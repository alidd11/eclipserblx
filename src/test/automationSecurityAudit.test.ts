import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const readProjectFile = (relativePath: string) =>
  readFileSync(resolve(process.cwd(), relativePath), "utf8");

describe("automation security hardening", () => {
  it("keeps the service-role transactional email sender staff-only", () => {
    const source = readProjectFile(
      "supabase/functions/send-transactional-email/index.ts",
    );

    expect(source).toContain("import { requireStaff }");
    expect(source).toContain("await requireStaff(req, corsHeaders)");
    expect(source).toContain("body.recipient_email || body.to");
    expect(source).toContain('const SITE_NAME = "Eclipse"');
    expect(source).not.toContain("No in-function auth check is needed");
  });

  it("restricts internal fan-out notifications while allowing real admin calls", () => {
    const contactSource = readProjectFile(
      "supabase/functions/notify-new-contact-message/index.ts",
    );
    const documentSource = readProjectFile(
      "supabase/functions/notify-seller-document/index.ts",
    );

    expect(contactSource).toContain("requireServiceRole(req, corsHeaders)");
    expect(documentSource).toContain("await requireAdmin(req, corsHeaders)");
  });

  it("authorizes seller review notifications by database ownership and deduplicates them", () => {
    const source = readProjectFile(
      "supabase/functions/notify-seller-review/index.ts",
    );

    expect(source).toContain("await requireAuth(req, corsHeaders)");
    expect(source).toContain('select("id, name, stores!inner(owner_id)")');
    expect(source).toContain('auth.user.id !== storeOwnerId');
    expect(source).toContain('.is("file_review_requested_at", null)');
    expect(source).toContain("duplicate: true");
    expect(source).not.toContain(
      "const { productId, productName, storeOwnerId, flagReasons }",
    );
  });

  it("does not release a payout after a provider request with an unknown outcome", () => {
    const source = readProjectFile(
      "supabase/functions/request-affiliate-payout/index.ts",
    );

    expect(source).toContain("providerRequestStarted = true");
    expect(source).toContain("isDefinitiveStripeRejection");
    expect(source).toContain(
      "!providerRequestStarted || definitelyRejected",
    );
    expect(source).toContain("outcomeUnknown");
  });

  it("uses the public Eclipse domain in ticket emails", () => {
    const template = readProjectFile(
      "supabase/functions/_shared/transactional-email-templates/ticket-reply.tsx",
    );
    const caller = readProjectFile(
      "src/pages/admin/CustomerTicketDetail.tsx",
    );

    expect(template).toContain("https://eclipserblx.com/support");
    expect(caller).toContain("https://eclipserblx.com/support/tickets/");
    expect(template).not.toContain("roleplay-hub-shop.lovable.app");
    expect(caller).not.toContain("roleplay-hub-shop.lovable.app");
  });

  it("binds bot activation to the authenticated purchaser", () => {
    const source = readProjectFile(
      "supabase/functions/activate-bot-license/index.ts",
    );

    expect(source).toContain("await requireAuth(req, corsHeaders)");
    expect(source).toContain("const userId = auth.user.id");
    expect(source).not.toContain(
      "const { installationCodeId, userId, redirectUri } = body",
    );
    expect(source).toContain(
      'oauthUrl.searchParams.set("redirect_uri", `${supabaseUrl}/functions/v1/activate-bot-license`)',
    );
  });

  it("uses the exact application origin allowlist for remaining OAuth and Connect flows", () => {
    const affiliateConnect = readProjectFile(
      "supabase/functions/create-affiliate-connect-account/index.ts",
    );
    const robloxCallback = readProjectFile(
      "supabase/functions/roblox-link-callback/index.ts",
    );

    expect(affiliateConnect).toContain(
      'allowedAppOrigin(req.headers.get("origin"))',
    );
    expect(robloxCallback).toContain("isAllowedAppUrl(redirect_uri)");
  });
});
