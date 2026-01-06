import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { ImagePlus, X, Loader2 } from 'lucide-react';

interface CreateThreadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryId: string;
  categorySlug: string;
  onSuccess?: (threadSlug: string) => void;
}

export function CreateThreadDialog({ 
  open, 
  onOpenChange, 
  categoryId, 
  categorySlug,
  onSuccess 
}: CreateThreadDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Show image upload for showcase and requests categories
  const showImageUpload = categorySlug === 'showcase' || categorySlug === 'requests';

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} is not an image`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} is too large (max 5MB)`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('forum-images')
          .upload(fileName, file);

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('forum-images')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        toast.success(`${newImages.length} image(s) uploaded`);
      }
    } catch (error) {
      toast.error('Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      if (!title.trim() || !content.trim()) throw new Error('Title and content required');

      // Generate slug from title
      const slug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 50) + '-' + Date.now().toString(36);

      // Create thread
      const { data: thread, error: threadError } = await supabase
        .from('forum_threads')
        .insert({
          category_id: categoryId,
          user_id: user.id,
          title: title.trim(),
          slug,
        })
        .select()
        .single();

      if (threadError) throw threadError;

      // Build content with images
      let finalContent = content.trim();
      if (images.length > 0) {
        finalContent += '\n\n---\n\n';
        images.forEach(url => {
          finalContent += `![image](${url})\n`;
        });
      }

      // Create first post
      const { error: postError } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content: finalContent,
        });

      if (postError) throw postError;

      return thread.slug;
    },
    onSuccess: (threadSlug) => {
      queryClient.invalidateQueries({ queryKey: ['forum-threads'] });
      queryClient.invalidateQueries({ queryKey: ['forum-thread-counts'] });
      toast.success('Thread created successfully!');
      setTitle('');
      setContent('');
      setImages([]);
      onOpenChange(false);
      onSuccess?.(threadSlug);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create thread');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Create New Thread</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Thread Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a descriptive title..."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content">Content</Label>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={showImageUpload ? "Describe your creation or request..." : "What would you like to discuss?"}
              className="min-h-[150px] resize-none"
              required
            />
          </div>

          {showImageUpload && (
            <div className="space-y-2">
              <Label>Images (optional)</Label>
              <p className="text-sm text-muted-foreground">
                {categorySlug === 'showcase' 
                  ? 'Upload screenshots of your creation'
                  : 'Add reference images for your request'}
              </p>
              
              {/* Image previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {images.map((url, index) => (
                    <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-border">
                      <img 
                        src={url} 
                        alt={`Upload ${index + 1}`} 
                        className="w-full h-full object-cover"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6"
                        onClick={() => removeImage(index)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload button */}
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= 6}
                  className="w-full"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Add Images {images.length > 0 && `(${images.length}/6)`}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 6 images, 5MB each
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="gradient-button"
              disabled={!title.trim() || !content.trim() || createMutation.isPending || uploading}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Thread'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
