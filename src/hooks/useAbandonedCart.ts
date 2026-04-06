import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuth } from './useAuth';
import { useCart } from './useCart';
import { supabase } from '@/integrations/supabase/client';

const ABANDONED_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

export function useAbandonedCart() {
  const { user } = useAuth();
  const { items, total } = useCart();
  const [recoveryCart, setRecoveryCart] = useState<any[] | null>(null);
  const [showRecoveryBanner, setShowRecoveryBanner] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>();

  // Save cart state to DB after inactivity
  useEffect(() => {
    if (!user || items.length === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      await supabase
        .from('abandoned_carts')
        .upsert({
          user_id: user.id,
          items: items as any,
          total,
          recovered: false,
          updated_at: new Date().toISOString(),
        }, { onConflict: 'user_id' })
        .select()
        .single()
        .then(({ error }) => {
          // Upsert may fail if no unique constraint on user_id alone; use insert+update pattern
          if (error) {
            // Fallback: delete old + insert new
            supabase.from('abandoned_carts')
              .delete()
              .eq('user_id', user.id)
              .eq('recovered', false)
              .then(() => {
                supabase.from('abandoned_carts').insert({
                  user_id: user.id,
                  items: items as any,
                  total,
                });
              });
          }
        });
    }, 5000); // Save after 5s of no cart changes

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [user, items, total]);

  // Check for abandoned cart on mount
  useEffect(() => {
    if (!user || items.length > 0) return;

    (async () => {
      const { data } = await supabase
        .from('abandoned_carts')
        .select('id, items, total, updated_at')
        .eq('user_id', user.id)
        .eq('recovered', false)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (data && Array.isArray(data.items) && (data.items as any[]).length > 0) {
        const updatedAt = new Date(data.updated_at).getTime();
        const age = Date.now() - updatedAt;
        
        if (age > ABANDONED_THRESHOLD_MS) {
          setRecoveryCart(data.items as any[]);
          setShowRecoveryBanner(true);
        }
      }
    })();
  }, [user, items.length]);

  const dismissRecovery = useCallback(() => {
    setShowRecoveryBanner(false);
    setRecoveryCart(null);
    
    if (user) {
      supabase.from('abandoned_carts')
        .update({ recovered: true, recovered_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('recovered', false);
    }
  }, [user]);

  const markRecovered = useCallback(async () => {
    if (user) {
      await supabase.from('abandoned_carts')
        .update({ recovered: true, recovered_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .eq('recovered', false);
    }
    setShowRecoveryBanner(false);
    setRecoveryCart(null);
  }, [user]);

  return {
    showRecoveryBanner,
    recoveryCart,
    dismissRecovery,
    markRecovered,
  };
}
