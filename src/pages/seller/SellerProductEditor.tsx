import { SellerLayout } from '@/components/seller/SellerLayout';
import { EarlyAccessCard } from '@/components/seller/EarlyAccessCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
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
  Save, ArrowLeft, Upload, X, Plus, FileCheck, Loader2, ImagePlus,
  Calendar, Clock, Shield, Sparkles
} from 'lucide-react';
import { useProductEditorData } from './product-editor/useProductEditorData';
import { MAX_IMAGES } from './product-editor/types';

export default function SellerProductEditor() {
  const {
    formData, setFormData, isEditing, categories, store, isPro,
    uploading, uploadingAsset, fileInputRef, assetInputRef,
    handleNameChange, handleImageUpload, handleAssetUpload, removeImage,
    handleSubmit, saveProduct,
    authLoading, flagLoading, sellerLoading, productLoading,
  } = useProductEditorData();

  const navigate = (await import('react-router-dom')).useNavigate();

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
                      {categories?.map((cat) => (
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
                  <p className="text-sm text-muted-foreground">Make this product visible when approved</p>
                </div>
                <Switch
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
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
                    <p className="text-sm text-muted-foreground">Let buyers choose their own price, including free</p>
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
                    <p className="text-sm text-muted-foreground">Set a future date and time for this product to go live</p>
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
                        <span>Scheduled for: {new Date(formData.release_at).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Early Access */}
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
                        <img src={img} alt={`Product ${index + 1}`} className="w-full aspect-square object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        {index === 0 && (
                          <span className="absolute bottom-2 left-2 px-2 py-1 bg-primary text-primary-foreground text-xs rounded">Main</span>
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
                    <p className="text-sm text-muted-foreground">Maximum {MAX_IMAGES} images reached</p>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImageUpload} />
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
                      <p className="text-xs text-muted-foreground truncate">{formData.asset_file_url}</p>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => setFormData({ ...formData, asset_file_url: '' })}>
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

                <input ref={assetInputRef} type="file" className="hidden" onChange={handleAssetUpload} />
              </div>
            </div>
          </div>

          {/* Download Limit — Pro Only */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Download Limit</h3>
                {!isPro && (
                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">PRO</Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">Limit how many times a buyer can download after purchase</p>
            </div>
            <div className="p-4">
              {isPro ? (
                <div className="space-y-2">
                  <Label htmlFor="max_downloads">Max downloads per purchase</Label>
                  <Input
                    id="max_downloads"
                    type="number"
                    min="1"
                    max="100"
                    placeholder="Unlimited (leave empty)"
                    value={formData.max_downloads_per_purchase}
                    onChange={(e) => setFormData({ ...formData, max_downloads_per_purchase: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    {formData.max_downloads_per_purchase
                      ? `Buyers can download up to ${formData.max_downloads_per_purchase} time${parseInt(formData.max_downloads_per_purchase) !== 1 ? 's' : ''}`
                      : 'No limit — buyers can re-download as many times as they want'}
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground mb-2">Upgrade to Pro to set download limits on your products.</p>
                  <Button variant="outline" size="sm" asChild>
                    <a href="/seller/pro">Upgrade to Pro</a>
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button type="button" variant="outline" onClick={() => navigate('/seller/products')}>
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
