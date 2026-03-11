import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';

interface TakedownEvidenceUploadProps {
  userId: string;
  folder: 'original-proof' | 'infringing-evidence';
  files: string[];
  onFilesChange: (files: string[]) => void;
  maxFiles?: number;
  label: string;
  description: string;
}

export function TakedownEvidenceUpload({
  userId,
  folder,
  files,
  onFilesChange,
  maxFiles = 5,
  label,
  description,
}: TakedownEvidenceUploadProps) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    if (files.length + selectedFiles.length > maxFiles) {
      toast.error(`Maximum ${maxFiles} files allowed`);
      return;
    }

    setUploading(true);
    const newPaths: string[] = [];

    for (const file of Array.from(selectedFiles)) {
      // Validate file type
      if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
        toast.error(`${file.name}: Only images and PDFs allowed`);
        continue;
      }
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File too large (max 10MB)`);
        continue;
      }

      const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
      const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const path = `${userId}/${folder}/${safeName}`;

      const { error } = await supabase.storage
        .from('takedown-evidence')
        .upload(path, file, { upsert: false });

      if (error) {
        console.error('Upload error:', error);
        toast.error(`Failed to upload ${file.name}`, { description: error.message });
      } else {
        newPaths.push(path);
      }
    }

    if (newPaths.length > 0) {
      onFilesChange([...files, ...newPaths]);
    }
    setUploading(false);
    // Reset input
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = async (path: string) => {
    await supabase.storage.from('takedown-evidence').remove([path]);
    onFilesChange(files.filter(f => f !== path));
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('takedown-evidence')
      .createSignedUrl(path, 300);
    return data?.signedUrl;
  };

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{description}</p>

      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((path, i) => (
            <FilePreview key={path} path={path} onRemove={() => removeFile(path)} getSignedUrl={getSignedUrl} />
          ))}
        </div>
      )}

      {files.length < maxFiles && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            multiple
            onChange={handleUpload}
            className="hidden"
            id={`upload-${folder}`}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="gap-1.5"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
            {uploading ? 'Uploading...' : 'Upload Screenshots'}
          </Button>
          <span className="text-xs text-muted-foreground ml-2">
            {files.length}/{maxFiles} files · Images or PDF, max 10MB each
          </span>
        </div>
      )}
    </div>
  );
}

function FilePreview({ path, onRemove, getSignedUrl }: { path: string; onRemove: () => void; getSignedUrl: (p: string) => Promise<string | undefined> }) {
  const [url, setUrl] = useState<string | null>(null);
  const filename = path.split('/').pop() || path;
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(filename);

  const loadPreview = async () => {
    if (isImage && !url) {
      const signed = await getSignedUrl(path);
      if (signed) setUrl(signed);
    }
  };

  // Load preview on mount
  useState(() => { loadPreview(); });

  return (
    <div className="relative group border rounded-md overflow-hidden w-20 h-20 bg-muted flex items-center justify-center">
      {isImage && url ? (
        <img src={url} alt="Evidence" className="w-full h-full object-cover" />
      ) : (
        <div className="text-center p-1">
          <ImageIcon className="h-5 w-5 mx-auto text-muted-foreground" />
          <p className="text-[8px] text-muted-foreground truncate mt-0.5">{filename}</p>
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 bg-destructive text-destructive-foreground rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
