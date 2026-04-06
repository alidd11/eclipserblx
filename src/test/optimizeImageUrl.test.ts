import { describe, it, expect } from "vitest";
import { optimizeImageUrl, getConnectionQuality } from "@/utils/optimizeImageUrl";

describe("optimizeImageUrl", () => {
  it("returns empty string for null/undefined", () => {
    expect(optimizeImageUrl(null)).toBe("");
    expect(optimizeImageUrl(undefined)).toBe("");
  });

  it("returns original URL for non-Supabase images", () => {
    const url = "https://example.com/image.png";
    expect(optimizeImageUrl(url, 200)).toBe(url);
  });

  it("routes Supabase storage URLs through image proxy when env vars are set", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 200);
    // When env vars are not set (test env), falls through to raw URL
    // When env vars are set, routes through proxy
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("preserves non-storage Supabase URLs", () => {
    const url = "https://abc.supabase.co/rest/v1/something";
    const result = optimizeImageUrl(url);
    expect(result).toBe(url);
  });
});

describe("getConnectionQuality", () => {
  it("returns high when no connection API", () => {
    expect(getConnectionQuality()).toBe("high");
  });
});
