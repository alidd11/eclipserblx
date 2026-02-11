import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { safeStorage } from '@/lib/safeStorage';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  slug: string;
  category_slug?: string;
  category_id?: string; // Added for Eclipse+ discount eligibility
  is_resellable?: boolean;
  quantity?: number; // For bundle purchases (e.g., 3-pack of bot licenses)
  bundle_id?: string; // Reference to the bundle if applicable
  bundle_label?: string; // Human-readable bundle name (e.g., "3-Pack")
  store_eclipse_enabled?: boolean; // Whether store has Eclipse+ discounts enabled
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  isInCart: (id: string) => boolean;
  total: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'ukrp-cart';

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => {
    const saved = safeStorage.getItem(CART_STORAGE_KEY);
    if (!saved) return [];

    try {
      const parsed = JSON.parse(saved);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    safeStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  // One-time hydration for older carts that predate `is_resellable` / `category_id`.
  // Ensures Eclipse+ eligibility is computed correctly even for already-saved carts.
  const hasHydratedRef = useRef(false);
  useEffect(() => {
    if (hasHydratedRef.current) return;
    if (items.length === 0) {
      hasHydratedRef.current = true;
      return;
    }

    const needsHydration = items.some((i) => i.is_resellable === undefined || i.category_id === undefined);
    if (!needsHydration) {
      hasHydratedRef.current = true;
      return;
    }

    hasHydratedRef.current = true;
    const ids = Array.from(new Set(items.map((i) => i.id)));
    let cancelled = false;

    (async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, is_resellable, category_id')
        .in('id', ids);

      if (cancelled || error || !data) return;
      const productMap = new Map(data.map((p) => [p.id, p]));

      setItems((prev) =>
        prev.map((item) => {
          const product = productMap.get(item.id);
          if (!product) return item;
          return {
            ...item,
            category_id: item.category_id ?? (product as any).category_id ?? item.category_id,
            is_resellable:
              item.is_resellable ??
              Boolean((product as any).is_resellable),
          };
        })
      );
    })();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const addItem = (item: CartItem) => {
    setItems((prev) => {
      if (prev.some((i) => i.id === item.id)) {
        return prev;
      }
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCart = () => {
    setItems([]);
  };

  const isInCart = (id: string) => {
    return items.some((item) => item.id === id);
  };

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const itemCount = items.length;

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, clearCart, isInCart, total, itemCount }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
