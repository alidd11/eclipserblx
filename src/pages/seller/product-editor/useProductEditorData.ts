import { useEffect, useRef, useState } from 'react';
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
import { performSecurityScan } from '@/lib/secureFileUpload';
import { validateImageQuality } from '@/lib/imageQuality';
import { useFormPersistence } from '@/hooks/useFormPersistence';
import { containsBlockedLinks } from '@/lib/blockedLinks';
import { toast } from 'sonner';
import type { ProductFormData, ModerationFlags } from './types';
import { INITIAL_FORM_DATA, MAX_IMAGES } from './types';

export function useProductEditorData() {
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

  const [formData, setFormData, clearFormData] = useFormPersistence<ProductFormData>(
    isEditing ? `seller-product-edit-${productId}` : 'seller-product-new',
    INITIAL_FORM_DATA
  );

  const [uploading, setUploading] = useState(false);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [moderationFlags, setModerationFlags] = useState<ModerationFlags>({});

  // Fetch categories
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
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
      const p = product as Record<string, unknown>;
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
        early_access_strategy: ((p.early_access_strategy as string) || 'timed') as import('@/components/seller/LaunchStrategyCard').EarlyAccessStrategy,
        early_access_min_orders: (p.early_access_min_orders as number)?.toString() || '2',
        early_access_link_token: (p.early_access_link_token as string) || '',
        ip_ownership_confirmed: product.ip_ownership_confirmed ?? false,
        is_pay_what_you_want: product.is_pay_what_you_want ?? false,
        min_price: (product.min_price ?? 0).toString(),
        max_downloads_per_purchase: p.max_downloads_per_purchase?.toString() || '',
      });
    }
  }, [product]);

  const handleNameChange = (name: string) => {
    setFormData(prev => ({ ...prev, name }));
  };

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
        const quality = await validateImageQuality(file);
        if (!quality.valid) { toast.error(quality.reason || 'Image does not meet quality standards'); continue; }

        toast.info('Scanning image...', { id: 'img-scan' });
        const scanResult = await performSecurityScan(file, { skipLuaAnalysis: true });
        if (!scanResult.isAllowed) {
          toast.dismiss('img-scan');
          toast.error(scanResult.reason || 'Image blocked');
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
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file, { contentType: file.type, cacheControl: '31536000' });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        const finalUrl = store?.id === QUANTIS_STORE_ID ? await applyProductWatermark(publicUrl, fileName) : publicUrl;
        newImages.push(finalUrl);
      }

      setFormData(prev => ({ ...prev, images: [...prev.images, ...newImages] }));
      if (newImages.length > 0) toast.success(`${newImages.length} image(s) uploaded successfully`);
    } catch (error) {
      toast.error('Failed to upload images: ' + (error as Error).message);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Upload asset file
  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingAsset(true);
    try {
      toast.info('Scanning file for threats...', { id: 'asset-scan' });
      const scanResult = await performSecurityScan(file, { skipNsfwCheck: true });
      if (!scanResult.isAllowed) {
        toast.dismiss('asset-scan');
        toast.error(scanResult.reason || 'File blocked by security scan');
        return;
      }
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
      const { error: uploadError } = await supabase.storage.from('product-assets').upload(fileName, file);
      if (uploadError) throw uploadError;

      setFormData(prev => ({ ...prev, asset_file_url: fileName }));
      toast.success('Asset file uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload asset: ' + (error as Error).message);
    } finally {
      setUploadingAsset(false);
      if (assetInputRef.current) assetInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

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

      let releaseAt: string | null = null;
      if (data.schedule_enabled && data.release_at) releaseAt = new Date(data.release_at).toISOString();

      let earlyAccessHours: number | null = null;
      if (data.schedule_enabled && data.early_access_enabled) {
        earlyAccessHours = data.early_access_hours ? parseInt(data.early_access_hours) : null;
      }

      const earlyAccessStrategy = data.schedule_enabled && data.early_access_enabled ? data.early_access_strategy : 'timed';
      const earlyAccessMinOrders = data.schedule_enabled && data.early_access_enabled && data.early_access_strategy === 'repeat_buyers'
        ? (parseInt(data.early_access_min_orders) || 2) : null;
      const earlyAccessLinkToken = data.schedule_enabled && data.early_access_enabled && data.early_access_strategy === 'private_link'
        ? (data.early_access_link_token || null) : null;

      const shouldAutoApprove = !hasSecurityFlags();
      const moderationStatus = shouldAutoApprove ? 'approved' : 'pending';

      const autoSlug = data.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);

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
        early_access_strategy: earlyAccessStrategy,
        early_access_min_orders: earlyAccessMinOrders,
        early_access_link_token: earlyAccessLinkToken,
        ip_ownership_confirmed: data.ip_ownership_confirmed,
        is_pay_what_you_want: data.is_pay_what_you_want,
        min_price: data.is_pay_what_you_want ? (parseFloat(data.min_price) || 0) : null,
        max_downloads_per_purchase: isPro && data.max_downloads_per_purchase ? parseInt(data.max_downloads_per_purchase) : null,
      };

      if (isEditing && productId) {
        const { error } = await supabase.from('products').update(productData).eq('id', productId).eq('store_id', store.id);
        if (error) throw error;
        return { productId, isAutoApproved: shouldAutoApprove };
      } else {
        const { data: insertedProduct, error } = await supabase
          .from('products').insert(productData).select('id, product_number').single();
        if (error) {
          if (error.message?.includes('duplicate') || error.code === '23505') {
            productData.slug = autoSlug + '-' + Date.now();
            const { data: retryProduct, error: retryError } = await supabase
              .from('products').insert(productData).select('id, product_number').single();
            if (retryError) throw retryError;
            return { productId: retryProduct.id, isAutoApproved: shouldAutoApprove, productNumber: (retryProduct as Record<string, unknown>).product_number as number };
          }
          throw error;
        }
        return { productId: insertedProduct.id, isAutoApproved: shouldAutoApprove, productNumber: (insertedProduct as Record<string, unknown>).product_number as number };
      }
    },
    onSuccess: async (result) => {
      if (result.isAutoApproved && result.productNumber) submitProductUrl(result.productNumber);
      if (result.isAutoApproved && !isEditing) {
        try {
          await supabase.functions.invoke('send-product-drop-webhook', { body: { productId: result.productId, isEarlyAccess: false } });
          toast.success('Product approved and announced to Discord!');
        } catch { toast.success('Product auto-approved!'); }
      } else if (result.isAutoApproved) {
        toast.success('Product updated successfully');
      } else {
        try {
          const flagReasons: string[] = [];
          if (moderationFlags.nsfw_flags?.length) flagReasons.push('NSFW content detected');
          if (moderationFlags.lua_risk_level && moderationFlags.lua_risk_level !== 'low') {
            flagReasons.push(`Lua script: ${moderationFlags.lua_risk_level} risk`);
          }
          await supabase.functions.invoke('notify-seller-review', {
            body: { productId: result.productId, productName: formData.name, storeOwnerId: user?.id, flagReasons },
          });
        } catch (error) { console.error('Failed to notify seller:', error); }
        toast.success('Product submitted for review - our team will approve it shortly');
      }
      clearFormData();
      queryClient.invalidateQueries({ queryKey: ['seller-products'] });
      navigate('/seller/products');
    },
    onError: (error) => { toast.error('Failed to save product: ' + error.message); },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = formData.name.trim();
    if (!name) { toast.error('Please enter a product name'); return; }
    if (name.length > 200) { toast.error('Product name must be under 200 characters'); return; }
    if (!formData.is_pay_what_you_want && (!formData.price || parseFloat(formData.price) <= 0)) { toast.error('Please enter a valid price'); return; }
    const price = parseFloat(formData.price);
    if (price > 50000) { toast.error('Price cannot exceed £50,000'); return; }
    if (formData.is_pay_what_you_want) {
      const minP = parseFloat(formData.min_price);
      if (minP > 0 && minP < 1) { toast.error('Minimum price must be £0 (free) or at least £1.00 (Stripe minimum)'); return; }
    }
    if (!formData.ip_ownership_confirmed) { toast.error('You must confirm you have the rights to sell this product'); return; }
    if (!formData.asset_file_url) { toast.error('A product file must be uploaded before saving'); return; }
    const plainDesc = formData.description.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
    if (plainDesc.length < 100) { toast.error(`Description must be at least 100 characters (currently ${plainDesc.length})`); return; }
    if (plainDesc.length > 10000) { toast.error('Description must be under 10,000 characters'); return; }
    if (containsBlockedLinks(formData.description)) {
      toast.warning('Links to external marketplaces are not allowed and have been removed');
    }
    saveProduct.mutate(formData);
  };

  // Auth guards
  useEffect(() => { if (!authLoading && !user) navigate('/auth'); }, [user, authLoading, navigate]);
  useEffect(() => { if (!flagLoading && !hasAccess) navigate('/'); }, [hasAccess, flagLoading, navigate]);
  useEffect(() => { if (!sellerLoading && !isSeller) navigate('/account'); }, [isSeller, sellerLoading, navigate]);

  return {
    formData, setFormData, isEditing, categories, store, isPro,
    uploading, uploadingAsset, fileInputRef, assetInputRef,
    handleNameChange, handleImageUpload, handleAssetUpload, removeImage,
    handleSubmit, saveProduct,
    authLoading, flagLoading, sellerLoading, productLoading,
  };
}
