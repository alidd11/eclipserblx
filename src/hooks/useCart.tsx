import { useState, useEffect, createContext, useContext, ReactNode, useRef, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { hapticTap } from '@/lib/haptics';
import { safeStorage } from '@/lib/safeStorage';
import { supabase } from '@/integrations/supabase/client';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  image?: string;
  slug: string;
  category_slug?: string;
  category_id?: string; // Used for discount eligibility
  is_resellable?: boolean;
  quantity?: number; // For bundle purchases (e.g., 3-pack of bot licenses)
  bundle_id?: string; // Reference to the bundle if applicable
  bundle_label?: string; // Human-readable bundle name (e.g., "3-Pack")
  store_name?: string; // Store name for transparency in cart/checkout
  is_pwyw?: boolean; // Pay What You Want product
  custom_price?: number; // Buyer-chosen price for PWYW products
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
  // Ensures discount eligibility is computed correctly even for already-saved carts.
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

  // Refs let addItem/removeItem reference each other's latest version
  // without stale closures, while keeping stable identities.
  const addItemRef = useRef<(item: CartItem) => void>(() => {});
  const removeItemRef = useRef<(id: string) => void>(() => {});

  // Cart entries are keyed by product id + optional bundle id, so the same
  // product added as both a single and a bundle stays distinct.
  const keyOf = (item: Pick<CartItem, 'id' | 'bundle_id'>) =>
    `${item.id}::${item.bundle_id ?? ''}`;

  const addItem = useCallback((item: CartItem) => {
    setItems((prev) => {
      const k = keyOf(item);
      if (prev.some((i) => keyOf(i) === k)) {
        return prev;
      }
      hapticTap();
      toast.success('Added to cart', {
        description: item.name,
        duration: 2000,
        action: {
          label: 'Undo',
          onClick: () => removeItemRef.current(item.id),
        },
      });
      return [...prev, item];
    });
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id);
      const next = prev.filter((i) => i.id !== id);
      if (item) {
        hapticTap();
        toast('Removed from cart', {
          description: item.name,
          duration: 2000,
          action: {
            label: 'Undo',
            onClick: () => addItemRef.current(item),
          },
        });
      }
      return next;
    });
  }, []);

  addItemRef.current = addItem;
  removeItemRef.current = removeItem;

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const isInCart = useCallback(
    (id: string) => items.some((item) => item.id === id),
    [items],
  );

  const value = useMemo<CartContextType>(() => {
    // Bundles store their full bundle price in `item.price`, so `quantity` is
    // display-only metadata and MUST NOT be multiplied here (would double-charge).
    // PWYW items use the buyer-chosen `custom_price` when present.
    const total = items.reduce(
      (sum, item) => sum + (item.is_pwyw ? (item.custom_price ?? item.price) : item.price),
      0,
    );
    return {
      items,
      addItem,
      removeItem,
      clearCart,
      isInCart,
      total,
      itemCount: items.length,
    };
  }, [items, addItem, removeItem, clearCart, isInCart]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
