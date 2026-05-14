import { useTwitterMentions, useTwitterAction } from '@/hooks/useTwitterActions';
import { formatDistanceToNow } from '@/lib/dateUtils';
import { Heart, Repeat2, MessageCircle, BarChart2, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import avatarImg from '@/assets/marketplace-logo-icon-sm.webp';

interface XTheme {
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  accent: string;
  [key: string]: string;
}

export function TwitterMentions({ xTheme }: { xTheme: XTheme }) {
  const { data, isLoading, refetch, isFetching } = useTwitterMentions();
  const twitterAction = useTwitterAction();
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const tweets = data?.data || [];
  const users = data?.includes?.users || [];

  const getUser = (authorId: string) => users.find((u: any) => u.id === authorId);

  const handleReply = (tweetId: string) => {
    if (!replyText.trim()) return;
    twitterAction.mutate(
      { action: 'reply', tweet_id: tweetId, text: replyText },
      { onSuccess: () => { setReplyingTo(null); setReplyText(''); } },
    );
  };

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
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      {/* Refresh bar */}
      <div className={`flex items-center justify-between px-4 py-2 ${xTheme.border} border-b`}>
        <span className={`text-[13px] ${xTheme.textSecondary}`}>
          {tweets.length} mention{tweets.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className={`flex items-center gap-1.5 text-[13px] font-bold ${xTheme.accent} hover:bg-[#1d9bf0]/10 px-3 py-1.5 rounded-full transition-colors`}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {tweets.length === 0 ? (
        <div className="p-8 text-center">
          <p className={`text-lg font-bold ${xTheme.text}`}>No mentions yet</p>
          <p className={`text-[15px] mt-1 ${xTheme.textSecondary}`}>When people mention @EclipseRblx, they'll show up here.</p>
        </div>
      ) : (
        <div className={`divide-y ${xTheme.border.replace('border-', 'divide-')}`}>
          {tweets.map((tweet: any) => {
            const author = getUser(tweet.author_id);
            return (
              <article key={tweet.id} className={`px-4 py-3 ${xTheme.hover} transition-colors`}>
                <div className="flex gap-3">
                  <div className="shrink-0">
                    {author?.profile_image_url ? (
                      <img src={author.profile_image_url} alt={author.name} className="h-10 w-10 rounded-full" />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-[#2f3336] flex items-center justify-center">
                        <span className="text-[#71767b] font-bold text-sm">{author?.name?.[0] || '?'}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className={`font-bold text-[15px] ${xTheme.text}`}>{author?.name || 'Unknown'}</span>
                      <span className={`${xTheme.textSecondary} text-[15px]`}>@{author?.username || 'unknown'}</span>
                      <span className={`${xTheme.textSecondary} text-[15px]`}>&middot;</span>
                      <span className={`${xTheme.textSecondary} text-[15px]`}>
                        {tweet.created_at ? formatDistanceToNow(new Date(tweet.created_at), { addSuffix: false }) : ''}
                      </span>
                    </div>

                    <p className={`text-[15px] ${xTheme.text} mt-0.5 whitespace-pre-wrap break-words leading-[20px]`}>
                      {tweet.text}
                    </p>

                    {/* Metrics */}
                    {tweet.public_metrics && (
                      <div className={`flex items-center gap-6 mt-2 text-[13px] ${xTheme.textSecondary}`}>
                        {tweet.public_metrics.reply_count > 0 && <span>{tweet.public_metrics.reply_count} replies</span>}
                        {tweet.public_metrics.retweet_count > 0 && <span>{tweet.public_metrics.retweet_count} retweets</span>}
                        {tweet.public_metrics.like_count > 0 && <span>{tweet.public_metrics.like_count} likes</span>}
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 mt-2 -ml-2 max-w-[320px] justify-between">
                      <button
                        onClick={() => setReplyingTo(replyingTo === tweet.id ? null : tweet.id)}
                        className={`${xTheme.textSecondary} hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors`}
                      >
                        <MessageCircle className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        onClick={() => twitterAction.mutate({ action: 'retweet', tweet_id: tweet.id })}
                        disabled={twitterAction.isPending}
                        className={`${xTheme.textSecondary} hover:text-[#00ba7c] p-2 rounded-full hover:bg-[#00ba7c]/10 transition-colors`}
                      >
                        <Repeat2 className="h-[18px] w-[18px]" />
                      </button>
                      <button
                        onClick={() => twitterAction.mutate({ action: 'like', tweet_id: tweet.id })}
                        disabled={twitterAction.isPending}
                        className={`${xTheme.textSecondary} hover:text-[#f91880] p-2 rounded-full hover:bg-[#f91880]/10 transition-colors`}
                      >
                        <Heart className="h-[18px] w-[18px]" />
                      </button>
                      <button className={`${xTheme.textSecondary} hover:text-[#1d9bf0] p-2 rounded-full hover:bg-[#1d9bf0]/10 transition-colors`}>
                        <BarChart2 className="h-[18px] w-[18px]" />
                      </button>
                    </div>

                    {/* Reply composer */}
                    {replyingTo === tweet.id && (
                      <div className={`mt-3 flex gap-2 items-start border-t ${xTheme.border.replace('border-', 'border-')} pt-3`}>
                        <img src={avatarImg} alt="Eclipse" className="h-8 w-8 rounded-full shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className={`text-[13px] ${xTheme.textSecondary} mb-1`}>
                            Replying to <span className="text-[#1d9bf0]">@{author?.username}</span>
                          </p>
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Post your reply"
                            className={`w-full bg-transparent ${xTheme.text} text-[15px] placeholder:opacity-50 outline-none resize-none min-h-[40px]`}
                            rows={2}
                            autoFocus
                          />
                          <div className="flex justify-end mt-1">
                            <button
                              onClick={() => handleReply(tweet.id)}
                              disabled={!replyText.trim() || twitterAction.isPending}
                              className="bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-foreground rounded-full px-4 py-1.5 text-[13px] font-bold transition-colors"
                            >
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
