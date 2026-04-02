import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarClock, Check, Clock, RefreshCw, X as XIcon } from 'lucide-react';

interface XTheme {
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  accent: string;
  trendBg: string;
  [key: string]: string;
}

interface TwitterScheduledPostsPanelProps {
  xTheme: XTheme;
  className?: string;
}

const statusStyles: Record<string, { label: string; className: string }> = {
  queued: { label: 'Approved', className: 'text-green-400' },
  draft: { label: 'Pending', className: 'text-yellow-400' },
  failed: { label: 'Failed', className: 'text-red-400' },
};

export function TwitterScheduledPostsPanel({ xTheme, className }: TwitterScheduledPostsPanelProps) {
  const queryClient = useQueryClient();

  const {
    data: scheduledPosts = [],
    isLoading,
    isFetching,
    error,
    refetch,
  } = useQuery({
    queryKey: ['twitter-scheduled-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twitter_posts')
        .select('id, content, status, scheduled_for, ai_generated, post_type, created_at')
        .in('status', ['queued', 'draft', 'failed'])
        .order('scheduled_for', { ascending: true })
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      return data ?? [];
    },
  });

  const refreshViews = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['twitter-scheduled-posts'] }),
      queryClient.invalidateQueries({ queryKey: ['twitter-posts-feed'] }),
      queryClient.invalidateQueries({ queryKey: ['twitter-posts-history'] }),
    ]);
  };

  const handleApprove = async (id: string) => {
    const { error } = await supabase.from('twitter_posts').update({ status: 'queued' }).eq('id', id);

    if (error) {
      toast.error(error.message || 'Failed to update post');
      return;
    }

    toast.success('Post approved and returned to the queue');
    await refreshViews();
  };

  const handleReject = async (id: string) => {
    const { error } = await supabase.from('twitter_posts').update({ status: 'cancelled' }).eq('id', id);

    if (error) {
      toast.error(error.message || 'Failed to update post');
      return;
    }

    toast.info('Scheduled post cancelled');
    await refreshViews();
  };

  return (
    <div className={`rounded-2xl ${xTheme.trendBg} overflow-hidden ${className ?? ''}`}>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <CalendarClock className={`h-5 w-5 ${xTheme.accent}`} />
          <h3 className={`text-xl font-extrabold ${xTheme.text}`}>Scheduled Posts</h3>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={`rounded-full p-2 ${xTheme.hover} transition-colors disabled:opacity-60`}
          aria-label="Refresh scheduled posts"
        >
          <RefreshCw className={`h-4 w-4 ${xTheme.textSecondary} ${isFetching ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {isLoading ? (
        <div className={`px-4 py-6 text-center text-[13px] ${xTheme.textSecondary}`}>Loading...</div>
      ) : error ? (
        <div className={`px-4 py-6 text-center text-[13px] ${xTheme.textSecondary}`}>
          {error instanceof Error ? error.message : 'Unable to load scheduled posts'}
        </div>
      ) : scheduledPosts.length === 0 ? (
        <div className={`px-4 py-6 text-center text-[13px] ${xTheme.textSecondary}`}>No scheduled posts</div>
      ) : (
        scheduledPosts.map((post) => {
          const scheduledDate = post.scheduled_for ? new Date(post.scheduled_for) : null;
          const timeLabel = scheduledDate
            ? scheduledDate.toLocaleString('en-GB', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Awaiting schedule';

          const statusMeta = statusStyles[post.status] ?? {
            label: post.status,
            className: xTheme.textSecondary,
          };

          const actionLabel = post.status === 'failed' ? 'Queue again' : 'Approve';

          return (
            <div key={post.id} className={`border-t ${xTheme.border} px-4 py-3 ${xTheme.hover} transition-colors`}>
              <div className="mb-1 flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 min-w-0">
                  <Clock className={`h-3 w-3 shrink-0 ${xTheme.textSecondary}`} />
                  <span className={`truncate text-[12px] ${xTheme.textSecondary}`}>{timeLabel}</span>
                </div>
                <span className={`shrink-0 text-[11px] font-semibold uppercase ${statusMeta.className}`}>{statusMeta.label}</span>
              </div>

              <p className={`mb-1.5 line-clamp-3 text-[13px] leading-5 ${xTheme.text}`}>
                {post.content?.trim() || 'Untitled post'}
              </p>

              <div className="mb-1 flex items-center gap-1.5">
                {post.ai_generated && (
                  <span className="rounded-full bg-[#1d9bf0]/10 px-1.5 py-0.5 text-[11px] text-[#1d9bf0]">
                    AI
                  </span>
                )}
                {post.post_type && (
                  <span className={`text-[11px] ${xTheme.textSecondary}`}>
                    {post.post_type === 'news'
                      ? 'News'
                      : post.post_type === 'automated'
                        ? 'Auto'
                        : post.post_type}
                  </span>
                )}
              </div>

              <div className="mt-2 flex gap-3">
                {post.status !== 'queued' && (
                  <button
                    onClick={() => handleApprove(post.id)}
                    className="flex items-center gap-1 text-[12px] text-green-400 transition-colors hover:text-green-300"
                  >
                    <Check className="h-3.5 w-3.5" /> {actionLabel}
                  </button>
                )}

                <button
                  onClick={() => handleReject(post.id)}
                  className="flex items-center gap-1 text-[12px] text-red-400 transition-colors hover:text-red-300"
                >
                  <XIcon className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}