import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';

export const useStoreFollow = (storeId: string | undefined) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: isFollowing, isLoading } = useQuery({
    queryKey: ['store-follow', storeId, user?.id],
    queryFn: async () => {
      if (!user?.id || !storeId) return false;
      
      const { data, error } = await supabase
        .from('store_follows')
        .select('id')
        .eq('user_id', user.id)
        .eq('store_id', storeId)
        .maybeSingle();
      
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id && !!storeId,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !storeId) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('store_follows')
        .insert({
          user_id: user.id,
          store_id: storeId,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-follow', storeId] });
      queryClient.invalidateQueries({ queryKey: ['public-store', storeId] });
      queryClient.invalidateQueries({ queryKey: ['following-stores'] });
      toast.success('Now following this store!');
    },
    onError: (error: any) => {
      console.error('Follow error:', error);
      toast.error('Failed to follow store');
    },
  });

  const unfollowMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !storeId) throw new Error('Must be logged in');
      
      const { error } = await supabase
        .from('store_follows')
        .delete()
        .eq('user_id', user.id)
        .eq('store_id', storeId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-follow', storeId] });
      queryClient.invalidateQueries({ queryKey: ['public-store', storeId] });
      queryClient.invalidateQueries({ queryKey: ['following-stores'] });
      toast.success('Unfollowed store');
    },
    onError: (error: any) => {
      console.error('Unfollow error:', error);
      toast.error('Failed to unfollow store');
    },
  });

  const toggleFollow = () => {
    if (!user) {
      toast.error('Please sign in to follow stores');
      return;
    }
    
    if (isFollowing) {
      unfollowMutation.mutate();
    } else {
      followMutation.mutate();
    }
  };

  return {
    isFollowing: isFollowing ?? false,
    isLoading,
    toggleFollow,
    isToggling: followMutation.isPending || unfollowMutation.isPending,
  };
};

export const useFollowingStores = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['following-stores', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('store_follows')
        .select(`
          id,
          created_at,
          notify_new_products,
          notify_discounts,
          stores (
            id,
            name,
            slug,
            logo_url,
            description,
            is_verified,
            product_count,
            follower_count
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });
};
