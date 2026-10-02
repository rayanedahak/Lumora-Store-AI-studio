import type { IncomingMessage, ServerResponse } from 'node:http';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

type VercelRequest = IncomingMessage & {
  method?: string;
  url?: string;
  query?: Record<string, unknown>;
  params?: Record<string, string | undefined>;
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

interface StoredOrder {
  id?: string;
  stripe_session_id: string;
  cj_order_id?: string;
  cj_fulfillment_status?: string;
  customer_name?: string;
  shipping_address?: Record<string, string>;
  quantity?: number;
  amount_total?: number;
  currency?: string;
  payment_status?: string;
  created_at?: string;
}

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

const DEMO_ORDER_LUM_1042: StoredOrder = {
  id: 'LUM-1042',
  stripe_session_id: 'LUM-1042',
  cj_order_id: 'LUM-EXP-1042',
  cj_fulfillment_status: 'in_transit',
  customer_name: 'Sarah M.',
  shipping_address: {
    city: 'Los Angeles',
    country: 'US',
  },
  quantity: 1,
  amount_total: 69.99,
  currency: 'cad',
  payment_status: 'paid',
  created_at: new Date(Date.now() - 86400000).toISOString(),
};

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

function extractOrderIdFromRequest(req: VercelRequest): string {
  if (req.params?.orderId) {
    return sanitizeText(req.params.orderId, 128);
  }
  const qOrderId = req.query?.orderId;
  if (typeof qOrderId === 'string' && qOrderId.trim()) {
    return sanitizeText(qOrderId, 128);
  }
  if (Array.isArray(qOrderId) && qOrderId[0]) {
    return sanitizeText(qOrderId[0], 128);
  }
  if (req.url) {
    try {
      const parsedUrl = new URL(req.url, 'https://lumora.local');
      const fromSearch = parsedUrl.searchParams.get('orderId');
      if (fromSearch) {
        return sanitizeText(fromSearch, 128);
      }
      const segments = parsedUrl.pathname.split('/').filter(Boolean);
      const lastSegment = segments[segments.length - 1];
      if (lastSegment && lastSegment !== 'track') {
        return sanitizeText(decodeURIComponent(lastSegment), 128);
      }
    } catch {
      // Ignore URL parse error
    }
  }
  return '';
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') {
    sendJson(res, 200, { ok: true });
    return;
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, { error: 'Method not allowed. Use GET.' });
    return;
  }

  try {
    const queryId = extractOrderIdFromRequest(req);
    if (!queryId || !VALID_ORDER_ID_REGEX.test(queryId)) {
      sendJson(res, 400, {
        error:
          'Please enter a valid Order ID (letters, numbers, and hyphens only).',
      });
      return;
    }

    if (queryId.toUpperCase() === 'LUM-1042') {
      sendJson(res, 200, {
        order: maskOrderForPublicTracking(DEMO_ORDER_LUM_1042),
      });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    if (supabaseAdmin) {
      const { data: byStripeSession } = await supabaseAdmin
        .from('orders')
        .select('*')
        .eq('stripe_session_id', queryId)
        .limit(1)
        .maybeSingle();

      if (byStripeSession) {
        sendJson(res, 200, {
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
        sendJson(res, 200, {
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
          sendJson(res, 200, {
            order: maskOrderForPublicTracking(byUuid as StoredOrder),
          });
          return;
        }
      }
    }

    sendJson(res, 404, {
      error:
        'No order found matching that Order ID. Please double-check your confirmation receipt.',
    });
  } catch {
    sendJson(res, 500, {
      error: 'Unable to retrieve order status right now.',
    });
  }
}
