import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
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
  Save,
  Upload,
  X,
  FileCheck,
  Loader2,
  ImagePlus,
  Calendar,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { applyProductWatermark } from '@/lib/watermark';
import { QUANTIS_STORE_ID } from '@/lib/constants';
import { performSecurityScan } from '@/lib/secureFileUpload';
import { validateImageQuality } from '@/lib/imageQuality';

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

interface SellerProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: ProductForm;
  setForm: React.Dispatch<React.SetStateAction<ProductForm>>;
  onSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  storeId: string | undefined;
  parentCats: { id: string; name: string; parent_id: string | null }[];
  childCatsMap: Map<string, { id: string; name: string; parent_id: string | null }[]>;
  limits: { maxProductFiles: number };
}

export function SellerProductFormDialog({
  open,
  onOpenChange,
  form,
  setForm,
  onSubmit,
  isPending,
  storeId,
  parentCats,
  childCatsMap,
  limits,
}: SellerProductFormDialogProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const additionalFileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

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
        const fileName = `${storeId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('product-images')
          .upload(fileName, file, { contentType: file.type });
        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(fileName);

        const finalUrl = storeId === QUANTIS_STORE_ID
          ? await applyProductWatermark(publicUrl, fileName)
          : publicUrl;

        setForm(prev => ({ ...prev, images: [...prev.images, finalUrl] }));
        uploadedCount++;
      }

      if (uploadedCount > 0) {
        toast.success(`${uploadedCount} image(s) uploaded successfully`);
      } else {
        toast.warning('No images were uploaded — check the errors above');
      }
    } catch (error) {
      toast.error('Failed to upload images: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

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
      const fileName = `${storeId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-assets')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      setForm(prev => ({ ...prev, asset_file_url: fileName }));
      toast.success('Asset file uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload asset: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      const fileName = `${storeId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('product-assets')
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      setForm(prev => ({
        ...prev,
        additional_asset_files: [...prev.additional_asset_files, fileName],
      }));
      toast.success('Additional file uploaded successfully');
    } catch (error) {
      toast.error('Failed to upload file: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setIsUploading(false);
      if (additionalFileInputRef.current) additionalFileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== index) }));
  };

  const removeAssetFile = () => {
    setForm(prev => ({ ...prev, asset_file_url: '' }));
  };

  const removeAdditionalFile = (index: number) => {
    setForm(prev => ({
      ...prev,
      additional_asset_files: prev.additional_asset_files.filter((_, i) => i !== index),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? 'Edit Product' : 'Create Product'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                  {parentCats.map((parent) => {
                    const children = childCatsMap.get(parent.id) || [];
                    if (children.length > 0) {
                      return (
                        <SelectGroup key={parent.id}>
                          <SelectLabel>{parent.name}</SelectLabel>
                          {children.map((child) => (
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
            <input type="file" ref={imageInputRef} onChange={handleImageUpload} accept="image/*" multiple className="hidden" />
            {form.images.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {form.images.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img src={url} alt="" className="h-16 w-16 object-cover rounded-lg border" />
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
            <Button type="button" variant="outline" onClick={() => imageInputRef.current?.click()} disabled={isUploadingImage || form.images.length >= 8} className="w-full">
              {isUploadingImage ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>) : (<><ImagePlus className="h-4 w-4 mr-2" />Add Images ({form.images.length}/8)</>)}
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
            <input type="file" ref={fileInputRef} onChange={handleAssetUpload} className="hidden" />
            <input type="file" ref={additionalFileInputRef} onChange={handleAdditionalFileUpload} className="hidden" />

            {form.asset_file_url ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                <FileCheck className="h-5 w-5 text-green-500" />
                <span className="flex-1 text-sm truncate">{form.asset_file_url.split('/').pop()}</span>
                <Badge variant="secondary" className="text-xs">Main</Badge>
                <Button type="button" variant="ghost" size="icon" onClick={removeAssetFile} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full">
                {isUploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>) : (<><Upload className="h-4 w-4 mr-2" />Upload Main File</>)}
              </Button>
            )}

            {form.additional_asset_files.map((file, index) => (
              <div key={index} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-muted/50">
                <FileCheck className="h-5 w-5 text-green-500" />
                <span className="flex-1 text-sm truncate">{file.split('/').pop()}</span>
                <Badge variant="outline" className="text-xs">Extra</Badge>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeAdditionalFile(index)} className="h-8 w-8">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {form.asset_file_url && (form.asset_file_url ? 1 : 0) + form.additional_asset_files.length < limits.maxProductFiles && (
              <Button type="button" variant="outline" onClick={() => additionalFileInputRef.current?.click()} disabled={isUploading} className="w-full">
                {isUploading ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>) : (<><Upload className="h-4 w-4 mr-2" />Add Another File</>)}
              </Button>
            )}

            <p className="text-xs text-muted-foreground">
              {limits.maxProductFiles === 1
                ? 'Upload the file customers will download. Upgrade to Pro for up to 3 files per product.'
                : `Upload up to ${limits.maxProductFiles} files per product.`}
            </p>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Active</Label>
              <p className="text-sm text-muted-foreground">Make visible when approved</p>
            </div>
            <Switch checked={form.is_active} onCheckedChange={(checked) => setForm({ ...form, is_active: checked })} />
          </div>

          {/* Scheduled Release */}
          <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-amber-500" />
                  Schedule Release
                </Label>
                <p className="text-xs text-muted-foreground">Set a future date for this product to go live</p>
              </div>
              <Switch
                checked={form.schedule_enabled}
                onCheckedChange={(checked) => setForm({ ...form, schedule_enabled: checked, release_at: checked ? form.release_at : '' })}
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

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? (<><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving...</>) : (<><Save className="h-4 w-4 mr-2" />{form.id ? 'Update Product' : 'Create Product'}</>)}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
