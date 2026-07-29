import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("payout and refund hardening", () => {
  it("keeps financial mutation helpers backend-only", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260726030000_payment_fulfillment_hardening.sql",
    );

    for (const functionName of [
      "increment_seller_pending_balance",
      "add_credits",
      "spend_credits",
      "fulfill_credits_idempotent",
      "increment_ad_ping_balance",
      "cleanup_old_webhook_events",
    ]) {
      expect(migration).toContain(
        `REVOKE ALL ON FUNCTION public.${functionName}`,
      );
    }
  });

  it("uses stable provider idempotency keys for every automated payout rail", () => {
    const source = readProjectFile(
      "supabase/functions/auto-process-seller-payouts/index.ts",
    );

    expect(source).toContain(
      "{ idempotencyKey: `seller-payout-${payoutId}` }",
    );
    expect(source).toContain("customerTransactionId: payoutId");
    expect(source).toContain(
      "sender_batch_id: `eclipse-payout-${payoutId}`",
    );
    expect(source).toContain("await releasePayoutLock(supabase, payoutId, runId)");
    expect(source).not.toContain(
      "customerTransactionId: `auto-payout-${payoutId}-${Date.now()}`",
    );
  });

  it("reserves and finalizes affiliate payouts through transaction-safe RPCs", () => {
    const source = readProjectFile(
      "supabase/functions/request-affiliate-payout/index.ts",
    );
    const staffProcessor = readProjectFile(
      "supabase/functions/process-affiliate-payout/index.ts",
    );

    expect(source).toContain("'reserve_affiliate_payout'");
    expect(source).toContain("'complete_affiliate_payout'");
    expect(source).toContain("'release_affiliate_payout'");
    expect(source).toContain(
      "{ idempotencyKey: `affiliate-payout-${payoutId}` }",
    );
    expect(staffProcessor).toContain(".select('id')");
    expect(staffProcessor).not.toContain(".select('total_paid')");

    const adminPage = readProjectFile("src/pages/admin/Affiliates.tsx");
    expect(adminPage).toContain(".eq('status', 'pending')");
    expect(adminPage).not.toContain(
      "available_balance: currentBalance.available_balance + payout.amount",
    );
  });

  it("applies cumulative refund deltas under database row locks", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260726030001_harden_payouts_and_partial_refunds.sql",
    );
    const handler = readProjectFile(
      "supabase/functions/_shared/webhook-refund-handler.ts",
    );

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.apply_cumulative_order_refund",
    );
    expect(migration).toContain("FOR UPDATE;");
    expect(migration).toContain("v_delta := v_cumulative - v_previous;");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.apply_cumulative_order_refund",
    );
    expect(handler).toContain("'apply_cumulative_order_refund'");
    expect(handler).not.toContain(
      "supabase.rpc('reverse_seller_earnings'",
    );
    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.release_escrow_funds",
    );
    expect(migration).toContain(
      "COALESCE(net_amount, 0) - COALESCE(refunded_amount, 0)",
    );
    expect(migration).toContain("FOR UPDATE SKIP LOCKED");
    expect(migration).toContain(
      "WHEN v_transaction.escrow_released_at IS NULL",
    );
  });

  it("settles asynchronous Wise payouts atomically at a terminal state", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260726030001_harden_payouts_and_partial_refunds.sql",
    );
    const webhook = readProjectFile(
      "supabase/functions/wise-webhook/index.ts",
    );

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.settle_seller_payout",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.settle_seller_payout",
    );
    expect(migration).toContain("IF p_status = 'completed' THEN");
    expect(webhook).toContain("'settle_seller_payout'");
    expect(webhook).not.toContain("supabase.rpc('increment_total_paid'");
    expect(webhook).not.toContain("supabase.rpc('decrement_available_balance'");
    expect(webhook).toContain("RSASSA-PKCS1-v1_5");
    expect(webhook).toContain("WISE_WEBHOOK_PUBLIC_KEY");
    expect(webhook).not.toContain("createHmac");
  });

  it("keeps seller payout creation behind its validated atomic RPC", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260726030001_harden_payouts_and_partial_refunds.sql",
    );

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.request_seller_payout",
    );
    expect(migration).toContain("p_amount = 'NaN'::numeric");
    expect(migration).toContain(
      "status IN ('pending', 'processing', 'awaiting_funds')",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.request_seller_payout",
    );
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.claim_payout_for_processing",
    );
  });
});

describe("password reset hardening", () => {
  it("consumes reset codes atomically and removes public RPC execution", () => {
    const migration = readProjectFile(
      "supabase/migrations/20260728122506_harden_password_reset_atomicity.sql",
    );
    const edgeFunction = readProjectFile(
      "supabase/functions/custom-password-reset/index.ts",
    );

    expect(migration).toContain(
      "CREATE OR REPLACE FUNCTION public.consume_password_reset_code",
    );
    expect(migration).toContain("FOR UPDATE");
    expect(migration).toContain(
      "REVOKE ALL ON FUNCTION public.verify_password_reset_code",
    );
    expect(migration).toContain(
      "GRANT EXECUTE ON FUNCTION public.consume_password_reset_code",
    );
    expect(edgeFunction).toContain("'consume_password_reset_code'");
    expect(edgeFunction).not.toContain("'verify_password_reset_code'");
    expect(edgeFunction).not.toContain("'increment_reset_code_attempts'");
  });
});
