import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface AccessibleStore {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  role: 'owner' | 'manager' | 'editor' | 'viewer';
}

export function useStoreAccess() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['store-access', user?.id],
    queryFn: async (): Promise<AccessibleStore[]> => {
      if (!user?.id) return [];

      // Fetch owned stores and team stores in parallel
      const [{ data: owned }, { data: teamMembers }] = await Promise.all([
        supabase
          .from('stores')
          .select('id, name, slug, logo_url')
          .eq('owner_id', user.id)
          .eq('status', 'approved')
          .order('created_at', { ascending: true }),
        supabase
          .from('store_team_members')
          .select('store_id, role, stores:store_id(id, name, slug, logo_url)')
          .eq('user_id', user.id)
          .not('accepted_at', 'is', null),
      ]);

      const stores: AccessibleStore[] = [];

      // Add owned stores
      if (owned) {
        for (const s of owned) {
          stores.push({ id: s.id, name: s.name, slug: s.slug, logo_url: s.logo_url, role: 'owner' });
        }
      }

      // Add team stores (avoid duplicates)
      if (teamMembers) {
        const ownedIds = new Set(stores.map(s => s.id));
        for (const tm of teamMembers) {
          const store = tm.stores as unknown as { id: string; name: string; slug: string; logo_url: string | null } | null;
          if (store && !ownedIds.has(store.id)) {
            stores.push({
              id: store.id,
              name: store.name,
              slug: store.slug,
              logo_url: store.logo_url,
              role: tm.role as 'manager' | 'editor' | 'viewer',
            });
          }
        }
      }

      return stores;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });
}
