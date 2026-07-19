import { describe, it, expect } from 'vitest';

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
