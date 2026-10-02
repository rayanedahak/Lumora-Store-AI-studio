import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Public Supabase URL and Publishable Key (read strictly from environment variables)
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

export const SUPABASE_URL = rawSupabaseUrl.replace(/\/rest\/v1\/?$/, '');

export const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

export const supabase: SupabaseClient | null =
  SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY
    ? createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: false,
        },
      })
    : null;

export interface OrderRecord {
  id?: string;
  stripe_session_id: string;
  stripe_payment_intent?: string | null;
  product_id?: string;
  price_id?: string;
  cj_variant_id?: string;
  cj_order_id?: string | null;
  cj_fulfillment_status?: string;
  customer_name: string;
  customer_email?: string;
  customer_phone?: string;
  shipping_address: {
    line1?: string;
    line2?: string;
    city: string;
    state?: string;
    postal_code?: string;
    country: string;
  };
  quantity: number;
  amount_total: number;
  currency: string;
  payment_status: string;
  created_at?: string;
}

export interface ContactSubmissionRecord {
  id?: string;
  name: string;
  email: string;
  subject?: string;
  message: string;
  tally_synced?: boolean;
  tally_submission_id?: string | null;
  created_at?: string;
}

export interface NewsletterSubscriberRecord {
  id?: string;
  email: string;
  discount_code?: string;
  source?: string;
  subscribed_at?: string;
}
