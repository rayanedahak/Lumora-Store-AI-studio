import type { IncomingMessage, ServerResponse } from 'node:http';
import { GoogleGenAI } from '@google/genai';

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
  console.log('API KEY EXISTS:', !!process.env.GEMINI_API_KEY);

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
    const messages = Array.isArray(body?.messages)
      ? (body.messages as Array<{ role?: string; text?: string }>)
      : [];
    const activeCurrency = body?.activeCurrency || 'CAD';
    const formattedBasePrice = body?.formattedBasePrice || '$69.99 CAD';

    const safeCurrency = SUPPORTED_CURRENCIES.has(
      String(activeCurrency).toUpperCase()
    )
      ? String(activeCurrency).toUpperCase()
      : 'CAD';
    const safeFormattedPrice =
      sanitizeText(formattedBasePrice, 40) || '$69.99 CAD';

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
- Support Email: getlumora.shop@gmail.com
- Never mention dropshipping or third-party suppliers. Keep responses helpful, concise (2–4 sentences unless more detail is requested), and formatting-clean.`;

    const contents = messages
      .slice(-20)
      .filter((m) => m && typeof m.text === 'string' && m.text.trim())
      .map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: sanitizeText(m.text, 1000) }],
      }))
      .filter((m) => m.parts[0].text.length > 0);

    if (contents.length === 0) {
      sendJson(res, 400, { error: 'Please enter a message.' });
      return;
    }

    const rawApiKey = process.env.GEMINI_API_KEY || '';
    const apiKey = rawApiKey.replace(/^["']+|["']+$/g, '').trim();

    if (
      !apiKey ||
      apiKey === 'MY_GEMINI_API_KEY' ||
      apiKey === 'YOUR_GEMINI_API_KEY'
    ) {
      sendJson(res, 503, {
        error:
          'Lumora Concierge is temporarily unavailable. Please ensure GEMINI_API_KEY is configured in your environment variables.',
      });
      return;
    }

    // Do NOT set httpOptions.timeout < 10000 because generativelanguage.googleapis.com
    // rejects X-Server-Timeout < 10s with HTTP 400 ("Manually set deadline 8s is too short. Minimum allowed deadline is 10s.")
    const ai = new GoogleGenAI({
      apiKey,
    });

    const candidateModels = ['gemini-2.5-flash', 'gemini-3.8-flash'];
    let responseText = '';
    let modelUsed = candidateModels[0];
    let lastError: unknown = null;

    for (const candidateModel of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: candidateModel,
          contents,
          config: {
            systemInstruction,
            temperature: 0.7,
            abortSignal: AbortSignal.timeout(8500),
          },
        });
        if (response.text) {
          responseText = response.text;
          modelUsed = candidateModel;
          break;
        }
      } catch (err) {
        lastError = err;
        console.error(`Gemini model ${candidateModel} error:`, err);
      }
    }

    if (!responseText && lastError) {
      throw lastError;
    }

    sendJson(res, 200, {
      reply:
        responseText ||
        'I can help you explore the Lumora Smart Sunset Lamp, our combo deals, or room lighting setups. What would you like to know?',
      modelUsed,
    });
  } catch (err) {
    console.error('POST /api/chat failed:', err);
    sendJson(res, 500, {
      error: 'Unable to reach Lumora Concierge right now.',
    });
  }
}
