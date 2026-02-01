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
import { LayoutGrid, Search, Check, X, Package, Folder } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  slug: string;
  icon: string | null;
  description: string | null;
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

  // Fetch all global categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['global-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name, slug, icon, description')
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

  // Toggle category mutation
  const toggleCategory = useMutation({
    mutationFn: async ({ categoryId, isEnabled }: { categoryId: string; isEnabled: boolean }) => {
      if (!store?.id) throw new Error('No store found');

      // Check if record exists
      const existing = storeCategories?.find(sc => sc.category_id === categoryId);

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from('store_categories')
          .update({ is_enabled: isEnabled })
          .eq('id', existing.id);
        if (error) throw error;
      } else {
        // Insert new record
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

      // Use upsert to handle existing records
      const { error } = await supabase
        .from('store_categories')
        .upsert(inserts, { 
          onConflict: 'store_id,category_id',
          ignoreDuplicates: false 
        });
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

  // Filter categories by search
  const filteredCategories = categories?.filter(cat => 
    cat.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Check if category is enabled
  const isCategoryEnabled = (categoryId: string) => {
    const storeCategory = storeCategories?.find(sc => sc.category_id === categoryId);
    return storeCategory?.is_enabled ?? false;
  };

  // Count enabled categories
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => enableAll.mutate()}
            disabled={enableAll.isPending}
          >
            Enable All
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => disableAll.mutate()}
            disabled={disableAll.isPending}
          >
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

        {/* Categories Grid */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LayoutGrid className="h-5 w-5" />
              Marketplace Categories
            </CardTitle>
            <CardDescription>
              Toggle categories to show them in your store's sidebar. Only enabled categories will appear.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredCategories.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {filteredCategories.map((category) => {
                  const isEnabled = isCategoryEnabled(category.id);
                  return (
                    <div
                      key={category.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border transition-colors cursor-pointer ${
                        isEnabled 
                          ? 'bg-primary/5 border-primary/30' 
                          : 'bg-card hover:bg-muted/50'
                      }`}
                      onClick={() => toggleCategory.mutate({ 
                        categoryId: category.id, 
                        isEnabled: !isEnabled 
                      })}
                    >
                      <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                        isEnabled ? 'bg-primary/10' : 'bg-muted'
                      }`}>
                        <Package className={`h-5 w-5 ${
                          isEnabled ? 'text-primary' : 'text-muted-foreground'
                        }`} />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className={`font-medium truncate ${
                          isEnabled ? 'text-foreground' : 'text-muted-foreground'
                        }`}>
                          {category.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          /{category.slug}
                        </p>
                      </div>

                      <Switch 
                        checked={isEnabled}
                        onCheckedChange={(checked) => {
                          toggleCategory.mutate({ categoryId: category.id, isEnabled: checked });
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
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
