import { describe, it, expect, beforeEach } from "vitest";
import { safeStorage, safeSessionStorage } from "@/lib/safeStorage";

describe("safeStorage (localStorage wrapper)", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("sets and gets items", () => {
    safeStorage.setItem("key", "value");
    expect(safeStorage.getItem("key")).toBe("value");
  });

  it("returns null for missing keys", () => {
    expect(safeStorage.getItem("nonexistent")).toBeNull();
  });

  it("removes items", () => {
    safeStorage.setItem("key", "value");
    safeStorage.removeItem("key");
    expect(safeStorage.getItem("key")).toBeNull();
  });

  it("reports length", () => {
    safeStorage.setItem("a", "1");
    safeStorage.setItem("b", "2");
    expect(safeStorage.getLength()).toBe(2);
  });

  it("returns keys by index", () => {
    safeStorage.setItem("testkey", "val");
    const key = safeStorage.key(0);
    expect(key).toBeTruthy();
  });
});

describe("safeSessionStorage", () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it("sets and gets items", () => {
    safeSessionStorage.setItem("s-key", "s-value");
    expect(safeSessionStorage.getItem("s-key")).toBe("s-value");
  });

  it("returns null for missing keys", () => {
    expect(safeSessionStorage.getItem("nope")).toBeNull();
  });

  it("removes items", () => {
    safeSessionStorage.setItem("s-key", "s-value");
    safeSessionStorage.removeItem("s-key");
    expect(safeSessionStorage.getItem("s-key")).toBeNull();
  });
});
