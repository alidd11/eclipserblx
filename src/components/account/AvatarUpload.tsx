import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, User, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification, showInfoNotification } from '@/lib/nativeNotification';
import { useDropZone } from '@/hooks/useDropZone';
import { performSecurityScan } from '@/lib/secureFileUpload';
interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string;
  onAvatarChange: (url: string) => void;
  compact?: boolean;
}

export function AvatarUpload({ userId, currentAvatarUrl, displayName, onAvatarChange, compact = false }: AvatarUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const uploadFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      showErrorNotification('Invalid File', 'Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showErrorNotification('File Too Large', 'Image must be less than 5MB');
      return;
    }

    // Security scan (NSFW check for images)
    showInfoNotification('Scanning', 'Checking image...');
    const scanResult = await performSecurityScan(file, { skipVirusScan: true, skipLuaAnalysis: true });
    
    if (!scanResult.isAllowed) {
      showErrorNotification('Upload Blocked', scanResult.reason || 'Image rejected');
      return;
    }

    setIsUploading(true);

    try {
      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}/avatar.${fileExt}`;

      // Delete old avatar if exists
      if (currentAvatarUrl) {
        const oldPath = currentAvatarUrl.split('/avatars/')[1];
        if (oldPath) {
          await supabase.storage.from('avatars').remove([oldPath]);
        }
      }

      // Upload new avatar
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('user_id', userId);

      if (updateError) throw updateError;

      onAvatarChange(publicUrl);
      showSuccessNotification('Profile Updated', 'Your profile picture has been changed');
    } catch (error: any) {
      console.error('Upload error:', error);
      showErrorNotification('Upload Failed', error.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
    }
  }, [userId, currentAvatarUrl, onAvatarChange]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    await uploadFile(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = useCallback((files: File[]) => {
    if (files.length > 0) {
      uploadFile(files[0]);
    }
  }, [uploadFile]);

  const { isDragOver, dragProps } = useDropZone({
    onDrop: handleDrop,
    accept: ['image/*'],
    maxSize: 5 * 1024 * 1024,
    maxFiles: 1,
    disabled: isUploading,
  });

  return (
    <div className={compact ? "relative" : "flex flex-col items-center gap-3"}>
      <div 
        className="relative group cursor-pointer"
        {...dragProps}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <Avatar className={`${compact ? 'h-14 w-14' : 'h-20 w-20'} border-2 transition-all duration-200 ${
          isDragOver 
            ? 'border-primary ring-2 ring-primary/30 scale-105' 
            : 'border-border hover:border-primary/50'
        }`}>
          <AvatarImage src={currentAvatarUrl || undefined} alt={displayName} />
          <AvatarFallback className={`${compact ? 'text-base' : 'text-lg'} bg-primary/10 text-primary`}>
            {displayName ? getInitials(displayName) : <User className={compact ? "h-6 w-6" : "h-8 w-8"} />}
          </AvatarFallback>
        </Avatar>
        
        {/* Drag overlay - only show when dragging, not as default state */}
        {isDragOver && (
          <div className="absolute inset-0 rounded-full bg-primary/20 flex items-center justify-center">
            <Upload className={`${compact ? 'h-4 w-4' : 'h-6 w-6'} text-primary animate-bounce`} />
          </div>
        )}
        
        {/* Upload indicator - small camera badge, only visible on hover/when not dragging */}
        {!isDragOver && (
          <div
            className={`absolute bottom-0 right-0 ${compact ? 'h-5 w-5' : 'h-7 w-7'} rounded-full shadow-md bg-secondary flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}
          >
            {isUploading ? (
              <Loader2 className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'} animate-spin`} />
            ) : (
              <Camera className={`${compact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'}`} />
            )}
          </div>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      {!compact && (
        <p className="text-xs text-muted-foreground">
          {isDragOver ? 'Drop to upload' : 'Click or drag to change photo'}
        </p>
      )}
    </div>
  );
}
