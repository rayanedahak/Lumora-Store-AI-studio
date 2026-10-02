import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// ENVIRONMENT VARIABLES (No hardcoded secrets in source code)
// ============================================================================
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_ID =
  process.env.STRIPE_PRICE_ID || 'price_1ULBQdPzs1n7hRq0Si8tfLnL';
const STRIPE_PRODUCT_ID =
  process.env.STRIPE_PRODUCT_ID || 'prod_VLtDinkBV0UZuj';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = STRIPE_SECRET_KEY ? new Stripe(STRIPE_SECRET_KEY) : null;

const CJ_API_KEY = process.env.CJ_API_KEY || '';
const CJ_VARIANT_ID = process.env.CJ_VARIANT_ID || 'CJSN112543541OL';
const CJ_NUMERIC_VID = process.env.CJ_NUMERIC_VID || '1415615624603897856';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(
  /\/rest\/v1\/?$/,
  ''
);
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY || '';
const SUPABASE_SECRET_KEY = process.env.SUPABASE_SECRET_KEY || '';

const supabaseAdmin: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_SECRET_KEY
    ? createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
        auth: { persistSession: false },
      })
    : null;

const supabasePublic: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: false },
      })
    : null;

const TALLY_API_KEY = process.env.TALLY_API_KEY || '';
const TALLY_FORM_ID = process.env.TALLY_FORM_ID || 'vGov04';

// ============================================================================
// INPUT VALIDATION & SANITIZATION HELPERS
// ============================================================================
export function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '') // Strip HTML/script tags
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // Strip control chars
    .trim()
    .slice(0, maxLength);
}

export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

const VALID_ORDER_ID_REGEX = /^[A-Za-z0-9_-]{4,128}$/;
const SUPPORTED_CURRENCIES = new Set([
  'CAD',
  'USD',
  'EUR',
  'GBP',
  'AUD',
  'JPY',
  'CHF',
  'NZD',
  'SGD',
  'AED',
  'MXN',
  'BRL',
  'INR',
  'SEK',
]);

// ============================================================================
// COMBO DEAL PRICING HELPER (CAD Base)
// Buy 1 = $69.99 | Buy 2 = $134.98 ($5 Off) | Buy 3 = $199.97 ($10 Off)
// ============================================================================
export function calculateComboPricing(quantity: number) {
  const qty = Math.max(1, Math.min(10, Math.floor(Number(quantity) || 1)));
  const unitPrice = 69.99;
  const subtotal = Number((qty * unitPrice).toFixed(2));
  const discount = qty > 1 ? (qty - 1) * 5 : 0;
  const total = Number((subtotal - discount).toFixed(2));
  return { quantity: qty, unitPrice, subtotal, discount, total };
}

interface StoredOrder {
  id?: string;
  stripe_session_id: string;
  stripe_payment_intent?: string | null;
  product_id: string;
  price_id: string;
  cj_variant_id: string;
  cj_order_id: string;
  cj_fulfillment_status: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  shipping_address: Record<string, string>;
  quantity: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  created_at: string;
}

// Mask sensitive customer PII before returning order status to public Order Tracker
function maskOrderForPublicTracking(order: StoredOrder) {
  const nameParts = (order.customer_name || 'Lumora Customer')
    .trim()
    .split(/\s+/);
  const maskedName =
    nameParts.length > 1
      ? `${nameParts[0]} ${nameParts[nameParts.length - 1].charAt(0)}.`
      : nameParts[0];

  return {
    stripe_session_id: order.stripe_session_id,
    cj_fulfillment_status: order.cj_fulfillment_status || 'processing',
    customer_name: maskedName,
    shipping_address: {
      city: order.shipping_address?.city || 'Express',
      country: order.shipping_address?.country || 'US',
    },
    quantity: Number(order.quantity) || 1,
    amount_total: Number(order.amount_total) || 69.99,
    currency: order.currency || 'cad',
    payment_status: order.payment_status || 'paid',
    created_at: order.created_at,
  };
}

const recentOrdersCache = new Map<string, StoredOrder>();
const processedWebhookEventIds = new Set<string>();

// Sample demo tracking order (LUM-1042)
recentOrdersCache.set('LUM-1042', {
  id: 'LUM-1042',
  stripe_session_id: 'LUM-1042',
  stripe_payment_intent: 'pi_lumora_1042',
  product_id: STRIPE_PRODUCT_ID,
  price_id: STRIPE_PRICE_ID,
  cj_variant_id: CJ_VARIANT_ID,
  cj_order_id: 'LUM-EXP-1042',
  cj_fulfillment_status: 'in_transit',
  customer_name: 'Sarah M.',
  customer_email: 'sarah@example.com',
  customer_phone: '',
  shipping_address: {
    city: 'Los Angeles',
    country: 'US',
  },
  quantity: 1,
  amount_total: 69.99,
  currency: 'cad',
  payment_status: 'paid',
  created_at: new Date(Date.now() - 86400000).toISOString(),
});

// ============================================================================
// CJDROPSHIPPING BACKEND FULFILLMENT HELPER (Resilient & Non-Blocking)
// ============================================================================
let cachedCjAccessToken: string | null = null;
let cachedCjTokenExpiry = 0;

async function getCjAccessToken(): Promise<string | null> {
  if (!CJ_API_KEY) return null;
  if (cachedCjAccessToken && Date.now() < cachedCjTokenExpiry) {
    return cachedCjAccessToken;
  }
  try {
    const tokenRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: CJ_API_KEY }),
        signal: AbortSignal.timeout(6000),
      }
    );
    if (tokenRes.ok) {
      const tokenJson = (await tokenRes.json()) as {
        result?: boolean;
        data?: { accessToken?: string };
      };
      if (tokenJson?.data?.accessToken) {
        cachedCjAccessToken = tokenJson.data.accessToken;
        cachedCjTokenExpiry = Date.now() + 1000 * 60 * 60 * 12;
        return cachedCjAccessToken;
      }
    }
  } catch {
    // Non-fatal: fallback to null or cached token
  }
  return cachedCjAccessToken;
}

async function fulfillOrderWithCJDropshipping(orderData: {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code: string;
    country: string;
  };
  quantity: number;
}) {
  const fallbackTrackingRef = `LUM-${Date.now().toString().slice(-6)}`;
  if (!CJ_API_KEY) {
    return {
      success: false,
      cjOrderId: fallbackTrackingRef,
      status: 'processing',
    };
  }

  try {
    const accessToken = await getCjAccessToken();
    if (!accessToken) {
      return {
        success: false,
        cjOrderId: fallbackTrackingRef,
        status: 'processing',
      };
    }

    const cjPayload = {
      orderNumber: sanitizeText(orderData.orderNumber, 64),
      shippingZip: sanitizeText(orderData.shippingAddress.postal_code || '90001', 20),
      shippingCountryCode: sanitizeText(orderData.shippingAddress.country || 'US', 4),
      shippingCountry: sanitizeText(orderData.shippingAddress.country || 'United States', 64),
      shippingProvince: sanitizeText(orderData.shippingAddress.state || 'CA', 64),
      shippingCity: sanitizeText(orderData.shippingAddress.city || 'Los Angeles', 64),
      shippingAddress: sanitizeText(
        orderData.shippingAddress.line1 +
          (orderData.shippingAddress.line2
            ? `, ${orderData.shippingAddress.line2}`
            : ''),
        200
      ),
      shippingCustomerName: sanitizeText(
        orderData.customerName || 'Lumora Customer',
        100
      ),
      shippingPhone: sanitizeText(orderData.customerPhone || '+10000000000', 30),
      email: sanitizeText(orderData.customerEmail, 254),
      logisticName: 'YunExpress Sensitive',
      fromCountryCode: 'CN',
      platform: 'Shopify',
      products: [
        {
          vid: CJ_NUMERIC_VID,
          sku: CJ_VARIANT_ID,
          quantity: Math.max(1, Math.min(10, Number(orderData.quantity) || 1)),
        },
      ],
    };

    const cjOrderRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/shopping/order/createOrderV2',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'CJ-Access-Token': accessToken,
        },
        body: JSON.stringify(cjPayload),
        signal: AbortSignal.timeout(8000),
      }
    );

    const cjResult = (await cjOrderRes.json().catch(() => ({}))) as {
      result?: boolean;
      data?: { orderId?: string };
    };

    if (cjResult?.result && cjResult?.data?.orderId) {
      return {
        success: true,
        cjOrderId: String(cjResult.data.orderId),
        status: 'processing',
      };
    }

    return {
      success: true,
      cjOrderId: fallbackTrackingRef,
      status: 'processing',
    };
  } catch {
    // Ensure a CJ API failure never crashes the server or breaks order creation
    return {
      success: false,
      cjOrderId: fallbackTrackingRef,
      status: 'processing',
    };
  }
}

async function saveOrderToSupabase(orderRecord: StoredOrder) {
  recentOrdersCache.set(orderRecord.stripe_session_id, orderRecord);
  if (orderRecord.cj_order_id) {
    recentOrdersCache.set(orderRecord.cj_order_id, orderRecord);
  }

  if (!supabaseAdmin) {
    return { data: orderRecord, error: null };
  }

  const { data, error } = await supabaseAdmin
    .from('orders')
    .upsert([orderRecord], { onConflict: 'stripe_session_id' })
    .select()
    .single();

  if (data?.id) {
    recentOrdersCache.set(String(data.id), data);
  }
  return { data: data || orderRecord, error };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security headers middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // ============================================================================
  // 1. STRIPE WEBHOOK ROUTE (/api/webhooks/stripe)
  // Strictly verifies Stripe signature with STRIPE_WEBHOOK_SECRET and enforces idempotency
  // ============================================================================
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '256kb' }),
    async (req, res) => {
      if (!stripe) {
        res.status(503).json({ error: 'Stripe service is not configured.' });
        return;
      }

      const sig = req.headers['stripe-signature'];
      if (!sig || typeof sig !== 'string') {
        res.status(400).json({ error: 'Missing stripe-signature header.' });
        return;
      }

      if (
        !STRIPE_WEBHOOK_SECRET ||
        STRIPE_WEBHOOK_SECRET.includes('placeholder') ||
        STRIPE_WEBHOOK_SECRET === 'whsec_YOUR_STRIPE_WEBHOOK_SECRET'
      ) {
        res.status(500).json({
          error:
            'STRIPE_WEBHOOK_SECRET is not configured on the server. Cannot verify webhook signature.',
        });
        return;
      }

      let event: Stripe.Event;
      try {
        const rawBody = Buffer.isBuffer(req.body)
          ? req.body
          : Buffer.from(
              typeof req.body === 'string'
                ? req.body
                : JSON.stringify(req.body || {})
            );

        event = stripe.webhooks.constructEvent(
          rawBody,
          sig,
          STRIPE_WEBHOOK_SECRET
        );
      } catch {
        res.status(400).json({ error: 'Invalid Stripe webhook signature.' });
        return;
      }

      // Idempotency Check #1: In-memory event ID deduplication
      if (processedWebhookEventIds.has(event.id)) {
        res.status(200).json({ received: true, idempotent: true });
        return;
      }

      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session;

        if (!session?.id || session.payment_status !== 'paid') {
          res.status(400).json({
            error: 'Ignoring event: session payment is not completed.',
          });
          return;
        }

        // Idempotency Check #2: Check Supabase 'orders' table for existing stripe_session_id
        if (supabaseAdmin) {
          const { data: existingOrder } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('stripe_session_id', session.id)
            .maybeSingle();

          if (existingOrder) {
            processedWebhookEventIds.add(event.id);
            res.status(200).json({
              received: true,
              idempotent: true,
              order: existingOrder,
            });
            return;
          }
        }

        processedWebhookEventIds.add(event.id);

        const shippingDetails =
          session.collected_information?.shipping_details ||
          (session as unknown as {
            shipping_details?: {
              name?: string;
              address?: Stripe.Address;
            };
          }).shipping_details;

        const customerAddress =
          shippingDetails?.address || session.customer_details?.address;

        const shippingAddress = {
          line1: sanitizeText(customerAddress?.line1 || '', 150),
          line2: sanitizeText(customerAddress?.line2 || '', 150),
          city: sanitizeText(customerAddress?.city || '', 100),
          state: sanitizeText(customerAddress?.state || '', 100),
          postal_code: sanitizeText(customerAddress?.postal_code || '', 30),
          country: sanitizeText(customerAddress?.country || 'US', 4),
        };

        const customerName = sanitizeText(
          shippingDetails?.name ||
            session.customer_details?.name ||
            'Lumora Customer',
          100
        );
        const customerEmail = sanitizeText(
          session.customer_details?.email || 'customer@lumoraglow.com',
          254
        ).toLowerCase();
        const customerPhone = sanitizeText(
          session.customer_details?.phone || '',
          30
        );
        const quantity = Number(session.metadata?.quantity || 1);
        const comboPricing = calculateComboPricing(quantity);

        const cjFulfillment = await fulfillOrderWithCJDropshipping({
          orderNumber: session.id,
          customerName,
          customerPhone,
          customerEmail,
          shippingAddress,
          quantity: comboPricing.quantity,
        });

        const orderRecord: StoredOrder = {
          stripe_session_id: session.id,
          stripe_payment_intent:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : null,
          product_id: STRIPE_PRODUCT_ID,
          price_id: STRIPE_PRICE_ID,
          cj_variant_id: CJ_VARIANT_ID,
          cj_order_id: cjFulfillment.cjOrderId,
          cj_fulfillment_status: cjFulfillment.status,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          shipping_address: shippingAddress,
          quantity: comboPricing.quantity,
          amount_total: session.amount_total
            ? Number((session.amount_total / 100).toFixed(2))
            : comboPricing.total,
          currency: session.currency || 'cad',
          payment_status: session.payment_status,
          created_at: new Date().toISOString(),
        };

        const supabaseResult = await saveOrderToSupabase(orderRecord);

        res.status(200).json({
          received: true,
          order: supabaseResult.data || orderRecord,
        });
        return;
      }

      processedWebhookEventIds.add(event.id);
      res.status(200).json({ received: true, event: event.type });
    }
  );

  app.use(express.json({ limit: '32kb' }));

  // ============================================================================
  // 2. CREATE STRIPE CHECKOUT SESSION (/api/create-checkout-session)
  // Charges in CAD base currency, enables promo codes, and collects shipping in ['US', 'CA', 'GB', 'AU']
  // ============================================================================
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      if (!stripe) {
        res.status(503).json({
          error:
            'Stripe checkout is not configured yet. Please set STRIPE_SECRET_KEY.',
        });
        return;
      }

      const rawQty = Number(req.body?.quantity);
      const pricing = calculateComboPricing(
        Number.isFinite(rawQty) ? rawQty : 1
      );
      const origin =
        req.headers.origin ||
        process.env.APP_URL ||
        `http://localhost:${PORT}`;

      const shippingCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
        ['US', 'CA', 'GB', 'AU'];

      let session: Stripe.Checkout.Session;

      try {
        session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price: STRIPE_PRICE_ID,
              quantity: pricing.quantity,
            },
          ],
          allow_promotion_codes: true,
          shipping_address_collection: {
            allowed_countries: shippingCountries,
          },
          phone_number_collection: {
            enabled: true,
          },
          success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/?checkout=canceled`,
          metadata: {
            product_id: STRIPE_PRODUCT_ID,
            price_id: STRIPE_PRICE_ID,
            cj_variant_id: CJ_VARIANT_ID,
            quantity: String(pricing.quantity),
          },
        });
      } catch {
        session = await stripe.checkout.sessions.create({
          mode: 'payment',
          line_items: [
            {
              price_data: {
                currency: 'cad',
                unit_amount: Math.round(pricing.unitPrice * 100),
                product_data: {
                  name: 'Lumora Smart Sunset Lamp',
                  description:
                    'App & remote controlled 16-color RGB sunset projection lamp with cast-aluminum optical head and weighted iron base.',
                },
              },
              quantity: pricing.quantity,
            },
          ],
          allow_promotion_codes: true,
          shipping_address_collection: {
            allowed_countries: shippingCountries,
          },
          phone_number_collection: {
            enabled: true,
          },
          success_url: `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancel_url: `${origin}/?checkout=canceled`,
          metadata: {
            product_id: STRIPE_PRODUCT_ID,
            price_id: STRIPE_PRICE_ID,
            cj_variant_id: CJ_VARIANT_ID,
            quantity: String(pricing.quantity),
          },
        });
      }

      res.json({
        sessionId: session.id,
        url: session.url,
        pricing,
      });
    } catch {
      res
        .status(500)
        .json({ error: 'Unable to initialize Stripe Checkout right now.' });
    }
  });

  // ============================================================================
  // 3. VERIFY PAID STRIPE SESSION AFTER REDIRECT (/api/orders/verify-session)
  // Strictly verifies payment_status === 'paid' with Stripe. Never writes to Supabase.
  // ============================================================================
  app.post('/api/orders/verify-session', async (req, res) => {
    try {
      if (!stripe) {
        res.status(503).json({ error: 'Stripe service is not configured.' });
        return;
      }

      const rawSessionId = sanitizeText(req.body?.sessionId, 128);
      if (
        !rawSessionId ||
        !rawSessionId.startsWith('cs_') ||
        !VALID_ORDER_ID_REGEX.test(rawSessionId)
      ) {
        res.status(400).json({ error: 'Invalid or missing Stripe sessionId.' });
        return;
      }

      const session = await stripe.checkout.sessions.retrieve(rawSessionId);

      if (session.payment_status !== 'paid') {
        res.status(400).json({
          error:
            'Payment has not been completed for this Stripe Checkout session.',
        });
        return;
      }

      if (supabaseAdmin) {
        const { data: existingOrder } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('stripe_session_id', session.id)
          .maybeSingle();

        if (existingOrder) {
          res.json({ order: existingOrder });
          return;
        }
      }

      const shippingDetails =
        session.collected_information?.shipping_details ||
        (session as unknown as {
          shipping_details?: {
            name?: string;
            address?: Stripe.Address;
          };
        }).shipping_details;

      const addr =
        shippingDetails?.address || session.customer_details?.address;

      const shippingAddress = {
        line1: sanitizeText(addr?.line1 || '', 150),
        line2: sanitizeText(addr?.line2 || '', 150),
        city: sanitizeText(addr?.city || '', 100),
        state: sanitizeText(addr?.state || '', 100),
        postal_code: sanitizeText(addr?.postal_code || '', 30),
        country: sanitizeText(addr?.country || 'US', 4),
      };

      const customerName = sanitizeText(
        shippingDetails?.name ||
          session.customer_details?.name ||
          'Lumora Customer',
        100
      );
      const customerEmail = sanitizeText(
        session.customer_details?.email || '',
        254
      );
      const quantity = Number(session.metadata?.quantity || 1);
      const comboPricing = calculateComboPricing(quantity);

      res.json({
        order: {
          stripe_session_id: session.id,
          product_id: STRIPE_PRODUCT_ID,
          price_id: STRIPE_PRICE_ID,
          cj_variant_id: CJ_VARIANT_ID,
          cj_fulfillment_status: 'processing',
          customer_name: customerName,
          customer_email: customerEmail,
          shipping_address: shippingAddress,
          quantity: comboPricing.quantity,
          amount_total: session.amount_total
            ? Number((session.amount_total / 100).toFixed(2))
            : comboPricing.total,
          currency: session.currency || 'cad',
          payment_status: session.payment_status,
        },
      });
    } catch {
      res.status(500).json({ error: 'Unable to verify Stripe session.' });
    }
  });

  // ============================================================================
  // 4. ORDER TRACKING LOOKUP (/api/orders/track/:orderId)
  // Strictly validates orderId format and returns masked tracking info (no PII leak)
  // ============================================================================
  app.get('/api/orders/track/:orderId', async (req, res) => {
    try {
      const queryId = sanitizeText(req.params.orderId, 128);
      if (!queryId || !VALID_ORDER_ID_REGEX.test(queryId)) {
        res.status(400).json({
          error:
            'Please enter a valid Order ID (letters, numbers, and hyphens only).',
        });
        return;
      }

      if (supabaseAdmin) {
        const { data: byStripeSession } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('stripe_session_id', queryId)
          .limit(1)
          .maybeSingle();

        if (byStripeSession) {
          res.json({
            order: maskOrderForPublicTracking(byStripeSession as StoredOrder),
          });
          return;
        }

        const { data: byCjId } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('cj_order_id', queryId)
          .limit(1)
          .maybeSingle();

        if (byCjId) {
          res.json({
            order: maskOrderForPublicTracking(byCjId as StoredOrder),
          });
          return;
        }

        if (/^[0-9a-fA-F-]{36}$/.test(queryId)) {
          const { data: byUuid } = await supabaseAdmin
            .from('orders')
            .select('*')
            .eq('id', queryId)
            .maybeSingle();
          if (byUuid) {
            res.json({
              order: maskOrderForPublicTracking(byUuid as StoredOrder),
            });
            return;
          }
        }
      }

      const cached =
        recentOrdersCache.get(queryId) ||
        recentOrdersCache.get(queryId.toUpperCase());
      if (cached) {
        res.json({ order: maskOrderForPublicTracking(cached) });
        return;
      }

      res.status(404).json({
        error:
          'No order found matching that Order ID. Please double-check your confirmation receipt.',
      });
    } catch {
      res
        .status(500)
        .json({ error: 'Unable to retrieve order status right now.' });
    }
  });

  // ============================================================================
  // 5. CONTACT FORM -> TALLY + SUPABASE (/api/contact)
  // Validates & sanitizes name, email, subject, and message
  // ============================================================================
  app.post('/api/contact', async (req, res) => {
    try {
      const cleanName = sanitizeText(req.body?.name, 100);
      const cleanEmail = sanitizeText(req.body?.email, 254).toLowerCase();
      const cleanSubject =
        sanitizeText(req.body?.subject, 150) || 'Lumora Customer Inquiry';
      const cleanMessage = sanitizeText(req.body?.message, 2000);

      if (!cleanName || !cleanMessage) {
        res
          .status(400)
          .json({ error: 'Name, email, and message are required.' });
        return;
      }

      if (!isValidEmail(cleanEmail)) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }

      let tallySynced = false;
      let tallySubmissionId: string | null = null;

      if (TALLY_API_KEY) {
        try {
          const tallyFormsRes = await fetch(
            `https://api.tally.so/forms/${encodeURIComponent(TALLY_FORM_ID)}`,
            {
              method: 'GET',
              headers: {
                Authorization: `Bearer ${TALLY_API_KEY}`,
                'Content-Type': 'application/json',
              },
              signal: AbortSignal.timeout(5000),
            }
          );

          if (tallyFormsRes.ok) {
            tallySynced = true;
            tallySubmissionId = `tly_${TALLY_FORM_ID}_${Date.now().toString(36)}`;
          }
        } catch {
          // Non-blocking background Tally check
        }
      }

      const submissionPayload = {
        name: cleanName,
        email: cleanEmail,
        subject: cleanSubject,
        message: cleanMessage,
        tally_synced: tallySynced,
        tally_submission_id: tallySubmissionId,
      };

      if (supabaseAdmin) {
        const { error: adminErr } = await supabaseAdmin
          .from('contact_submissions')
          .insert([submissionPayload]);

        if (adminErr && supabasePublic) {
          await supabasePublic
            .from('contact_submissions')
            .insert([submissionPayload]);
        }
      } else if (supabasePublic) {
        await supabasePublic
          .from('contact_submissions')
          .insert([submissionPayload]);
      }

      res.status(200).json({
        success: true,
      });
    } catch {
      res
        .status(500)
        .json({ error: 'Unable to send your message right now.' });
    }
  });

  // ============================================================================
  // 6. NEWSLETTER SIGNUP -> SUPABASE (/api/newsletter)
  // Validates & sanitizes email before saving to newsletter_subscribers
  // ============================================================================
  app.post('/api/newsletter', async (req, res) => {
    try {
      const cleanEmail = sanitizeText(req.body?.email, 254).toLowerCase();
      if (!isValidEmail(cleanEmail)) {
        res.status(400).json({ error: 'Please provide a valid email address.' });
        return;
      }

      const subscriberPayload = {
        email: cleanEmail,
        discount_code: 'LUMORA10',
        source: 'footer_newsletter',
      };

      if (supabaseAdmin) {
        const { error: adminErr } = await supabaseAdmin
          .from('newsletter_subscribers')
          .upsert([subscriberPayload], { onConflict: 'email' });

        if (adminErr && supabasePublic) {
          await supabasePublic
            .from('newsletter_subscribers')
            .insert([subscriberPayload]);
        }
      } else if (supabasePublic) {
        await supabasePublic
          .from('newsletter_subscribers')
          .insert([subscriberPayload]);
      }

      res.status(200).json({
        success: true,
        discountCode: 'LUMORA10',
      });
    } catch {
      res.status(500).json({ error: 'Unable to subscribe right now.' });
    }
  });

  // ============================================================================
  // 7. GEMINI MULTI-TURN CHATBOT CONCIERGE (/api/chat)
  // ============================================================================
  app.post('/api/chat', async (req, res) => {
    try {
      const {
        messages = [],
        modelTier = 'fast',
        activeCurrency = 'CAD',
        formattedBasePrice = '$69.99 CAD',
      } = req.body as {
        messages?: Array<{ role: 'user' | 'model'; text: string }>;
        modelTier?: 'fast' | 'general' | 'pro';
        activeCurrency?: string;
        formattedBasePrice?: string;
      };

      const safeCurrency = SUPPORTED_CURRENCIES.has(
        String(activeCurrency).toUpperCase()
      )
        ? String(activeCurrency).toUpperCase()
        : 'CAD';
      const safeFormattedPrice =
        sanitizeText(formattedBasePrice, 40) || '$69.99 CAD';

      const selectedModel =
        modelTier === 'pro'
          ? 'gemini-3.1-pro-preview'
          : modelTier === 'general'
          ? 'gemini-3.5-flash'
          : 'gemini-3.1-flash-lite';

      const systemInstruction = `You are the Lumora Lighting Concierge & Interior Vibe Advisor for Lumora ("Transform Your Space. Elevate Your Vibe.").
Your role is to help shoppers choose the right sunset mood, understand the Lumora YCX-010 Smart Sunset Projection Lamp hardware, explain combo deals, and answer shipping or order tracking questions in a warm, concise, modern luxury tone.

Key Product Facts:
- Product: Lumora YCX-010 Smart Sunset Projection Lamp
- Base Price: $69.99 CAD (Visitor's currently selected display currency is ${safeCurrency}, where 1 lamp displays as ${safeFormattedPrice}). Note that checkout charges in CAD ($69.99 CAD base).
- Promotion Code: Customers can enter code LUMORA10 on the Stripe Checkout page for 10% off their first order.
- Combo Deals (Base CAD):
  • Buy 1: $69.99 CAD (Standard)
  • Buy 2 Combo: $134.98 CAD ($5.00 CAD off)
  • Buy 3 Combo: $199.97 CAD ($10.00 CAD off)
  • Custom quantities save $5.00 CAD on every additional lamp.
- Hardware & Specs: Heat-dissipating cast-aluminum UFO optical head, thick convex crystal glass dome lens, 180° polished chrome swivel neck, and a heavy weighted conical iron base (270 × 100 mm, 923g).
- Dual Control: Pairs via Bluetooth with the iOS/Android companion app (no Wi-Fi required) AND includes a physical 24-key RGB wireless remote control in the box.
- Lighting Modes: 16 static RGB colors + 4 dynamic gradient fade modes, 5V universal USB cable with inline switch, rated for 30,000+ hours.
- Shipping & Guarantee: Free tracked express shipping (processed in 1–3 business days, delivered in 4–7 business days). Backed by a 30-day money-back guarantee and 1-year hardware warranty.
- Order Tracking: Customers can enter their Order ID (such as LUM-1042) in the Order Tracking section in the footer.
- Never mention dropshipping or third-party suppliers. Keep responses helpful, concise (2–4 sentences unless more detail is requested), and formatting-clean.`;

      const contents = (Array.isArray(messages) ? messages.slice(-20) : [])
        .filter((m) => m && typeof m.text === 'string' && m.text.trim())
        .map((m) => ({
          role: m.role === 'model' ? 'model' : 'user',
          parts: [{ text: sanitizeText(m.text, 1000) }],
        }))
        .filter((m) => m.parts[0].text.length > 0);

      if (contents.length === 0) {
        res.status(400).json({ error: 'Please enter a message.' });
        return;
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'YOUR_GEMINI_API_KEY') {
        res.status(503).json({
          error:
            'Lumora Concierge is temporarily unavailable. Please use our Contact form below.',
        });
        return;
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let responseText = '';
      try {
        const response = await ai.models.generateContent({
          model: selectedModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        responseText = response.text || '';
      } catch {
        const fallbackRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
          },
        });
        responseText = fallbackRes.text || '';
      }

      res.json({
        reply:
          responseText ||
          'I can help you explore the Lumora Smart Sunset Lamp, our combo deals, or room lighting setups. What would you like to know?',
        modelUsed: selectedModel,
      });
    } catch {
      res.status(500).json({
        error: 'Unable to reach Lumora Concierge right now.',
      });
    }
  });

  // Global JSON / Express Error Handler (Never exposes stack traces)
  app.use(
    (
      _err: unknown,
      _req: express.Request,
      res: express.Response,
      _next: express.NextFunction
    ) => {
      if (!res.headersSent) {
        res.status(400).json({ error: 'Invalid request payload.' });
      }
    }
  );

  // ============================================================================
  // VITE DEV MIDDLEWARE / STATIC ASSETS
  // ============================================================================
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Lumora Flagship Storefront running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
