import { useState, useRef } from 'react';
import { sanitizeSearch } from '@/lib/searchUtils';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { QUANTIS_STORE_ID } from '@/lib/constants';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Eye,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { hapticTap } from '@/lib/haptics';
import { ADMIN_MANAGED_STORES } from '@/lib/constants';
import { SellerProductFormDialog } from '@/components/seller/products/SellerProductFormDialog';
import { SellerProductsList } from '@/components/seller/products/SellerProductsList';

interface ProductForm {
  id?: string;
  name: string;
  slug: string;
  price: string;
  description: string;
  category_id: string;
  is_active: boolean;
  images: string[];
  asset_file_url: string;
  additional_asset_files: string[];
  schedule_enabled: boolean;
  release_at: string;
  is_pay_what_you_want: boolean;
}

const INITIAL_FORM: ProductForm = {
  name: '', slug: '', price: '', description: '', category_id: '',
  is_active: true, images: [], asset_file_url: '', additional_asset_files: [],
  schedule_enabled: false, release_at: '', is_pay_what_you_want: false,
};

const PRODUCTS_PER_PAGE = 20;

const isAdminManagedProduct = (product: { store_id: string; is_seller_product: boolean }) =>
  (ADMIN_MANAGED_STORES as readonly string[]).includes(product.store_id) && product.is_seller_product === false;

export default function SellerProducts() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const { limits } = useSellerSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1);
    }, 300);
  };

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('display_order').order('name');
      if (error) throw error;
      return data;
    },
  });

  const parentCats = categories?.filter((c) => !c.parent_id) || [];
  const childCatsMap = new Map<string, typeof parentCats>();
  categories?.forEach((c) => {
    if (c.parent_id) {
      const arr = childCatsMap.get(c.parent_id) || [];
      arr.push(c);
      childCatsMap.set(c.parent_id, arr);
    }
  });

  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products', store?.id, currentPage, debouncedSearch],
    queryFn: async () => {
      if (!store?.id) return { products: [], totalCount: 0 };
      const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
      const to = from + PRODUCTS_PER_PAGE - 1;
      let query = supabase.from('products').select('*, categories(name)', { count: 'exact' }).eq('store_id', store.id).order('created_at', { ascending: false });
      if (debouncedSearch) query = query.ilike('name', `%${sanitizeSearch(debouncedSearch)}%`);
      const { data, error, count } = await query.range(from, to);
      if (error) throw error;
      return { products: data || [], totalCount: count || 0 };
    },
    enabled: !!store?.id,
    staleTime: 2 * 60_000,
  });

  const products = productsData?.products || [];
  const totalCount = productsData?.totalCount || 0;
  const totalPages = Math.ceil(totalCount / PRODUCTS_PER_PAGE);

  const saveProduct = useMutation({
    mutationFn: async (data: ProductForm) => {
      if (!store?.id) throw new Error('Missing store');
      const priceVal = parseFloat(data.price) || 0;
      const autoSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
      const productData: Record<string, any> = {
        name: data.name, slug: autoSlug || `product-${crypto.randomUUID().slice(0, 8)}`,
        price: priceVal, seller_price: priceVal, description: data.description,
        category_id: data.category_id || null, images: data.images || [],
        asset_file_url: data.asset_file_url || null, additional_asset_files: data.additional_asset_files || [],
        store_id: store!.id, is_seller_product: true,
        is_active: data.is_active !== undefined ? data.is_active : false,
        moderation_status: 'pending', release_at: data.release_at || null,
        is_pay_what_you_want: data.is_pay_what_you_want || false,
      };
      if (data.id) {
        const { error } = await supabase.from('products').update(productData).eq('id', data.id).eq('store_id', store!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert(productData as any);
        if (error) {
          if (error.message?.includes('duplicate') || error.code === '23505') {
            productData.slug = autoSlug + '-' + Date.now();
            const { error: retryError } = await supabase.from('products').insert(productData as any);
            if (retryError) throw retryError;
          } else throw error;
        }
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.id ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setIsDialogOpen(false);
      setForm(INITIAL_FORM);
      if (!variables.id) {
        supabase.from('products').select('id').eq('store_id', store!.id).eq('slug', variables.slug).order('created_at', { ascending: false }).limit(1).single().then(({ data: newProduct }) => {
          if (newProduct) {
            supabase.functions.invoke('send-product-drop-webhook', { body: { productId: newProduct.id, isEarlyAccess: false } });
          }
        });
      }
    },
    onError: (error) => toast.error('Failed to save product: ' + error.message),
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from('products').delete().eq('id', productId).eq('store_id', store?.id ?? '');
      if (error) throw error;
    },
    onSuccess: () => { toast.success('Product deleted'); queryClient.invalidateQueries({ queryKey: ['seller-products'] }); setDeleteProductId(null); },
    onError: (error) => toast.error('Failed: ' + error.message),
  });

  const formatDateTimeForInput = (isoString: string | null) => {
    if (!isoString) return '';
    const d = new Date(isoString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const isScheduledForFuture = (releaseAt: string | null) => releaseAt ? new Date(releaseAt) > new Date() : false;

  const openEdit = (product: NonNullable<typeof products>[number]) => {
    if (isAdminManagedProduct(product)) { toast.info('This product is managed by Eclipse admins.'); return; }
    hapticTap();
    const hasSchedule = !!product.release_at && isScheduledForFuture(product.release_at);
    setForm({
      id: product.id, name: product.name || '', slug: product.slug || '',
      price: product.price?.toString() || '', description: product.description || '',
      category_id: product.category_id || '', is_active: product.is_active ?? true,
      images: product.images || [], asset_file_url: product.asset_file_url || '',
      additional_asset_files: (product as any).additional_asset_files || [],
      schedule_enabled: hasSchedule, release_at: formatDateTimeForInput(product.release_at),
      is_pay_what_you_want: product.is_pay_what_you_want ?? false,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => { hapticTap(); setForm(INITIAL_FORM); setIsDialogOpen(true); };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error('Please enter a product name'); return; }
    if (!form.is_pay_what_you_want && (!form.price || parseFloat(form.price) <= 0)) { toast.error('Please enter a valid price'); return; }
    saveProduct.mutate(form);
  };

  return (
    <SellerLayout>
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">Manage your store's product catalog</p>
          </div>
          <div className="flex gap-2 shrink-0">
            {store?.slug && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/store/${store.slug}`}><Eye className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">View Store</span></Link>
              </Button>
            )}
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4 mr-1.5" /><span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span></Button>
          </div>
        </div>

        <div className="space-y-3">
          {!productsLoading && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground"><span className="font-semibold text-foreground">{totalCount}</span> total</span>
              <span className="text-muted-foreground"><span className="font-semibold text-green-500">{products.filter((p) => p.moderation_status === 'approved' && p.is_active).length}</span> live</span>
              <span className="text-muted-foreground"><span className="font-semibold text-yellow-500">{products.filter((p) => p.moderation_status === 'pending').length}</span> pending</span>
              <span className="text-muted-foreground"><span className="font-semibold text-muted-foreground">{products.filter((p) => !p.is_active).length}</span> inactive</span>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={searchQuery} onChange={(e) => handleSearchChange(e.target.value)} className="pl-10 h-10" />
          </div>
        </div>

        <SellerProductsList
          products={products}
          totalCount={totalCount}
          isLoading={productsLoading}
          storeId={store?.id}
          selectedProductIds={selectedProductIds}
          onSelectionChange={setSelectedProductIds}
          onEdit={openEdit}
          onDelete={setDeleteProductId}
          onCreateClick={openCreate}
        />

        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground tabular-nums">{((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount)} of {totalCount}</p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-xs font-medium tabular-nums px-1">{currentPage}/{totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          All new products are reviewed within 24-48 hours before going live.
        </p>

        <SellerProductFormDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          form={form}
          setForm={setForm}
          onSubmit={handleSubmit}
          isPending={saveProduct.isPending}
          storeId={store?.id}
          parentCats={parentCats}
          childCatsMap={childCatsMap}
          limits={limits}
        />

        <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>Are you sure? This action cannot be undone.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => deleteProductId && deleteProduct.mutate(deleteProductId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SellerLayout>
  );
}
