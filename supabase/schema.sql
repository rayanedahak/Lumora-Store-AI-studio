-- Lumora Storefront Supabase Schema & Hardened Row Level Security (RLS) Policies
-- All sensitive reads/writes are performed server-side via service_role

-- 1. ORDERS TABLE (Populated exclusively by verified Stripe checkout.session.completed Webhook)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent TEXT,
  product_id TEXT DEFAULT 'prod_VLtDinkBV0UZuj',
  price_id TEXT DEFAULT 'price_1ULBQdPzs1n7hRq0Si8tfLnL',
  cj_variant_id TEXT DEFAULT 'CJSN112543541OL',
  cj_order_id TEXT,
  cj_fulfillment_status TEXT DEFAULT 'pending',
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  customer_phone TEXT,
  shipping_address JSONB,
  quantity INTEGER NOT NULL DEFAULT 1,
  amount_total NUMERIC(10, 2) NOT NULL DEFAULT 69.99,
  currency TEXT NOT NULL DEFAULT 'cad',
  payment_status TEXT NOT NULL DEFAULT 'paid',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. CONTACT SUBMISSIONS TABLE (Synced with Tally & Contact Form)
CREATE TABLE IF NOT EXISTS public.contact_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT DEFAULT 'General Inquiry',
  message TEXT NOT NULL,
  tally_synced BOOLEAN DEFAULT false,
  tally_submission_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. NEWSLETTER SUBSCRIBERS TABLE (Footer 10% Off Signup)
CREATE TABLE IF NOT EXISTS public.newsletter_subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  discount_code TEXT DEFAULT 'LUMORA10',
  source TEXT DEFAULT 'footer_newsletter',
  subscribed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ENABLE ROW LEVEL SECURITY (RLS) ON ALL TABLES
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_subscribers ENABLE ROW LEVEL SECURITY;

-- REMOVE ANY PUBLIC/ANON POLICIES ON ORDERS TO PREVENT UNAUTHENTICATED READS OR WRITES
DROP POLICY IF EXISTS "Public can insert orders via checkout" ON public.orders;
DROP POLICY IF EXISTS "Public can read own order" ON public.orders;

-- RLS POLICIES FOR ORDERS (Strictly service_role only)
DROP POLICY IF EXISTS "Service role can manage all orders" ON public.orders;
CREATE POLICY "Service role can manage all orders"
  ON public.orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS POLICIES FOR CONTACT SUBMISSIONS (No public SELECT allowed; service_role manages all)
DROP POLICY IF EXISTS "Public can submit contact form" ON public.contact_submissions;
DROP POLICY IF EXISTS "Service role full access to contact_submissions" ON public.contact_submissions;
CREATE POLICY "Service role full access to contact_submissions"
  ON public.contact_submissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS POLICIES FOR NEWSLETTER SUBSCRIBERS (No public SELECT allowed; service_role manages all)
DROP POLICY IF EXISTS "Public can subscribe to newsletter" ON public.newsletter_subscribers;
DROP POLICY IF EXISTS "Service role full access to newsletter_subscribers" ON public.newsletter_subscribers;
CREATE POLICY "Service role full access to newsletter_subscribers"
  ON public.newsletter_subscribers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
