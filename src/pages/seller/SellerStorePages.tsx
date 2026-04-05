import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  Plus, FileText, Pencil, Trash2, Eye, EyeOff, GripVertical, ExternalLink, Save
} from 'lucide-react';
import { toast } from 'sonner';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';

interface StorePage {
  id: string;
  store_id: string;
  title: string;
  slug: string;
  content: string;
  is_published: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60);
}

function PageEditor({ 
  page, 
  storeId, 
  storeSlug,
  onClose 
}: { 
  page?: StorePage; 
  storeId: string; 
  storeSlug: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState(page?.title || '');
  const [slug, setSlug] = useState(page?.slug || '');
  const [isPublished, setIsPublished] = useState(page?.is_published ?? true);
  const [autoSlug, setAutoSlug] = useState(!page);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: 'Start writing your page content...' }),
    ],
    content: page?.content || '',
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const content = editor?.getHTML() || '';
      const finalSlug = slug || slugify(title);
      
      if (!title.trim()) throw new Error('Title is required');
      if (!finalSlug.trim()) throw new Error('Slug is required');

      if (page) {
        const { error } = await supabase
          .from('store_pages')
          .update({ 
            title, 
            slug: finalSlug, 
            content, 
            is_published: isPublished,
            updated_at: new Date().toISOString(),
          } as any)
          .eq('id', page.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('store_pages')
          .insert({ 
            store_id: storeId, 
            title, 
            slug: finalSlug, 
            content, 
            is_published: isPublished 
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(page ? 'Page updated' : 'Page created');
      queryClient.invalidateQueries({ queryKey: ['store-pages', storeId] });
      onClose();
    },
    onError: (err: any) => {
      if (err.message?.includes('duplicate')) {
        toast.error('A page with that slug already exists');
      } else {
        toast.error(err.message || 'Failed to save page');
      }
    },
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Page Title</Label>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (autoSlug) setSlug(slugify(e.target.value));
            }}
            placeholder="e.g. FAQ, Returns Policy"
          />
        </div>
        <div className="space-y-2">
          <Label>URL Slug</Label>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground shrink-0">/store/{storeSlug}/page/</span>
            <Input
              value={slug}
              onChange={(e) => { setSlug(slugify(e.target.value)); setAutoSlug(false); }}
              placeholder="faq"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Switch checked={isPublished} onCheckedChange={setIsPublished} />
        <Label>Published</Label>
      </div>

      <div className="space-y-2">
        <Label>Content</Label>
        <div className="border border-border rounded-lg overflow-hidden bg-card">
          <EditorContent 
            editor={editor} 
            className="prose prose-sm dark:prose-invert max-w-none p-4 min-h-[300px] focus-within:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px]" 
          />
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
          <Save className="h-4 w-4 mr-2" />
          {saveMutation.isPending ? 'Saving...' : 'Save Page'}
        </Button>
      </div>
    </div>
  );
}

export default function SellerStorePages() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [editingPage, setEditingPage] = useState<StorePage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data: pages = [], isLoading } = useQuery({
    queryKey: ['store-pages', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('store_pages')
        .select('*')
        .eq('store_id', store.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return data as StorePage[];
    },
    enabled: !!store?.id,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('store_pages').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Page deleted');
      queryClient.invalidateQueries({ queryKey: ['store-pages', store?.id] });
      setDeleteId(null);
    },
    onError: () => toast.error('Failed to delete page'),
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from('store_pages')
        .update({ is_published: published } as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-pages', store?.id] });
    },
  });

  if (isCreating || editingPage) {
    return (
      <SellerLayout>
        <div>
          <div className="mb-6">
            <h1 className="text-3xl font-bold">{editingPage ? 'Edit Page' : 'New Page'}</h1>
            <p className="text-muted-foreground">
              {editingPage ? `Editing "${editingPage.title}"` : 'Create a new custom page for your store'}
            </p>
          </div>
          <PageEditor
            page={editingPage || undefined}
            storeId={store?.id || ''}
            storeSlug={store?.slug || store?.id || ''}
            onClose={() => { setEditingPage(null); setIsCreating(false); }}
          />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Custom Pages</h1>
            <p className="text-muted-foreground">
              Create standalone pages like FAQ, Returns Policy, or Contact
            </p>
          </div>
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Page
          </Button>
        </div>

        {isLoading ? (
          <div className="border border-border rounded-xl overflow-hidden"><div className="p-4 p-8 text-center text-muted-foreground">Loading...</div></div>
        ) : pages.length === 0 ? (
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="p-4 p-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-2">No custom pages yet</h3>
              <p className="text-muted-foreground mb-4">
                Create pages like FAQ, Returns Policy, or Contact to add to your store.
              </p>
              <Button onClick={() => setIsCreating(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create Your First Page
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {pages.map((page) => (
              <div key={page.id}>
                <div className="p-4 p-4 flex items-center gap-4">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{page.title}</h3>
                      <Badge variant={page.is_published ? 'default' : 'secondary'} className="shrink-0">
                        {page.is_published ? 'Published' : 'Draft'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      /store/{store?.slug || store?.id}/page/{page.slug}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => togglePublish.mutate({ id: page.id, published: !page.is_published })}
                      title={page.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {page.is_published ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => window.open(`/store/${store?.slug || store?.id}/page/${page.slug}`, '_blank')}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8"
                      onClick={() => setEditingPage(page)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={() => setDeleteId(page.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Page</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this page? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button 
              variant="destructive" 
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              disabled={deleteMutation.isPending}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SellerLayout>
  );
}
