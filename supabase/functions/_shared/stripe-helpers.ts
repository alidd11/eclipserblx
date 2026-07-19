import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export function createStripeClient(): Stripe {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
  return new Stripe(key, { apiVersion: "2023-10-16" });
}

export function createAdminSupabase(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );
}

export async function getOrCreateStripeCustomer(
  stripe: Stripe,
  email: string,
  createIfMissing: boolean
): Promise<string | undefined> {
  const customers = await stripe.customers.list({ email, limit: 1 });
  if (customers.data.length > 0) return customers.data[0].id;
  if (createIfMissing) {
    const customer = await stripe.customers.create({ email });
    return customer.id;
  }
  return undefined;
}

export async function authenticateUser(
  supabase: SupabaseClient,
  req: Request
): Promise<{ userId: string | null; email: string | null }> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return { userId: null, email: null };

  const token = authHeader.replace("Bearer ", "");
  const { data } = await supabase.auth.getUser(token);
  return {
    userId: data.user?.id || null,
    email: data.user?.email || null,
  };
}

export function logStep(prefix: string, step: string, details?: unknown) {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${prefix}] ${step}${detailsStr}`);
}
