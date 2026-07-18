import { useState, useRef } from 'react';
import { sanitizeSearch } from '@/lib/searchUtils';
import { submitProductUrl } from '@/lib/submitIndexNow';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Upload, FileCheck, X, Loader2, ImagePlus, Video, Edit3, Clock, Calendar, Store, Crown } from 'lucide-react';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { PermissionGate } from '@/hooks/useUserPermissions';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SortableMediaItem } from '@/components/admin/SortableMediaItem';
import { supabase } from '@/integrations/supabase/client';
import { applyProductWatermark } from '@/lib/watermark';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { QUANTIS_STORE_ID, VINO_STORE_ID } from '@/lib/constants';
import { ProductTable } from '@/components/admin/products/ProductTable';
import { ProductMobileCards } from '@/components/admin/products/ProductMobileCards';
import { formatGBP } from '@/lib/formatters';

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
  marketplace_store: 'quantis' | 'vino' | null;
}

const emptyForm: ProductForm = {
  name: '', slug: '', price: '', description: '', category_id: '', is_active: true, is_featured: false, is_resellable: false,
  images: '', asset_file_url: '', release_at: '', schedule_enabled: false, early_access_enabled: false, early_access_hours: '',
  marketplace_store: 'quantis',
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
  category_id: null, is_active: null, is_featured: null, price_adjustment_enabled: false,
  price_adjustment_type: 'percentage', price_adjustment_value: '', price_adjustment_direction: 'increase',
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
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [isMassEditOpen, setIsMassEditOpen] = useState(false);
  const [massEditForm, setMassEditForm] = useState<MassEditForm>(emptyMassEditForm);
  const [massDeleteOpen, setMassDeleteOpen] = useState(false);
  const queryClient = useQueryClient();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data, error } = await supabase.from('categories').select('*').order('display_order'); if (error) throw error; return data; },
  });

  const { data: stores } = useQuery({
    queryKey: ['admin-stores-filter'],
    queryFn: async () => { const { data, error } = await supabase.from('stores').select('id, name').order('name'); if (error) throw error; return data; },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['admin-products', search, filterCategory, filterStore, filterStatus],
    queryFn: async () => {
      let query = supabase.from('products').select(`*, categories(name)`).order('created_at', { ascending: false }).eq('is_seller_product', false);
      if (search) query = query.ilike('name', `%${sanitizeSearch(search)}%`);
      if (filterCategory && filterCategory !== 'all') query = query.eq('category_id', filterCategory);
      if (filterStore && filterStore !== 'all') { if (filterStore === 'none') query = query.is('store_id', null); else query = query.eq('store_id', filterStore); }
      if (filterStatus === 'active') query = query.eq('is_active', true);
      else if (filterStatus === 'inactive') query = query.eq('is_active', false);
      else if (filterStatus === 'featured') query = query.eq('is_featured', true);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60_000,
  });

  // File upload handlers
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      toast.info('Scanning file for threats...', { id: 'security-scan' });
      const scanResult = await performSecurityScan(file, { skipNsfwCheck: true });
      if (!scanResult.isAllowed) { toast.dismiss('security-scan'); toast.error(scanResult.reason || 'File blocked by security scan'); return; }
      if (scanResult.luaRiskLevel === 'medium' && scanResult.luaConcerns?.length) toast.warning(`File has concerns: ${scanResult.luaConcerns.join(', ')}`, { duration: 8000 });
      toast.dismiss('security-scan');
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('product-assets').upload(fileName, file);
      if (uploadError) throw uploadError;
      setForm({ ...form, asset_file_url: fileName });
      toast.success('File uploaded successfully');
    } catch (error: unknown) { toast.error(`Upload failed: ${(error as Error).message}`); }
    finally { setIsUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  };

  const removeAssetFile = async () => {
    if (form.asset_file_url) { try { await supabase.storage.from('product-assets').remove([form.asset_file_url]); } catch (error) { console.error('Failed to remove file:', error); } }
    setForm({ ...form, asset_file_url: '' });
  };

  const handleMediaUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (type === 'image' && !file.type.startsWith('image/')) { toast.error('Please select an image file'); return; }
    if (type === 'video' && !file.type.startsWith('video/')) { toast.error('Please select a video file'); return; }
    const currentMedia = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [];
    if (currentMedia.length >= 8) { toast.error('Maximum 8 media files allowed per product'); return; }
    if (type === 'image') setIsUploadingImage(true); else setIsUploadingVideo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file, { contentType: file.type, cacheControl: '31536000' });
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
      const isQuantisStore = form.marketplace_store === 'quantis';
      const watermarkedUrl = isQuantisStore ? await applyProductWatermark(publicUrl, fileName) : publicUrl;
      const cm = form.images ? form.images.split(',').map(s => s.trim()).filter(Boolean) : [];
      cm.push(watermarkedUrl);
      setForm({ ...form, images: cm.join(', ') });
      toast.success(`${type === 'image' ? 'Image' : 'Video'} uploaded successfully`);
    } catch (error: unknown) { toast.error(`Upload failed: ${(error as Error).message}`); }
    finally {
      if (type === 'image') { setIsUploadingImage(false); if (imageInputRef.current) imageInputRef.current.value = ''; }
      else { setIsUploadingVideo(false); if (videoInputRef.current) videoInputRef.current.value = ''; }
    }
  };

  const removeMedia = (indexToRemove: number) => {
    const cm = form.images.split(',').map(s => s.trim()).filter(Boolean);
    cm.splice(indexToRemove, 1);
    setForm({ ...form, images: cm.join(', ') });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const cm = form.images.split(',').map(s => s.trim()).filter(Boolean);
      const oldIndex = cm.findIndex((_, i) => `media-${i}` === active.id);
      const newIndex = cm.findIndex((_, i) => `media-${i}` === over.id);
      const reordered = arrayMove(cm, oldIndex, newIndex);
      setForm({ ...form, images: reordered.join(', ') });
    }
  };

  // Mutations
  const saveMutation = useMutation({
    mutationFn: async (data: ProductForm) => {
      
      let earlyAccessHours: number | null = null;
      if (data.schedule_enabled && data.early_access_enabled) earlyAccessHours = data.early_access_hours ? parseInt(data.early_access_hours) : null;
      const isEditing = !!data.id;
      const originalProduct = isEditing ? products?.find(p => p.id === data.id) : null;
      const isSellerProduct = originalProduct?.is_seller_product === true;
      const priceVal = parseFloat(data.price);
      const slug = data.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'product';
      const payload: Record<string, any> = {
        name: data.name, slug, price: priceVal, seller_price: priceVal, description: data.description || null,
        category_id: data.category_id || null, is_active: data.is_active, is_featured: data.is_featured, is_resellable: data.is_resellable,
        images: data.images ? data.images.split(',').map(s => s.trim()) : [], asset_file_url: data.asset_file_url || null,
        release_at: data.schedule_enabled && data.release_at ? new Date(data.release_at).toISOString() : null,
        early_access_hours: earlyAccessHours,
      };
      if (!isSellerProduct) {
        payload.store_id = data.marketplace_store === 'quantis' ? QUANTIS_STORE_ID : data.marketplace_store === 'vino' ? VINO_STORE_ID : null;
        payload.moderation_status = data.marketplace_store ? 'approved' : null;
        payload.is_seller_product = false;
      }
      if (data.id) {
        const { error } = await supabase.from('products').update(payload as any).eq('id', data.id);
        if (error) throw error;
        supabase.functions.invoke('translate-product', { body: { productId: data.id } }).catch(err => console.error('Translation failed:', err));
      } else {
        const { data: newProduct, error } = await supabase.from('products').insert(payload as any).select().single();
        if (error) { if (error.code === '23505' || error.message?.includes('duplicate')) throw new Error('A product with this URL slug already exists.'); throw error; }
        if (newProduct) supabase.functions.invoke('translate-product', { body: { productId: newProduct.id } }).catch(err => console.error('Translation failed:', err));
        if (payload.is_active && newProduct) {
          let categoryName: string | undefined;
          if (payload.category_id) { const category = categories?.find(c => c.id === payload.category_id); categoryName = category?.name; }
          supabase.functions.invoke('notify-new-product', { body: { product_id: newProduct.id, product_name: payload.name, product_slug: payload.slug, product_number: (newProduct as any).product_number, product_price: payload.price, category_name: categoryName } }).catch(err => console.error('Failed to notify:', err));
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      
      if (form.slug) submitProductUrl(form.slug);
      setIsDialogOpen(false); setForm(emptyForm);
      toast.success(form.id ? 'Product updated' : 'Product created');
    },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('products').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setDeleteId(null); toast.success('Product deleted'); },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const massEditMutation = useMutation({
    mutationFn: async ({ ids, updates, priceAdjustment }: { ids: string[]; updates: Partial<{ category_id: string; is_active: boolean; is_featured: boolean }>; priceAdjustment?: { type: 'percentage' | 'fixed'; value: number; direction: 'increase' | 'decrease' } }) => {
      if (Object.keys(updates).length > 0) { const { error } = await supabase.from('products').update(updates).in('id', ids); if (error) throw error; }
      if (priceAdjustment) {
        const { data: pd, error: fe } = await supabase.from('products').select('id, price').in('id', ids);
        if (fe) throw fe;
        for (const product of pd || []) {
          let newPrice = product.price;
          if (priceAdjustment.type === 'percentage') { const adj = product.price * (priceAdjustment.value / 100); newPrice = priceAdjustment.direction === 'increase' ? product.price + adj : product.price - adj; }
          else { newPrice = priceAdjustment.direction === 'increase' ? product.price + priceAdjustment.value : product.price - priceAdjustment.value; }
          newPrice = Math.max(0, Math.round(newPrice * 100) / 100);
          const { error: ue } = await supabase.from('products').update({ price: newPrice }).eq('id', product.id);
          if (ue) throw ue;
        }
      }
    },
    onSuccess: (_, variables) => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setIsMassEditOpen(false); setMassEditForm(emptyMassEditForm); setSelectedProducts(new Set()); toast.success(`${variables.ids.length} products updated`); },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const massDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => { const { error } = await supabase.from('products').delete().in('id', ids); if (error) throw error; },
    onSuccess: (_, ids) => { queryClient.invalidateQueries({ queryKey: ['admin-products'] }); setMassDeleteOpen(false); setSelectedProducts(new Set()); toast.success(`${ids.length} products deleted`); },
    onError: (error: Error) => { toast.error(error.message); },
  });

  const formatDateTimeForInput = (isoString: string | null) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}T${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const isScheduledForFuture = (releaseAt: string | null) => releaseAt ? new Date(releaseAt) > new Date() : false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const openEdit = (product: any) => {
    const hasSchedule = !!product.release_at && isScheduledForFuture(product.release_at);
    const hasEarlyAccess = product.early_access_hours !== null && product.early_access_hours !== undefined;
    setForm({
      id: product.id, name: product.name, slug: product.slug, price: product.price.toString(),
      description: product.description || '', category_id: product.category_id || '',
      is_active: product.is_active, is_featured: product.is_featured, is_resellable: product.is_resellable || false,
      images: product.images?.join(', ') || '', asset_file_url: product.asset_file_url || '',
      release_at: formatDateTimeForInput(product.release_at), schedule_enabled: hasSchedule,
      early_access_enabled: hasSchedule && hasEarlyAccess, early_access_hours: product.early_access_hours?.toString() || '',
      marketplace_store: product.store_id === QUANTIS_STORE_ID ? 'quantis' : product.store_id === VINO_STORE_ID ? 'vino' : null,
    });
    setIsDialogOpen(true);
  };

  const openCreate = () => { setForm(emptyForm); setIsDialogOpen(true); };
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); if (!form.name || !form.price) { toast.error('Please fill in required fields'); return; } if (!form.asset_file_url) { toast.error('A product file must be uploaded before saving'); return; } saveMutation.mutate(form); };

  const toggleProductSelection = (id: string) => { setSelectedProducts(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };
  const toggleSelectAll = () => { if (!products) return; if (selectedProducts.size === products.length) setSelectedProducts(new Set()); else setSelectedProducts(new Set(products.map(p => p.id))); };

  const handleMassEditSubmit = () => {
    const updates: Partial<{ category_id: string; is_active: boolean; is_featured: boolean }> = {};
    if (massEditForm.category_id !== null) updates.category_id = massEditForm.category_id;
    if (massEditForm.is_active !== null) updates.is_active = massEditForm.is_active;
    if (massEditForm.is_featured !== null) updates.is_featured = massEditForm.is_featured;
    let priceAdjustment: { type: 'percentage' | 'fixed'; value: number; direction: 'increase' | 'decrease' } | undefined;
    if (massEditForm.price_adjustment_enabled && massEditForm.price_adjustment_value) {
      const value = parseFloat(massEditForm.price_adjustment_value);
      if (isNaN(value) || value <= 0) { toast.error('Please enter a valid price adjustment value'); return; }
      priceAdjustment = { type: massEditForm.price_adjustment_type, value, direction: massEditForm.price_adjustment_direction };
    }
    if (Object.keys(updates).length === 0 && !priceAdjustment) { toast.error('Please select at least one field to update'); return; }
    massEditMutation.mutate({ ids: Array.from(selectedProducts), updates, priceAdjustment });
  };

  return (
    <AdminLayout requiredPermissions={['view_products', 'manage_products']}>
      <div className="space-y-4">
        <AdminPageHeader
          title="Products"
          description="Manage your product catalog"
          actions={
            <PermissionGate permission="manage_products">
              <Button onClick={openCreate} className="gradient-button border-0 h-12"><Plus className="h-4 w-4 mr-2" />Add Product</Button>
            </PermissionGate>
          }
        />

        <div className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-background" />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger className="bg-background text-xs sm:text-sm"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories?.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStore} onValueChange={setFilterStore}>
              <SelectTrigger className="bg-background text-xs sm:text-sm"><SelectValue placeholder="Store" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stores</SelectItem>
                <SelectItem value="none">No Store</SelectItem>
                {stores?.map((store) => <SelectItem key={store.id} value={store.id}>{store.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="bg-background text-xs sm:text-sm"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="featured">Featured</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedProducts.size > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="secondary" className="text-sm py-1">{selectedProducts.size} selected</Badge>
              <Button variant="outline" size="sm" onClick={() => { setMassEditForm(emptyMassEditForm); setIsMassEditOpen(true); }}>
                <Edit3 className="h-4 w-4 mr-2" />Edit Selected
              </Button>
              <Button variant="outline" size="sm" onClick={() => setMassDeleteOpen(true)} className="text-destructive hover:text-destructive">
                <X className="h-4 w-4 mr-2" />Delete Selected
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedProducts(new Set())}>
                <X className="h-4 w-4 mr-1" />Clear
              </Button>
            </div>
          )}

          <ProductMobileCards products={products} isLoading={isLoading} selectedProducts={selectedProducts} onToggleSelection={toggleProductSelection} onToggleSelectAll={toggleSelectAll} onEdit={openEdit} isScheduledForFuture={isScheduledForFuture} />
          <ProductTable products={products} isLoading={isLoading} selectedProducts={selectedProducts} onToggleSelection={toggleProductSelection} onToggleSelectAll={toggleSelectAll} onEdit={openEdit} onDelete={setDeleteId} isScheduledForFuture={isScheduledForFuture} />
        </div>
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Edit Product' : 'Create Product'}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (£) *</Label>
                <Input id="price" type="number" step="0.01" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories?.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <RichTextEditor content={form.description} onChange={(content) => setForm({ ...form, description: content })} placeholder="Write your product description..." />
            </div>
            <div className="space-y-2">
              <Label>Product Media (Images & Videos)</Label>
              <input type="file" ref={imageInputRef} onChange={(e) => handleMediaUpload(e, 'image')} accept="image/*" className="hidden" />
              <input type="file" ref={videoInputRef} onChange={(e) => handleMediaUpload(e, 'video')} accept="video/*" className="hidden" />
              {form.images && (
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                  <SortableContext items={form.images.split(',').map((_, i) => `media-${i}`).filter((_, i) => form.images.split(',')[i]?.trim())} strategy={horizontalListSortingStrategy}>
                    <div className="flex flex-wrap gap-2 mb-2">
                      {form.images.split(',').map((media, idx) => { const t = media.trim(); if (!t) return null; return <SortableMediaItem key={`media-${idx}`} id={`media-${idx}`} url={t} index={idx} onRemove={removeMedia} />; })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage || isUploadingVideo || (form.images ? form.images.split(',').filter(s => s.trim()).length >= 8 : false)} className="flex-1">
                  {isUploadingImage ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><ImagePlus className="h-4 w-4 mr-2" />Image</>}
                </Button>
                <Button type="button" variant="outline" onClick={() => videoInputRef.current?.click()} disabled={isUploadingImage || isUploadingVideo || (form.images ? form.images.split(',').filter(s => s.trim()).length >= 8 : false)} className="flex-1">
                  {isUploadingVideo ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Video className="h-4 w-4 mr-2" />Video</>}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Drag to reorder. Upload up to 8 files ({form.images ? form.images.split(',').filter(s => s.trim()).length : 0}/8)</p>
            </div>
            <div className="space-y-2">
              <Label>Downloadable File <span className="text-destructive">*</span></Label>
              <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
              {form.asset_file_url ? (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                  <FileCheck className="h-5 w-5 text-success" /><span className="flex-1 text-sm truncate">{form.asset_file_url}</span>
                  <Button type="button" variant="ghost" size="icon" aria-label="Close" onClick={removeAssetFile} className="h-8 w-8"><X className="h-4 w-4" /></Button>
                </div>
              ) : (
                <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                  {isUploading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</> : <><Upload className="h-4 w-4 mr-2" />Upload File</>}
                </Button>
              )}
              <p className="text-xs text-muted-foreground">Upload the file customers will download after purchase</p>
            </div>
            <div className="flex items-center gap-6 flex-wrap">
              <div className="flex items-center gap-2"><Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label htmlFor="active">Active</Label></div>
              <div className="flex items-center gap-2"><Switch id="resellable" checked={form.is_resellable} onCheckedChange={(v) => setForm({ ...form, is_resellable: v })} /><Label htmlFor="resellable" title="Excluded from promotional discounts and special offers">Resell</Label></div>
              <div className="flex items-center gap-2"><Switch id="schedule" checked={form.schedule_enabled} onCheckedChange={(v) => setForm({ ...form, schedule_enabled: v, release_at: v ? form.release_at : '' })} /><Label htmlFor="schedule" className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />Schedule</Label></div>
            </div>
            {form.schedule_enabled && (
              <div className="space-y-4">
                <div className="space-y-2 p-3 rounded-lg border border-warning/30 bg-warning/5">
                  <Label htmlFor="release_at" className="flex items-center gap-2 text-warning"><Calendar className="h-4 w-4" />Release Date & Time</Label>
                  <Input id="release_at" type="datetime-local" value={form.release_at} onChange={(e) => setForm({ ...form, release_at: e.target.value })} min={new Date().toISOString().slice(0, 16)} className="bg-background" />
                  <p className="text-xs text-muted-foreground">Product will be hidden from customers until this date and time</p>
                </div>
                <div className="p-3 rounded-lg border border-warning/30 bg-warning/5 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-1.5 rounded-md bg-warning/20"><Crown className="h-4 w-4 text-warning" /></div>
                    <div><Label className="text-sm font-medium">Early Product Drops</Label><p className="text-xs text-muted-foreground">Give customers early access</p></div>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <div className="space-y-0.5"><Label htmlFor="early_access_enabled" className="text-sm">Enable Early Access</Label><p className="text-xs text-muted-foreground">Customers can access before public release</p></div>
                    <Switch id="early_access_enabled" checked={form.early_access_enabled} onCheckedChange={(checked) => setForm({ ...form, early_access_enabled: checked, early_access_hours: checked ? form.early_access_hours : '' })} />
                  </div>
                  {form.early_access_enabled && (
                    <div className="space-y-2 pt-2 border-t border-warning/20">
                      <Label htmlFor="early_access_hours" className="flex items-center gap-2 text-sm"><Clock className="h-4 w-4 text-muted-foreground" />Custom Early Access Window (optional)</Label>
                      <div className="flex items-center gap-3">
                        <Input id="early_access_hours" type="number" min="1" max="168" value={form.early_access_hours} onChange={(e) => setForm({ ...form, early_access_hours: e.target.value })} placeholder="24" className="w-24 bg-background" />
                        <span className="text-sm text-muted-foreground">hours before public release</span>
                      </div>
                      <p className="text-xs text-muted-foreground">Leave empty to use the platform default (24 hours)</p>
                    </div>
                  )}
                </div>
              </div>
            )}
            <div className="space-y-2 p-3 rounded-lg border border-primary/30 bg-primary/5">
              <Label className="font-medium flex items-center gap-2"><Store className="h-4 w-4 text-primary" />Marketplace Store</Label>
              <Select value={form.marketplace_store || 'none'} onValueChange={(v) => setForm({ ...form, marketplace_store: v === 'none' ? null : v as 'quantis' | 'vino' })}>
                <SelectTrigger><SelectValue placeholder="Select store" /></SelectTrigger>
                <SelectContent><SelectItem value="none">None</SelectItem><SelectItem value="quantis">Quantis</SelectItem><SelectItem value="vino">Vino</SelectItem></SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">Select which marketplace store this product appears under</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saveMutation.isPending}>{saveMutation.isPending ? 'Saving...' : 'Save'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Product?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mass Edit Dialog */}
      <Dialog open={isMassEditOpen} onOpenChange={setIsMassEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Edit {selectedProducts.size} Products</DialogTitle><DialogDescription>Select the fields you want to update.</DialogDescription></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Checkbox id="mass-category-toggle" checked={massEditForm.category_id !== null} onCheckedChange={(checked) => setMassEditForm({ ...massEditForm, category_id: checked ? '' : null })} /><Label htmlFor="mass-category-toggle" className="font-medium">Change Category</Label></div>
              {massEditForm.category_id !== null && (
                <Select value={massEditForm.category_id} onValueChange={(v) => setMassEditForm({ ...massEditForm, category_id: v })}>
                  <SelectTrigger className="ml-6"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{categories?.map((cat) => <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>)}</SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Checkbox id="mass-active-toggle" checked={massEditForm.is_active !== null} onCheckedChange={(checked) => setMassEditForm({ ...massEditForm, is_active: checked ? true : null })} /><Label htmlFor="mass-active-toggle" className="font-medium">Change Active Status</Label></div>
              {massEditForm.is_active !== null && (
                <div className="flex items-center gap-2 ml-6"><Switch id="mass-active" checked={massEditForm.is_active} onCheckedChange={(v) => setMassEditForm({ ...massEditForm, is_active: v })} /><Label htmlFor="mass-active">{massEditForm.is_active ? 'Active' : 'Inactive'}</Label></div>
              )}
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3"><Checkbox id="mass-price-toggle" checked={massEditForm.price_adjustment_enabled} onCheckedChange={(checked) => setMassEditForm({ ...massEditForm, price_adjustment_enabled: !!checked, price_adjustment_value: checked ? massEditForm.price_adjustment_value : '' })} /><Label htmlFor="mass-price-toggle" className="font-medium">Adjust Prices</Label></div>
              {massEditForm.price_adjustment_enabled && (
                <div className="ml-6 space-y-3">
                  <div className="flex gap-2">
                    <Button type="button" variant={massEditForm.price_adjustment_direction === 'increase' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_direction: 'increase' })}>Increase</Button>
                    <Button type="button" variant={massEditForm.price_adjustment_direction === 'decrease' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_direction: 'decrease' })}>Decrease</Button>
                  </div>
                  <div className="flex gap-2">
                    <Button type="button" variant={massEditForm.price_adjustment_type === 'percentage' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_type: 'percentage' })}>Percentage (%)</Button>
                    <Button type="button" variant={massEditForm.price_adjustment_type === 'fixed' ? 'default' : 'outline'} size="sm" className="flex-1" onClick={() => setMassEditForm({ ...massEditForm, price_adjustment_type: 'fixed' })}>Fixed Amount (£)</Button>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input type="number" step={massEditForm.price_adjustment_type === 'percentage' ? '1' : '0.01'} min="0" placeholder={massEditForm.price_adjustment_type === 'percentage' ? 'e.g. 10' : 'e.g. 5.00'} value={massEditForm.price_adjustment_value} onChange={(e) => setMassEditForm({ ...massEditForm, price_adjustment_value: e.target.value })} className="flex-1" />
                    <span className="text-muted-foreground text-sm w-8">{massEditForm.price_adjustment_type === 'percentage' ? '%' : '£'}</span>
                  </div>
                  {massEditForm.price_adjustment_value && (
                    <p className="text-xs text-muted-foreground">Will {massEditForm.price_adjustment_direction} all selected product prices by {massEditForm.price_adjustment_type === 'percentage' ? `${massEditForm.price_adjustment_value}%` : `${formatGBP(parseFloat(massEditForm.price_adjustment_value || '0'))}`}</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMassEditOpen(false)}>Cancel</Button>
            <Button onClick={handleMassEditSubmit} disabled={massEditMutation.isPending}>
              {massEditMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating...</> : `Update ${selectedProducts.size} Products`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Mass Delete Confirmation */}
      <AlertDialog open={massDeleteOpen} onOpenChange={setMassDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete {selectedProducts.size} Products?</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => massDeleteMutation.mutate(Array.from(selectedProducts))} className="bg-destructive hover:bg-destructive/90" disabled={massDeleteMutation.isPending}>
              {massDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedProducts.size} Products`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
