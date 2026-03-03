import { describe, it, expect } from "vitest";
import { CURRENCIES, CurrencyCode } from "@/hooks/useCurrency";

describe("Currency constants", () => {
  it("defines GBP, USD, EUR", () => {
    const codes: CurrencyCode[] = ["GBP", "USD", "EUR"];
    codes.forEach((code) => {
      expect(CURRENCIES[code]).toBeDefined();
      expect(CURRENCIES[code].symbol).toBeTruthy();
      expect(CURRENCIES[code].locale).toBeTruthy();
    });
  });

  it("GBP uses £ symbol", () => {
    expect(CURRENCIES.GBP.symbol).toBe("£");
  });

  it("USD uses $ symbol", () => {
    expect(CURRENCIES.USD.symbol).toBe("$");
  });

  it("EUR uses € symbol", () => {
    expect(CURRENCIES.EUR.symbol).toBe("€");
  });
});
