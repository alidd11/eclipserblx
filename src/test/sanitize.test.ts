import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize";

describe("sanitizeHtml", () => {
  it("strips script tags", () => {
    const result = sanitizeHtml('<p>Hello</p><script>alert("xss")</script>');
    expect(result).not.toContain("<script>");
    expect(result).toContain("Hello");
  });

  it("allows safe HTML tags", () => {
    const result = sanitizeHtml("<p><strong>Bold</strong> text</p>");
    expect(result).toContain("<strong>");
    expect(result).toContain("<p>");
  });

  it("handles empty input", () => {
    expect(sanitizeHtml("")).toBe("");
  });
});
