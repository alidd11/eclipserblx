import { describe, it, expect } from 'vitest';

// Test cart item price calculation logic (extracted from cart context)
interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity?: number;
  custom_price?: number;
  is_pwyw?: boolean;
}

function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => {
    const price = item.is_pwyw && item.custom_price !== undefined ? item.custom_price : item.price;
    const qty = item.quantity || 1;
    return sum + price * qty;
  }, 0);
}

function isInCart(items: CartItem[], id: string): boolean {
  return items.some(item => item.id === id);
}

function addItem(items: CartItem[], newItem: CartItem): CartItem[] {
  if (items.some(i => i.id === newItem.id)) return items;
  return [...items, newItem];
}

function removeItem(items: CartItem[], id: string): CartItem[] {
  return items.filter(i => i.id !== id);
}

describe('Cart Logic', () => {
  const sampleItems: CartItem[] = [
    { id: '1', name: 'Product A', price: 5.99 },
    { id: '2', name: 'Product B', price: 12.50 },
  ];

  describe('calculateCartTotal', () => {
    it('sums prices correctly', () => {
      expect(calculateCartTotal(sampleItems)).toBeCloseTo(18.49);
    });

    it('returns 0 for empty cart', () => {
      expect(calculateCartTotal([])).toBe(0);
    });

    it('handles quantity > 1', () => {
      const items: CartItem[] = [{ id: '1', name: 'Bundle', price: 10, quantity: 3 }];
      expect(calculateCartTotal(items)).toBe(30);
    });

    it('uses custom_price for PWYW items', () => {
      const items: CartItem[] = [{ id: '1', name: 'PWYW', price: 5, is_pwyw: true, custom_price: 15 }];
      expect(calculateCartTotal(items)).toBe(15);
    });

    it('falls back to price when PWYW has no custom_price', () => {
      const items: CartItem[] = [{ id: '1', name: 'PWYW', price: 5, is_pwyw: true }];
      expect(calculateCartTotal(items)).toBe(5);
    });
  });

  describe('isInCart', () => {
    it('finds existing items', () => {
      expect(isInCart(sampleItems, '1')).toBe(true);
    });

    it('returns false for missing items', () => {
      expect(isInCart(sampleItems, '999')).toBe(false);
    });
  });

  describe('addItem', () => {
    it('adds a new item', () => {
      const newItem: CartItem = { id: '3', name: 'New', price: 7 };
      const result = addItem(sampleItems, newItem);
      expect(result).toHaveLength(3);
      expect(result[2].id).toBe('3');
    });

    it('prevents duplicates', () => {
      const dupe: CartItem = { id: '1', name: 'Product A', price: 5.99 };
      const result = addItem(sampleItems, dupe);
      expect(result).toHaveLength(2);
    });
  });

  describe('removeItem', () => {
    it('removes an item by id', () => {
      const result = removeItem(sampleItems, '1');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('2');
    });

    it('returns same array when id not found', () => {
      const result = removeItem(sampleItems, '999');
      expect(result).toHaveLength(2);
    });
  });
});
