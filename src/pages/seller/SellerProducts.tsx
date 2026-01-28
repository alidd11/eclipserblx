import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
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
  SelectItem,
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
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { hapticTap } from '@/lib/haptics';

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
  schedule_enabled: boolean;
  release_at: string;
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
  schedule_enabled: false,
  release_at: '',
};

export default function SellerProducts() {
  const queryClient = useQueryClient();
  const { store } = useSellerStatus();
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  
  // Dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<ProductForm>(INITIAL_FORM);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .order('name');
      if (error) throw error;
      return data;
    },
  });

  // Fetch seller's products
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['seller-products', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*, categories(name)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!store?.id,
  });

  // Save product mutation
  const saveProduct = useMutation({
    mutationFn: async (data: ProductForm) => {
      if (!store?.id) throw new Error('Missing store');

      // Calculate release_at value
      let releaseAt: string | null = null;
      if (data.schedule_enabled && data.release_at) {
        releaseAt = new Date(data.release_at).toISOString();
      }

      const productData = {
        name: data.name,
        slug: data.slug,
        price: parseFloat(data.price) || 0,
        description: data.description,
        category_id: data.category_id || null,
        is_active: data.is_active,
        images: data.images,
        asset_file_url: data.asset_file_url || null,
        store_id: store.id,
        is_seller_product: true,
        moderation_status: 'pending',
        release_at: releaseAt,
      };

      if (data.id) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', data.id)
          .eq('store_id', store.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('products')
          .insert(productData);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(form.id ? 'Product updated' : 'Product created');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      setIsDialogOpen(false);
      setForm(INITIAL_FORM);
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

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

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
      schedule_enabled: hasSchedule,
      release_at: formatDateTimeForInput(product.release_at),
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
      for (const file of Array.from(files)) {
        if (form.images.length >= 8) break;

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

        setForm(prev => ({
          ...prev,
          images: [...prev.images, publicUrl],
        }));
      }

      toast.success('Images uploaded successfully');
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

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    saveProduct.mutate(form);
  };

  const filteredProducts = products?.filter((product: any) =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getModerationBadge = (status: string | null) => {
    switch (status) {
      case 'approved':
        return <Badge variant="default" className="gap-1 bg-green-600"><CheckCircle className="h-3 w-3" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Rejected</Badge>;
      case 'pending':
      default:
        return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
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
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Products</h1>
            <p className="text-muted-foreground">
              Manage your store's product catalog
            </p>
          </div>
          <div className="flex gap-2">
            {store?.slug && (
              <Button variant="outline" asChild>
                <Link to={`/store/${store.slug}`}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Store
                </Link>
              </Button>
            )}
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Add Product
            </Button>
          </div>
        </div>

        {/* Search */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {filteredProducts.length > 0 && store?.id && (
          <BulkProductActions
            products={filteredProducts}
            storeId={store.id}
            selectedIds={selectedProductIds}
            onSelectionChange={setSelectedProductIds}
          />
        )}

        {/* Products - Mobile Card View */}
        <div className="block md:hidden space-y-3">
          {productsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          ) : filteredProducts.length > 0 ? (
            filteredProducts.map((product: any) => (
              <Card 
                key={product.id}
                className="overflow-hidden cursor-pointer hover:border-primary/50 transition-colors active:scale-[0.98]"
                onClick={() => openEdit(product)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="h-14 w-14 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(product.categories as any)?.name || 'Uncategorized'}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="font-semibold text-sm">{formatCurrency(product.price)}</span>
                        {getModerationBadge(product.moderation_status)}
                        {!product.is_active && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first product to the store.
                </p>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Products Table - Desktop */}
        <Card className="hidden md:block">
          <CardHeader>
            <CardTitle>Products ({filteredProducts.length})</CardTitle>
            <CardDescription>
              Click a product to view and edit all details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {productsLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-16" />
                ))}
              </div>
            ) : filteredProducts.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]"></TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Downloads</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((product: any) => (
                      <TableRow 
                        key={product.id}
                        className="cursor-pointer hover:bg-muted/50"
                        onClick={() => openEdit(product)}
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
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(product.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {(product.categories as any)?.name || 'Uncategorized'}
                        </TableCell>
                        <TableCell>{formatCurrency(product.price)}</TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            {getModerationBadge(product.moderation_status)}
                            {!product.is_active && (
                              <Badge variant="outline" className="block w-fit">Inactive</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{product.download_count || 0}</TableCell>
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
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
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-12">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">
                  Start by adding your first product to the store.
                </p>
                <Button onClick={openCreate}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Product
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Moderation Info */}
        <Card className="mt-6 border-blue-500/50 bg-blue-500/5">
          <CardContent className="flex items-start gap-4 py-4">
            <AlertCircle className="h-6 w-6 text-blue-500 mt-0.5" />
            <div>
              <p className="font-medium">Product Moderation</p>
              <p className="text-sm text-muted-foreground">
                All new products are reviewed by our team before being listed publicly. 
                This usually takes 24-48 hours. You'll receive a notification once your 
                product is approved or if any changes are needed.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Product Edit/Create Dialog */}
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
                    onChange={(e) => setForm({ 
                      ...form, 
                      name: e.target.value, 
                      slug: form.slug || generateSlug(e.target.value)
                    })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">URL Slug</Label>
                  <Input
                    id="slug"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: e.target.value })}
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
                    onValueChange={(v) => setForm({ ...form, category_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories?.map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
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
                  placeholder="Describe your product..."
                />
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

              {/* Downloadable File */}
              <div className="space-y-2">
                <Label>Downloadable File</Label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleAssetUpload}
                  className="hidden"
                />
                {form.asset_file_url ? (
                  <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <span className="flex-1 text-sm truncate">{form.asset_file_url.split('/').pop()}</span>
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
