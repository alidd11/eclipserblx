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

  it("returns original Supabase URL without transformation", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 200);
    expect(result).toBe(url);
  });

  it("does not append query params", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 150, 100, "contain");
    expect(result).toBe(url);
  });
});

describe("getConnectionQuality", () => {
  it("returns high when no connection API", () => {
    expect(getConnectionQuality()).toBe("high");
  });
});
