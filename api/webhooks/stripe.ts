import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

export const config = {
  api: {
    bodyParser: false,
  },
};

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
  rawBody?: Buffer | string;
  headers: IncomingMessage['headers'];
};

type VercelResponse = ServerResponse & {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
};

function sendJson(res: VercelResponse, statusCode: number, payload: unknown) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    res.status(statusCode).json(payload);
    return;
  }
  res.statusCode = statusCode;
  res.end(JSON.stringify(payload));
}

function sanitizeText(input: unknown, maxLength = 500): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLength);
}

function calculateComboPricing(quantity: number) {
  const qty = Math.max(1, Math.min(10, Math.floor(Number(quantity) || 1)));
  const unitPrice = 69.99;
  const subtotal = Number((qty * unitPrice).toFixed(2));
  const discount = qty > 1 ? (qty - 1) * 5 : 0;
  const total = Number((subtotal - discount).toFixed(2));
  return { quantity: qty, unitPrice, subtotal, discount, total };
}

function getSupabaseAdmin(): SupabaseClient | null {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/\/rest\/v1\/?$/, '');
  const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || '').trim();
  if (!supabaseUrl || !supabaseSecretKey) return null;
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false },
  });
}

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  if (Buffer.isBuffer(req.body)) {
    return req.body;
  }
  if (Buffer.isBuffer(req.rawBody)) {
    return req.rawBody;
  }
  if (typeof req.rawBody === 'string') {
    return Buffer.from(req.rawBody, 'utf8');
  }
  if (typeof req.body === 'string') {
    return Buffer.from(req.body, 'utf8');
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length > 0) {
    return Buffer.concat(chunks);
  }
  if (req.body && typeof req.body === 'object') {
    return Buffer.from(JSON.stringify(req.body), 'utf8');
  }
  return Buffer.alloc(0);
}

const processedWebhookEventIds = new Set<string>();
let cachedCjAccessToken: string | null = null;
let cachedCjTokenExpiry = 0;

async function getCjAccessToken(cjApiKey: string): Promise<string | null> {
  if (!cjApiKey) return null;
  if (cachedCjAccessToken && Date.now() < cachedCjTokenExpiry) {
    return cachedCjAccessToken;
  }
  try {
    const tokenRes = await fetch(
      'https://developers.cjdropshipping.com/api2.0/v1/authentication/getAccessToken',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: cjApiKey }),
        signal: AbortSignal.timeout(4000),
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
    // Non-fatal fallback
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
  const cjApiKey = (process.env.CJ_API_KEY || '').trim();
  const cjVariantId = (process.env.CJ_VARIANT_ID || '').trim();
  const cjNumericVid = (process.env.CJ_NUMERIC_VID || '').trim();

  if (!cjApiKey) {
    return {
      success: false,
      cjOrderId: fallbackTrackingRef,
      status: 'processing',
    };
  }

  try {
    const accessToken = await getCjAccessToken(cjApiKey);
    if (!accessToken) {
      return {
        success: false,
        cjOrderId: fallbackTrackingRef,
        status: 'processing',
      };
    }

    const productEntry: Record<string, unknown> = {
      quantity: Math.max(1, Math.min(10, Number(orderData.quantity) || 1)),
    };
    if (cjNumericVid) productEntry.vid = cjNumericVid;
    if (cjVariantId) productEntry.sku = cjVariantId;

    const cjPayload = {
      orderNumber: sanitizeText(orderData.orderNumber, 64),
      shippingZip: sanitizeText(
        orderData.shippingAddress.postal_code || '90001',
        20
      ),
      shippingCountryCode: sanitizeText(
        orderData.shippingAddress.country || 'US',
        4
      ),
      shippingCountry: sanitizeText(
        orderData.shippingAddress.country || 'United States',
        64
      ),
      shippingProvince: sanitizeText(
        orderData.shippingAddress.state || 'CA',
        64
      ),
      shippingCity: sanitizeText(
        orderData.shippingAddress.city || 'Los Angeles',
        64
      ),
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
      shippingPhone: sanitizeText(
        orderData.customerPhone || '+10000000000',
        30
      ),
      email: sanitizeText(orderData.customerEmail, 254),
      logisticName: 'YunExpress Sensitive',
      fromCountryCode: 'CN',
      platform: 'Shopify',
      products: [productEntry],
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
        signal: AbortSignal.timeout(4500),
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
    return {
      success: false,
      cjOrderId: fallbackTrackingRef,
      status: 'processing',
    };
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed. Use POST.' });
    return;
  }

  try {
    const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || '').trim();
    if (!stripeSecretKey) {
      sendJson(res, 503, { error: 'Stripe service is not configured.' });
      return;
    }

    const sig = req.headers['stripe-signature'];
    if (!sig || typeof sig !== 'string') {
      sendJson(res, 400, { error: 'Missing stripe-signature header.' });
      return;
    }

    const webhookSecret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
    if (
      !webhookSecret ||
      webhookSecret.includes('placeholder') ||
      webhookSecret === 'whsec_YOUR_STRIPE_WEBHOOK_SECRET'
    ) {
      sendJson(res, 500, {
        error:
          'STRIPE_WEBHOOK_SECRET is not configured on the server. Cannot verify webhook signature.',
      });
      return;
    }

    const stripe = new Stripe(stripeSecretKey, {
      timeout: 8000,
      maxNetworkRetries: 1,
    });

    let event: Stripe.Event;
    try {
      const rawBody = await readRawBody(req);
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch {
      sendJson(res, 400, { error: 'Invalid Stripe webhook signature.' });
      return;
    }

    // Idempotency Check #1: In-memory event ID deduplication
    if (processedWebhookEventIds.has(event.id)) {
      sendJson(res, 200, { received: true, idempotent: true });
      return;
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;

      if (!session?.id || session.payment_status !== 'paid') {
        sendJson(res, 400, {
          error: 'Ignoring event: session payment is not completed.',
        });
        return;
      }

      const supabaseAdmin = getSupabaseAdmin();

      // Idempotency Check #2: Check Supabase 'orders' table for existing stripe_session_id
      if (supabaseAdmin) {
        const { data: existingOrder } = await supabaseAdmin
          .from('orders')
          .select('*')
          .eq('stripe_session_id', session.id)
          .maybeSingle();

        if (existingOrder) {
          processedWebhookEventIds.add(event.id);
          sendJson(res, 200, {
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

      const orderRecord = {
        stripe_session_id: session.id,
        stripe_payment_intent:
          typeof session.payment_intent === 'string'
            ? session.payment_intent
            : null,
        product_id:
          session.metadata?.product_id ||
          (process.env.STRIPE_PRODUCT_ID || '').trim(),
        price_id:
          session.metadata?.price_id ||
          (process.env.STRIPE_PRICE_ID || '').trim(),
        cj_variant_id:
          session.metadata?.cj_variant_id ||
          (process.env.CJ_VARIANT_ID || '').trim(),
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

      let savedOrder = orderRecord;
      if (supabaseAdmin) {
        const { data } = await supabaseAdmin
          .from('orders')
          .upsert([orderRecord], { onConflict: 'stripe_session_id' })
          .select()
          .single();
        if (data) {
          savedOrder = data;
        }
      }

      sendJson(res, 200, {
        received: true,
        order: savedOrder,
      });
      return;
    }

    processedWebhookEventIds.add(event.id);
    sendJson(res, 200, { received: true, event: event.type });
  } catch {
    sendJson(res, 500, { error: 'Webhook handler encountered an error.' });
  }
}
