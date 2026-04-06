import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, FileImage, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UploadedFile {
  file_path: string;
  file_name: string;
  file_size: number;
}

interface DisputeEvidenceUploadProps {
  disputeId?: string; // Optional: if provided, saves to dispute_evidence table
  onFilesChange: (files: UploadedFile[]) => void;
  existingFiles?: UploadedFile[];
  maxFiles?: number;
  disabled?: boolean;
  className?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

export function DisputeEvidenceUpload({
  disputeId,
  onFilesChange,
  existingFiles = [],
  maxFiles = 5,
  disabled = false,
  className,
}: DisputeEvidenceUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(existingFiles);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (!selectedFiles.length || !user) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} exceeds 10MB limit`);
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name}: Only images and PDFs are allowed`);
        return;
      }
    }

    setUploading(true);
    const newFiles: UploadedFile[] = [];

    try {
      for (const file of selectedFiles) {
        const ext = file.name.split('.').pop();
        const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;

        const { error } = await supabase.storage
          .from('dispute-evidence')
          .upload(filePath, file, { contentType: file.type });

        if (error) throw error;

        const uploaded: UploadedFile = {
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
        };

        // If disputeId is provided, save to dispute_evidence table
        if (disputeId) {
          await supabase.from('dispute_evidence').insert({
            dispute_id: disputeId,
            uploaded_by: user.id,
            file_path: filePath,
            file_name: file.name,
            file_size: file.size,
          });
        }

        newFiles.push(uploaded);
      }

      const updated = [...files, ...newFiles];
      setFiles(updated);
      onFilesChange(updated);
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFile = async (index: number) => {
    const file = files[index];
    try {
      await supabase.storage.from('dispute-evidence').remove([file.file_path]);
      if (disputeId) {
        await supabase.from('dispute_evidence').delete().eq('file_path', file.file_path);
      }
    } catch (err) {
      console.error('Failed to remove file:', err);
    }
    const updated = files.filter((_, i) => i !== index);
    setFiles(updated);
    onFilesChange(updated);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={cn('space-y-3', className)}>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(',')}
        multiple
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg border bg-muted/30 text-sm">
              <FileImage className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate flex-1">{file.file_name}</span>
              <span className="text-xs text-muted-foreground shrink-0">{formatSize(file.file_size)}</span>
              {!disabled && (
                <Button type="button" variant="ghost" size="icon" aria-label="Close" className="h-6 w-6" onClick={() => removeFile(i)}>
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {files.length < maxFiles && !disabled && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full border-dashed"
        >
          {uploading ? (
            <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Uploading...</>
          ) : (
            <><Upload className="h-4 w-4 mr-2" />Attach Evidence ({files.length}/{maxFiles})</>
          )}
        </Button>
      )}

      <p className="text-xs text-muted-foreground">
        Images or PDFs up to 10MB each. Screenshots, receipts, or other proof.
      </p>
    </div>
  );
}
