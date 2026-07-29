import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

export interface StoredCheckoutItem {
  id: string;
  name: string;
  price: number;
  category_slug?: string;
}

export interface StoredCheckoutCart {
  id: string;
  user_id: string | null;
  customer_email: string | null;
  items: StoredCheckoutItem[];
  subtotal: number;
  total: number;
  discount_code_id: string | null;
  discount_amount: number;
  fulfilled_at?: string | null;
}

export async function storeCheckoutCart(
  supabase: SupabaseClient,
  input: {
    id: string;
    paymentIntentId: string;
    userId: string | null;
    customerEmail: string | null;
    items: StoredCheckoutItem[];
    subtotal: number;
    total: number;
    discountCodeId?: string | null;
    discountAmount?: number;
  },
): Promise<void> {
  const { error } = await supabase.from("payment_checkout_carts").insert({
    id: input.id,
    stripe_payment_intent_id: input.paymentIntentId,
    user_id: input.userId,
    customer_email: input.customerEmail,
    items: input.items,
    subtotal: input.subtotal,
    total: input.total,
    discount_code_id: input.discountCodeId || null,
    discount_amount: input.discountAmount || 0,
  });
  if (error) throw new Error(`Failed to persist checkout cart: ${error.message}`);
}

export async function loadCheckoutCart(
  supabase: SupabaseClient,
  cartReference: string | null | undefined,
  paymentIntentId?: string | null,
): Promise<StoredCheckoutCart | null> {
  if (!cartReference) return null;
  let query = supabase
    .from("payment_checkout_carts")
    .select("id, user_id, customer_email, items, subtotal, total, discount_code_id, discount_amount, fulfilled_at")
    .eq("id", cartReference);
  if (paymentIntentId) query = query.eq("stripe_payment_intent_id", paymentIntentId);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(`Failed to load checkout cart: ${error.message}`);
  return data as StoredCheckoutCart | null;
}
