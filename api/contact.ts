import type { IncomingMessage, ServerResponse } from 'node:http';
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

function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) return false;
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function getSupabaseClients(): {
  supabaseAdmin: SupabaseClient | null;
  supabasePublic: SupabaseClient | null;
} {
  const supabaseUrl = (
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    ''
  )
    .trim()
    .replace(/\/rest\/v1\/?$/, '');
  const supabaseSecretKey = (process.env.SUPABASE_SECRET_KEY || '').trim();
  const supabasePublishableKey = (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    ''
  ).trim();

  const supabaseAdmin =
    supabaseUrl && supabaseSecretKey
      ? createClient(supabaseUrl, supabaseSecretKey, {
          auth: { persistSession: false },
        })
      : null;

  const supabasePublic =
    supabaseUrl && supabasePublishableKey
      ? createClient(supabaseUrl, supabasePublishableKey, {
          auth: { persistSession: false },
        })
      : null;

  return { supabaseAdmin, supabasePublic };
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
    const body = await parseJsonBody(req);
    const cleanName = sanitizeText(body?.name, 100);
    const cleanEmail = sanitizeText(body?.email, 254).toLowerCase();
    const cleanSubject =
      sanitizeText(body?.subject, 150) || 'Lumora Customer Inquiry';
    const cleanMessage = sanitizeText(body?.message, 2000);

    if (!cleanName || !cleanMessage) {
      sendJson(res, 400, {
        error: 'Name, email, and message are required.',
      });
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      sendJson(res, 400, {
        error: 'Please provide a valid email address.',
      });
      return;
    }

    let tallySynced = false;
    let tallySubmissionId: string | null = null;
    const tallyApiKey = (process.env.TALLY_API_KEY || '').trim();
    const tallyFormId = (process.env.TALLY_FORM_ID || '').trim();

    if (tallyApiKey && tallyFormId) {
      try {
        const tallyFormsRes = await fetch(
          `https://api.tally.so/forms/${encodeURIComponent(tallyFormId)}`,
          {
            method: 'GET',
            headers: {
              Authorization: `Bearer ${tallyApiKey}`,
              'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(4000),
          }
        );

        if (tallyFormsRes.ok) {
          tallySynced = true;
          tallySubmissionId = `tly_${tallyFormId}_${Date.now().toString(36)}`;
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

    const { supabaseAdmin, supabasePublic } = getSupabaseClients();

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

    sendJson(res, 200, {
      success: true,
    });
  } catch {
    sendJson(res, 500, {
      error: 'Unable to send your message right now.',
    });
  }
}
