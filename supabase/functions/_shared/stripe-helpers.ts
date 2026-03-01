import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

// Eclipse+ discount constants - must match frontend
export const BOT_CATEGORY_ID = "852838dc-adb6-4154-93fe-d1814fe46263";
export const ECLIPSE_SAVERS_CATEGORY_ID = "26463de5-38f4-4203-a379-78f6f92be3c7";
export const ECLIPSE_PLUS_DISCOUNT = 30;
export const ECLIPSE_PLUS_BOT_DISCOUNT = 35;

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

export function isEligibleForDiscount(
  categoryId: string | null | undefined,
  isResellable: boolean | null | undefined,
  storeEclipseEnabled?: boolean
): boolean {
  if (storeEclipseEnabled === false) return false;
  if (isResellable) return false;
  return categoryId !== ECLIPSE_SAVERS_CATEGORY_ID;
}

export function calculateMemberPrice(
  originalPrice: number,
  categoryId: string | null | undefined,
  isResellable: boolean | null | undefined,
  storeEclipseEnabled?: boolean
): number {
  if (!isEligibleForDiscount(categoryId, isResellable, storeEclipseEnabled)) {
    return originalPrice;
  }
  if (categoryId === BOT_CATEGORY_ID) {
    return originalPrice * (1 - ECLIPSE_PLUS_BOT_DISCOUNT / 100);
  }
  return originalPrice * (1 - ECLIPSE_PLUS_DISCOUNT / 100);
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
