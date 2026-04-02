import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, formatDistanceToNow } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Heart, Repeat2, BarChart2, Share, MoreHorizontal, MessageCircle } from 'lucide-react';
import avatarImg from '@/assets/marketplace-logo-icon-sm.webp';

interface XTheme {
  bg: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  accent: string;
  [key: string]: string;
}

export function TwitterFeed({ xTheme }: { xTheme: XTheme }) {
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
      <div className="divide-y divide-[#2f3336]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 space-y-3 animate-pulse">
            <div className="flex gap-3">
              <div className="h-10 w-10 rounded-full bg-[#2f3336] shrink-0" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-48 bg-[#2f3336] rounded" />
                <div className="h-4 w-full bg-[#2f3336] rounded" />
                <div className="h-4 w-3/4 bg-[#2f3336] rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!posts?.length) {
    return (
      <div className="p-8 text-center">
        <p className={`text-lg font-bold ${xTheme.text}`}>No posts yet</p>
        <p className={`text-[15px] mt-1 ${xTheme.textSecondary}`}>
          When Eclipse posts, they'll show up here.
        </p>
      </div>
    );
  }

  const statusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <span className="text-[#00ba7c] text-[13px]">· Posted</span>;
      case 'draft':
        return <span className="text-[#ffd400] text-[13px]">· Draft</span>;
      case 'failed':
        return <span className="text-[#f4212e] text-[13px]">· Failed</span>;
      default:
        return null;
    }
  };

  return (
    <div className={`divide-y ${xTheme.border.replace('border-', 'divide-')}`}>
      {posts.map((post) => (
        <article
          key={post.id}
          className={`px-4 py-3 ${xTheme.hover} transition-colors cursor-default`}
        >
          <div className="flex gap-3">
            {/* Avatar */}
            <div className="shrink-0">
              <img src="/src/assets/marketplace-logo-icon-sm.webp" alt="Eclipse" className="h-10 w-10 rounded-full" />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              {/* Header */}
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`font-bold text-[15px] ${xTheme.text}`}>Eclipse</span>
                {/* Verified badge */}
                <svg viewBox="0 0 22 22" className="h-[18px] w-[18px] text-[#1d9bf0]" fill="currentColor">
                  <path d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.69-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.636.433 1.221.878 1.69.47.446 1.055.752 1.69.883.635.13 1.294.083 1.902-.143.271.586.702 1.084 1.24 1.438.54.354 1.167.551 1.813.568.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.225 1.261.276 1.897.143.634-.131 1.217-.437 1.687-.883.445-.47.751-1.054.882-1.69.132-.633.083-1.29-.14-1.896.587-.274 1.084-.705 1.438-1.246.355-.54.553-1.17.57-1.817zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z" />
                </svg>
                <span className={`${xTheme.textSecondary} text-[15px]`}>@EclipseRblx</span>
                <span className={`${xTheme.textSecondary} text-[15px]`}>·</span>
                <span className={`${xTheme.textSecondary} text-[15px]`}>
                  {formatDistanceToNow(new Date(post.posted_at), { addSuffix: false })}
                </span>
                {statusBadge(post.status)}
                <button className={`ml-auto ${xTheme.textSecondary} hover:text-[#1d9bf0] p-1.5 -m-1.5 rounded-full hover:bg-[#1d9bf0]/10 transition-colors`}>
                  <MoreHorizontal className="h-[18px] w-[18px]" />
                </button>
              </div>

              {/* Tweet text */}
              <p className={`text-[15px] ${xTheme.text} mt-0.5 whitespace-pre-wrap break-words leading-[20px]`}
                style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}
              >
                {post.content}
              </p>

              {/* Hashtags */}
              {(post.hashtags_used as string[])?.length > 0 && (
                <p className="text-[15px] text-[#1d9bf0] mt-0.5">
                  {(post.hashtags_used as string[]).join(' ')}
                </p>
              )}

              {/* Timestamp */}
              <p className={`text-[13px] ${xTheme.textSecondary} mt-2`}>
                {format(new Date(post.posted_at), "h:mm a · MMM d, yyyy")}
              </p>

              {/* Action bar */}
              <div className="flex items-center justify-between mt-2 max-w-[425px] -ml-2">
                <button className={`flex items-center gap-1 ${xTheme.textSecondary} hover:text-[#1d9bf0] text-[13px] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors group`}>
                  <MessageCircle className="h-[18px] w-[18px]" />
                </button>
                <button className={`flex items-center gap-1 ${xTheme.textSecondary} hover:text-[#00ba7c] text-[13px] p-2 rounded-full hover:bg-[#00ba7c]/10 transition-colors group`}>
                  <Repeat2 className="h-[18px] w-[18px]" />
                </button>
                <button className={`flex items-center gap-1 ${xTheme.textSecondary} hover:text-[#f91880] text-[13px] p-2 rounded-full hover:bg-[#f91880]/10 transition-colors group`}>
                  <Heart className="h-[18px] w-[18px]" />
                </button>
                <button className={`flex items-center gap-1 ${xTheme.textSecondary} hover:text-[#1d9bf0] text-[13px] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors group`}>
                  <BarChart2 className="h-[18px] w-[18px]" />
                </button>
                <div className="flex items-center">
                  <button className={`${xTheme.textSecondary} hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors`}>
                    <Share className="h-[18px] w-[18px]" />
                  </button>
                  {post.tweet_id && (
                    <a
                      href={`https://x.com/i/web/status/${post.tweet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`${xTheme.textSecondary} hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors`}
                    >
                      <ExternalLink className="h-[18px] w-[18px]" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
