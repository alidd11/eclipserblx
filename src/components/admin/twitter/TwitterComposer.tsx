import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Image as ImageIcon, Hash, Globe, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export function TwitterComposer() {
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
  const fullPreview = selectedHashtags.length > 0
    ? `${content}${separator}${hashtagString}`
    : content;
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
    } catch (err: any) {
      toast.error(err.message || 'Failed to send tweet');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="border-b border-border p-4">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="shrink-0">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">E</span>
          </div>
        </div>

        {/* Compose area */}
        <div className="flex-1 min-w-0">
          {/* Audience selector */}
          <Select value={postType} onValueChange={setPostType}>
            <SelectTrigger className="w-auto h-6 text-xs text-primary border-primary/30 rounded-full px-3 gap-1 mb-2 inline-flex">
              <Globe className="h-3 w-3" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="product_drop">Product Drop</SelectItem>
              <SelectItem value="store_showcase">Store Showcase</SelectItem>
              <SelectItem value="announcement">Announcement</SelectItem>
              <SelectItem value="scheduled">Scheduled</SelectItem>
            </SelectContent>
          </Select>

          {/* Text input */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's happening on Eclipse?"
            className="w-full bg-transparent text-foreground text-lg placeholder:text-muted-foreground/50 outline-none resize-none min-h-[80px]"
            rows={3}
          />

          {/* Hashtag section */}
          {showHashtags && (
            <div className="mt-2 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {useCustomHashtags ? `Pick up to 5 hashtags (${selectedHashtags.length}/5)` : 'Auto-selected hashtags (2-5)'}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs h-6 text-primary"
                  onClick={() => setUseCustomHashtags(!useCustomHashtags)}
                >
                  {useCustomHashtags ? 'Use Auto' : 'Pick Manually'}
                </Button>
              </div>
              {useCustomHashtags && (
                <div className="flex flex-wrap gap-1.5">
                  {hashtags?.map((h) => (
                    <Badge
                      key={h.id}
                      variant={selectedHashtags.includes(h.tag) ? 'default' : 'outline'}
                      className="cursor-pointer text-xs"
                      onClick={() => toggleHashtag(h.tag)}
                    >
                      {h.tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Divider */}
          <div className="border-t border-border mt-2 pt-3 flex items-center justify-between">
            {/* Tools */}
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowHashtags(!showHashtags)}
                className={`p-2 rounded-full transition-colors ${showHashtags ? 'text-primary bg-primary/10' : 'text-primary/70 hover:bg-primary/10'}`}
              >
                <Hash className="h-5 w-5" />
              </button>
              <button className="p-2 rounded-full text-primary/70 hover:bg-primary/10 transition-colors">
                <ImageIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Right side: char count + post button */}
            <div className="flex items-center gap-3">
              {content.length > 0 && (
                <div className="flex items-center gap-2">
                  {/* Circular progress */}
                  <div className="relative h-6 w-6">
                    <svg className="h-6 w-6 -rotate-90" viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" className="text-muted/30" strokeWidth="2.5" />
                      <circle
                        cx="12" cy="12" r="10" fill="none"
                        stroke={charCount > 280 ? 'hsl(var(--destructive))' : charCount > 260 ? 'hsl(45 100% 50%)' : 'hsl(var(--primary))'}
                        strokeWidth="2.5"
                        strokeDasharray={`${charPercent * 0.628} 62.8`}
                        strokeLinecap="round"
                      />
                    </svg>
                    {charCount > 260 && (
                      <span className={`absolute inset-0 flex items-center justify-center text-[9px] font-bold ${charCount > 280 ? 'text-destructive' : 'text-muted-foreground'}`}>
                        {280 - charCount}
                      </span>
                    )}
                  </div>
                  <div className="w-px h-6 bg-border" />
                </div>
              )}

              <Button
                onClick={handleSend}
                disabled={sending || !content.trim() || charCount > 280}
                className="rounded-full px-5 font-bold"
                size="sm"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Post'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
