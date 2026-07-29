import { describe, expect, it } from "vitest";
import {
  allowedAppOrigin,
  isAllowedAppUrl,
} from "../../supabase/functions/_shared/allowed-app-origin";

describe("application redirect allowlist", () => {
  it("accepts only exact approved origins", () => {
    expect(isAllowedAppUrl("https://eclipserblx.com/auth/discord/callback")).toBe(true);
    expect(isAllowedAppUrl("https://www.eclipserblx.com/account")).toBe(true);
    expect(isAllowedAppUrl("https://eclipserblx.lovable.app/account")).toBe(true);
    expect(isAllowedAppUrl("http://localhost:5173/auth/roblox/callback")).toBe(true);
  });

  it("rejects prefix, user-info and unrelated Lovable host bypasses", () => {
    expect(isAllowedAppUrl("https://eclipserblx.com.evil.example/callback")).toBe(false);
    expect(isAllowedAppUrl("https://eclipserblx.com@evil.example/callback")).toBe(false);
    expect(isAllowedAppUrl("https://attacker.lovable.app/callback")).toBe(false);
    expect(isAllowedAppUrl("javascript:alert(1)")).toBe(false);
  });

  it("returns a normalized safe origin for payment redirects", () => {
    expect(allowedAppOrigin("https://eclipserblx.com/seller/settings")).toBe(
      "https://eclipserblx.com",
    );
    expect(allowedAppOrigin("https://eclipserblx.com.evil.example")).toBe(
      "https://eclipserblx.com",
    );
  });
});
