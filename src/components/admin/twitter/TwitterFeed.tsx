import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Heart, Repeat2, BarChart2, Share, MoreHorizontal, CheckCircle2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export function TwitterFeed() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['twitter-posts-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twitter_posts')
        .select('*')
        .order('posted_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  if (isLoading) {
    return (
      <div className="divide-y divide-border">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 space-y-3">
            <div className="flex gap-3">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p className="text-lg font-medium">No tweets yet</p>
        <p className="text-sm mt-1">Compose your first tweet to get started</p>
      </div>
    );
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge className="bg-green-500/10 text-green-400 border-green-500/20 text-[10px] px-1.5 py-0">Posted</Badge>;
      case 'draft':
        return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Draft</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Failed</Badge>;
      default:
        return null;
    }
  };

  return (
    <div className="divide-y divide-border">
      {posts.map((post) => (
        <article
          key={post.id}
          className="p-4 hover:bg-muted/30 transition-colors cursor-default"
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">E</span>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-sm text-foreground">Eclipse</span>
                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="text-muted-foreground text-sm">@EclipseRblx</span>
                <span className="text-muted-foreground text-sm">·</span>
                <span className="text-muted-foreground text-sm">
                  {formatDistanceToNow(new Date(post.posted_at), { addSuffix: false })}
                </span>
                {statusIcon(post.status)}
                <button className="ml-auto text-muted-foreground hover:text-foreground p-1 rounded-full hover:bg-muted/50">
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </div>

              {/* Tweet text */}
              <p className="text-sm text-foreground mt-1 whitespace-pre-wrap break-words leading-relaxed">
                {post.content}
              </p>

              {/* Hashtags */}
              {(post.hashtags_used as string[])?.length > 0 && (
                <p className="text-sm text-primary mt-1">
                  {(post.hashtags_used as string[]).join(' ')}
                </p>
              )}

              {/* Timestamp */}
              <p className="text-xs text-muted-foreground mt-2">
                {format(new Date(post.posted_at), "h:mm a · MMM d, yyyy")}
              </p>

              {/* Action bar */}
              <div className="flex items-center justify-between mt-3 max-w-[360px] -ml-2">
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary text-xs group p-1.5 rounded-full hover:bg-primary/10 transition-colors">
                  <BarChart2 className="h-4 w-4" />
                </button>
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-green-500 text-xs group p-1.5 rounded-full hover:bg-green-500/10 transition-colors">
                  <Repeat2 className="h-4 w-4" />
                </button>
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-pink-500 text-xs group p-1.5 rounded-full hover:bg-pink-500/10 transition-colors">
                  <Heart className="h-4 w-4" />
                </button>
                <button className="flex items-center gap-1.5 text-muted-foreground hover:text-primary text-xs group p-1.5 rounded-full hover:bg-primary/10 transition-colors">
                  <Share className="h-4 w-4" />
                </button>
                {post.tweet_id && (
                  <a
                    href={`https://x.com/i/web/status/${post.tweet_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary text-xs p-1.5 rounded-full hover:bg-primary/10 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
