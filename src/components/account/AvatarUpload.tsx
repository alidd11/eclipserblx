import { useState, useRef, useCallback } from 'react';
import { Camera, Loader2, User, Upload } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useDropZone } from '@/hooks/useDropZone';

interface AvatarUploadProps {
  userId: string;
  currentAvatarUrl: string | null;
  displayName: string;
  onAvatarChange: (url: string) => void;
}

export function AvatarUpload({ userId, currentAvatarUrl, displayName, onAvatarChange }: AvatarUploadProps) {
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
    <div className="flex flex-col items-center gap-3">
      <div 
        className="relative group cursor-pointer"
        {...dragProps}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <Avatar className={`h-20 w-20 border-2 transition-all duration-200 ${
          isDragOver 
            ? 'border-primary ring-2 ring-primary/30 scale-105' 
            : 'border-border hover:border-primary/50'
        }`}>
          <AvatarImage src={currentAvatarUrl || undefined} alt={displayName} />
          <AvatarFallback className="text-lg bg-primary/10 text-primary">
            {displayName ? getInitials(displayName) : <User className="h-8 w-8" />}
          </AvatarFallback>
        </Avatar>
        
        {/* Drag overlay */}
        {isDragOver && (
          <div className="absolute inset-0 rounded-full bg-primary/20 flex items-center justify-center">
            <Upload className="h-6 w-6 text-primary animate-bounce" />
          </div>
        )}
        
        {/* Upload button */}
        <Button
          size="icon"
          variant="secondary"
          className="absolute bottom-0 right-0 h-7 w-7 rounded-full shadow-md pointer-events-none"
        >
          {isUploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Camera className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
      <p className="text-xs text-muted-foreground">
        {isDragOver ? 'Drop to upload' : 'Click or drag to change photo'}
      </p>
    </div>
  );
}
