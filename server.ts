import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import createCheckoutSessionHandler from './api/create-checkout-session.ts';
import stripeWebhookHandler from './api/webhooks/stripe.ts';
import verifySessionHandler from './api/orders/verify-session.ts';
import trackOrderHandler from './api/orders/track.ts';
import contactHandler from './api/contact.ts';
import newsletterHandler from './api/newsletter.ts';
import chatHandler from './api/chat.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Security headers middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // 1. Stripe Webhook Route (Preserves Raw Body Buffer for constructEvent)
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json', limit: '256kb' }),
    async (req, res) => {
      await stripeWebhookHandler(req, res);
    }
  );

  // Parse JSON for remaining API routes
  app.use(express.json({ limit: '32kb' }));

  // 2. Create Stripe Checkout Session
  app.post('/api/create-checkout-session', async (req, res) => {
    await createCheckoutSessionHandler(req, res);
  });

  // 3. Verify Paid Stripe Checkout Session
  app.post('/api/orders/verify-session', async (req, res) => {
    await verifySessionHandler(req, res);
  });

  // 4. Order Tracking Lookup (Supports both /api/orders/track/:orderId and /api/orders/track?orderId=...)
  app.get('/api/orders/track/:orderId', async (req, res) => {
    await trackOrderHandler(req, res);
  });
  app.get('/api/orders/track', async (req, res) => {
    await trackOrderHandler(req, res);
  });

  // 5. Contact Form -> Tally + Supabase
  app.post('/api/contact', async (req, res) => {
    await contactHandler(req, res);
  });

  // 6. Newsletter Signup -> Supabase
  app.post('/api/newsletter', async (req, res) => {
    await newsletterHandler(req, res);
  });

  // 7. Gemini Multi-Turn Concierge Chat
  app.post('/api/chat', async (req, res) => {
    await chatHandler(req, res);
  });

  // Catch-all for any unmatched /api/* route so it always returns JSON, never HTML
  app.all('/api/*', (_req, res) => {
    res.status(404).json({ error: 'API endpoint not found.' });
  });

  // Global JSON Error Handler (Never exposes HTML error pages or stack traces)
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

  // Vite Dev Middleware / Static Assets
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
    console.log(`Lumora Flagship Storefront running on port ${PORT}`);
  });
}

startServer();
