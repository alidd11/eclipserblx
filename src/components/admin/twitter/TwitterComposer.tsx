import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Loader2, Image as ImageIcon, Hash, Globe, ListPlus, Smile, MapPin, CalendarClock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import avatarImg from '@/assets/marketplace-logo-icon-sm.webp';

interface XTheme {
  bg: string;
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  accent: string;
  accentBg: string;
  inputBg: string;
  [key: string]: string;
}

export function TwitterComposer({ xTheme }: { xTheme: XTheme }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('scheduled');
  const [sending, setSending] = useState(false);
  const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
  const [showHashtags, setShowHashtags] = useState(false);
  const [useCustomHashtags, setUseCustomHashtags] = useState(false);

  const { data: hashtags } = useQuery({
    queryKey: ['twitter-hashtags-active'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twitter_hashtags')
        .select('*')
        .eq('is_active', true)
        .order('usage_count', { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const hashtagString = selectedHashtags.join(' ');
  const separator = selectedHashtags.length > 0 ? '\n\n' : '';
  const fullPreview = selectedHashtags.length > 0 ? `${content}${separator}${hashtagString}` : content;
  const charCount = fullPreview.length;
  const charPercent = Math.min((charCount / 280) * 100, 100);

  const toggleHashtag = (tag: string) => {
    setSelectedHashtags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev,
    );
  };

  const handleSend = async () => {
    if (!content.trim()) return;
    if (charCount > 280) {
      toast.error('Tweet exceeds 280 characters');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('post-twitter-update', {
        body: {
          content: content.trim(),
          post_type: postType,
          hashtag_count: 3,
          ...(useCustomHashtags && selectedHashtags.length > 0
            ? { override_hashtags: selectedHashtags }
            : {}),
        },
      });

      if (error) throw error;

      if (data?.status === 'draft') {
        toast.info('Saved as draft — Twitter API credentials not yet configured');
      } else if (data?.status === 'sent') {
        toast.success('Tweet posted successfully!');
      } else if (data?.status === 'failed') {
        toast.error('Tweet failed to post');
      }

      setContent('');
      setSelectedHashtags([]);
      setShowHashtags(false);
      queryClient.invalidateQueries({ queryKey: ['twitter-posts-feed'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-scheduled-posts'] });
      queryClient.invalidateQueries({ queryKey: ['twitter-posts-history'] });
    } catch (err) {
      toast.error(err.message || 'Failed to send tweet');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${xTheme.border} border-b px-4 pt-3 pb-2`}>
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0 pt-1">
          <img src={avatarImg} alt="Eclipse" className="h-10 w-10 rounded-full" />
        </div>

        {/* Compose area */}
        <div className="flex-1 min-w-0">
          {/* Audience pill */}
          <button className={`flex items-center gap-1 text-[13px] font-bold ${xTheme.accent} border border-[#1d9bf0]/30 rounded-full px-3 py-0.5 mb-3 ${xTheme.hover} transition-colors`}>
            <Globe className="h-3 w-3" />
            Everyone
          </button>

          {/* Text input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What is happening?!"
            className={`w-full bg-transparent ${xTheme.text} text-xl placeholder:${xTheme.textSecondary} placeholder:opacity-60 outline-none resize-none min-h-[52px] leading-relaxed`}
            rows={2}
          />

          {/* Hashtag section */}
          {showHashtags && (
            <div className="mt-2 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className={`text-xs ${xTheme.textSecondary}`}>
                  {useCustomHashtags ? `Pick up to 5 (${selectedHashtags.length}/5)` : 'Auto-selected (2-5)'}
                </span>
                <button
                  className={`text-xs font-bold ${xTheme.accent} ${xTheme.hover} px-2 py-1 rounded-full`}
                  onClick={() => setUseCustomHashtags(!useCustomHashtags)}
                >
                  {useCustomHashtags ? 'Use Auto' : 'Pick Manually'}
                </button>
              </div>
              {useCustomHashtags && (
                <div className="flex flex-wrap gap-1.5">
                  {hashtags?.map((h) => (
                    <Badge
                      key={h.id}
                      variant={selectedHashtags.includes(h.tag) ? 'default' : 'outline'}
                      className={`cursor-pointer text-xs ${
                        selectedHashtags.includes(h.tag)
                          ? 'bg-[#1d9bf0] text-foreground border-[#1d9bf0]'
                          : `${xTheme.textSecondary} border-[#2f3336]`
                      }`}
                      onClick={() => toggleHashtag(h.tag)}
                    >
                      {h.tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Reply setting */}
          <button className={`flex items-center gap-1.5 text-[13px] font-bold ${xTheme.accent} mb-3 ${xTheme.hover} rounded-full px-1 py-1 -ml-1 transition-colors`}>
            <Globe className="h-4 w-4" />
            Everyone can reply
          </button>

          {/* Divider */}
          <div className={`${xTheme.border} border-t`} />

          {/* Bottom toolbar */}
          <div className="flex items-center justify-between pt-2 pb-1">
            {/* Tools */}
            <div className="flex items-center -ml-2">
              <button className={`p-2 rounded-full ${xTheme.accent} hover:bg-[#1d9bf0]/10 transition-colors`}>
                <ImageIcon className="h-[18px] w-[18px]" />
              </button>
              <button className={`p-2 rounded-full ${xTheme.accent} hover:bg-[#1d9bf0]/10 transition-colors`}>
                <ListPlus className="h-[18px] w-[18px]" />
              </button>
              <button className={`p-2 rounded-full ${xTheme.accent} hover:bg-[#1d9bf0]/10 transition-colors`}>
                <Smile className="h-[18px] w-[18px]" />
              </button>
              <button className={`p-2 rounded-full ${xTheme.accent} hover:bg-[#1d9bf0]/10 transition-colors`}>
                <CalendarClock className="h-[18px] w-[18px]" />
              </button>
              <button className={`p-2 rounded-full ${xTheme.accent} hover:bg-[#1d9bf0]/10 transition-colors`}>
                <MapPin className="h-[18px] w-[18px]" />
              </button>
              <button
                onClick={() => setShowHashtags(!showHashtags)}
                className={`p-2 rounded-full transition-colors ${
                  showHashtags ? 'text-[#1d9bf0] bg-[#1d9bf0]/10' : `${xTheme.accent} hover:bg-[#1d9bf0]/10`
                }`}
              >
                <Hash className="h-[18px] w-[18px]" />
              </button>
            </div>

            {/* Right: char count + post */}
            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <div className="flex items-center gap-2">
                  <div className="relative h-[30px] w-[30px]">
                    <svg className="h-[30px] w-[30px] -rotate-90" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" className="text-[#2f3336]" strokeWidth="2" />
                      <circle
                        cx="12" cy="12" r="10" fill="none"
                        stroke={charCount > 280 ? '#f4212e' : charCount > 260 ? '#ffd400' : '#1d9bf0'}
                        strokeWidth="2"
                        strokeDasharray={`${charPercent * 0.628} 62.8`}
                        strokeLinecap="round"
                      />
                    </svg>
                    {charCount > 260 && (
                      <span className={`absolute inset-0 flex items-center justify-center text-[11px] font-medium ${
                        charCount > 280 ? 'text-[#f4212e]' : xTheme.textSecondary
                      }`}>
                        {280 - charCount}
                      </span>
                    )}
                  </div>
                  <div className="w-px h-7 bg-[#2f3336]" />
                </div>
              )}

              <button
                onClick={handleSend}
                disabled={sending || !content.trim() || charCount > 280}
                className="bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 disabled:hover:bg-[#1d9bf0] text-foreground rounded-full px-5 py-[7px] text-[15px] font-bold transition-colors"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
