import { describe, expect, it } from "vitest";
import {
  buildSitemap,
  escapeXml,
} from "../../supabase/functions/dynamic-sitemap/sitemap";

describe("dynamic sitemap", () => {
  it("emits canonical product and store URLs with valid XML escaping", () => {
    const xml = buildSitemap({
      generatedAt: new Date("2026-07-26T12:00:00.000Z"),
      products: [
        {
          product_number: 57,
          created_at: "2026-07-20T09:30:00.000Z",
          updated_at: "2026-07-25T14:15:00.000Z",
        },
      ],
      stores: [
        {
          slug: "builder & sons",
          updated_at: "2026-07-24T08:00:00.000Z",
        },
      ],
      categories: [{
        slug: "maps & models",
        updated_at: "2026-07-23T10:00:00.000Z",
      }],
    });

    expect(xml).toContain("<loc>https://eclipserblx.com/products/57</loc>");
    expect(xml).not.toContain("share.eclipserblx.com");
    expect(xml).toContain("<lastmod>2026-07-25</lastmod>");
    expect(xml).toContain(
      "<loc>https://eclipserblx.com/store/builder%20%26%20sons</loc>",
    );
    expect(xml).toContain(
      "<loc>https://eclipserblx.com/products?category=maps%20%26%20models</loc>",
    );
    expect(xml).toContain("<lastmod>2026-07-23</lastmod>");
    expect(xml).not.toMatch(
      /<loc>https:\/\/eclipserblx\.com\/<\/loc>\s*<lastmod>/,
    );
  });

  it("skips malformed dynamic records rather than emitting broken URLs", () => {
    const xml = buildSitemap({
      generatedAt: new Date("2026-07-26T12:00:00.000Z"),
      products: [
        { product_number: null },
        { product_number: "NaN" },
        { product_number: "123" },
      ],
      stores: [{ slug: null }, { slug: "valid-store" }],
      categories: [{ slug: null }],
    });

    expect(xml).toContain("/products/123");
    expect(xml).not.toContain("/products/NaN");
    expect(xml).toContain("/store/valid-store");
  });

  it("escapes all XML-sensitive characters", () => {
    expect(escapeXml(`<tag a="b">'&`)).toBe(
      "&lt;tag a=&quot;b&quot;&gt;&apos;&amp;",
    );
  });
});
