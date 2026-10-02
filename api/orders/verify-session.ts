import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
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

const VALID_ORDER_ID_REGEX = /^[A-Za-z0-9_-]{4,128}$/;

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

async function parseJsonBody(req: VercelRequest): Promise<Record<string, unknown>> {
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return req.body as Record<string, unknown>;
  }
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (Buffer.isBuffer(req.body)) {
    try {
      return JSON.parse(req.body.toString('utf8')) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
  } catch {
    return {};
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

    const body = await parseJsonBody(req);
    const rawSessionId = sanitizeText(body?.sessionId, 128);
    if (
      !rawSessionId ||
      !rawSessionId.startsWith('cs_') ||
      !VALID_ORDER_ID_REGEX.test(rawSessionId)
    ) {
      sendJson(res, 400, { error: 'Invalid or missing Stripe sessionId.' });
      return;
    }

    const stripe = new Stripe(stripeSecretKey, {
      timeout: 8000,
      maxNetworkRetries: 1,
    });

    const session = await stripe.checkout.sessions.retrieve(
      rawSessionId,
      {},
      {
        timeout: 8000,
      }
    );

    if (session.payment_status !== 'paid') {
      sendJson(res, 400, {
        error:
          'Payment has not been completed for this Stripe Checkout session.',
      });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      const { data: existingOrder } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('stripe_session_id', session.id)
        .maybeSingle();

      if (existingOrder) {
        sendJson(res, 200, { order: existingOrder });
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

    sendJson(res, 200, {
      order: {
        stripe_session_id: session.id,
        product_id:
          session.metadata?.product_id ||
          (process.env.STRIPE_PRODUCT_ID || '').trim(),
        price_id:
          session.metadata?.price_id ||
          (process.env.STRIPE_PRICE_ID || '').trim(),
        cj_variant_id:
          session.metadata?.cj_variant_id ||
          (process.env.CJ_VARIANT_ID || '').trim(),
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
    sendJson(res, 500, { error: 'Unable to verify Stripe session.' });
  }
}
