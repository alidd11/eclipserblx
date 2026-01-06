import { useState } from 'react';
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

      // Create first post
      const { error: postError } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content: content.trim(),
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
      <DialogContent className="sm:max-w-[600px]">
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
              placeholder="What would you like to discuss?"
              className="min-h-[200px] resize-none"
              required
            />
          </div>

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
              disabled={!title.trim() || !content.trim() || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create Thread'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
