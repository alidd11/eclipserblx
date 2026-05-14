import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, Youtube, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { errMsg } from '@/lib/errors';

const CATEGORIES = [
 'Education', 'Entertainment', 'Gaming', 'Science & Technology',
 'People & Blogs', 'Howto & Style', 'Music', 'Comedy',
];

export function YouTubeUploadTab() {
 const { user } = useAuth();
 const [title, setTitle] = useState('');
 const [description, setDescription] = useState('');
 const [videoUrl, setVideoUrl] = useState('');
 const [thumbnailUrl, setThumbnailUrl] = useState('');
 const [category, setCategory] = useState('Education');
 const [privacyStatus, setPrivacyStatus] = useState('public');
 const [tags, setTags] = useState<string[]>([]);
 const [tagInput, setTagInput] = useState('');
 const [uploading, setUploading] = useState(false);
 const [videoFile, setVideoFile] = useState<File | null>(null);

 const addTag = () => {
 const tag = tagInput.trim();
 if (tag && !tags.includes(tag) && tags.length < 15) {
 setTags([...tags, tag]);
 setTagInput('');
 }
 };

 const removeTag = (t: string) => setTags(tags.filter(x => x !== t));

 const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (!file) return;
 if (!file.type.startsWith('video/')) {
 toast.error('Please select a video file');
 return;
 }
 if (file.size > 2 * 1024 * 1024 * 1024) {
 toast.error('File must be under 2GB');
 return;
 }
 setVideoFile(file);

 // Upload to storage
 const ext = file.name.split('.').pop();
 const path = `podcasts/${Date.now()}.${ext}`;
 toast.info('Uploading video to storage...');

 const { data, error } = await supabase.storage
 .from('podcast-videos')
 .upload(path, file, { contentType: file.type });

 if (error) {
 toast.error('Failed to upload video: ' + error.message);
 setVideoFile(null);
 return;
 }

 const { data: urlData } = supabase.storage
 .from('podcast-videos')
 .getPublicUrl(path);

 setVideoUrl(urlData.publicUrl);
 toast.success('Video uploaded to storage');
 };

 const handleSubmit = async (uploadNow: boolean) => {
 if (!title.trim()) { toast.error('Title is required'); return; }
 if (!videoUrl) { toast.error('Video file is required'); return; }

 setUploading(true);
 try {
 // Create podcast record
 const { data: podcast, error: insertErr } = await supabase
 .from('youtube_podcasts')
 .insert({
 title: title.trim(),
 description: description.trim(),
 video_file_url: videoUrl,
 thumbnail_url: thumbnailUrl || null,
 category,
 privacy_status: privacyStatus,
 tags,
 status: uploadNow ? 'draft' : 'draft',
 uploaded_by: user?.id,
 })
 .select()
 .single();

 if (insertErr) throw insertErr;

 if (uploadNow) {
 toast.info('Starting YouTube upload...');
 const { data: result, error: fnErr } = await supabase.functions.invoke('upload-youtube-podcast', {
 body: { podcastId: podcast.id },
 });

 if (fnErr) throw fnErr;
 if (result?.youtubeUrl) {
 toast.success('Podcast published to YouTube!');
 } else {
 toast.success('Upload initiated');
 }
 } else {
 toast.success('Podcast saved as draft');
 }

 // Reset form
 setTitle('');
 setDescription('');
 setVideoUrl('');
 setThumbnailUrl('');
 setTags([]);
 setVideoFile(null);
 setCategory('Education');
 setPrivacyStatus('public');
 } catch (err) {
 toast.error(errMsg(err) || 'Upload failed');
 } finally {
 setUploading(false);
 }
 };

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Youtube className="h-5 w-5 text-destructive" />
 Upload Podcast to YouTube
 </h3>
 <p className="text-sm text-muted-foreground">Upload a podcast episode directly to your YouTube channel</p>
 </div>
 <div className="p-4 space-y-4">
 <div className="space-y-2">
 <Label htmlFor="title">Title *</Label>
 <Input id="title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Episode title" maxLength={100} />
 <p className="text-xs text-muted-foreground">{title.length}/100</p>
 </div>

 <div className="space-y-2">
 <Label htmlFor="desc">Description</Label>
 <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} placeholder="Episode description..." rows={4} maxLength={5000} />
 <p className="text-xs text-muted-foreground">{description.length}/5000</p>
 </div>

 <div className="space-y-2">
 <Label>Video File *</Label>
 {videoFile ? (
 <div className="flex items-center gap-2 p-2 border rounded">
 <Upload className="h-4 w-4 text-primary" />
 <span className="text-sm truncate flex-1">{videoFile.name}</span>
 {videoUrl && <Badge variant="secondary">Uploaded</Badge>}
 </div>
 ) : (
 <Input type="file" accept="video/*" onChange={handleFileSelect} />
 )}
 </div>

 <div className="space-y-2">
 <Label htmlFor="thumb">Thumbnail URL (optional)</Label>
 <Input id="thumb" value={thumbnailUrl} onChange={e => setThumbnailUrl(e.target.value)} placeholder="https://..." />
 </div>

 <div className="grid grid-cols-2 gap-4">
 <div className="space-y-2">
 <Label>Category</Label>
 <Select value={category} onValueChange={setCategory}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
 </SelectContent>
 </Select>
 </div>
 <div className="space-y-2">
 <Label>Privacy</Label>
 <Select value={privacyStatus} onValueChange={setPrivacyStatus}>
 <SelectTrigger><SelectValue /></SelectTrigger>
 <SelectContent>
 <SelectItem value="public">Public</SelectItem>
 <SelectItem value="unlisted">Unlisted</SelectItem>
 <SelectItem value="private">Private</SelectItem>
 </SelectContent>
 </Select>
 </div>
 </div>

 <div className="space-y-2">
 <Label>Tags</Label>
 <div className="flex gap-2">
 <Input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="Add tag..." onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag())} />
 <Button type="button" variant="outline" onClick={addTag} size="sm">Add</Button>
 </div>
 {tags.length > 0 && (
 <div className="flex flex-wrap gap-1 mt-1">
 {tags.map(t => (
 <Badge key={t} variant="secondary" className="gap-1">
 {t}
 <X className="h-3 w-3 cursor-pointer" onClick={() => removeTag(t)} />
 </Badge>
 ))}
 </div>
 )}
 </div>

 <div className="flex gap-2 pt-2">
 <Button onClick={() => handleSubmit(false)} variant="outline" disabled={uploading}>
 Save Draft
 </Button>
 <Button onClick={() => handleSubmit(true)} disabled={uploading || !videoUrl}>
 {uploading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Uploading...</> : <><Youtube className="h-4 w-4 mr-2" /> Upload to YouTube</>}
 </Button>
 </div>
 </div>
 </div>
 );
}
