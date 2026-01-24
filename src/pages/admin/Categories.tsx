import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { Plus, Pencil, Trash2, GripVertical, Car, Code, Box, Layout, Percent, Bot, Gamepad2, Palette, Zap, Shield, Wrench, Sparkles, Package, FileCode, Layers, ChevronDown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';

// Available icons for categories
const ICON_OPTIONS = [
  { value: 'Car', label: 'Car', icon: Car },
  { value: 'Code', label: 'Code', icon: Code },
  { value: 'Box', label: 'Box', icon: Box },
  { value: 'Layout', label: 'Layout', icon: Layout },
  { value: 'Percent', label: 'Percent', icon: Percent },
  { value: 'Bot', label: 'Bot', icon: Bot },
  { value: 'Gamepad2', label: 'Gamepad', icon: Gamepad2 },
  { value: 'Palette', label: 'Palette', icon: Palette },
  { value: 'Zap', label: 'Zap', icon: Zap },
  { value: 'Shield', label: 'Shield', icon: Shield },
  { value: 'Wrench', label: 'Wrench', icon: Wrench },
  { value: 'Sparkles', label: 'Sparkles', icon: Sparkles },
  { value: 'Package', label: 'Package', icon: Package },
  { value: 'FileCode', label: 'FileCode', icon: FileCode },
  { value: 'Layers', label: 'Layers', icon: Layers },
];

const getIconComponent = (iconName: string | null) => {
  const found = ICON_OPTIONS.find(opt => opt.value === iconName);
  return found?.icon || Box;
};

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  display_order: number;
  parent_id: string | null;
  product_count?: number;
}

interface CategoryForm {
  name: string;
  slug: string;
  description: string;
  icon: string;
}

const emptyForm: CategoryForm = {
  name: '',
  slug: '',
  description: '',
  icon: 'Box',
};

// Generate slug from name
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

// Sortable row component for desktop table
function SortableRow({ 
  category, 
  onEdit, 
  onDelete 
}: { 
  category: Category & { product_count: number }; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = getIconComponent(category.icon);

  return (
    <TableRow 
      ref={setNodeRef} 
      style={style}
      className={cn(isDragging && "opacity-50 bg-muted")}
    >
      <TableCell className="w-10">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-muted">
            <IconComponent className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </TableCell>
      <TableCell className="font-medium">{category.name}</TableCell>
      <TableCell className="text-muted-foreground font-mono text-sm">{category.slug}</TableCell>
      <TableCell className="text-muted-foreground max-w-[200px] truncate">
        {category.description || '—'}
      </TableCell>
      <TableCell className="text-center">
        <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-0.5 rounded-full bg-muted text-sm">
          {category.product_count}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2 justify-end">
          <Button variant="ghost" size="icon" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

// Sortable card component for mobile
function SortableMobileCard({ 
  category, 
  onEdit, 
  onDelete 
}: { 
  category: Category & { product_count: number }; 
  onEdit: () => void; 
  onDelete: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const IconComponent = getIconComponent(category.icon);

  return (
    <div 
      ref={setNodeRef} 
      style={style}
      className={cn("border rounded-lg bg-card", isDragging && "opacity-50")}
    >
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full p-4 flex items-center gap-3 text-left">
            <button
              {...attributes}
              {...listeners}
              onClick={(e) => e.stopPropagation()}
              className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded touch-none"
            >
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </button>
            <div className="p-2 rounded bg-muted">
              <IconComponent className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{category.name}</p>
              <p className="text-xs text-muted-foreground">{category.product_count} products</p>
            </div>
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-3 border-t pt-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Slug</p>
              <p className="font-mono text-sm">{category.slug}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Description</p>
              <p className="text-sm">{category.description || '—'}</p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default function AdminCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [deletingCategory, setDeletingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Fetch categories with product counts
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data: cats, error: catsError } = await supabase
        .from('categories')
        .select('*')
        .order('display_order', { ascending: true });

      if (catsError) throw catsError;

      // Get product counts
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('category_id');

      if (productsError) throw productsError;

      const counts: Record<string, number> = {};
      products?.forEach(p => {
        if (p.category_id) {
          counts[p.category_id] = (counts[p.category_id] || 0) + 1;
        }
      });

      return (cats || []).map(cat => ({
        ...cat,
        product_count: counts[cat.id] || 0,
      }));
    },
  });

  // Check for duplicate slug
  const checkSlugExists = async (slug: string, excludeId?: string) => {
    const { data } = await supabase
      .from('categories')
      .select('id')
      .eq('slug', slug)
      .neq('id', excludeId || '')
      .maybeSingle();
    return !!data;
  };

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: async (data: { form: CategoryForm; id?: string }) => {
      const slugExists = await checkSlugExists(data.form.slug, data.id);
      if (slugExists) {
        throw new Error('A category with this slug already exists');
      }

      if (data.id) {
        const { error } = await supabase
          .from('categories')
          .update({
            name: data.form.name,
            slug: data.form.slug,
            description: data.form.description || null,
            icon: data.form.icon,
          })
          .eq('id', data.id);
        if (error) throw error;
      } else {
        const maxOrder = Math.max(0, ...categories.map(c => c.display_order || 0));
        const { error } = await supabase
          .from('categories')
          .insert({
            name: data.form.name,
            slug: data.form.slug,
            description: data.form.description || null,
            icon: data.form.icon,
            display_order: maxOrder + 1,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setDialogOpen(false);
      setEditingCategory(null);
      setForm(emptyForm);
      toast({
        title: editingCategory ? 'Category updated' : 'Category created',
        description: `"${form.name}" has been saved.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setDeleteDialogOpen(false);
      setDeletingCategory(null);
      toast({
        title: 'Category deleted',
        description: 'The category has been removed.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete category.',
        variant: 'destructive',
      });
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) => 
        supabase
          .from('categories')
          .update({ display_order: index })
          .eq('id', id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to reorder categories.',
        variant: 'destructive',
      });
    },
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = categories.findIndex(c => c.id === active.id);
    const newIndex = categories.findIndex(c => c.id === over.id);
    const newOrder = arrayMove(categories, oldIndex, newIndex);
    
    // Optimistic update
    queryClient.setQueryData(['admin-categories'], newOrder);
    reorderMutation.mutate(newOrder.map(c => c.id));
  };

  const openCreate = () => {
    setEditingCategory(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (category: Category) => {
    setEditingCategory(category);
    setForm({
      name: category.name,
      slug: category.slug,
      description: category.description || '',
      icon: category.icon || 'Box',
    });
    setDialogOpen(true);
  };

  const openDelete = (category: Category) => {
    setDeletingCategory(category);
    setDeleteDialogOpen(true);
  };

  const handleNameChange = (name: string) => {
    setForm(prev => ({
      ...prev,
      name,
      slug: editingCategory ? prev.slug : generateSlug(name),
    }));
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.slug.trim()) {
      toast({
        title: 'Validation error',
        description: 'Name and slug are required.',
        variant: 'destructive',
      });
      return;
    }
    saveMutation.mutate({ form, id: editingCategory?.id });
  };

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Categories</h1>
            <p className="text-muted-foreground">Manage product categories</p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Categories</CardTitle>
            <CardDescription>
              Drag and drop to reorder. Products will appear in this order.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading...</div>
            ) : categories.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No categories yet. Click "Add Category" to create one.
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                {/* Desktop Table */}
                <div className="hidden md:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-10"></TableHead>
                        <TableHead className="w-16">Icon</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Slug</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-center">Products</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <SortableContext
                        items={categories.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {categories.map(category => (
                          <SortableRow
                            key={category.id}
                            category={category}
                            onEdit={() => openEdit(category)}
                            onDelete={() => openDelete(category)}
                          />
                        ))}
                      </SortableContext>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="md:hidden space-y-2">
                  <SortableContext
                    items={categories.map(c => c.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    {categories.map(category => (
                      <SortableMobileCard
                        key={category.id}
                        category={category}
                        onEdit={() => openEdit(category)}
                        onDelete={() => openDelete(category)}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? 'Edit Category' : 'Add Category'}</DialogTitle>
            <DialogDescription>
              {editingCategory ? 'Update the category details.' : 'Create a new product category.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => handleNameChange(e.target.value)}
                placeholder="e.g. Vehicle Liveries"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slug">Slug</Label>
              <Input
                id="slug"
                value={form.slug}
                onChange={e => setForm(prev => ({ ...prev, slug: e.target.value }))}
                placeholder="e.g. vehicle-liveries"
              />
              <p className="text-xs text-muted-foreground">
                Used in URLs. Auto-generated from name, but you can customize it.
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="A brief description of this category..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Icon</Label>
              <Select value={form.icon} onValueChange={v => setForm(prev => ({ ...prev, icon: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an icon" />
                </SelectTrigger>
                <SelectContent>
                  {ICON_OPTIONS.map(opt => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <opt.icon className="h-4 w-4" />
                        <span>{opt.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {deletingCategory && (deletingCategory as Category & { product_count?: number }).product_count && (deletingCategory as Category & { product_count?: number }).product_count! > 0 ? (
                <>
                  <span className="text-destructive font-medium">Warning:</span> This category has{' '}
                  <strong>{(deletingCategory as Category & { product_count?: number }).product_count}</strong> products assigned to it. 
                  These products will become uncategorized.
                </>
              ) : (
                <>Are you sure you want to delete "{deletingCategory?.name}"? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingCategory && deleteMutation.mutate(deletingCategory.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
