import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export function useWishlist(productId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Check if a specific product is in wishlist
  const { data: isInWishlist, isLoading: isCheckingWishlist } = useQuery({
    queryKey: ['wishlist-check', productId, user?.id],
    queryFn: async () => {
      if (!user?.id || !productId) return false;
      
      const { data, error } = await supabase
        .from('wishlist')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!productId,
  });

  const addToWishlist = useMutation({
    mutationFn: async (prodId: string) => {
      if (!user?.id) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('wishlist')
        .insert({ user_id: user.id, product_id: prodId });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
      toast.success('Added to wishlist');
    },
    onError: (error) => {
      console.error('Failed to add to wishlist:', error);
      toast.error('Failed to add to wishlist');
    },
  });

  const removeFromWishlist = useMutation({
    mutationFn: async (prodId: string) => {
      if (!user?.id) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('wishlist')
        .delete()
        .eq('user_id', user.id)
        .eq('product_id', prodId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      queryClient.invalidateQueries({ queryKey: ['wishlist-check'] });
      toast.success('Removed from wishlist');
    },
    onError: (error) => {
      console.error('Failed to remove from wishlist:', error);
      toast.error('Failed to remove from wishlist');
    },
  });

  const toggleWishlist = () => {
    if (!productId) return;
    if (isInWishlist) {
      removeFromWishlist.mutate(productId);
    } else {
      addToWishlist.mutate(productId);
    }
  };

  return {
    isInWishlist: isInWishlist ?? false,
    isLoading: isCheckingWishlist,
    toggleWishlist,
    isToggling: addToWishlist.isPending || removeFromWishlist.isPending,
    addToWishlist: addToWishlist.mutate,
    removeFromWishlist: removeFromWishlist.mutate,
  };
}

export function useWishlistItems() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['wishlist', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('wishlist')
        .select(`
          id,
          created_at,
          product_id,
          products (
            id,
            name,
            slug,
            price,
            images,
            description,
            is_active,
            store_id,
            stores (
              name,
              slug
            )
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
    staleTime: 30000,
  });
}
