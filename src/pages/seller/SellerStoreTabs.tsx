import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { LayoutGrid, Plus, Edit2, Trash2, GripVertical, Package, Save, X } from 'lucide-react';

interface StoreTab {
  id: string;
  store_id: string;
  name: string;
  slug: string;
  icon: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  product_count?: number;
}

interface Product {
  id: string;
  name: string;
  images: string[] | null;
  is_active: boolean;
}

const MAX_TABS = 10;

export default function SellerStoreTabs() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingTab, setEditingTab] = useState<StoreTab | null>(null);
  const [assigningTab, setAssigningTab] = useState<StoreTab | null>(null);
  const [formData, setFormData] = useState({ name: '', slug: '', is_active: true });

  // Fetch store tabs
  const { data: tabs, isLoading: tabsLoading } = useQuery({
    queryKey: ['store-tabs', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      // Get tabs with product counts
      const { data: tabsData, error } = await supabase
        .from('store_tabs')
        .select('*')
        .eq('store_id', store.id)
        .order('display_order');

      if (error) throw error;

      // Get product counts for each tab
      const tabsWithCounts = await Promise.all(
        (tabsData || []).map(async (tab) => {
          const { count } = await supabase
            .from('store_tab_products')
            .select('*', { count: 'exact', head: true })
            .eq('tab_id', tab.id);
          return { ...tab, product_count: count || 0 };
        })
      );

      return tabsWithCounts as StoreTab[];
    },
    enabled: !!store?.id,
  });

  // Fetch store products for assignment
  const { data: products } = useQuery({
    queryKey: ['store-products-for-tabs', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('products')
        .select('id, name, images, is_active')
        .eq('store_id', store.id)
        .order('name');
      if (error) throw error;
      return data as Product[];
    },
    enabled: !!store?.id && !!assigningTab,
  });

  // Fetch assigned products for a tab
  const { data: assignedProducts, refetch: refetchAssigned } = useQuery({
    queryKey: ['tab-products', assigningTab?.id],
    queryFn: async () => {
      if (!assigningTab?.id) return [];
      const { data, error } = await supabase
        .from('store_tab_products')
        .select('product_id')
        .eq('tab_id', assigningTab.id);
      if (error) throw error;
      return data.map(p => p.product_id);
    },
    enabled: !!assigningTab?.id,
  });

  // Create tab mutation
  const createTab = useMutation({
    mutationFn: async (data: { name: string; slug: string; is_active: boolean }) => {
      if (!store?.id) throw new Error('No store found');
      
      const nextOrder = (tabs?.length || 0);
      const { error } = await supabase
        .from('store_tabs')
        .insert({
          store_id: store.id,
          name: data.name,
          slug: data.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          is_active: data.is_active,
          display_order: nextOrder,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-tabs'] });
      toast.success('Tab created successfully');
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to create tab: ' + error.message);
    },
  });

  // Update tab mutation
  const updateTab = useMutation({
    mutationFn: async ({ id, ...data }: { id: string; name: string; slug: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('store_tabs')
        .update({
          name: data.name,
          slug: data.slug.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
          is_active: data.is_active,
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-tabs'] });
      toast.success('Tab updated successfully');
      setEditingTab(null);
      resetForm();
    },
    onError: (error) => {
      toast.error('Failed to update tab: ' + error.message);
    },
  });

  // Delete tab mutation
  const deleteTab = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('store_tabs')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-tabs'] });
      toast.success('Tab deleted successfully');
    },
    onError: (error) => {
      toast.error('Failed to delete tab: ' + error.message);
    },
  });

  // Toggle product assignment
  const toggleProduct = useMutation({
    mutationFn: async ({ tabId, productId, isAssigned }: { tabId: string; productId: string; isAssigned: boolean }) => {
      if (isAssigned) {
        const { error } = await supabase
          .from('store_tab_products')
          .delete()
          .eq('tab_id', tabId)
          .eq('product_id', productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('store_tab_products')
          .insert({ tab_id: tabId, product_id: productId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      refetchAssigned();
      queryClient.invalidateQueries({ queryKey: ['store-tabs'] });
    },
    onError: (error) => {
      toast.error('Failed to update product assignment: ' + error.message);
    },
  });

  const resetForm = () => {
    setFormData({ name: '', slug: '', is_active: true });
  };

  const handleEdit = (tab: StoreTab) => {
    setEditingTab(tab);
    setFormData({ name: tab.name, slug: tab.slug, is_active: tab.is_active });
  };

  const handleSave = () => {
    if (editingTab) {
      updateTab.mutate({ id: editingTab.id, ...formData });
    } else {
      createTab.mutate(formData);
    }
  };

  const canCreateMore = (tabs?.length || 0) < MAX_TABS;

  return (
    <SellerLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Store Categories</h1>
            <p className="text-muted-foreground">
              Create custom categories to organize products on your store page
            </p>
          </div>
          <Button 
            onClick={() => setIsCreateOpen(true)} 
            disabled={!canCreateMore}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        {/* Limit indicator */}
        <div className="mb-4">
          <Badge variant={canCreateMore ? 'secondary' : 'destructive'}>
            {tabs?.length || 0} / {MAX_TABS} categories used
          </Badge>
        </div>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Your Categories
            </CardTitle>
            <CardDescription>
              Drag to reorder, assign products, or edit your categories
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tabsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-16" />)}
              </div>
            ) : tabs && tabs.length > 0 ? (
              <div className="space-y-3">
                {tabs.map((tab) => (
                  <div 
                    key={tab.id}
                    className="flex items-center gap-3 p-4 rounded-lg border bg-card"
                  >
                    <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{tab.name}</span>
                        {!tab.is_active && (
                          <Badge variant="secondary" className="text-xs">Hidden</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        /{tab.slug} · {tab.product_count} products
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAssigningTab(tab)}
                      >
                        <Package className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tab)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteTab.mutate(tab.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Categories Yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create categories to organize your products
                </p>
                <Button onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Category
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create/Edit Dialog */}
        <Dialog open={isCreateOpen || !!editingTab} onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setEditingTab(null);
            resetForm();
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingTab ? 'Edit Category' : 'Create New Category'}</DialogTitle>
              <DialogDescription>
                {editingTab ? 'Update your category settings' : 'Add a new product category to your store'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tab-name">Category Name</Label>
                <Input
                  id="tab-name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ 
                      ...formData, 
                      name: e.target.value,
                      slug: editingTab ? formData.slug : e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
                    });
                  }}
                  placeholder="e.g. Scripts, Models, Bundles"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tab-slug">URL Slug</Label>
                <Input
                  id="tab-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="e.g. scripts"
                />
                <p className="text-xs text-muted-foreground">
                  This appears in the URL when filtering: /store/your-store?tab={formData.slug || 'slug'}
                </p>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Visible</Label>
                  <p className="text-xs text-muted-foreground">Show this category on your store page</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateOpen(false);
                setEditingTab(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button 
                onClick={handleSave}
                disabled={!formData.name || !formData.slug || createTab.isPending || updateTab.isPending}
              >
                <Save className="h-4 w-4 mr-2" />
                {editingTab ? 'Save Changes' : 'Create Category'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Products Dialog */}
        <Dialog open={!!assigningTab} onOpenChange={(open) => {
          if (!open) setAssigningTab(null);
        }}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Assign Products to "{assigningTab?.name}"</DialogTitle>
              <DialogDescription>
                Select which products appear under this tab
              </DialogDescription>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto py-4 space-y-2">
              {products && products.length > 0 ? (
                products.map((product) => {
                  const isAssigned = assignedProducts?.includes(product.id);
                  return (
                    <div 
                      key={product.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        isAssigned ? 'bg-primary/10 border-primary' : 'hover:bg-muted'
                      }`}
                      onClick={() => {
                        if (assigningTab) {
                          toggleProduct.mutate({ 
                            tabId: assigningTab.id, 
                            productId: product.id, 
                            isAssigned: !!isAssigned 
                          });
                        }
                      }}
                    >
                      <div className="h-10 w-10 rounded overflow-hidden bg-muted flex-shrink-0">
                        {product.images?.[0] ? (
                          <img src={product.images[0]} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Package className="h-full w-full p-2 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{product.name}</p>
                        {!product.is_active && (
                          <Badge variant="secondary" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <Switch checked={isAssigned} />
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No products found
                </div>
              )}
            </div>

            <DialogFooter>
              <Button onClick={() => setAssigningTab(null)}>
                Done
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SellerLayout>
  );
}