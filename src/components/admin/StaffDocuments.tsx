import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Loader2,
  File,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileCode
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

const DOCUMENT_CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
  { value: 'contract', label: 'Contract', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
  { value: 'id_verification', label: 'ID Verification', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
  { value: 'performance', label: 'Performance Review', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
  { value: 'training', label: 'Training', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  { value: 'certification', label: 'Certification', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30' },
  { value: 'other', label: 'Other', color: 'bg-pink-500/20 text-pink-400 border-pink-500/30' },
];

interface StaffDocument {
  id: string;
  staff_user_id: string;
  uploaded_by: string;
  file_name: string;
  file_path: string;
  file_type: string | null;
  file_size: number | null;
  description: string | null;
  category: string | null;
  created_at: string;
  uploader_name?: string;
}

interface StaffDocumentsProps {
  staffUserId: string;
  currentUserId: string;
  isAdmin: boolean;
}

const getFileIcon = (fileType: string | null) => {
  if (!fileType) return File;
  if (fileType.startsWith('image/')) return FileImage;
  if (fileType.includes('spreadsheet') || fileType.includes('excel') || fileType.includes('csv')) return FileSpreadsheet;
  if (fileType.includes('zip') || fileType.includes('rar') || fileType.includes('archive')) return FileArchive;
  if (fileType.includes('javascript') || fileType.includes('json') || fileType.includes('html') || fileType.includes('css')) return FileCode;
  if (fileType.includes('pdf') || fileType.includes('document') || fileType.includes('text')) return FileText;
  return File;
};

const formatFileSize = (bytes: number | null) => {
  if (!bytes) return 'Unknown size';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getCategoryInfo = (category: string | null) => {
  return DOCUMENT_CATEGORIES.find(c => c.value === category) || DOCUMENT_CATEGORIES[0];
};

export function StaffDocuments({ staffUserId, currentUserId, isAdmin }: StaffDocumentsProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [isUploading, setIsUploading] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<StaffDocument | null>(null);

  // Fetch documents for this staff member
  const { data: documents = [], isLoading } = useQuery<StaffDocument[]>({
    queryKey: ['staff-documents', staffUserId],
    queryFn: async (): Promise<StaffDocument[]> => {
      const { data, error } = await supabase
        .from('staff_documents')
        .select('*')
        .eq('staff_user_id', staffUserId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get uploader names
      const uploaderIds = [...new Set(data.map(d => d.uploaded_by))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name')
        .in('user_id', uploaderIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.display_name]));

      return data.map(doc => ({
        ...doc,
        uploader_name: profileMap.get(doc.uploaded_by) || 'Unknown',
      }));
    },
    enabled: !!staffUserId && isAdmin,
  });

  // Upload document mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setIsUploading(true);
      
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${staffUserId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('staff-documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Create database record
      const { error: dbError } = await supabase
        .from('staff_documents')
        .insert({
          staff_user_id: staffUserId,
          uploaded_by: currentUserId,
          file_name: file.name,
          file_path: fileName,
          file_type: file.type,
          file_size: file.size,
          description: description.trim() || null,
          category: category,
        });

      if (dbError) {
        // Cleanup uploaded file if database insert fails
        await supabase.storage.from('staff-documents').remove([fileName]);
        throw dbError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents', staffUserId] });
      setDescription('');
      setCategory('general');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      toast.success('Document uploaded successfully');
    },
    onError: (error) => {
      toast.error('Failed to upload document: ' + error.message);
    },
    onSettled: () => {
      setIsUploading(false);
    },
  });

  // Delete document mutation
  const deleteMutation = useMutation({
    mutationFn: async (doc: StaffDocument) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('staff-documents')
        .remove([doc.file_path]);

      if (storageError) throw storageError;

      // Delete database record
      const { error: dbError } = await supabase
        .from('staff_documents')
        .delete()
        .eq('id', doc.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-documents', staffUserId] });
      toast.success('Document deleted');
    },
    onError: (error) => {
      toast.error('Failed to delete document: ' + error.message);
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast.error('File size must be less than 10MB');
        return;
      }
      uploadMutation.mutate(file);
    }
  };

  const handleDownload = async (doc: StaffDocument) => {
    try {
      const { data, error } = await supabase.storage
        .from('staff-documents')
        .download(doc.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error('Failed to download document');
    }
  };

  if (!isAdmin) return null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Section */}
          <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/20">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select value={category} onValueChange={setCategory} disabled={isUploading}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g., Signed on Jan 2024..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isUploading}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
                disabled={isUploading}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Document
                  </>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">Max 10MB</span>
            </div>
          </div>

          {/* Documents List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse p-4 rounded-lg bg-muted/30">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-muted rounded" />
                    <div className="flex-1">
                      <div className="h-4 w-32 bg-muted rounded mb-2" />
                      <div className="h-3 w-24 bg-muted rounded" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No documents uploaded</p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload contracts, ID verification, or other important files
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {documents.map(doc => {
                const FileIcon = getFileIcon(doc.file_type);
                const categoryInfo = getCategoryInfo(doc.category);
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <FileIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className="font-medium text-sm truncate">{doc.file_name}</p>
                        <Badge variant="outline" className={`text-xs shrink-0 ${categoryInfo.color}`}>
                          {categoryInfo.label}
                        </Badge>
                      </div>
                      {doc.description && (
                        <p className="text-xs text-muted-foreground truncate">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(doc.file_size)} • Uploaded by {doc.uploader_name} on {format(new Date(doc.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => setDocumentToDelete(doc)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!documentToDelete} onOpenChange={(open) => !open && setDocumentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{documentToDelete?.file_name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (documentToDelete) {
                  deleteMutation.mutate(documentToDelete);
                  setDocumentToDelete(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
