import { useState, useRef, useCallback } from 'react';
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
import { useDropZone } from '@/hooks/useDropZone';
import { showSuccessNotification, showErrorNotification, showInfoNotification } from '@/lib/nativeNotification';
import { ImagePlus, X, Loader2, Upload } from 'lucide-react';
import { forumThreadSchema, validateWithSchema, isValidationError } from '@/lib/validationSchemas';
import { cn } from '@/lib/utils';

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

  // Check image for NSFW content
  const checkNSFW = async (file: File): Promise<{ isNSFW: boolean; reason: string }> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const base64 = reader.result as string;
          const response = await supabase.functions.invoke('check-nsfw', {
            body: { imageBase64: base64 }
          });
          
          if (response.error) {
            console.error('NSFW check error:', response.error);
            resolve({ isNSFW: false, reason: '' }); // Allow on error
            return;
          }
          
          resolve(response.data);
        } catch (error) {
          console.error('NSFW check failed:', error);
          resolve({ isNSFW: false, reason: '' }); // Allow on error
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const processImages = useCallback(async (files: File[]) => {
    if (!user) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of files) {
        if (!file.type.startsWith('image/')) {
          showErrorNotification('Invalid File', `${file.name} is not an image`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          showErrorNotification('File Too Large', `${file.name} exceeds 5MB limit`);
          continue;
        }

        // Check max images
        if (images.length + newImages.length >= 6) {
          showErrorNotification('Limit Reached', 'Maximum 6 images allowed');
          break;
        }

        // Check for NSFW content
        showInfoNotification('Checking...', `Scanning ${file.name}`);
        const nsfwResult = await checkNSFW(file);
        
        if (nsfwResult.isNSFW) {
          showErrorNotification('Content Rejected', `${file.name}: ${nsfwResult.reason || 'Inappropriate content'}`);
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('forum-images')
          .upload(fileName, file);

        if (uploadError) {
          showErrorNotification('Upload Failed', `Could not upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('forum-images')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        showSuccessNotification('Upload Complete', `${newImages.length} image(s) uploaded`);
      }
    } catch (error) {
      showErrorNotification('Upload Error', 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [user, images.length]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    processImages(Array.from(files));
  };

  // Drag and drop support
  const { isDragOver, dragProps } = useDropZone({
    onDrop: processImages,
    accept: ['image/*'],
    maxSize: 5 * 1024 * 1024,
    maxFiles: 6 - images.length,
    disabled: uploading || !showImageUpload || images.length >= 6,
  });

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Must be logged in');
      
      // Validate input with schema
      const validation = validateWithSchema(forumThreadSchema, {
        title: title.trim(),
        content: content.trim(),
      });

      if (isValidationError(validation)) {
        throw new Error(validation.error);
      }

      const validatedData = validation.data;

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
      showSuccessNotification('Thread Created', 'Your discussion has been posted');
      setTitle('');
      setContent('');
      setImages([]);
      onOpenChange(false);
      onSuccess?.(threadSlug);
    },
    onError: (error) => {
      showErrorNotification('Creation Failed', error instanceof Error ? error.message : 'Could not create thread');
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
              maxLength={10000}
              required
            />
            <p className="text-xs text-muted-foreground">{content.length}/10000 characters</p>
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

              {/* Upload area with drag-drop */}
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-4 transition-colors",
                  isDragOver ? "border-primary bg-primary/5" : "border-border"
                )}
                {...dragProps}
              >
                {isDragOver ? (
                  <div className="flex flex-col items-center gap-2 text-primary py-4">
                    <Upload className="h-8 w-8 animate-bounce" />
                    <span className="text-sm font-medium">Drop images here</span>
                  </div>
                ) : (
                  <>
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
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      Drag & drop or click to upload. Max 6 images, 5MB each
                    </p>
                  </>
                )}
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
