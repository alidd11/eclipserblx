import { describe, it, expect, vi, beforeEach } from "vitest";
import { exportToCSV } from "@/lib/export-csv";

describe("exportToCSV", () => {
  beforeEach(() => {
    // Mock URL.createObjectURL and URL.revokeObjectURL
    vi.stubGlobal("URL", {
      createObjectURL: vi.fn(() => "blob:mock"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("does nothing for empty data", () => {
    const clickSpy = vi.fn();
    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: clickSpy,
    } as any);

    exportToCSV([], "test");
    expect(clickSpy).not.toHaveBeenCalled();
  });

  it("creates CSV with correct headers", () => {
    let blobContent = "";
    vi.stubGlobal("Blob", class MockBlob {
      constructor(parts: string[]) { blobContent = parts.join(""); }
    });
    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: vi.fn(),
    } as any);

    exportToCSV([{ name: "Alice", age: 30 }], "users");
    expect(blobContent).toContain("name,age");
    expect(blobContent).toContain("Alice,30");
  });

  it("escapes commas and quotes in values", () => {
    let blobContent = "";
    vi.stubGlobal("Blob", class MockBlob {
      constructor(parts: string[]) { blobContent = parts.join(""); }
    });
    vi.spyOn(document, "createElement").mockReturnValue({
      set href(_: string) {},
      set download(_: string) {},
      click: vi.fn(),
    } as any);

    exportToCSV([{ note: 'has, comma and "quotes"' }], "test");
    expect(blobContent).toContain('"has, comma and ""quotes"""');
  });
});
