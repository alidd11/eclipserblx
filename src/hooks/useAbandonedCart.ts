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

  // Save cart state to DB after inactivity.
  // NOTE: abandoned_carts has no unique constraint on user_id (rows are kept
  // for history — one active + N recovered), so we intentionally avoid upsert
  // with onConflict:'user_id' (that would 400). Instead: look up the active
  // row for this user and UPDATE it, or INSERT a new one.
  useEffect(() => {
    if (!user || items.length === 0) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

    saveTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          items: items as any,
          total,
          updated_at: new Date().toISOString(),
        };

        const { data: existing, error: selectError } = await supabase
          .from('abandoned_carts')
          .select('id')
          .eq('user_id', user.id)
          .eq('recovered', false)
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (selectError) return;

        if (existing?.id) {
          await supabase
            .from('abandoned_carts')
            .update(payload)
            .eq('id', existing.id);
        } else {
          await supabase
            .from('abandoned_carts')
            .insert({ user_id: user.id, recovered: false, ...payload });
        }
      } catch {
        // Non-blocking: abandoned-cart persistence must never surface console noise.
      }
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
