import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { applyProductWatermark } from '@/lib/watermark';
import { QUANTIS_STORE_ID } from '@/lib/constants';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { BulkProductActions } from '@/components/seller/BulkProductActions';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Eye,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Upload,
  X,
  FileCheck,
  Loader2,
  ImagePlus,
  Calendar,
  Save,
  Lock,
  ShieldCheck,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { validateImageQuality } from '@/lib/imageQuality';
import { hapticTap } from '@/lib/haptics';
import { ADMIN_MANAGED_STORES } from '@/lib/constants';

// Helper to check if product is managed by Eclipse/Vino (admin-only) - locked & read-only
const isAdminManagedProduct = (product: any) => 
  (ADMIN_MANAGED_STORES as readonly string[]).includes(product.store_id) && product.is_seller_product === false;

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
  name: '',
  slug: '',
  price: '',
  description: '',
  category_id: '',
  is_active: true,
  images: [],
  asset_file_url: '',
  additional_asset_files: [],
  schedule_enabled: false,
  release_at: '',
  is_pay_what_you_want: false,
};

const PRODUCTS_PER_PAGE = 20;

export default function SellerProducts() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const { limits } = useSellerSubscription();
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Debounce search to avoid excessive queries
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setCurrentPage(1); // Reset to page 1 on new search
    }, 300);
  };

  // Fetch categories with hierarchy
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('display_order')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Derived hierarchy for category selector
  const parentCats = categories?.filter((c: any) => !c.parent_id) || [];
  const childCatsMap = new Map<string, any[]>();
  categories?.forEach((c: any) => {
    if (c.parent_id) {
      const arr = childCatsMap.get(c.parent_id) || [];
      arr.push(c);
      childCatsMap.set(c.parent_id, arr);
    }
  });

  // Fetch seller's products with server-side pagination
  const { data: productsData, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products', store?.id, currentPage, debouncedSearch],
    queryFn: async () => {
      if (!store?.id) return { products: [], totalCount: 0 };
      
      const from = (currentPage - 1) * PRODUCTS_PER_PAGE;
      const to = from + PRODUCTS_PER_PAGE - 1;

      let query = supabase
        .from('products')
        .select('*, categories(name)', { count: 'exact' })
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (debouncedSearch) {
        query = query.ilike('name', `%${debouncedSearch}%`);
      }

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

  // Save product mutation
  const saveProduct = useMutation({
    mutationFn: async (data: ProductForm) => {
      if (!store?.id) throw new Error('Missing store');

      // Calculate release_at value
      let releaseAt: string | null = null;
      if (data.schedule_enabled && data.release_at) {
        releaseAt = new Date(data.release_at).toISOString();
      }

      const priceVal = parseFloat(data.price) || 0;
      // Generate a deterministic slug from the name (just for DB constraint)
      const autoSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);

      const productData: Record<string, any> = {
        name: data.name,
        slug: autoSlug || `product-${crypto.randomUUID().slice(0, 8)}`,
        price: priceVal,
        seller_price: priceVal,
        description: data.description,
        category_id: data.category_id || null,
        images: data.images || [],
        asset_file_url: data.asset_file_url || null,
        additional_asset_files: data.additional_asset_files || [],
        store_id: store!.id,
        is_seller_product: true,
        is_active: data.is_active !== undefined ? data.is_active : false,
        moderation_status: 'pending',
        release_at: data.release_at || null,
        is_pay_what_you_want: data.is_pay_what_you_want || false,
      };

      if (data.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', data.id)
          .eq('store_id', store!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData as any);

        if (error) {
          if (error.message?.includes('duplicate') || error.code === '23505') {
            // Retry with timestamp suffix on collision
            productData.slug = autoSlug + '-' + Date.now();
            const { error: retryError } = await supabase
              .from('products')
              .insert(productData as any);
            if (retryError) throw retryError;
          } else {
            throw error;
          }
        }
      }
    },
    onSuccess: (_data, variables) => {
      toast.success(variables.id ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setIsDialogOpen(false);
      setForm(INITIAL_FORM);

      // Send Discord announcement for new auto-approved products
      if (!variables.id) {
        // Fetch the newly created product to get its ID
        supabase
          .from('products')
          .select('id')
          .eq('store_id', store!.id)
          .eq('slug', variables.slug)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()
          .then(({ data: newProduct }) => {
            if (newProduct) {
              supabase.functions.invoke('send-product-drop-webhook', {
                body: { productId: newProduct.id, isEarlyAccess: false },
              }).then(({ error }) => {
                if (error) console.error('Discord product drop announce failed:', error);
              });
            }
          });
      }
    },
    onError: (error) => {
      toast.error('Failed to save product: ' + error.message);
    },
  });

  // Delete product mutation
  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', store?.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setDeleteProductId(null);
    },
    onError: (error) => {
      toast.error('Failed to delete product: ' + error.message);
    },
  });


  // Helper function to format datetime for input
  const formatDateTimeForInput = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // Helper to check if product is scheduled for future
  const isScheduledForFuture = (releaseAt: string | null) => {
    if (!releaseAt) return false;
    return new Date(releaseAt) > new Date();
  };

  // Open dialog for editing
  const openEdit = (product: any) => {
    // Prevent editing admin-managed products (Eclipse/Vino)
    if (isAdminManagedProduct(product)) {
      toast.info('This product is managed by Eclipse admins and cannot be edited here.');
      return;
    }
    
    hapticTap();
    const hasSchedule = !!product.release_at && isScheduledForFuture(product.release_at);
    setForm({
      id: product.id,
      name: product.name || '',
      slug: product.slug || '',
      price: product.price?.toString() || '',
      description: product.description || '',
      category_id: product.category_id || '',
      is_active: product.is_active ?? true,
      images: product.images || [],
      asset_file_url: product.asset_file_url || '',
      additional_asset_files: (product as any).additional_asset_files || [],
      schedule_enabled: hasSchedule,
      release_at: formatDateTimeForInput(product.release_at),
      is_pay_what_you_want: product.is_pay_what_you_want ?? false,
    });
    setIsDialogOpen(true);
  };

  // Open dialog for creating
  const openCreate = () => {
    hapticTap();
    setForm(INITIAL_FORM);
    setIsDialogOpen(true);
  };

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (form.images.length >= 8) {
      toast.error('Maximum 8 images allowed per product');
      return;
    }

    setIsUploadingImage(true);
    try {
      let uploadedCount = 0;
      for (const file of Array.from(files)) {
        if (form.images.length + uploadedCount >= 8) break;

        // Quality check
        const quality = await validateImageQuality(file);
        if (!quality.valid) {
          toast.error(quality.reason || 'Image does not meet quality standards');
          continue;
        }

        toast.info('Scanning image...', { id: 'img-scan' });
        const scanResult = await performSecurityScan(file, { skipLuaAnalysis: true });
        
        if (!scanResult.isAllowed) {
          toast.dismiss('img-scan');
          toast.error(scanResult.reason || 'Image blocked');
          continue;
        }
        toast.dismiss('img-scan');

        const fileExt = file.name.split('.').pop();
        const fileName = `${store?.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { contentType: file.type });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        // Apply Quantis watermark only for Quantis store products
        const finalUrl = store?.id === QUANTIS_STORE_ID
          ? await applyProductWatermark(publicUrl, fileName)
          : publicUrl;

        setForm(prev => ({
          ...prev,
          images: [...prev.images, finalUrl],
        }));
        uploadedCount++;
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} image(s) uploaded successfully`);
      } else {
        toast.warning('No images were uploaded — check the errors above');
      }
    } catch (error: any) {
      toast.error('Failed to upload images: ' + error.message);
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
    }
  };

  // Handle asset file upload
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      toast.info('Scanning file for threats...', { id: 'asset-scan' });
      const scanResult = await performSecurityScan(file, { skipNsfwCheck: true });
      
      if (!scanResult.isAllowed) {
        toast.dismiss('asset-scan');
        toast.error(scanResult.reason || 'File blocked by security scan');
        return;
      }
      
      if (scanResult.luaRiskLevel === 'medium' && scanResult.luaConcerns?.length) {
        toast.warning(`File has concerns: ${scanResult.luaConcerns.join(', ')}`, { duration: 8000 });
      }
      
      toast.dismiss('asset-scan');

      const fileExt = file.name.split('.').pop();
      const fileName = `${store?.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      setForm(prev => ({
        ...prev,
        asset_file_url: fileName,
      }));

      toast.success('Asset file uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload asset: ' + error.message);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Remove asset file
  const removeAssetFile = () => {
    setForm(prev => ({ ...prev, asset_file_url: '' }));
  };

  // Handle additional file upload
  const handleAdditionalFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const totalFiles = (form.asset_file_url ? 1 : 0) + form.additional_asset_files.length + 1;
    if (totalFiles > limits.maxProductFiles) {
      toast.error(`Your plan allows ${limits.maxProductFiles} file(s) per product. Upgrade to Pro for more.`);
      return;
    }

    setIsUploading(true);
    try {
      toast.info('Scanning file for threats...', { id: 'additional-scan' });
      const scanResult = await performSecurityScan(file, { skipNsfwCheck: true });
      if (!scanResult.isAllowed) {
        toast.dismiss('additional-scan');
        toast.error(scanResult.reason || 'File blocked by security scan');
        return;
      }
      toast.dismiss('additional-scan');

      const fileExt = file.name.split('.').pop();
      const fileName = `${store?.id}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-assets')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      setForm(prev => ({
        ...prev,
        additional_asset_files: [...prev.additional_asset_files, fileName],
      }));
      toast.success('Additional file uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload file: ' + error.message);
    } finally {
      setIsUploading(false);
      if (additionalFileInputRef.current) additionalFileInputRef.current.value = '';
    }
  };

  // Remove additional file
  const removeAdditionalFile = (index: number) => {
    setForm(prev => ({
      ...prev,
      additional_asset_files: prev.additional_asset_files.filter((_, i) => i !== index),
    }));
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!form.is_pay_what_you_want && (!form.price || parseFloat(form.price) <= 0)) {
      toast.error('Please enter a valid price');
      return;
    }
    saveProduct.mutate(form);
  };

  const filteredProducts = products;

  const getModerationBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-500">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            Live
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-destructive">
            <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
            Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-yellow-500">
            <span className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
            Pending
          </span>
        );
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <SellerLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-2xl font-display font-bold">Products</h1>
            <p className="text-sm text-muted-foreground">
              Manage your store's product catalog
            </p>
          </div>
          <div className="flex gap-2 shrink-0">
            {store?.slug && (
              <Button variant="outline" size="sm" asChild>
                <Link to={`/store/${store.slug}`}>
                  <Eye className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">View Store</span>
                </Link>
              </Button>
            )}
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Add Product</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>
        </div>

        {/* Stats + Search row */}
        <div className="space-y-3">
          {!productsLoading && (
            <div className="flex items-center gap-4 text-sm">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">{totalCount}</span> total
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-green-500">{products.filter((p: any) => p.moderation_status === 'approved' && p.is_active).length}</span> live
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-yellow-500">{products.filter((p: any) => p.moderation_status === 'pending').length}</span> pending
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-muted-foreground">{products.filter((p: any) => !p.is_active).length}</span> inactive
              </span>
            </div>
          )}

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 h-10"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {filteredProducts.length > 0 && store?.id && (
          <BulkProductActions
            products={filteredProducts}
            storeId={store.id}
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
          />
        )}

        {/* Products - Mobile List */}
        <div className="block md:hidden">
          {productsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="divide-y divide-border">
              {filteredProducts.map((product: any) => {
                const isLocked = isAdminManagedProduct(product);
                return (
                  <div
                    key={product.id}
                    className={`py-3 flex items-start gap-3 ${isLocked ? 'opacity-75' : 'cursor-pointer active:bg-muted/30'}`}
                    onClick={() => !isLocked && openEdit(product)}
                  >
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate text-sm">{product.name}</p>
                        {isLocked && (
                          <Badge variant="secondary" className="gap-1 text-xs flex-shrink-0">
                            <ShieldCheck className="h-3 w-3" />
                            Eclipse
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
                        <span className="text-muted-foreground text-xs">·</span>
                        {getModerationBadge(product.moderation_status)}
                        {!product.is_active && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    {isLocked ? (
                      <Lock className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    ) : (
                      <Edit className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1" />
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="text-sm font-medium mb-1">No products yet</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Start by adding your first product.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          )}
        </div>

        {/* Products Table - Desktop */}
        <div className="hidden md:block border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/30">
            <p className="text-sm font-medium">Products ({totalCount})</p>
          </div>
          {productsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Downloads</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProducts.map((product: any) => {
                    const isLocked = isAdminManagedProduct(product);
                    return (
                      <TableRow 
                        key={product.id}
                        className={isLocked ? 'opacity-75' : 'cursor-pointer hover:bg-muted/50'}
                        onClick={() => !isLocked && openEdit(product)}
                      >
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={selectedProductIds.includes(product.id)}
                            onCheckedChange={() => {
                              if (selectedProductIds.includes(product.id)) {
                                setSelectedProductIds(selectedProductIds.filter(id => id !== product.id));
                              } else {
                                setSelectedProductIds([...selectedProductIds, product.id]);
                              }
                            }}
                            aria-label="Select product"
                            disabled={isLocked}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {product.images?.[0] ? (
                              <img
                                src={product.images[0]}
                                alt={product.name}
                                className="h-10 w-10 rounded object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
                                <Package className="h-5 w-5 text-muted-foreground" />
                              </div>
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium">{product.name}</p>
                                {isLocked && (
                                  <Badge variant="secondary" className="gap-1 text-xs">
                                    <ShieldCheck className="h-3 w-3" />
                                    Eclipse
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {new Date(product.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {(product.categories as any)?.name || 'Uncategorized'}
                        </TableCell>
                        <TableCell className="text-sm">{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getModerationBadge(product.moderation_status)}
                            {!product.is_active && (
                              <Badge variant="outline" className="block w-fit text-[10px]">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{product.download_count || 0}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          {isLocked ? (
                            <Button variant="ghost" size="icon" disabled title="Managed by Eclipse admins">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </Button>
                          ) : (
                            <>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDeleteProductId(product.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-12">
              <Package className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <h3 className="text-sm font-medium mb-1">No products yet</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Start by adding your first product.
              </p>
              <Button size="sm" onClick={openCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4">
            <p className="text-xs text-muted-foreground">
              {((currentPage - 1) * PRODUCTS_PER_PAGE) + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-xs font-medium px-1">
                {currentPage}/{totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-4">
          <AlertCircle className="h-3.5 w-3.5" />
          All new products are reviewed within 24-48 hours before going live.
        </p>

        {/* Product Edit/Create Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{form.id ? 'Edit Product' : 'Create Product'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ 
                    ...form, 
                    name: e.target.value,
                  })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (£) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={form.category_id} 
                    onValueChange={(v) => setForm({ ...form, category_id: v === '__none__' ? '' : v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">No category</SelectItem>
                      {parentCats.map((parent: any) => {
                        const children = childCatsMap.get(parent.id) || [];
                        if (children.length > 0) {
                          return (
                            <SelectGroup key={parent.id}>
                              <SelectLabel>{parent.name}</SelectLabel>
                              {children.map((child: any) => (
                                <SelectItem key={child.id} value={child.id} className="pl-6">
                                  {child.name}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          );
                        }
                        return (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description <span className="text-destructive">*</span></Label>
                <RichTextEditor
                  content={form.description}
                  onChange={(content) => setForm({ ...form, description: content })}
                  placeholder="Describe your product (min. 100 characters)..."
                />
                <p className="text-xs text-muted-foreground">
                  {form.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length}/100 characters minimum
                </p>
              </div>

              {/* Product Images */}
              <div className="space-y-2">
                <Label>Product Images</Label>
                <input
                  type="file"
                  ref={imageInputRef}
                  onChange={handleImageUpload}
                  accept="image/*"
                  multiple
                  className="hidden"
                />
                
                {form.images.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {form.images.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img 
                          src={url} 
                          alt="" 
                          className="h-16 w-16 object-cover rounded-lg border"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage || form.images.length >= 8}
                  className="w-full"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Add Images ({form.images.length}/8)
                    </>
                  )}
                </Button>
              </div>

              {/* Downloadable Files */}
              <div className="space-y-2">
                <Label>
                  Downloadable Files <span className="text-destructive">*</span>
                  <span className="text-xs text-muted-foreground ml-2">
                    ({(form.asset_file_url ? 1 : 0) + form.additional_asset_files.length}/{limits.maxProductFiles})
                  </span>
                </Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAssetUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={additionalFileInputRef}
                  onChange={handleAdditionalFileUpload}
                  className="hidden"
                />

                {/* Main file */}
                {form.asset_file_url ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <span className="flex-1 text-sm truncate">{form.asset_file_url.split('/').pop()}</span>
                    <Badge variant="secondary" className="text-xs">Main</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={removeAssetFile}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Main File
                      </>
                    )}
                  </Button>
                )}

                {/* Additional files */}
                {form.additional_asset_files.map((file, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <span className="flex-1 text-sm truncate">{file.split('/').pop()}</span>
                    <Badge variant="outline" className="text-xs">Extra</Badge>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeAdditionalFile(index)}
                      className="h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}

                {/* Add more files button */}
                {form.asset_file_url && (form.asset_file_url ? 1 : 0) + form.additional_asset_files.length < limits.maxProductFiles && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => additionalFileInputRef.current?.click()}
                    disabled={isUploading}
                    className="w-full"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mr-2" />
                        Add Another File
                      </>
                    )}
                  </Button>
                )}

                <p className="text-xs text-muted-foreground">
                  {limits.maxProductFiles === 1 
                    ? 'Upload the file customers will download. Upgrade to Pro for up to 3 files per product.'
                    : `Upload up to ${limits.maxProductFiles} files per product.`
                  }
                </p>
              </div>

              {/* Active Switch */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Make visible when approved
                  </p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
                />
              </div>

              {/* Scheduled Release */}
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      Schedule Release
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Set a future date for this product to go live
                    </p>
                  </div>
                  <Switch
                    checked={form.schedule_enabled}
                    onCheckedChange={(checked) => setForm({ 
                      ...form, 
                      schedule_enabled: checked,
                      release_at: checked ? form.release_at : '',
                    })}
                  />
                </div>

                {form.schedule_enabled && (
                  <div className="space-y-2 pt-2">
                    <Label htmlFor="release_at" className="flex items-center gap-2 text-amber-500">
                      <Clock className="h-4 w-4" />
                      Release Date & Time
                    </Label>
                    <Input
                      id="release_at"
                      type="datetime-local"
                      value={form.release_at}
                      onChange={(e) => setForm({ ...form, release_at: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="bg-background"
                    />
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={saveProduct.isPending}
              >
                {saveProduct.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    {form.id ? 'Update Product' : 'Create Product'}
                  </>
                )}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Product</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this product? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteProductId && deleteProduct.mutate(deleteProductId)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </SellerLayout>
  );
}
