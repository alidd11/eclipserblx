import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { 
  Save, 
  ArrowLeft, 
  Upload, 
  X, 
  Plus,
  FileCheck,
  Loader2,
  ImagePlus,
  Calendar,
  Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';

interface ProductFormData {
  name: string;
  slug: string;
  price: string;
  seller_price: string;
  description: string;
  category_id: string;
  is_active: boolean;
  images: string[];
  asset_file_url: string;
  schedule_enabled: boolean;
  release_at: string;
}

export default function SellerProductEditor() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  
  const { user, loading: authLoading } = useAuth();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const { store, isSeller, loading: sellerLoading } = useSellerStatus();

  const isEditing = !!productId;

  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    slug: '',
    price: '',
    seller_price: '',
    description: '',
    category_id: '',
    is_active: true,
    images: [],
    asset_file_url: '',
    schedule_enabled: false,
    release_at: '',
  });

  const [uploading, setUploading] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);

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

  // Fetch product if editing
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['seller-product', productId],
    queryFn: async () => {
      if (!productId || !store?.id) return null;
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .eq('store_id', store.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!store?.id,
  });

  // Populate form when editing
  useEffect(() => {
    if (product) {
      const hasSchedule = !!product.release_at && new Date(product.release_at) > new Date();
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        price: product.price?.toString() || '',
        seller_price: product.seller_price?.toString() || '',
        description: product.description || '',
        category_id: product.category_id || '',
        is_active: product.is_active ?? true,
        images: product.images || [],
        asset_file_url: product.asset_file_url || '',
        schedule_enabled: hasSchedule,
        release_at: product.release_at ? new Date(product.release_at).toISOString().slice(0, 16) : '',
      });
    }
  }, [product]);

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: prev.slug || generateSlug(name),
    }));
  };

  // Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages: string[] = [];

      for (const file of Array.from(files)) {
        // Security scan (virus + NSFW)
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

        newImages.push(publicUrl);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));

      toast.success('Images uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload images: ' + error.message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Upload asset file
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAsset(true);
    try {
      // Security scan for product assets (Roblox files, Lua scripts)
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

      // For private bucket, we store the path, not public URL
      setFormData(prev => ({
        ...prev,
        asset_file_url: fileName,
      }));

      toast.success('Asset file uploaded successfully');
    } catch (error: any) {
      toast.error('Failed to upload asset: ' + error.message);
    } finally {
      setUploadingAsset(false);
      if (assetInputRef.current) {
        assetInputRef.current.value = '';
      }
    }
  };

  // Remove image
  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  // Save product mutation
  const saveProduct = useMutation({
    mutationFn: async (data: ProductFormData) => {
      if (!store?.id || !user?.id) throw new Error('Missing store or user');

      // Calculate release_at value
      let releaseAt: string | null = null;
      if (data.schedule_enabled && data.release_at) {
        releaseAt = new Date(data.release_at).toISOString();
      }

      const productData = {
        name: data.name,
        slug: data.slug,
        price: parseFloat(data.price) || 0,
        seller_price: parseFloat(data.seller_price) || parseFloat(data.price) || 0,
        description: data.description,
        category_id: data.category_id || null,
        is_active: data.is_active,
        images: data.images,
        asset_file_url: data.asset_file_url || null,
        store_id: store.id,
        is_seller_product: true,
        moderation_status: 'pending', // All new/edited products go to pending
        release_at: releaseAt,
      };

      if (isEditing && productId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)
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
      toast.success(isEditing ? 'Product updated successfully' : 'Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      navigate('/seller/products');
    },
    onError: (error) => {
      toast.error('Failed to save product: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Please enter a product name');
      return;
    }
    if (!formData.price || parseFloat(formData.price) <= 0) {
      toast.error('Please enter a valid price');
      return;
    }

    saveProduct.mutate(formData);
  };

  // Auth guards
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!flagLoading && !hasAccess) {
      navigate('/');
    }
  }, [hasAccess, flagLoading, navigate]);

  useEffect(() => {
    if (!sellerLoading && !isSeller) {
      navigate('/account');
    }
  }, [isSeller, sellerLoading, navigate]);

  if (authLoading || flagLoading || sellerLoading || (isEditing && productLoading)) {
    return (
      <SellerLayout>
        <div className="max-w-3xl mx-auto">
          <Skeleton className="h-10 w-64 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate('/seller/products')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">
              {isEditing ? 'Edit Product' : 'Add New Product'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? 'Update your product details' : 'Create a new product for your store'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Essential details about your product</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">URL Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="product-url-slug"
                />
                <p className="text-xs text-muted-foreground">
                  This will be used in the product URL
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="price">Price (£) *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
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
                <Label htmlFor="description">Description</Label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(content) => setFormData({ ...formData, description: content })}
                  placeholder="Describe your product..."
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Active</Label>
                  <p className="text-sm text-muted-foreground">
                    Make this product visible when approved
                  </p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
              </div>

              {/* Scheduled Release */}
              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-amber-500" />
                      Schedule Release
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Set a future date and time for this product to go live
                    </p>
                  </div>
                  <Switch
                    checked={formData.schedule_enabled}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      schedule_enabled: checked,
                      release_at: checked ? formData.release_at : '',
                    })}
                  />
                </div>

                {formData.schedule_enabled && (
                  <div className="space-y-2 p-4 rounded-lg border border-amber-500/30 bg-amber-500/5">
                    <Label htmlFor="release_at" className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                      <Clock className="h-4 w-4" />
                      Release Date & Time
                    </Label>
                    <Input
                      id="release_at"
                      type="datetime-local"
                      value={formData.release_at}
                      onChange={(e) => setFormData({ ...formData, release_at: e.target.value })}
                      min={new Date().toISOString().slice(0, 16)}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Your product will be hidden from customers until this date and time. Make sure to set the product as "Active" above.
                    </p>
                    {formData.release_at && new Date(formData.release_at) > new Date() && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-amber-600 dark:text-amber-400">
                        <Calendar className="h-4 w-4" />
                        <span>
                          Scheduled for: {new Date(formData.release_at).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader>
              <CardTitle>Product Images</CardTitle>
              <CardDescription>Upload images to showcase your product</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-4">
                    {formData.images.map((img, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={img}
                          alt={`Product ${index + 1}`}
                          className="w-full aspect-square object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded">
                            Main
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {uploading ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  ) : (
                    <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {uploading ? 'Uploading...' : 'Click to upload images'}
                  </p>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </CardContent>
          </Card>

          {/* Digital Asset */}
          <Card>
            <CardHeader>
              <CardTitle>Digital Asset</CardTitle>
              <CardDescription>Upload the file customers will download after purchase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {formData.asset_file_url && (
                  <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <FileCheck className="h-5 w-5 text-green-500" />
                    <div className="flex-1">
                      <p className="font-medium">Asset file uploaded</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {formData.asset_file_url}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setFormData({ ...formData, asset_file_url: '' })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <div
                  onClick={() => assetInputRef.current?.click()}
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary transition-colors"
                >
                  {uploadingAsset ? (
                    <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-muted-foreground" />
                  ) : (
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {uploadingAsset ? 'Uploading...' : 'Click to upload asset file (ZIP, RAR, etc.)'}
                  </p>
                </div>

                <input
                  ref={assetInputRef}
                  type="file"
                  className="hidden"
                  onChange={handleAssetUpload}
                />
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/seller/products')}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saveProduct.isPending}>
              <Save className="h-4 w-4 mr-2" />
              {saveProduct.isPending ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
            </Button>
          </div>
        </form>
      </div>
    </SellerLayout>
  );
}
