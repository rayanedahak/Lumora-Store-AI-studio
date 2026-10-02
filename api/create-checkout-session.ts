import type { IncomingMessage, ServerResponse } from 'node:http';
import Stripe from 'stripe';

type VercelRequest = IncomingMessage & {
  method?: string;
  body?: unknown;
  query?: Record<string, unknown>;
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

export function calculateComboPricing(quantity: number) {
  const qty = Math.max(1, Math.min(10, Math.floor(Number(quantity) || 1)));
  const unitPrice = 69.99;
  const subtotal = Number((qty * unitPrice).toFixed(2));
  const discount = qty > 1 ? (qty - 1) * 5 : 0;
  const total = Number((subtotal - discount).toFixed(2));
  return { quantity: qty, unitPrice, subtotal, discount, total };
}

function resolveDynamicOrigin(
  req: VercelRequest,
  bodyOrigin?: unknown
): string {
  const candidates: string[] = [];

  if (typeof bodyOrigin === 'string' && bodyOrigin.trim()) {
    candidates.push(bodyOrigin.trim());
  }
  if (typeof req.headers.origin === 'string' && req.headers.origin.trim()) {
    candidates.push(req.headers.origin.trim());
  }
  if (process.env.APP_URL) {
    candidates.push(process.env.APP_URL.trim());
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    candidates.push(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`);
  }
  if (process.env.VERCEL_URL) {
    candidates.push(`https://${process.env.VERCEL_URL.trim()}`);
  }

  const forwardedHost = req.headers['x-forwarded-host'] || req.headers.host;
  const forwardedProto = req.headers['x-forwarded-proto'] || 'https';
  if (typeof forwardedHost === 'string' && forwardedHost.trim()) {
    const proto =
      typeof forwardedProto === 'string'
        ? forwardedProto.split(',')[0].trim()
        : 'https';
    candidates.push(`${proto}://${forwardedHost.split(',')[0].trim()}`);
  }

  for (const candidate of candidates) {
    try {
      const parsed = new URL(candidate);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        return parsed.origin;
      }
    } catch {
      // Ignore malformed URL candidate
    }
  }

  return '';
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
      sendJson(res, 503, {
        error:
          'Stripe checkout is not configured yet. Please set STRIPE_SECRET_KEY in your environment variables.',
      });
      return;
    }

    const stripe = new Stripe(stripeSecretKey, {
      timeout: 8000,
      maxNetworkRetries: 1,
    });

    const body = await parseJsonBody(req);
    const rawQty = Number(body?.quantity);
    const pricing = calculateComboPricing(
      Number.isFinite(rawQty) ? rawQty : 1
    );

    const origin = resolveDynamicOrigin(req, body?.origin);
    if (!origin) {
      sendJson(res, 400, {
        error: 'Unable to determine application origin URL for checkout redirect.',
      });
      return;
    }

    const stripePriceId = (process.env.STRIPE_PRICE_ID || '').trim();
    const stripeProductId = (process.env.STRIPE_PRODUCT_ID || '').trim();
    const cjVariantId = (process.env.CJ_VARIANT_ID || '').trim();

    const shippingCountries: Stripe.Checkout.SessionCreateParams.ShippingAddressCollection.AllowedCountry[] =
      ['US', 'CA', 'GB', 'AU'];

    const commonSessionParams: Omit<
      Stripe.Checkout.SessionCreateParams,
      'line_items'
    > = {
      mode: 'payment',
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
        product_id: stripeProductId,
        price_id: stripePriceId,
        cj_variant_id: cjVariantId,
        quantity: String(pricing.quantity),
      },
    };

    let session: Stripe.Checkout.Session | null = null;

    if (stripePriceId) {
      try {
        session = await stripe.checkout.sessions.create(
          {
            ...commonSessionParams,
            line_items: [
              {
                price: stripePriceId,
                quantity: pricing.quantity,
              },
            ],
          },
          { timeout: 8000 }
        );
      } catch {
        session = null;
      }
    }

    if (!session) {
      session = await stripe.checkout.sessions.create(
        {
          ...commonSessionParams,
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
        },
        { timeout: 8000 }
      );
    }

    sendJson(res, 200, {
      sessionId: session.id,
      url: session.url,
      pricing,
    });
  } catch {
    sendJson(res, 500, {
      error: 'Unable to initialize Stripe Checkout right now.',
    });
  }
}
