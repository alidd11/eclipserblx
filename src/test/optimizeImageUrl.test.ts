import { describe, it, expect } from "vitest";
import { optimizeImageUrl } from "@/utils/optimizeImageUrl";

describe("optimizeImageUrl", () => {
  it("returns empty string for null/undefined", () => {
    expect(optimizeImageUrl(null, 200)).toBe("");
    expect(optimizeImageUrl(undefined, 200)).toBe("");
  });

  it("returns original URL for non-Supabase images", () => {
    const url = "https://example.com/image.png";
    expect(optimizeImageUrl(url, 200)).toBe(url);
  });

  it("transforms Supabase storage URL to render endpoint", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 200);
    expect(result).toContain("/storage/v1/render/image/public/");
    expect(result).not.toContain("/storage/v1/object/public/");
  });

  it("applies 2x width for retina", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 150);
    expect(result).toContain("width=300");
  });

  it("applies height when provided", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 150, 100);
    expect(result).toContain("height=200");
  });

  it("defaults to cover resize", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 150);
    expect(result).toContain("resize=cover");
  });

  it("respects custom resize mode", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 150, undefined, "contain");
    expect(result).toContain("resize=contain");
  });

  it("sets quality to 80", () => {
    const url = "https://abc.supabase.co/storage/v1/object/public/images/photo.jpg";
    const result = optimizeImageUrl(url, 150);
    expect(result).toContain("quality=80");
  });
});
