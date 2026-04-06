import { supabase } from '@/integrations/supabase/client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type TwitterAction = 'like' | 'unlike' | 'retweet' | 'unretweet' | 'reply' | 'delete' | 'timeline' | 'mentions';

interface ActionParams {
  action: TwitterAction;
  tweet_id?: string;
  text?: string;
}

export function useTwitterAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: ActionParams) => {
      const { data, error } = await supabase.functions.invoke('twitter-actions', {
        body: params,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (_, variables) => {
      const labels: Record<string, string> = {
        like: 'Liked!', unlike: 'Unliked', retweet: 'Retweeted!', unretweet: 'Unretweeted',
        reply: 'Reply sent!', delete: 'Tweet deleted',
      };
      if (labels[variables.action]) toast.success(labels[variables.action]);
      queryClient.invalidateQueries({ queryKey: ['twitter-posts-feed'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-posts-history'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-scheduled-posts'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-mentions'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-timeline'] });
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Twitter action failed');
    },
  });
}

export function useTwitterTimeline() {
  return useQuery({
    queryKey: ['twitter-timeline'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('twitter-actions', {
        body: { action: 'timeline' },
      });
      if (error) throw error;
      return data?.data;
    },
    staleTime: 60_000,
  });
}

export function useTwitterMentions() {
  return useQuery({
    queryKey: ['twitter-mentions'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('twitter-actions', {
        body: { action: 'mentions' },
      });
      if (error) throw error;
      return data?.data;
    },
    staleTime: 60_000,
  });
}
