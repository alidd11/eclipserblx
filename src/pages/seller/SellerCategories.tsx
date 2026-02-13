import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { LayoutGrid, Search, Check, Package, Folder, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
  parent_id: string | null;
}

interface StoreCategory {
  id: string;
  store_id: string;
  category_id: string;
  is_enabled: boolean;
  display_order: number;
}

export default function SellerCategories() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedParents, setExpandedParents] = useState<Set<string>>(new Set());

  // Fetch all global categories including parent_id
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['global-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, icon, description, parent_id')
        .order('display_order')
        .order('name');
      if (error) throw error;
      return data as Category[];
    },
  });

  // Fetch store's enabled categories
  const { data: storeCategories, isLoading: storeCategoriesLoading } = useQuery({
    queryKey: ['store-categories', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data, error } = await supabase
        .from('store_categories')
        .select('*')
        .eq('store_id', store.id);
      if (error) throw error;
      return data as StoreCategory[];
    },
    enabled: !!store?.id,
  });

  // Derived: parent categories and children lookup
  const parentCategories = categories?.filter(c => !c.parent_id) || [];
  const childrenMap = new Map<string, Category[]>();
  categories?.forEach(c => {
    if (c.parent_id) {
      const existing = childrenMap.get(c.parent_id) || [];
      existing.push(c);
      childrenMap.set(c.parent_id, existing);
    }
  });

  // Toggle category mutation
  const toggleCategory = useMutation({
    mutationFn: async ({ categoryId, isEnabled }: { categoryId: string; isEnabled: boolean }) => {
      if (!store?.id) throw new Error('No store found');
      const existing = storeCategories?.find(sc => sc.category_id === categoryId);
      if (existing) {
        const { error } = await supabase
          .from('store_categories')
          .update({ is_enabled: isEnabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('store_categories')
          .insert({
            store_id: store.id,
            category_id: categoryId,
            is_enabled: isEnabled,
            display_order: storeCategories?.length || 0,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    },
    onError: (error) => {
      toast.error('Failed to update category: ' + error.message);
    },
  });

  // Toggle parent + all children
  const toggleParentWithChildren = useMutation({
    mutationFn: async ({ parentId, isEnabled }: { parentId: string; isEnabled: boolean }) => {
      if (!store?.id) throw new Error('No store found');
      const children = childrenMap.get(parentId) || [];
      const allIds = [parentId, ...children.map(c => c.id)];

      const upserts = allIds.map((catId, index) => ({
        store_id: store.id,
        category_id: catId,
        is_enabled: isEnabled,
        display_order: index,
      }));

      const { error } = await supabase
        .from('store_categories')
        .upsert(upserts, { onConflict: 'store_id,category_id', ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
    },
    onError: (error) => {
      toast.error('Failed to update categories: ' + error.message);
    },
  });

  // Enable all categories
  const enableAll = useMutation({
    mutationFn: async () => {
      if (!store?.id || !categories) throw new Error('No store or categories');
      const inserts = categories.map((cat, index) => ({
        store_id: store.id,
        category_id: cat.id,
        is_enabled: true,
        display_order: index,
      }));
      const { error } = await supabase
        .from('store_categories')
        .upsert(inserts, { onConflict: 'store_id,category_id', ignoreDuplicates: false });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
      toast.success('All categories enabled');
    },
    onError: (error) => {
      toast.error('Failed to enable all: ' + error.message);
    },
  });

  // Disable all categories
  const disableAll = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store found');
      const { error } = await supabase
        .from('store_categories')
        .update({ is_enabled: false })
        .eq('store_id', store.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-categories'] });
      toast.success('All categories disabled');
    },
    onError: (error) => {
      toast.error('Failed to disable all: ' + error.message);
    },
  });

  // Check if category is enabled
  const isCategoryEnabled = (categoryId: string) => {
    return storeCategories?.find(sc => sc.category_id === categoryId)?.is_enabled ?? false;
  };

  // Check if all children of a parent are enabled
  const areAllChildrenEnabled = (parentId: string) => {
    const children = childrenMap.get(parentId) || [];
    if (children.length === 0) return isCategoryEnabled(parentId);
    return children.every(c => isCategoryEnabled(c.id));
  };

  // Check if some children are enabled
  const areSomeChildrenEnabled = (parentId: string) => {
    const children = childrenMap.get(parentId) || [];
    if (children.length === 0) return isCategoryEnabled(parentId);
    return children.some(c => isCategoryEnabled(c.id));
  };

  // Toggle expanded state
  const toggleExpanded = (parentId: string) => {
    setExpandedParents(prev => {
      const next = new Set(prev);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  // Filter by search
  const filteredParents = parentCategories.filter(parent => {
    const children = childrenMap.get(parent.id) || [];
    const parentMatches = parent.name.toLowerCase().includes(searchQuery.toLowerCase());
    const childMatches = children.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
    return parentMatches || childMatches;
  });

  const enabledCount = storeCategories?.filter(sc => sc.is_enabled).length || 0;
  const isLoading = categoriesLoading || storeCategoriesLoading;

  return (
    <SellerLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold">Store Categories</h1>
            <p className="text-muted-foreground">
              Enable categories from the marketplace to organize your products
            </p>
          </div>
        </div>

        {/* Stats & Actions */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          <Badge variant="secondary" className="text-sm">
            <Check className="h-3.5 w-3.5 mr-1" />
            {enabledCount} enabled
          </Badge>
          <Badge variant="outline" className="text-sm">
            <Folder className="h-3.5 w-3.5 mr-1" />
            {categories?.length || 0} total
          </Badge>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => enableAll.mutate()} disabled={enableAll.isPending}>
            Enable All
          </Button>
          <Button variant="outline" size="sm" onClick={() => disableAll.mutate()} disabled={disableAll.isPending}>
            Disable All
          </Button>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search categories..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Hierarchical Categories List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Marketplace Categories
            </CardTitle>
            <CardDescription>
              Toggle categories to show them in your store. Toggling a parent enables/disables all sub-categories.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(i => (
                  <Skeleton key={i} className="h-14" />
                ))}
              </div>
            ) : filteredParents.length > 0 ? (
              <div className="space-y-1">
                {filteredParents.map((parent) => {
                  const children = childrenMap.get(parent.id) || [];
                  const hasChildren = children.length > 0;
                  const isExpanded = expandedParents.has(parent.id);
                  const allEnabled = areAllChildrenEnabled(parent.id);
                  const someEnabled = areSomeChildrenEnabled(parent.id);

                  return (
                    <div key={parent.id}>
                      {/* Parent row */}
                      <div
                        className={`flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${
                          allEnabled
                            ? 'bg-primary/5 border-primary/30'
                            : someEnabled
                            ? 'bg-primary/[0.02] border-border'
                            : 'bg-card border-border hover:bg-muted/50'
                        }`}
                      >
                        {hasChildren ? (
                          <button
                            type="button"
                            onClick={() => toggleExpanded(parent.id)}
                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted/80 transition-transform"
                          >
                            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                          </button>
                        ) : (
                          <div className="h-6 w-6" />
                        )}

                        <div
                          className={`h-9 w-9 rounded-lg flex items-center justify-center ${
                            allEnabled ? 'bg-primary/10' : 'bg-muted'
                          }`}
                        >
                          <Package className={`h-4.5 w-4.5 ${allEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>

                        <div
                          className="flex-1 min-w-0 cursor-pointer"
                          onClick={() => hasChildren && toggleExpanded(parent.id)}
                        >
                          <p className={`font-medium truncate ${allEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {parent.name}
                          </p>
                          {hasChildren && (
                            <p className="text-xs text-muted-foreground">
                              {children.filter(c => isCategoryEnabled(c.id)).length}/{children.length} sub-categories enabled
                            </p>
                          )}
                        </div>

                        <Switch
                          checked={allEnabled}
                          onCheckedChange={(checked) => {
                            if (hasChildren) {
                              toggleParentWithChildren.mutate({ parentId: parent.id, isEnabled: checked });
                            } else {
                              toggleCategory.mutate({ categoryId: parent.id, isEnabled: checked });
                            }
                          }}
                        />
                      </div>

                      {/* Children */}
                      <AnimatePresence>
                        {hasChildren && isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden"
                          >
                            <div className="ml-8 pl-4 border-l border-border space-y-1 py-1">
                              {children
                                .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()) || !searchQuery)
                                .map(child => {
                                  const childEnabled = isCategoryEnabled(child.id);
                                  return (
                                    <div
                                      key={child.id}
                                      className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors cursor-pointer ${
                                        childEnabled ? 'bg-primary/5' : 'hover:bg-muted/50'
                                      }`}
                                      onClick={() => toggleCategory.mutate({ categoryId: child.id, isEnabled: !childEnabled })}
                                    >
                                      <div className={`h-7 w-7 rounded flex items-center justify-center ${
                                        childEnabled ? 'bg-primary/10' : 'bg-muted'
                                      }`}>
                                        <Package className={`h-3.5 w-3.5 ${childEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
                                      </div>
                                      <p className={`flex-1 text-sm truncate ${childEnabled ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {child.name}
                                      </p>
                                      <Switch
                                        checked={childEnabled}
                                        onCheckedChange={(checked) => {
                                          toggleCategory.mutate({ categoryId: child.id, isEnabled: checked });
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="scale-90"
                                      />
                                    </div>
                                  );
                                })}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <LayoutGrid className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Categories Found</h3>
                <p className="text-muted-foreground">
                  {searchQuery ? 'Try a different search term' : 'No categories available'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <LayoutGrid className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium mb-1">How Categories Work</h4>
                <p className="text-sm text-muted-foreground">
                  Enabled categories will appear in your store's sidebar, allowing customers to filter 
                  your products. When you upload a product, you can assign it to any of the marketplace 
                  categories. Only categories you've enabled will be visible to your customers.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
