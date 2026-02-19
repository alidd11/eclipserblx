import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Search, Upload, FileCheck, X, Loader2, ImagePlus, Video, CheckSquare, Square, Edit3, Clock, Calendar, Store, Crown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SortableMediaItem } from '@/components/admin/SortableMediaItem';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { ECLIPSE_STORE_ID, VINO_STORE_ID } from '@/lib/constants';

interface ProductForm {
  id?: string;
  name: string;
  slug: string;
  price: string;
  description: string;
  category_id: string;
  is_active: boolean;
  is_featured: boolean;
  is_resellable: boolean;
  images: string;
  asset_file_url: string;
  release_at: string;
  schedule_enabled: boolean;
  early_access_enabled: boolean;
  early_access_hours: string;
  // Roblox / Robux configuration
  robux_enabled: boolean;
  robux_product_id: string;
  robux_price: string;
  // Marketplace store selection (null = no store, 'eclipse' or 'vino')
  marketplace_store: 'eclipse' | 'vino' | null;
}

const emptyForm: ProductForm = {
  name: '',
  slug: '',
  price: '',
  description: '',
  category_id: '',
  is_active: true,
  is_featured: false,
  is_resellable: false, // Default to off - excludes from Eclipse+ discounts when true
  images: '',
  asset_file_url: '',
  release_at: '',
  schedule_enabled: false,
  early_access_enabled: false,
  early_access_hours: '',
  robux_enabled: false,
  robux_product_id: '',
  robux_price: '',
  marketplace_store: 'eclipse', // Default to Eclipse Store
};

interface MassEditForm {
  category_id: string | null;
  is_active: boolean | null;
  is_featured: boolean | null;
  price_adjustment_enabled: boolean;
  price_adjustment_type: 'percentage' | 'fixed';
  price_adjustment_value: string;
  price_adjustment_direction: 'increase' | 'decrease';
}

const emptyMassEditForm: MassEditForm = {
  category_id: null,
  is_active: null,
  is_featured: null,
  price_adjustment_enabled: false,
  price_adjustment_type: 'percentage',
  price_adjustment_value: '',
  price_adjustment_direction: 'increase',
};

export default function AdminProducts() {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStore, setFilterStore] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductForm>(emptyForm);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  
  // Mass edit state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isMassEditOpen, setIsMassEditOpen] = useState(false);
  const [massEditForm, setMassEditForm] = useState<MassEditForm>(emptyMassEditForm);
  const [massDeleteOpen, setMassDeleteOpen] = useState(false);
  
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('display_order');
      if (error) throw error;
      return data;
    },
  });

  const { data: stores } = useQuery({
    queryKey: ['admin-stores-filter'],
    queryFn: async () => {
      const { data, error } = await supabase.from('stores').select('id, name').order('name');
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products', search, filterCategory, filterStore, filterStatus],
    queryFn: async () => {
      let query = supabase.from('products').select(`*, categories(name)`).order('created_at', { ascending: false });
      if (search) query = query.ilike('name', `%${search}%`);
      if (filterCategory && filterCategory !== 'all') query = query.eq('category_id', filterCategory);
      if (filterStore && filterStore !== 'all') {
        if (filterStore === 'none') query = query.is('store_id', null);
        else query = query.eq('store_id', filterStore);
      }
      if (filterStatus === 'active') query = query.eq('is_active', true);
      else if (filterStatus === 'inactive') query = query.eq('is_active', false);
      else if (filterStatus === 'featured') query = query.eq('is_featured', true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 30000,
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Security scan for product assets (Roblox files, Lua scripts)
      toast.info('Scanning file for threats...', { id: 'security-scan' });
      const scanResult = await performSecurityScan(file, { skipNsfwCheck: true });
      
      if (!scanResult.isAllowed) {
        toast.dismiss('security-scan');
        toast.error(scanResult.reason || 'File blocked by security scan');
        return;
      }
      
      if (scanResult.luaRiskLevel === 'medium' && scanResult.luaConcerns?.length) {
        toast.warning(`File has concerns: ${scanResult.luaConcerns.join(', ')}`, { duration: 8000 });
      }
      
      toast.dismiss('security-scan');

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('product-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get the file path (not public URL since bucket is private)
      setForm({ ...form, asset_file_url: filePath });
      toast.success('File uploaded successfully');
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeAssetFile = async () => {
    if (form.asset_file_url) {
      try {
        await supabase.storage.from('product-assets').remove([form.asset_file_url]);
      } catch (error) {
        console.error('Failed to remove file:', error);
      }
    }
    setForm({ ...form, asset_file_url: '' });
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (type === 'image' && !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (type === 'video' && !file.type.startsWith('video/')) {
      toast.error('Please select a video file');
      return;
    }

    // Check max 8 media limit
    const currentMedia = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (currentMedia.length >= 8) {
      toast.error('Maximum 8 media files allowed per product');
      return;
    }

    if (type === 'image') {
      setIsUploadingImage(true);
    } else {
      setIsUploadingVideo(true);
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(fileName, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(fileName);

      // Add to media list
      const currentMedia = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [];
      currentMedia.push(publicUrl);
      setForm({ ...form, images: currentMedia.join(', ') });
      toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully`);
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      if (type === 'image') {
        setIsUploadingImage(false);
        if (imageInputRef.current) imageInputRef.current.value = '';
      } else {
        setIsUploadingVideo(false);
        if (videoInputRef.current) videoInputRef.current.value = '';
      }
    }
  };

  const removeMedia = (indexToRemove: number) => {
    const currentMedia = form.images.split(',').map(s => s.trim()).filter(Boolean);
    currentMedia.splice(indexToRemove, 1);
    setForm({ ...form, images: currentMedia.join(', ') });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const currentMedia = form.images.split(',').map(s => s.trim()).filter(Boolean);
      const oldIndex = currentMedia.findIndex((_, i) => `media-${i}` === active.id);
      const newIndex = currentMedia.findIndex((_, i) => `media-${i}` === over.id);
      const reordered = arrayMove(currentMedia, oldIndex, newIndex);
      setForm({ ...form, images: reordered.join(', ') });
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      const robuxPriceValue = data.robux_price?.trim()
        ? Number.parseInt(data.robux_price, 10)
        : null;

      // Calculate early access hours
      let earlyAccessHours: number | null = null;
      if (data.schedule_enabled && data.early_access_enabled) {
        earlyAccessHours = data.early_access_hours ? parseInt(data.early_access_hours) : null;
        // If enabled but no custom hours, we'll use null to indicate "use platform default"
      }

      const isEditing = !!data.id;
      
      // Find the original product to check if it's a seller product
      const originalProduct = isEditing ? products?.find(p => p.id === data.id) : null;
      const isSellerProduct = originalProduct?.is_seller_product === true;

      const payload: Record<string, any> = {
        name: data.name,
        slug: data.slug,
        price: parseFloat(data.price),
        description: data.description || null,
        category_id: data.category_id || null,
        is_active: data.is_active,
        is_featured: data.is_featured,
        is_resellable: data.is_resellable,
        images: data.images ? data.images.split(',').map(s => s.trim()) : [],
        asset_file_url: data.asset_file_url || null,
        release_at: data.schedule_enabled && data.release_at ? new Date(data.release_at).toISOString() : null,
        early_access_hours: earlyAccessHours,
        robux_enabled: data.robux_enabled,
        robux_product_id: data.robux_product_id?.trim() ? data.robux_product_id.trim() : null,
        robux_price:
          typeof robuxPriceValue === 'number' && Number.isFinite(robuxPriceValue)
            ? robuxPriceValue
            : null,
      };

      // Only set store/seller fields for non-seller products or new products
      // This prevents overwriting seller product metadata when admins edit them
      if (!isSellerProduct) {
        payload.store_id = data.marketplace_store === 'eclipse' 
          ? ECLIPSE_STORE_ID 
          : data.marketplace_store === 'vino' 
            ? VINO_STORE_ID 
            : null;
        payload.moderation_status = data.marketplace_store ? 'approved' : null;
        payload.is_seller_product = false;
      }

      const isNewProduct = !isEditing;

      if (data.id) {
        const { error } = await supabase.from('products').update(payload as any).eq('id', data.id);
        if (error) throw error;

        // Re-translate product in background on update
        supabase.functions.invoke('translate-product', {
          body: { productId: data.id },
        }).catch(err => console.error('Translation failed:', err));

      } else {
        const { data: newProduct, error } = await supabase.from('products').insert(payload as any).select().single();
        if (error) throw error;

        // Translate new product in background
        if (newProduct) {
          supabase.functions.invoke('translate-product', {
            body: { productId: newProduct.id },
          }).catch(err => console.error('Translation failed:', err));
        }

        // Send push notifications for new active products
        if (payload.is_active && newProduct) {
          // Get category name if available
          let categoryName: string | undefined;
          if (payload.category_id) {
            const category = categories?.find(c => c.id === payload.category_id);
            categoryName = category?.name;
          }

          // Notify subscribers in background (don't await to avoid blocking UI)
          supabase.functions.invoke('notify-new-product', {
            body: {
              product_id: newProduct.id,
              product_name: payload.name,
              product_slug: payload.slug,
              product_price: payload.price,
              category_name: categoryName,
            },
          }).then(result => {
            if (result.error) {
              console.error('Failed to notify subscribers:', result.error);
            } else {
              console.log('New product notifications sent:', result.data);
            }
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products-robux-status'] });
      setIsDialogOpen(false);
      setForm(emptyForm);
      toast.success(form.id ? 'Product updated' : 'Product created');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setDeleteId(null);
      toast.success('Product deleted');
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Mass edit mutation
  const massEditMutation = useMutation({
    mutationFn: async ({ 
      ids, 
      updates, 
      priceAdjustment 
    }: { 
      ids: string[]; 
      updates: Partial<{ category_id: string; is_active: boolean; is_featured: boolean }>; 
      priceAdjustment?: { type: 'percentage' | 'fixed'; value: number; direction: 'increase' | 'decrease' };
    }) => {
      // If we have regular updates, apply them
      if (Object.keys(updates).length > 0) {
        const { error } = await supabase
          .from('products')
          .update(updates)
          .in('id', ids);
        if (error) throw error;
      }
      
      // If we have price adjustments, we need to update each product individually
      if (priceAdjustment) {
        // Fetch current prices
        const { data: productsData, error: fetchError } = await supabase
          .from('products')
          .select('id, price')
          .in('id', ids);
        
        if (fetchError) throw fetchError;
        
        // Calculate and apply new prices
        for (const product of productsData || []) {
          let newPrice = product.price;
          
          if (priceAdjustment.type === 'percentage') {
            const adjustment = product.price * (priceAdjustment.value / 100);
            newPrice = priceAdjustment.direction === 'increase' 
              ? product.price + adjustment 
              : product.price - adjustment;
          } else {
            newPrice = priceAdjustment.direction === 'increase'
              ? product.price + priceAdjustment.value
              : product.price - priceAdjustment.value;
          }
          
          // Ensure price doesn't go below 0
          newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
          
          const { error: updateError } = await supabase
            .from('products')
            .update({ price: newPrice })
            .eq('id', product.id);
          
          if (updateError) throw updateError;
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setIsMassEditOpen(false);
      setMassEditForm(emptyMassEditForm);
      setSelectedProducts(new Set());
      toast.success(`${variables.ids.length} products updated`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Mass delete mutation
  const massDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase.from('products').delete().in('id', ids);
      if (error) throw error;
    },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      setMassDeleteOpen(false);
      setSelectedProducts(new Set());
      toast.success(`${ids.length} products deleted`);
    },
    onError: (error: any) => {
      toast.error(error.message);
    },
  });

  // Helper function to format datetime for input
  const formatDateTimeForInput = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    // Format: YYYY-MM-DDTHH:mm (local time)
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

  const openEdit = (product: any) => {
    const hasSchedule = !!product.release_at && isScheduledForFuture(product.release_at);
    const hasEarlyAccess = product.early_access_hours !== null && product.early_access_hours !== undefined;
    setForm({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price.toString(),
      description: product.description || '',
      category_id: product.category_id || '',
      is_active: product.is_active,
      is_featured: product.is_featured,
      is_resellable: product.is_resellable || false,
      images: product.images?.join(', ') || '',
      asset_file_url: product.asset_file_url || '',
      release_at: formatDateTimeForInput(product.release_at),
      schedule_enabled: hasSchedule,
      early_access_enabled: hasSchedule && hasEarlyAccess,
      early_access_hours: product.early_access_hours?.toString() || '',
      robux_enabled: !!product.robux_enabled,
      robux_product_id: product.robux_product_id || '',
      robux_price: product.robux_price ? String(product.robux_price) : '',
      marketplace_store: product.store_id === ECLIPSE_STORE_ID 
        ? 'eclipse' 
        : product.store_id === VINO_STORE_ID 
          ? 'vino' 
          : null,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => {
    setForm(emptyForm);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.slug || !form.price) {
      toast.error('Please fill in required fields');
      return;
    }
    if (!form.asset_file_url) {
      toast.error('A product file must be uploaded before saving');
      return;
    }
    saveMutation.mutate(form);
  };

  // Selection helpers
  const toggleProductSelection = (id: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!products) return;
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  const handleMassEditSubmit = () => {
    const updates: Partial<{ category_id: string; is_active: boolean; is_featured: boolean }> = {};
    if (massEditForm.category_id !== null) {
      updates.category_id = massEditForm.category_id;
    }
    if (massEditForm.is_active !== null) {
      updates.is_active = massEditForm.is_active;
    }
    if (massEditForm.is_featured !== null) {
      updates.is_featured = massEditForm.is_featured;
    }
    
    // Build price adjustment if enabled
    let priceAdjustment: { type: 'percentage' | 'fixed'; value: number; direction: 'increase' | 'decrease' } | undefined;
    if (massEditForm.price_adjustment_enabled && massEditForm.price_adjustment_value) {
      const value = parseFloat(massEditForm.price_adjustment_value);
      if (isNaN(value) || value <= 0) {
        toast.error('Please enter a valid price adjustment value');
        return;
      }
      priceAdjustment = {
        type: massEditForm.price_adjustment_type,
        value,
        direction: massEditForm.price_adjustment_direction,
      };
    }
    
    if (Object.keys(updates).length === 0 && !priceAdjustment) {
      toast.error('Please select at least one field to update');
      return;
    }
    
    massEditMutation.mutate({ ids: Array.from(selectedProducts), updates, priceAdjustment });
  };

  return (
    <AdminLayout requiredPermissions={['view_products']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display">Products</CardTitle>
                <CardDescription>Manage your product catalog</CardDescription>
              </div>
              <Button onClick={openCreate} className="gradient-button border-0 w-full sm:w-auto">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search */}
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10 bg-background"
              />
            </div>

            {/* Filters row */}
            <div className="grid grid-cols-3 gap-2">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="bg-background text-xs sm:text-sm">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStore} onValueChange={setFilterStore}>
                <SelectTrigger className="bg-background text-xs sm:text-sm">
                  <SelectValue placeholder="Store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  <SelectItem value="none">No Store</SelectItem>
                  {stores?.map((store) => (
                    <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="bg-background text-xs sm:text-sm">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="featured">Featured</SelectItem>
                </SelectContent>
              </Select>
            </div>
              
            {/* Mass edit actions - visible when products are selected */}
            {selectedProducts.size > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-sm py-1">
                    {selectedProducts.size} selected
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMassEditForm(emptyMassEditForm);
                      setIsMassEditOpen(true);
                    }}
                  >
                    <Edit3 className="h-4 w-4 mr-2" />
                    Edit Selected
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setMassDeleteOpen(true)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedProducts(new Set())}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Clear
                  </Button>
                </div>
              )}

            {/* Mobile Card View */}
            <div className="block md:hidden space-y-3">
              {/* Select All for Mobile */}
              {products && products.length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-muted/30 rounded-lg">
                  <Checkbox
                    checked={selectedProducts.size === products.length && products.length > 0}
                    onCheckedChange={toggleSelectAll}
                    id="select-all-mobile"
                  />
                  <Label htmlFor="select-all-mobile" className="text-sm text-muted-foreground cursor-pointer">
                    Select all products
                  </Label>
                </div>
              )}
              
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : products?.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No products found</p>
              ) : (
                products?.map((product) => (
                  <Card 
                    key={product.id} 
                    className={`bg-muted/30 border-border overflow-hidden transition-colors ${
                      selectedProducts.has(product.id) ? 'ring-2 ring-primary' : ''
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {/* Checkbox */}
                        <Checkbox
                          checked={selectedProducts.has(product.id)}
                          onCheckedChange={() => toggleProductSelection(product.id)}
                          className="mt-1 flex-shrink-0"
                        />
                        <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden flex-shrink-0">
                          {product.images?.[0] ? (
                            <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-lg font-medium">
                              {product.name.charAt(0)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 space-y-2">
                          <div>
                            <p className="font-medium text-base leading-tight">{product.name}</p>
                            <p className="text-sm text-muted-foreground">{product.categories?.name || 'Uncategorized'}</p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {isScheduledForFuture(product.release_at) ? (
                              <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs px-2 py-0.5 hover:bg-amber-500/20" title={`Releases: ${new Date(product.release_at).toLocaleString()}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                Scheduled
                              </Badge>
                            ) : product.is_active ? (
                              <Badge className="bg-green-500/20 text-green-400 border-0 text-xs px-2 py-0.5 hover:bg-green-500/20">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs px-2 py-0.5">Inactive</Badge>
                            )}
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => openEdit(product)} className="h-10 w-10 touch-manipulation active:scale-95 flex-shrink-0">
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden md:block rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12">
                      <Checkbox
                        checked={products && products.length > 0 && selectedProducts.size === products.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                    </TableRow>
                  ) : products?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No products found</TableCell>
                    </TableRow>
                  ) : (
                    products?.map((product) => (
                      <TableRow 
                        key={product.id}
                        className={selectedProducts.has(product.id) ? 'bg-primary/5' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedProducts.has(product.id)}
                            onCheckedChange={() => toggleProductSelection(product.id)}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded bg-muted overflow-hidden">
                              {product.images?.[0] ? (
                                <img src={product.images[0]} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                  {product.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">{product.slug}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{product.categories?.name || '—'}</TableCell>
                        <TableCell>£{product.price.toFixed(2)}</TableCell>
                        <TableCell>
                          <div className="flex gap-2 flex-wrap">
                            {isScheduledForFuture(product.release_at) ? (
                              <Badge variant="outline" className="text-amber-500 border-amber-500/30" title={`Releases: ${new Date(product.release_at).toLocaleString()}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {new Date(product.release_at).toLocaleDateString()}
                              </Badge>
                            ) : product.is_active ? (
                              <Badge variant="outline" className="text-green-500 border-green-500/30">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(product)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(product.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Edit Product' : 'Create Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, slug: e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">Slug *</Label>
                <Input
                  id="slug"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (£) *</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor
                content={form.description}
                onChange={(content) => setForm({ ...form, description: content })}
                placeholder="Write your product description..."
              />
            </div>

            <div className="space-y-2">
              <Label>Product Media (Images & Videos)</Label>
              <input
                type="file"
                ref={imageInputRef}
                onChange={(e) => handleMediaUpload(e, 'image')}
                accept="image/*"
                className="hidden"
              />
              <input
                type="file"
                ref={videoInputRef}
                onChange={(e) => handleMediaUpload(e, 'video')}
                accept="video/*"
                className="hidden"
              />
              
              {/* Media previews with drag-and-drop */}
              {form.images && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext
                    items={form.images.split(',').map((_, i) => `media-${i}`).filter((_, i) => form.images.split(',')[i]?.trim())}
                    strategy={horizontalListSortingStrategy}
                  >
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.images.split(',').map((media, idx) => {
                        const trimmedMedia = media.trim();
                        if (!trimmedMedia) return null;
                        return (
                          <SortableMediaItem
                            key={`media-${idx}`}
                            id={`media-${idx}`}
                            url={trimmedMedia}
                            index={idx}
                            onRemove={removeMedia}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={isUploadingImage || isUploadingVideo || (form.images ? form.images.split(',').filter(s => s.trim()).length >= 8 : false)}
                  className="flex-1"
                >
                  {isUploadingImage ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Image
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={isUploadingImage || isUploadingVideo || (form.images ? form.images.split(',').filter(s => s.trim()).length >= 8 : false)}
                  className="flex-1"
                >
                  {isUploadingVideo ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Video className="h-4 w-4 mr-2" />
                      Video
                    </>
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Drag to reorder. Upload up to 8 files ({form.images ? form.images.split(',').filter(s => s.trim()).length : 0}/8)
              </p>
            </div>

            <div className="space-y-2">
              <Label>Downloadable File <span className="text-destructive">*</span></Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />
              {form.asset_file_url ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                  <FileCheck className="h-5 w-5 text-green-500" />
                  <span className="flex-1 text-sm truncate">{form.asset_file_url}</span>
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
                      Upload File
                    </>
                  )}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">
                Upload the file customers will download after purchase
              </p>
            </div>

            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2">
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="resellable"
                  checked={form.is_resellable}
                  onCheckedChange={(v) => setForm({ ...form, is_resellable: v })}
                />
                <Label htmlFor="resellable" title="Excludes from Eclipse+ discounts and free claims">Resell</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  id="schedule"
                  checked={form.schedule_enabled}
                  onCheckedChange={(v) => setForm({ ...form, schedule_enabled: v, release_at: v ? form.release_at : '' })}
                />
                <Label htmlFor="schedule" className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Schedule
                </Label>
              </div>
            </div>

            {/* Schedule Release Date/Time */}
            {form.schedule_enabled && (
              <div className="space-y-4">
                <div className="space-y-2 p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
                  <Label htmlFor="release_at" className="flex items-center gap-2 text-amber-500">
                    <Calendar className="h-4 w-4" />
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
                  <p className="text-xs text-muted-foreground">
                    Product will be hidden from customers until this date and time
                  </p>
                </div>

                {/* Early Product Drops Section */}
                <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-amber-500/20">
                      <Crown className="h-4 w-4 text-amber-500" />
                    </div>
                    <div>
                      <Label className="text-sm font-medium">Early Product Drops</Label>
                      <p className="text-xs text-muted-foreground">
                        Give Eclipse+ members early access
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5">
                      <Label htmlFor="early_access_enabled" className="text-sm">Enable Early Access</Label>
                      <p className="text-xs text-muted-foreground">
                        Eclipse+ members can access before public release
                      </p>
                    </div>
                    <Switch
                      id="early_access_enabled"
                      checked={form.early_access_enabled}
                      onCheckedChange={(checked) => setForm({ 
                        ...form, 
                        early_access_enabled: checked,
                        early_access_hours: checked ? form.early_access_hours : ''
                      })}
                    />
                  </div>

                  {form.early_access_enabled && (
                    <div className="space-y-2 pt-2 border-t border-amber-500/20">
                      <Label htmlFor="early_access_hours" className="flex items-center gap-2 text-sm">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        Custom Early Access Window (optional)
                      </Label>
                      <div className="flex items-center gap-3">
                        <Input
                          id="early_access_hours"
                          type="number"
                          min="1"
                          max="168"
                          value={form.early_access_hours}
                          onChange={(e) => setForm({ ...form, early_access_hours: e.target.value })}
                          placeholder="24"
                          className="w-24 bg-background"
                        />
                        <span className="text-sm text-muted-foreground">hours before public release</span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Leave empty to use the platform default (24 hours)
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Robux Configuration Section */}
            <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
              <div className="flex items-center justify-between">
                <Label htmlFor="robux_enabled" className="font-medium">Robux Payments</Label>
                <Switch
                  id="robux_enabled"
                  checked={form.robux_enabled}
                  onCheckedChange={(checked) => setForm({ ...form, robux_enabled: checked })}
                />
              </div>
              
              {form.robux_enabled && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="robux_product_id" className="text-sm">Roblox Product ID</Label>
                    <Input
                      id="robux_product_id"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={form.robux_product_id}
                      onChange={(e) => setForm({ ...form, robux_product_id: e.target.value })}
                      placeholder="e.g. 1234567890"
                      className="bg-background"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="robux_price" className="text-sm">Robux Price</Label>
                    <Input
                      id="robux_price"
                      type="number"
                      inputMode="numeric"
                      value={form.robux_price}
                      onChange={(e) => setForm({ ...form, robux_price: e.target.value })}
                      placeholder="e.g. 100"
                      className="bg-background"
                      min="1"
                      step="1"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Marketplace Store Selection */}
            <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <Label className="font-medium flex items-center gap-2">
                <Store className="h-4 w-4 text-primary" />
                Marketplace Store
              </Label>
              <Select 
                value={form.marketplace_store || 'none'} 
                onValueChange={(v) => setForm({ ...form, marketplace_store: v === 'none' ? null : v as 'eclipse' | 'vino' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select store" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="eclipse">Eclipse Store</SelectItem>
                  <SelectItem value="vino">Vino</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Select which marketplace store this product appears under
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the product.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Edit Dialog */}
      <Dialog open={isMassEditOpen} onOpenChange={setIsMassEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit {selectedProducts.size} Products</DialogTitle>
            <DialogDescription>
              Select the fields you want to update. Only changed fields will be applied.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {/* Category */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="mass-category-toggle"
                  checked={massEditForm.category_id !== null}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setMassEditForm({ ...massEditForm, category_id: '' });
                    } else {
                      setMassEditForm({ ...massEditForm, category_id: null });
                    }
                  }}
                />
                <Label htmlFor="mass-category-toggle" className="font-medium">Change Category</Label>
              </div>
              {massEditForm.category_id !== null && (
                <Select 
                  value={massEditForm.category_id} 
                  onValueChange={(v) => setMassEditForm({ ...massEditForm, category_id: v })}
                >
                  <SelectTrigger className="ml-6">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Active Status */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="mass-active-toggle"
                  checked={massEditForm.is_active !== null}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setMassEditForm({ ...massEditForm, is_active: true });
                    } else {
                      setMassEditForm({ ...massEditForm, is_active: null });
                    }
                  }}
                />
                <Label htmlFor="mass-active-toggle" className="font-medium">Change Active Status</Label>
              </div>
              {massEditForm.is_active !== null && (
                <div className="flex items-center gap-2 ml-6">
                  <Switch
                    id="mass-active"
                    checked={massEditForm.is_active}
                    onCheckedChange={(v) => setMassEditForm({ ...massEditForm, is_active: v })}
                  />
                  <Label htmlFor="mass-active">
                    {massEditForm.is_active ? 'Active' : 'Inactive'}
                  </Label>
                </div>
              )}
            </div>

            {/* Price Adjustment */}
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="mass-price-toggle"
                  checked={massEditForm.price_adjustment_enabled}
                  onCheckedChange={(checked) => {
                    setMassEditForm({ 
                      ...massEditForm, 
                      price_adjustment_enabled: !!checked,
                      price_adjustment_value: checked ? massEditForm.price_adjustment_value : ''
                    });
                  }}
                />
                <Label htmlFor="mass-price-toggle" className="font-medium">Adjust Prices</Label>
              </div>
              {massEditForm.price_adjustment_enabled && (
                <div className="ml-6 space-y-3">
                  {/* Direction: Increase or Decrease */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={massEditForm.price_adjustment_direction === 'increase' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_direction: 'increase' })}
                    >
                      Increase
                    </Button>
                    <Button
                      type="button"
                      variant={massEditForm.price_adjustment_direction === 'decrease' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_direction: 'decrease' })}
                    >
                      Decrease
                    </Button>
                  </div>
                  
                  {/* Type: Percentage or Fixed */}
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={massEditForm.price_adjustment_type === 'percentage' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_type: 'percentage' })}
                    >
                      Percentage (%)
                    </Button>
                    <Button
                      type="button"
                      variant={massEditForm.price_adjustment_type === 'fixed' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1"
                      onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_type: 'fixed' })}
                    >
                      Fixed Amount (£)
                    </Button>
                  </div>
                  
                  {/* Value Input */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step={massEditForm.price_adjustment_type === 'percentage' ? '1' : '0.01'}
                      min="0"
                      placeholder={massEditForm.price_adjustment_type === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'}
                      value={massEditForm.price_adjustment_value}
                      onChange={(e) => setMassEditForm({ ...massEditForm, price_adjustment_value: e.target.value })}
                      className="flex-1"
                    />
                    <span className="text-muted-foreground text-sm w-8">
                      {massEditForm.price_adjustment_type === 'percentage' ? '%' : '£'}
                    </span>
                  </div>
                  
                  {/* Preview text */}
                  {massEditForm.price_adjustment_value && (
                    <p className="text-xs text-muted-foreground">
                      Will {massEditForm.price_adjustment_direction} all selected product prices by{' '}
                      {massEditForm.price_adjustment_type === 'percentage' 
                        ? `${massEditForm.price_adjustment_value}%`
                        : `£${parseFloat(massEditForm.price_adjustment_value || '0').toFixed(2)}`
                      }
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMassEditOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleMassEditSubmit} 
              disabled={massEditMutation.isPending}
            >
              {massEditMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Updating...
                </>
              ) : (
                `Update ${selectedProducts.size} Products`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass Delete Confirmation */}
      <AlertDialog open={massDeleteOpen} onOpenChange={setMassDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedProducts.size} Products?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all selected products.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => massDeleteMutation.mutate(Array.from(selectedProducts))}
              className="bg-destructive hover:bg-destructive/90"
              disabled={massDeleteMutation.isPending}
            >
              {massDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedProducts.size} Products`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
