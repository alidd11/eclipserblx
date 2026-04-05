import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMarketplaceAccess } from '@/hooks/useFeatureFlag';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Json } from '@/integrations/supabase/types';
import { applyProductWatermark } from '@/lib/watermark';
import { submitProductUrl } from '@/lib/submitIndexNow';
import { QUANTIS_STORE_ID } from '@/lib/constants';
import { EarlyAccessCard } from '@/components/seller/EarlyAccessCard';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  Clock,
  Shield,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { validateImageQuality } from '@/lib/imageQuality';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { containsBlockedLinks } from '@/lib/blockedLinks';

interface ModerationFlags {
  nsfw_flags?: string[];
  lua_risk_level?: 'low' | 'medium' | 'high';
  lua_concerns?: string[];
  scan_timestamp?: string;
}

interface ProductFormData {
  name: string;
  slug: string;
  price: string;
  seller_price: string;
  description: string;
  category_id: string;
  is_active: boolean;
  eclipse_free_eligible: boolean;
  images: string[];
  asset_file_url: string;
  schedule_enabled: boolean;
  release_at: string;
  early_access_enabled: boolean;
  early_access_hours: string;
  ip_ownership_confirmed: boolean;
  is_pay_what_you_want: boolean;
  min_price: string;
  max_downloads_per_purchase: string;
}

const INITIAL_FORM_DATA: ProductFormData = {
  name: '',
  slug: '',
  price: '',
  seller_price: '',
  description: '',
  category_id: '',
  is_active: true,
  eclipse_free_eligible: false,
  images: [],
  asset_file_url: '',
  schedule_enabled: false,
  release_at: '',
  early_access_enabled: false,
  early_access_hours: '',
  ip_ownership_confirmed: false,
  is_pay_what_you_want: false,
  min_price: '0',
  max_downloads_per_purchase: '',
};

export default function SellerProductEditor() {
  const navigate = useNavigate();
  const { productId } = useParams();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const assetInputRef = useRef<HTMLInputElement>(null);
  
  const { user, loading: authLoading } = useAuth();
  const { isPro } = useSellerSubscription();
  const { hasAccess, loading: flagLoading } = useMarketplaceAccess();
  const { store, isSeller, loading: sellerLoading } = useSellerStatus();

  const isEditing = !!productId;

  // Only persist new product forms (not when editing existing)
  const [formData, setFormData, clearFormData] = useFormPersistence<ProductFormData>(
    isEditing ? `seller-product-edit-${productId}` : 'seller-product-new',
    INITIAL_FORM_DATA
  );

  const [uploading, setUploading] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  
  // Track security scan flags for auto-approval logic
  const [moderationFlags, setModerationFlags] = useState<ModerationFlags>({});

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
      const hasEarlyAccess = product.early_access_hours !== null && product.early_access_hours !== undefined;
      setFormData({
        name: product.name || '',
        slug: product.slug || '',
        price: product.price?.toString() || '',
        seller_price: product.seller_price?.toString() || '',
        description: product.description || '',
        category_id: product.category_id || '',
        is_active: product.is_active ?? true,
        eclipse_free_eligible: product.eclipse_free_eligible ?? false,
        images: product.images || [],
        asset_file_url: product.asset_file_url || '',
        schedule_enabled: hasSchedule,
        release_at: product.release_at ? new Date(product.release_at).toISOString().slice(0, 16) : '',
        early_access_enabled: hasSchedule && hasEarlyAccess,
        early_access_hours: product.early_access_hours?.toString() || '',
        ip_ownership_confirmed: product.ip_ownership_confirmed ?? false,
        is_pay_what_you_want: product.is_pay_what_you_want ?? false,
        min_price: (product.min_price ?? 0).toString(),
        max_downloads_per_purchase: (product as any).max_downloads_per_purchase?.toString() || '',
      });
    }
  }, [product]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
    }));
  };

  const MAX_IMAGES = 4;

  // Upload image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_IMAGES - formData.images.length;
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} images allowed per product`);
      return;
    }

    const filesToUpload = Array.from(files).slice(0, remainingSlots);
    if (filesToUpload.length < files.length) {
      toast.warning(`Only uploading ${filesToUpload.length} image(s) - ${MAX_IMAGES} maximum reached`);
    }

    setUploading(true);
    try {
      const newImages: string[] = [];

      for (const file of filesToUpload) {
        // Quality check
        const quality = await validateImageQuality(file);
        if (!quality.valid) {
          toast.error(quality.reason || 'Image does not meet quality standards');
          continue;
        }

        // Security scan (virus + NSFW)
        toast.info('Scanning image...', { id: 'img-scan' });
        const scanResult = await performSecurityScan(file, { skipLuaAnalysis: true });
        
        if (!scanResult.isAllowed) {
          toast.dismiss('img-scan');
          toast.error(scanResult.reason || 'Image blocked');
          
          // Track NSFW flags for moderation
          if (scanResult.isNsfw) {
            setModerationFlags(prev => ({
              ...prev,
              nsfw_flags: [...(prev.nsfw_flags || []), scanResult.reason || 'NSFW content detected'],
              scan_timestamp: new Date().toISOString(),
            }));
          }
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
        newImages.push(finalUrl);
      }

      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));

      if (newImages.length > 0) {
        toast.success(`${newImages.length} image(s) uploaded successfully`);
      }
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
      
      // Track Lua concerns for moderation flags
      if (scanResult.luaRiskLevel && scanResult.luaRiskLevel !== 'low') {
        setModerationFlags(prev => ({
          ...prev,
          lua_risk_level: scanResult.luaRiskLevel,
          lua_concerns: scanResult.luaConcerns || [],
          scan_timestamp: new Date().toISOString(),
        }));
        
        if (scanResult.luaRiskLevel === 'medium' && scanResult.luaConcerns?.length) {
          toast.warning(`File has concerns: ${scanResult.luaConcerns.join(', ')}`, { duration: 8000 });
        }
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

  // Determine if product should be auto-approved
  const hasSecurityFlags = (): boolean => {
    return !!(
      moderationFlags.nsfw_flags?.length ||
      (moderationFlags.lua_risk_level && moderationFlags.lua_risk_level !== 'low') ||
      moderationFlags.lua_concerns?.length
    );
  };

  // Save product mutation
  const saveProduct = useMutation({
    mutationFn: async (data: ProductFormData): Promise<{ productId: string; isAutoApproved: boolean; productNumber?: number }> => {
      if (!store?.id || !user?.id) throw new Error('Missing store or user');

      // Calculate release_at value
      let releaseAt: string | null = null;
      if (data.schedule_enabled && data.release_at) {
        releaseAt = new Date(data.release_at).toISOString();
      }

      // Calculate early access hours
      let earlyAccessHours: number | null = null;
      if (data.schedule_enabled && data.early_access_enabled) {
        earlyAccessHours = data.early_access_hours ? parseInt(data.early_access_hours) : null;
      }

      // Determine moderation status: auto-approve if no flags
      const shouldAutoApprove = !hasSecurityFlags();
      const moderationStatus = shouldAutoApprove ? 'approved' : 'pending';

      // Generate a deterministic slug from the name (just for DB constraint, not shown to users)
      const autoSlug = data.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')
        .slice(0, 60);

      const productData = {
        name: data.name,
        slug: autoSlug || `product-${crypto.randomUUID().slice(0, 8)}`,
        price: parseFloat(data.price) || 0,
        seller_price: parseFloat(data.seller_price) || parseFloat(data.price) || 0,
        description: data.description,
        category_id: data.category_id || null,
        is_active: shouldAutoApprove ? data.is_active : false,
        eclipse_free_eligible: data.eclipse_free_eligible,
        images: data.images,
        asset_file_url: data.asset_file_url || null,
        store_id: store.id,
        is_seller_product: true,
        moderation_status: moderationStatus,
        moderation_flags: hasSecurityFlags() ? (moderationFlags as Json) : null,
        release_at: releaseAt,
        early_access_hours: earlyAccessHours,
        ip_ownership_confirmed: data.ip_ownership_confirmed,
        is_pay_what_you_want: data.is_pay_what_you_want,
        min_price: data.is_pay_what_you_want ? (parseFloat(data.min_price) || 0) : null,
      };

      if (isEditing && productId) {
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId)
          .eq('store_id', store.id);

        if (error) throw error;
        return { productId, isAutoApproved: shouldAutoApprove, productNumber: undefined as number | undefined };
      } else {

        const { data: insertedProduct, error } = await supabase
          .from('products')
          .insert(productData)
          .select('id, product_number')
          .single();

        if (error) {
          if (error.message?.includes('duplicate') || error.code === '23505') {
            // Retry with timestamp suffix on collision
            productData.slug = autoSlug + '-' + Date.now();
            const { data: retryProduct, error: retryError } = await supabase
              .from('products')
              .insert(productData)
              .select('id, product_number')
              .single();
            if (retryError) throw retryError;
            return { productId: retryProduct.id, isAutoApproved: shouldAutoApprove, productNumber: (retryProduct as any).product_number };
          }
          throw error;
        }
        return { productId: insertedProduct.id, isAutoApproved: shouldAutoApprove, productNumber: (insertedProduct as any).product_number };
      }
    },
    onSuccess: async (result) => {
      // Submit to search engines if auto-approved
      if (result.isAutoApproved && result.productNumber) {
        submitProductUrl(result.productNumber);
      }
      // Send Discord announcement for auto-approved new products
      if (result.isAutoApproved && !isEditing) {
        try {
          await supabase.functions.invoke('send-product-drop-webhook', {
            body: { productId: result.productId, isEarlyAccess: false },
          });
          toast.success('Product approved and announced to Discord!');
        } catch (error) {
          console.error('Failed to send Discord announcement:', error);
          toast.success('Product auto-approved!');
        }
      } else if (result.isAutoApproved) {
        toast.success('Product updated successfully');
      } else {
        // Product was flagged — trigger seller notification for consent
        try {
          const flagReasons: string[] = [];
          if (moderationFlags.nsfw_flags?.length) flagReasons.push('NSFW content detected');
          if (moderationFlags.lua_risk_level && moderationFlags.lua_risk_level !== 'low') {
            flagReasons.push(`Lua script: ${moderationFlags.lua_risk_level} risk`);
          }
          
          await supabase.functions.invoke('notify-seller-review', {
            body: {
              productId: result.productId,
              productName: formData.name,
              storeOwnerId: user?.id,
              flagReasons,
            },
          });
        } catch (error) {
          console.error('Failed to notify seller:', error);
        }
        toast.success('Product submitted for review - our team will approve it shortly');
      }
      
      clearFormData();
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      navigate('/seller/products');
    },
    onError: (error) => {
      toast.error('Failed to save product: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const name = formData.name.trim();
    if (!name) {
      toast.error('Please enter a product name');
      return;
    }
    if (name.length > 200) {
      toast.error('Product name must be under 200 characters');
      return;
    }
    if (!formData.is_pay_what_you_want && (!formData.price || parseFloat(formData.price) <= 0)) {
      toast.error('Please enter a valid price');
      return;
    }
    const price = parseFloat(formData.price);
    if (price > 50000) {
      toast.error('Price cannot exceed £50,000');
      return;
    }
    if (formData.is_pay_what_you_want) {
      const minP = parseFloat(formData.min_price);
      if (minP > 0 && minP < 1) {
        toast.error('Minimum price must be £0 (free) or at least £1.00 (Stripe minimum)');
        return;
      }
    }
    if (!formData.ip_ownership_confirmed) {
      toast.error('You must confirm you have the rights to sell this product');
      return;
    }
    if (!formData.asset_file_url) {
      toast.error('A product file must be uploaded before saving');
      return;
    }
    const plainDesc = formData.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (plainDesc.length < 100) {
      toast.error(`Description must be at least 100 characters (currently ${plainDesc.length})`);
      return;
    }
    if (plainDesc.length > 10000) {
      toast.error('Description must be under 10,000 characters');
      return;
    }

    // Warn about blocked marketplace links (they'll be stripped by sanitization)
    if (containsBlockedLinks(formData.description)) {
      toast.warning('Links to external marketplaces are not allowed and have been removed');
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
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Essential details about your product</p>
            </div>
            <div className="p-4 space-y-4">
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
                    onValueChange={(value) => setFormData({ ...formData, category_id: value === '__none__' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-muted-foreground">No category</SelectItem>
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
                <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
                <RichTextEditor
                  content={formData.description}
                  onChange={(content) => setFormData({ ...formData, description: content })}
                  placeholder="Describe your product (min. 100 characters)..."
                />
                <p className="text-xs text-muted-foreground">
                  {formData.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length}/100 characters minimum
                </p>
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Eclipse+ Free Claim</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow Eclipse+ members to claim this product for free
                  </p>
                </div>
                <Switch
                  checked={formData.eclipse_free_eligible}
                  onCheckedChange={(checked) => setFormData({ ...formData, eclipse_free_eligible: checked })}
                />
              </div>

              {/* Pay What You Want */}
              <div className="space-y-4 pt-4 border-t">
                {!store?.pwyw_enabled ? (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-muted bg-muted/30">
                    <Sparkles className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Pay What You Want pricing is disabled for your store.{' '}
                      <a href="/seller/settings/profile" className="underline text-primary hover:text-primary/80">
                        Enable it in Store Settings
                      </a>
                    </p>
                  </div>
                ) : (
                <>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Pay What You Want
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      Let buyers choose their own price, including free
                    </p>
                  </div>
                  <Switch
                    checked={formData.is_pay_what_you_want}
                    onCheckedChange={(checked) => setFormData({ 
                      ...formData, 
                      is_pay_what_you_want: checked,
                      min_price: checked ? (formData.min_price || '0') : '0',
                    })}
                  />
                </div>

                {formData.is_pay_what_you_want && (
                  <div className="space-y-3 p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
                    <div className="space-y-2">
                      <Label htmlFor="min_price">Minimum Price (£)</Label>
                      <Input
                        id="min_price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.min_price}
                        onChange={(e) => setFormData({ ...formData, min_price: e.target.value })}
                        placeholder="0.00"
                      />
                      <p className="text-xs text-muted-foreground">
                        Set to £0 for completely free downloads. The "Price" field above becomes the suggested price shown to buyers.
                        {parseFloat(formData.min_price) > 0 && parseFloat(formData.min_price) < 1 && (
                          <span className="text-destructive block mt-1">
                            ⚠ Minimum must be £0 (free) or £1+ (Stripe minimum)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                )}
                </>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-start gap-3 p-4 rounded-lg border border-primary/30 bg-primary/5">
                  <Checkbox
                    id="ip_ownership"
                    checked={formData.ip_ownership_confirmed}
                    onCheckedChange={(checked) => setFormData({ ...formData, ip_ownership_confirmed: checked as boolean })}
                    className="mt-0.5"
                  />
                  <div className="space-y-1">
                    <label htmlFor="ip_ownership" className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                      <Shield className="h-4 w-4 text-primary" />
                      IP Ownership Confirmation *
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      I confirm that I am the original creator of this product, or I have obtained proper 
                      licensing/permission to sell this product. I understand that selling stolen or 
                      unauthorized assets violates the <a href="/dmca" target="_blank" className="text-primary hover:underline">DMCA Policy</a> and 
                      may result in account termination.
                    </p>
                  </div>
                </div>
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
            </div>
          </div>

          {/* Early Access for Eclipse+ */}
          <EarlyAccessCard
            enabled={formData.early_access_enabled}
            onEnabledChange={(enabled) => setFormData({ 
              ...formData, 
              early_access_enabled: enabled,
              early_access_hours: enabled ? formData.early_access_hours : '',
            })}
            customHours={formData.early_access_hours}
            onCustomHoursChange={(hours) => setFormData({ ...formData, early_access_hours: hours })}
            scheduleEnabled={formData.schedule_enabled}
          />

          {/* Images */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm flex items-center justify-between">
                <span>Product Images</span>
                <span className="text-sm font-normal text-muted-foreground">
                  {formData.images.length}/{MAX_IMAGES}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">Upload up to {MAX_IMAGES} images to showcase your product</p>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {formData.images.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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

                {formData.images.length < MAX_IMAGES ? (
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
                      {uploading ? 'Uploading...' : `Click to upload images (${MAX_IMAGES - formData.images.length} remaining)`}
                    </p>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center bg-muted/20">
                    <ImagePlus className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Maximum {MAX_IMAGES} images reached
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>
          </div>

          {/* Digital Asset */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">Digital Asset <span className="text-destructive">*</span></h3>
              <p className="text-xs text-muted-foreground mt-0.5">Upload the file customers will download after purchase (required)</p>
            </div>
            <div className="p-4">
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
            </div>
          </div>

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
