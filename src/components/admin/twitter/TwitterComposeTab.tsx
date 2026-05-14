import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Send, Loader2, Hash, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';

export function TwitterComposeTab() {
 const [content, setContent] = useState('');
 const [postType, setPostType] = useState('scheduled');
 const [sending, setSending] = useState(false);
 const [selectedHashtags, setSelectedHashtags] = useState<string[]>([]);
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

 const toggleHashtag = (tag: string) => {
 setSelectedHashtags((prev) =>
 prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < 5 ? [...prev, tag] : prev,
 );
 };

 const handleSend = async () => {
 if (!content.trim()) {
 toast.error('Please write some content');
 return;
 }
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
 } catch (err) {
 toast.error(errMsg(err) || 'Failed to send tweet');
 } finally {
 setSending(false);
 }
 };

 return (
 <div className="grid gap-4 md:grid-cols-2">
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-lg">Compose Tweet</h3>
 <p className="text-sm text-muted-foreground">Write your tweet and select hashtags</p>
 </div>
 <div className="p-4 space-y-4">
 <div className="space-y-2">
 <Label>Content</Label>
 <Textarea
 value={content}
 onChange={(e) => setContent(e.target.value)}
 placeholder="What's happening on Eclipse?"
 className="min-h-[120px]"
 />
 </div>

 <div className="space-y-2">
 <Label>Post Type</Label>
 <Select value={postType} onValueChange={setPostType}>
 <SelectTrigger>
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 <SelectItem value="product_drop">Product Drop</SelectItem>
 <SelectItem value="store_showcase">Store Showcase</SelectItem>
 <SelectItem value="announcement">Announcement</SelectItem>
 <SelectItem value="scheduled">Scheduled</SelectItem>
 </SelectContent>
 </Select>
 </div>

 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <Label className="flex items-center gap-1">
 <Hash className="h-3.5 w-3.5" /> Hashtags
 </Label>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => setUseCustomHashtags(!useCustomHashtags)}
 >
 {useCustomHashtags ? 'Use Auto' : 'Pick Manually'}
 </Button>
 </div>

 {useCustomHashtags ? (
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
 ) : (
 <p className="text-xs text-muted-foreground">
 2\u20135 hashtags will be auto-selected based on usage rotation
 </p>
 )}
 </div>

 <Button
 className="w-full"
 onClick={handleSend}
 disabled={sending || !content.trim() || charCount > 280}
 >
 {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
 Send Tweet
 </Button>
 </div>
 </div>

 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-lg">Preview</h3>
 <p className="text-sm text-muted-foreground">
 <span className={charCount > 280 ? 'text-destructive font-bold' : ''}>
 {charCount}/280
 </span>
 </p>
 </div>
 <div className="p-4">
 {charCount > 280 && (
 <div className="flex items-center gap-2 text-destructive text-sm mb-3">
 <AlertCircle className="h-4 w-4" />
 Exceeds character limit
 </div>
 )}
 <div className="rounded-lg border bg-muted/30 p-4 whitespace-pre-wrap text-sm min-h-[120px]">
 {fullPreview || <span className="text-muted-foreground italic">Your tweet preview will appear here...</span>}
 </div>
 </div>
 </div>
 </div>
 );
}
