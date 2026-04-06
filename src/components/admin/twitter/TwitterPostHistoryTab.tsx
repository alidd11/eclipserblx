import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from '@/lib/dateUtils';
import { ExternalLink, Clock, Zap, FileText, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface XTheme {
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  accent: string;
  [key: string]: string;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  sent: { label: 'Posted', color: 'text-[#00ba7c]', icon: CheckCircle2 },
  queued: { label: 'Queued', color: 'text-[#1d9bf0]', icon: Clock },
  draft: { label: 'Draft', color: 'text-[#ffd400]', icon: FileText },
  failed: { label: 'Failed', color: 'text-[#f4212e]', icon: AlertTriangle },
};

const typeLabels: Record<string, string> = {
  product_drop: 'Product Drop',
  store_showcase: 'Store',
  announcement: 'Announce',
  scheduled: 'Scheduled',
  automated: 'Auto',
  news: 'News',
};

export function TwitterPostHistoryTab({ xTheme }: { xTheme: XTheme }) {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['twitter-posts-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twitter_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="divide-y divide-[#2f3336]">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="px-4 py-3 animate-pulse">
            <div className="h-3 w-24 bg-[#2f3336] rounded mb-2" />
            <div className="h-4 w-full bg-[#2f3336] rounded mb-1" />
            <div className="h-3 w-48 bg-[#2f3336] rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="px-4 py-8 text-center">
        <p className={`text-[15px] font-bold ${xTheme.text}`}>No post history</p>
        <p className={`text-[13px] mt-1 ${xTheme.textSecondary}`}>Posts will appear here once created.</p>
      </div>
    );
  }

  return (
    <div className={`divide-y ${xTheme.border.replace('border-', 'divide-')}`}>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3`}>
        <Zap className={`h-4 w-4 ${xTheme.accent}`} />
        <span className={`text-[15px] font-bold ${xTheme.text}`}>Post History</span>
        <span className={`text-[13px] ${xTheme.textSecondary} ml-1`}>{posts.length} posts</span>
      </div>

      {posts.map((post) => {
        const status = statusConfig[post.status] ?? statusConfig.draft;
        const StatusIcon = status.icon;
        const hashtags = (post.hashtags_used as string[]) ?? [];

        return (
          <div key={post.id} className={`px-4 py-3 ${xTheme.hover} transition-colors`}>
            {/* Top row: status + type + time */}
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <div className={`flex items-center gap-1 ${status.color}`}>
                <StatusIcon className="h-3 w-3" />
                <span className="text-[12px] font-semibold uppercase">{status.label}</span>
              </div>
              {post.post_type && (
                <>
                  <span className={`text-[12px] ${xTheme.textSecondary}`}>·</span>
                  <span className={`text-[12px] ${xTheme.textSecondary}`}>
                    {typeLabels[post.post_type] || post.post_type}
                  </span>
                </>
              )}
              {post.ai_generated && (
                <span className="text-[10px] text-[#1d9bf0] bg-[#1d9bf0]/10 rounded-full px-1.5 py-0.5 font-medium">AI</span>
              )}
              <span className={`text-[12px] ${xTheme.textSecondary} ml-auto`}>
                {post.posted_at
                  ? format(new Date(post.posted_at), 'dd MMM yyyy HH:mm')
                  : post.scheduled_for
                    ? `Sched. ${format(new Date(post.scheduled_for), 'dd MMM HH:mm')}`
                    : format(new Date(post.created_at), 'dd MMM yyyy HH:mm')}
              </span>
            </div>

            {/* Content */}
            <p className={`text-[14px] ${xTheme.text} leading-[20px] line-clamp-2 mb-1.5`}>
              {post.content?.replace(/\n*#\w+/g, '').trim() || 'Untitled post'}
            </p>

            {/* Hashtags + link */}
            <div className="flex items-center justify-between gap-2">
              {hashtags.length > 0 ? (
                <div className="flex flex-wrap gap-1 min-w-0 flex-1">
                  {hashtags.map((tag, i) => (
                    <span key={i} className="text-[12px] text-[#1d9bf0]">{tag}</span>
                  ))}
                </div>
              ) : (
                <div />
              )}
              {post.tweet_id && (
                <a
                  href={`https://x.com/i/web/status/${post.tweet_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${xTheme.textSecondary} hover:text-[#1d9bf0] shrink-0 transition-colors`}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
