import { useState, useCallback, useRef } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useSellerSubscription } from '@/hooks/useSellerSubscription';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Shield, Upload, AlertTriangle, CheckCircle2, Clock, XCircle,
  FileSearch, Radar, ExternalLink, X, Crown, FileWarning,
  Hash, User, Fingerprint, CalendarDays, File as FileIcon,
  Loader2, ChevronDown, ChevronUp, MoreVertical, EyeOff, CheckCircle, Ban,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, formatDistanceToNow } from '@/lib/dateUtils';

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_EXTENSIONS = ['.lua', '.rbxm', '.rbxl', '.rbxmx', '.rbxlx', '.zip', '.rar', '.txt', '.json', '.png', '.jpg', '.jpeg', '.gif', '.mp3', '.ogg', '.wav'];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

interface ForensicReport {
  id: string;
  fingerprint_found: boolean;
  fingerprint: string | null;
  buyer_identified: boolean;
  matched_display_name: string | null;
  file_hash: string;
  status: string;
}

export default function SellerLeakReports() {
  const { store } = useSellerStatus();
  const { isPro } = useSellerSubscription();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [files, setFiles] = useState<File[]>([]);
  const [productId, setProductId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [forensicResults, setForensicResults] = useState<ForensicReport[]>([]);
  const [expandedReport, setExpandedReport] = useState<string | null>(null);

  const { data: products } = useQuery({
    queryKey: ['seller-products-for-leak', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .order('name');
      return data || [];
    },
    enabled: !!store?.id,
  });

  const { data: reports, refetch } = useQuery({
    queryKey: ['leak-reports', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await supabase
        .from('leak_reports')
        .select('*, products(name)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
    enabled: !!store?.id,
  });

  const [statusFilter, setStatusFilter] = useState<string>('active');

  const { data: scanResults } = useQuery({
    queryKey: ['leak-scan-results', store?.id, statusFilter],
    queryFn: async () => {
      if (!store?.id) return [];
      let query = (supabase as any)
        .from('leak_scan_results')
        .select('*, products(name)')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data } = await query;
      return (data || []) as any[];
    },
    enabled: !!store?.id && isPro,
  });

  const toggleScan = useMutation({
    mutationFn: async (enabled: boolean) => {
      if (!store?.id) throw new Error('No store');
      const { error } = await (supabase as any)
        .from('stores')
        .update({ leak_scan_enabled: enabled })
        .eq('id', store.id);
      if (error) throw error;
    },
    onSuccess: (_, enabled) => {
      toast.success(enabled ? 'Auto-scan enabled' : 'Auto-scan disabled');
      queryClient.invalidateQueries({ queryKey: ['seller-status'] });
    },
    onError: () => toast.error('Failed to update auto-scan setting'),
  });

  const updateResultStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase as any)
        .from('leak_scan_results')
        .update({ status, dismissed: status !== 'active' })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      const labels: Record<string, string> = {
        ignored: 'Marked as ignored',
        resolved: 'Marked as resolved',
        false_positive: 'Marked as false positive',
        active: 'Restored to active',
      };
      toast.success(labels[status] || 'Status updated');
      queryClient.invalidateQueries({ queryKey: ['leak-scan-results'] });
    },
    onError: () => toast.error('Failed to update status'),
  });

  // --- File validation & handling ---

  const validateFile = useCallback((file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name} exceeds 20MB limit (${formatFileSize(file.size)})`;
    }
    const ext = getFileExtension(file.name);
    if (ext && !ALLOWED_EXTENSIONS.includes(ext)) {
      return `${file.name} has unsupported format (${ext})`;
    }
    return null;
  }, []);

  const addFiles = useCallback((incoming: FileList | File[]) => {
    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(incoming).forEach((f) => {
      const err = validateFile(f);
      if (err) {
        errors.push(err);
      } else if (!files.some((existing) => existing.name === f.name && existing.size === f.size)) {
        newFiles.push(f);
      }
    });

    if (errors.length) toast.error(errors.join('\n'));
    if (newFiles.length) setFiles((prev) => [...prev, ...newFiles]);
  }, [files, validateFile]);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // --- Submit & forensic analysis ---

  const handleSubmit = async () => {
    if (!files.length || !productId || !store?.id) {
      toast.error('Please select a product and upload at least one file');
      return;
    }

    setIsSubmitting(true);
    setForensicResults([]);
    const results: ForensicReport[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('productId', productId);
        formData.append('storeId', store.id);
        if (notes) formData.append('notes', notes);

        const res = await fetch(
          `${supabaseUrl}/functions/v1/report-leak`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.access_token}` },
            body: formData,
          }
        );

        const result = await res.json();
        if (!res.ok) {
          toast.error(`${file.name}: ${result.error || 'Analysis failed'}`);
          continue;
        }

        results.push(result.report);
      }

      setForensicResults(results);

      const confirmed = results.filter((r) => r.buyer_identified).length;
      const fpFound = results.filter((r) => r.fingerprint_found && !r.buyer_identified).length;
      const noFp = results.filter((r) => !r.fingerprint_found).length;

      if (confirmed > 0) {
        toast.success(`${confirmed} file(s) matched to a buyer`);
      }
      if (fpFound > 0) {
        toast.info(`${fpFound} file(s) contain fingerprints but no buyer match`);
      }
      if (noFp > 0) {
        toast.warning(`${noFp} file(s) had no detectable fingerprint`);
      }

      setFiles([]);
      setProductId('');
      setNotes('');
      refetch();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusConfig: Record<string, { icon: any; color: string; label: string }> = {
    pending: { icon: Clock, color: 'text-warning', label: 'Pending' },
    confirmed: { icon: CheckCircle2, color: 'text-destructive', label: 'Confirmed Leak' },
    dismissed: { icon: XCircle, color: 'text-muted-foreground', label: 'Dismissed' },
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Asset Protection
          </h1>
          <p className="text-sm text-muted-foreground">
            Report leaked files to identify the source buyer via embedded fingerprints
          </p>
        </div>

        {/* Auto-Scan Toggle — Pro Only */}
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-primary/10">
                <Radar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-medium flex items-center gap-2">
                  Automated Leak Scanning
                  {!isPro && (
                    <Badge variant="outline" className="text-xs gap-1">
                      <Crown className="h-3 w-3" /> Pro
                    </Badge>
                  )}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Periodically scans known leak sites for your products
                </p>
              </div>
            </div>
            <Switch
              checked={!!(store as any)?.leak_scan_enabled}
              onCheckedChange={(checked) => toggleScan.mutate(checked)}
              disabled={!isPro || toggleScan.isPending}
            />
          </div>
        </div>

        {/* Auto-Detected Leaks */}
        {isPro && scanResults && scanResults.length > 0 && (
          <div className="rounded-xl border border-destructive/30 bg-card">
            <div className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-medium flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-4 w-4" />
                Auto-Detected Results
                <Badge variant="destructive" className="text-xs">{scanResults.length}</Badge>
              </h3>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px] h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="ignored">Ignored</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="false_positive">False Positive</SelectItem>
                  <SelectItem value="all">All</SelectItem>
                </SelectContent>
              </Select>
            </div>
            </div>
            <div className="p-4 pt-2 space-y-2">
              {scanResults.map((result: any) => {
                const confidenceBadge = result.confidence === 'confirmed'
                  ? { label: 'Confirmed', className: 'bg-destructive/15 text-destructive border-destructive/30' }
                  : result.confidence === 'high'
                    ? { label: 'High', className: 'bg-warning/15 text-warning border-warning/30' }
                    : result.confidence === 'low'
                      ? { label: 'Low', className: 'bg-muted text-muted-foreground border-border' }
                      : { label: 'Medium', className: 'bg-warning/10 text-warning/80 border-warning/20' };

                return (
                  <div key={result.id} className="flex items-start justify-between gap-3 p-3 rounded-lg border bg-card">
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
                        <span className="font-medium text-sm truncate">
                          {result.products?.name || 'Unknown Product'}
                        </span>
                        <Badge variant="outline" className={`text-xs shrink-0 ${confidenceBadge.className}`}>
                          {confidenceBadge.label}
                        </Badge>
                        {result.status && result.status !== 'active' && (
                          <Badge variant="outline" className="text-xs shrink-0 capitalize">
                            {result.status.replace('_', ' ')}
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs shrink-0">
                          {result.source_domain}
                        </Badge>
                      </div>
                      {result.matched_display_name && (
                        <p className="text-xs flex items-center gap-1 text-destructive font-medium">
                          <Shield className="h-3 w-3" />
                          Buyer Identified: <span className="text-foreground">{result.matched_display_name}</span>
                        </p>
                      )}
                      {result.extracted_fingerprint && !result.matched_display_name && (
                        <p className="text-xs font-mono text-warning">
                          Fingerprint: {result.extracted_fingerprint}
                        </p>
                      )}
                      {result.snippet && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{result.snippet}</p>
                      )}
                      {result.ai_verdict && (
                        <p className="text-xs italic text-muted-foreground/70">
                          AI: {result.ai_verdict}
                        </p>
                      )}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span>{formatDistanceToNow(new Date(result.created_at), { addSuffix: true })}</span>
                        <a
                          href={result.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1"
                        >
                          View Source <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {result.status !== 'active' && (
                          <DropdownMenuItem onClick={() => updateResultStatus.mutate({ id: result.id, status: 'active' })}>
                            <CheckCircle2 className="h-4 w-4 mr-2" /> Restore to Active
                          </DropdownMenuItem>
                        )}
                        {result.status !== 'ignored' && (
                          <DropdownMenuItem onClick={() => updateResultStatus.mutate({ id: result.id, status: 'ignored' })}>
                            <EyeOff className="h-4 w-4 mr-2" /> Ignore
                          </DropdownMenuItem>
                        )}
                        {result.status !== 'resolved' && (
                          <DropdownMenuItem onClick={() => updateResultStatus.mutate({ id: result.id, status: 'resolved' })}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Mark Resolved
                          </DropdownMenuItem>
                        )}
                        {result.status !== 'false_positive' && (
                          <DropdownMenuItem onClick={() => updateResultStatus.mutate({ id: result.id, status: 'false_positive' })}>
                            <Ban className="h-4 w-4 mr-2" /> False Positive
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Forensic Results — shown after analysis */}
        {forensicResults.length > 0 && (
          <div className="rounded-xl border border-primary/30 bg-card">
            <div className="p-4 pb-2">
              <h3 className="text-base font-medium flex items-center gap-2">
                <Fingerprint className="h-4 w-4 text-primary" />
                Forensic Analysis Results
                <Badge variant="default" className="text-xs">{forensicResults.length} file(s)</Badge>
              </h3>
            </div>
            <div className="p-4 pt-2 space-y-2">
              {forensicResults.map((report) => (
                <div key={report.id} className="rounded-lg border bg-card overflow-hidden">
                  <button
                    className="w-full p-3 flex items-center justify-between text-left hover:bg-muted/30 transition-colors"
                    onClick={() => setExpandedReport(expandedReport === report.id ? null : report.id)}
                  >
                    <div className="flex items-center gap-2">
                      {report.buyer_identified ? (
                        <CheckCircle2 className="h-4 w-4 text-destructive" />
                      ) : report.fingerprint_found ? (
                        <Fingerprint className="h-4 w-4 text-warning" />
                      ) : (
                        <FileWarning className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className="font-medium text-sm">
                        {report.buyer_identified
                          ? `Buyer Identified: ${report.matched_display_name}`
                          : report.fingerprint_found
                            ? 'Fingerprint Detected'
                            : 'No Fingerprint Found'}
                      </span>
                    </div>
                    {expandedReport === report.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {expandedReport === report.id && (
                    <div className="px-3 pb-3 border-t">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3">
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Fingerprint className="h-3 w-3" /> Fingerprint
                          </p>
                          <p className="text-sm font-mono">
                            {report.fingerprint || <span className="text-muted-foreground italic">None detected</span>}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" /> Matched Buyer
                          </p>
                          <p className="text-sm font-medium">
                            {report.matched_display_name || <span className="text-muted-foreground italic">No match</span>}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Hash className="h-3 w-3" /> File Hash (SHA-256)
                          </p>
                          <p className="text-xs font-mono break-all text-muted-foreground">
                            {report.file_hash}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Shield className="h-3 w-3" /> Status
                          </p>
                          <Badge variant={report.buyer_identified ? 'destructive' : 'outline'} className="text-xs">
                            {report.buyer_identified ? 'Leak Confirmed' : report.fingerprint_found ? 'Fingerprint Only' : 'Inconclusive'}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Submit Report — Enterprise Upload */}
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="p-4 pb-2">
            <h3 className="text-base font-medium flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Analyse Leaked Files
            </h3>
            <p className="text-xs text-muted-foreground mt-1">
              Upload suspected leaked files for fingerprint extraction and buyer identification
            </p>
          </div>
          <div className="p-4 pt-2 space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Product</label>
              <Select value={productId} onValueChange={setProductId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select the affected product" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Drag & Drop Zone */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Upload Files</label>
              <div
                className={`
                  relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer
                  ${isDragOver
                    ? 'border-primary bg-primary/5 scale-[1.01]'
                    : 'border-border hover:border-primary/50 hover:bg-muted/20'
                  }
                `}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  className="hidden"
                  accept={ALLOWED_EXTENSIONS.join(',')}
                  onChange={(e) => {
                    if (e.target.files?.length) addFiles(e.target.files);
                    e.target.value = '';
                  }}
                />
                <Upload className={`h-8 w-8 mx-auto mb-2 transition-colors ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
                <p className="text-sm font-medium">
                  {isDragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Supports .lua, .rbxm, .rbxl, .zip, images, audio — max 20MB per file
                </p>
              </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="space-y-1.5">
                {files.map((f, i) => (
                  <div key={`${f.name}-${i}`} className="flex items-center justify-between gap-2 p-2 rounded-lg border bg-muted/30">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{f.name}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatFileSize(f.size)}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Where did you find this file? Any additional context..."
                rows={3}
              />
            </div>

            <Button
              onClick={handleSubmit}
              disabled={isSubmitting || !files.length || !productId}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analysing {files.length} file(s)...
                </>
              ) : (
                <>
                  <Fingerprint className="h-4 w-4 mr-2" />
                  Analyse {files.length || ''} File{files.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Reports List */}
        <div className="rounded-xl border border-border/50 bg-card">
          <div className="p-4 pb-2">
            <h3 className="text-base font-medium">Report History</h3>
          </div>
          <div className="p-4 pt-2">
            {!reports?.length ? (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p>No leak reports yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report: any) => {
                  const status = statusConfig[report.status] || statusConfig.pending;
                  const StatusIcon = status.icon;
                  return (
                    <div key={report.id} className="flex items-start justify-between p-3 rounded-lg border bg-card">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`h-4 w-4 ${status.color}`} />
                          <span className="font-medium text-sm truncate">
                            {report.products?.name || 'Unknown Product'}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {status.label}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-0.5">
                          <p className="flex items-center gap-1">
                            <CalendarDays className="h-3 w-3" />
                            {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}
                          </p>
                          {report.extracted_fingerprint && (
                            <p className="font-mono flex items-center gap-1">
                              <Fingerprint className="h-3 w-3" />
                              <span className="text-primary">{report.extracted_fingerprint}</span>
                            </p>
                          )}
                          {report.file_hash && (
                            <p className="font-mono flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              <span className="truncate max-w-[200px]">{report.file_hash}</span>
                            </p>
                          )}
                          {report.matched_display_name && (
                            <p className="flex items-center gap-1 text-destructive font-medium">
                              <User className="h-3 w-3" />
                              Buyer: <span className="text-foreground">{report.matched_display_name}</span>
                            </p>
                          )}
                          {!report.extracted_fingerprint && (
                            <p className="text-warning">No fingerprint detected</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
