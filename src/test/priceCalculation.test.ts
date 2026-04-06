import { describe, it, expect } from 'vitest';

// Test the Eclipse member discount logic from create-payment-intent
const ECLIPSE_SAVERS_CATEGORY_ID = '26463de5-38f4-4203-a379-78f6f92be3c7';

function calculateMemberPrice(
  originalPrice: number,
  categoryId: string | null,
  isResellable: boolean,
  storeEclipseEnabled?: boolean
): number {
  // Eclipse Savers category gets 15% off
  if (categoryId === ECLIPSE_SAVERS_CATEGORY_ID) {
    return Math.round(originalPrice * 0.85 * 100) / 100;
  }
  // Resellable items get 10% off
  if (isResellable) {
    return Math.round(originalPrice * 0.90 * 100) / 100;
  }
  // Store-enabled eclipse discount: 5% off
  if (storeEclipseEnabled) {
    return Math.round(originalPrice * 0.95 * 100) / 100;
  }
  return originalPrice;
}

describe('Member Price Calculation', () => {
  it('applies 15% discount for Eclipse Savers category', () => {
    expect(calculateMemberPrice(10, ECLIPSE_SAVERS_CATEGORY_ID, false)).toBeCloseTo(8.5);
  });

  it('applies 10% discount for resellable items', () => {
    expect(calculateMemberPrice(20, 'other-cat', true)).toBeCloseTo(18);
  });

  it('applies 5% discount for store-enabled eclipse', () => {
    expect(calculateMemberPrice(100, 'other-cat', false, true)).toBeCloseTo(95);
  });

  it('returns original price with no discount conditions', () => {
    expect(calculateMemberPrice(50, 'other-cat', false, false)).toBe(50);
  });

  it('prioritizes category discount over resellable', () => {
    // category check comes first in the logic
    expect(calculateMemberPrice(10, ECLIPSE_SAVERS_CATEGORY_ID, true)).toBeCloseTo(8.5);
  });

  it('handles zero price', () => {
    expect(calculateMemberPrice(0, ECLIPSE_SAVERS_CATEGORY_ID, false)).toBe(0);
  });

  it('rounds to 2 decimal places', () => {
    expect(calculateMemberPrice(9.99, ECLIPSE_SAVERS_CATEGORY_ID, false)).toBeCloseTo(8.49);
  });
});

describe('Discount Code Calculation', () => {
  function applyDiscount(subtotal: number, discountType: 'percentage' | 'fixed', discountValue: number): number {
    if (discountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    }
    return Math.min(discountValue, subtotal);
  }

  it('applies percentage discount', () => {
    expect(applyDiscount(100, 'percentage', 10)).toBe(10);
  });

  it('applies fixed discount', () => {
    expect(applyDiscount(100, 'fixed', 15)).toBe(15);
  });

  it('caps fixed discount at subtotal', () => {
    expect(applyDiscount(5, 'fixed', 15)).toBe(5);
  });

  it('handles 100% discount', () => {
    expect(applyDiscount(50, 'percentage', 100)).toBe(50);
  });
});
