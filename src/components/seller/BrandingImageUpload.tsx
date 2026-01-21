import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useDropZone } from '@/hooks/useDropZone';
import { performSecurityScan, validateFile } from '@/lib/secureFileUpload';

interface BrandingImageUploadProps {
  userId: string;
  type: 'logo' | 'banner';
  currentUrl: string;
  onUpload: (url: string) => void;
}

export function BrandingImageUpload({ 
  userId, 
  type, 
  currentUrl, 
  onUpload 
}: BrandingImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const maxSize = type === 'logo' ? 2 * 1024 * 1024 : 5 * 1024 * 1024; // 2MB for logo, 5MB for banner
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

  const uploadImage = async (file: File) => {
    // Client-side validation
    const validation = validateFile(file, {
      maxSize,
      allowedTypes: acceptedTypes,
    });

    if (!validation.valid) {
      toast.error(validation.error);
      return;
    }

    setIsUploading(true);

    try {
      // Security scan
      const scanResult = await performSecurityScan(file, {
        skipLuaAnalysis: true,
        skipNsfwCheck: false,
      });

      if (!scanResult.isAllowed) {
        toast.error(scanResult.reason || 'File failed security check');
        return;
      }

      // Delete old image if exists
      if (currentUrl && currentUrl.includes('store-branding')) {
        const oldPath = currentUrl.split('store-branding/')[1];
        if (oldPath) {
          await supabase.storage.from('store-branding').remove([oldPath]);
        }
      }

      // Upload new image
      const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
      const fileName = `${type}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('store-branding')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('store-branding')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
      toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} uploaded successfully`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Failed to upload ${type}: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadImage(file);
    }
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (files: File[]) => {
    if (files.length > 0) {
      uploadImage(files[0]);
    }
  };

  const handleRemove = async () => {
    if (currentUrl && currentUrl.includes('store-branding')) {
      try {
        const oldPath = currentUrl.split('store-branding/')[1];
        if (oldPath) {
          await supabase.storage.from('store-branding').remove([oldPath]);
        }
      } catch (error) {
        console.error('Failed to remove old image:', error);
      }
    }
    onUpload('');
    toast.success(`${type === 'logo' ? 'Logo' : 'Banner'} removed`);
  };

  const { isDragOver, dragProps } = useDropZone({
    onDrop: handleDrop,
    accept: acceptedTypes,
    maxSize,
    maxFiles: 1,
    disabled: isUploading,
  });

  const isLogo = type === 'logo';

  return (
    <div className="space-y-3">
      <Label>{isLogo ? 'Store Logo' : 'Store Banner'}</Label>
      
      {/* Current Image Preview */}
      {currentUrl && (
        <div className="relative group">
          <div className={`border rounded-lg overflow-hidden bg-muted ${isLogo ? 'w-24 h-24' : 'w-full h-32'}`}>
            <img
              src={currentUrl}
              alt={isLogo ? 'Store logo' : 'Store banner'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = '/placeholder.svg';
              }}
            />
          </div>
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Upload Area */}
      <div
        {...dragProps}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors
          ${isDragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          ${isUploading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleFileSelect}
          className="hidden"
        />
        
        <div className="flex flex-col items-center gap-2">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Uploading...</p>
            </>
          ) : isDragOver ? (
            <>
              <Upload className="h-8 w-8 text-primary" />
              <p className="text-sm text-primary font-medium">Drop to upload</p>
            </>
          ) : (
            <>
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {currentUrl ? 'Click or drag to replace' : 'Click or drag to upload'}
              </p>
              <p className="text-xs text-muted-foreground">
                {isLogo ? 'Recommended: 200x200px • Max 2MB' : 'Recommended: 1200x400px • Max 5MB'}
              </p>
            </>
          )}
        </div>
      </div>

      {/* URL Input Fallback */}
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">Or paste an image URL:</p>
        <Input
          value={currentUrl}
          onChange={(e) => onUpload(e.target.value)}
          placeholder={isLogo ? 'https://example.com/logo.png' : 'https://example.com/banner.png'}
          className="text-sm"
        />
      </div>
    </div>
  );
}