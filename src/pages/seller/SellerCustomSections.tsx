import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, Trash2, Save, GripVertical, Eye, EyeOff, 
  LayoutGrid, MessageSquare, Quote, FileText, Image 
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const SECTION_TYPES = [
  { id: 'faq', name: 'FAQ', icon: MessageSquare, description: 'Questions & answers' },
  { id: 'testimonials', name: 'Testimonials', icon: Quote, description: 'Customer quotes' },
  { id: 'featured_collection', name: 'Featured Collection', icon: LayoutGrid, description: 'Curated product list' },
  { id: 'text_block', name: 'Text Block', icon: FileText, description: 'Rich text content' },
  { id: 'gallery', name: 'Gallery', icon: Image, description: 'Image showcase' },
] as const;

type SectionType = typeof SECTION_TYPES[number]['id'];

interface CustomSection {
  id: string;
  store_id: string;
  section_type: SectionType;
  title: string;
  content: any;
  display_order: number;
  is_visible: boolean;
  created_at: string;
  updated_at: string;
}

const DEFAULT_CONTENT: Record<SectionType, any> = {
  faq: { items: [{ question: '', answer: '' }] },
  testimonials: { items: [{ name: '', text: '', rating: 5 }] },
  featured_collection: { product_ids: [], description: '' },
  text_block: { body: '' },
  gallery: { images: [] },
};

export default function SellerCustomSections() {
  const { user } = useAuth();
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<CustomSection>>({});

  const { data: sections, isLoading } = useQuery({
    queryKey: ['store-custom-sections', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('store_custom_sections')
        .select('*')
        .eq('store_id', store.id)
        .order('display_order', { ascending: true });
      if (error) throw error;
      return (data || []) as CustomSection[];
    },
    enabled: !!store?.id,
  });

  const addSection = useMutation({
    mutationFn: async (sectionType: SectionType) => {
      if (!store?.id) throw new Error('No store');
      const maxOrder = Math.max(0, ...(sections || []).map(s => s.display_order));
      const { error } = await supabase
        .from('store_custom_sections')
        .insert({
          store_id: store.id,
          section_type: sectionType,
          title: SECTION_TYPES.find(t => t.id === sectionType)?.name || 'New Section',
          content: DEFAULT_CONTENT[sectionType],
          display_order: maxOrder + 1,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-custom-sections'] });
      toast.success('Section added');
    },
    onError: (e) => toast.error('Failed to add section: ' + e.message),
  });

  const updateSection = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CustomSection>) => {
      const { error } = await supabase
        .from('store_custom_sections')
        .update(updates as any)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-custom-sections'] });
      setEditingId(null);
      toast.success('Section updated');
    },
    onError: (e) => toast.error('Failed to update: ' + e.message),
  });

  const deleteSection = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_custom_sections')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-custom-sections'] });
      toast.success('Section deleted');
    },
    onError: (e) => toast.error('Failed to delete: ' + e.message),
  });

  const toggleVisibility = (section: CustomSection) => {
    updateSection.mutate({ id: section.id, is_visible: !section.is_visible });
  };

  const startEditing = (section: CustomSection) => {
    setEditingId(section.id);
    setEditForm({ title: section.title, content: section.content });
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateSection.mutate({ id: editingId, title: editForm.title, content: editForm.content });
  };

  const renderContentEditor = (sectionType: SectionType, content: any, onChange: (c: any) => void) => {
    switch (sectionType) {
      case 'faq': {
        const items = content?.items || [];
        return (
          <div className="space-y-3">
            {items.map((item: any, i: number) => (
              <div key={i} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Question {i + 1}</Label>
                  {items.length > 1 && (
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => onChange({ items: items.filter((_: any, j: number) => j !== i) })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Question..."
                  value={item.question}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, question: e.target.value };
                    onChange({ items: newItems });
                  }}
                />
                <Textarea
                  placeholder="Answer..."
                  value={item.answer}
                  rows={2}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, answer: e.target.value };
                    onChange({ items: newItems });
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline" size="sm"
              onClick={() => onChange({ items: [...items, { question: '', answer: '' }] })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Question
            </Button>
          </div>
        );
      }

      case 'testimonials': {
        const items = content?.items || [];
        return (
          <div className="space-y-3">
            {items.map((item: any, i: number) => (
              <div key={i} className="space-y-2 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Testimonial {i + 1}</Label>
                  {items.length > 1 && (
                    <Button
                      variant="ghost" size="icon" className="h-6 w-6"
                      onClick={() => onChange({ items: items.filter((_: any, j: number) => j !== i) })}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
                <Input
                  placeholder="Customer name..."
                  value={item.name}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, name: e.target.value };
                    onChange({ items: newItems });
                  }}
                />
                <Textarea
                  placeholder="What they said..."
                  value={item.text}
                  rows={2}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = { ...item, text: e.target.value };
                    onChange({ items: newItems });
                  }}
                />
              </div>
            ))}
            <Button
              variant="outline" size="sm"
              onClick={() => onChange({ items: [...items, { name: '', text: '', rating: 5 }] })}
            >
              <Plus className="h-3 w-3 mr-1" /> Add Testimonial
            </Button>
          </div>
        );
      }

      case 'text_block':
        return (
          <Textarea
            placeholder="Write your content here..."
            value={content?.body || ''}
            rows={6}
            onChange={(e) => onChange({ body: e.target.value })}
          />
        );

      case 'gallery':
        return (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Add image URLs (one per line)
            </p>
            <Textarea
              placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg"
              value={(content?.images || []).join('\n')}
              rows={4}
              onChange={(e) => onChange({ images: e.target.value.split('\n').filter(Boolean) })}
            />
          </div>
        );

      case 'featured_collection':
        return (
          <div className="space-y-2">
            <Textarea
              placeholder="Description of this collection..."
              value={content?.description || ''}
              rows={2}
              onChange={(e) => onChange({ ...content, description: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">
              Products can be curated from your product list. Use pinned products for now.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  const getTypeIcon = (type: string) => {
    const t = SECTION_TYPES.find(st => st.id === type);
    return t ? <t.icon className="h-4 w-4" /> : null;
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Custom Sections</h1>
          <p className="text-muted-foreground">
            Add custom content sections to your store page
          </p>
        </div>

        {/* Add Section */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Add New Section</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {SECTION_TYPES.map(type => (
                <Button
                  key={type.id}
                  variant="outline"
                  className="flex flex-col items-center gap-1 h-auto py-3"
                  onClick={() => addSection.mutate(type.id)}
                  disabled={addSection.isPending}
                >
                  <type.icon className="h-5 w-5" />
                  <span className="text-xs">{type.name}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Sections List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
          </div>
        ) : sections && sections.length > 0 ? (
          <div className="space-y-3">
            {sections.map((section) => (
              <Card key={section.id} className={!section.is_visible ? 'opacity-60' : ''}>
                <CardContent className="py-4">
                  {editingId === section.id ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(section.section_type)}
                        <Badge variant="outline" className="text-xs">{section.section_type.replace('_', ' ')}</Badge>
                      </div>
                      <div className="space-y-2">
                        <Label>Section Title</Label>
                        <Input
                          value={editForm.title || ''}
                          onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Content</Label>
                        {renderContentEditor(
                          section.section_type as SectionType,
                          editForm.content,
                          (c) => setEditForm({ ...editForm, content: c })
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={updateSection.isPending}>
                          <Save className="h-3 w-3 mr-1" /> Save
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        {getTypeIcon(section.section_type)}
                        <div>
                          <p className="font-medium text-sm">{section.title}</p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {section.section_type.replace('_', ' ')}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          onClick={() => toggleVisibility(section)}
                        >
                          {section.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          onClick={() => startEditing(section)}
                        >
                          Edit
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Section</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{section.title}"? This cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteSection.mutate(section.id)}>
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No Custom Sections</h3>
              <p className="text-muted-foreground">
                Add FAQ, testimonials, or other sections to make your store stand out.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </SellerLayout>
  );
}
