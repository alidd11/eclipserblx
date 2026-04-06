import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Shield, Upload, AlertTriangle, CheckCircle2, Clock, XCircle, FileSearch } from 'lucide-react';
import { toast } from 'sonner';
import { format } from '@/lib/dateUtils';

export default function SellerLeakReports() {
  const { store } = useSellerStatus();
  const [file, setFile] = useState<File | null>(null);
  const [productId, setProductId] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleSubmit = async () => {
    if (!file || !productId || !store?.id) {
      toast.error('Please select a product and upload the leaked file');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('productId', productId);
      formData.append('storeId', store.id);
      if (notes) formData.append('notes', notes);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/report-leak`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to submit report');

      if (result.report?.buyer_identified) {
        toast.success(`Fingerprint matched! Buyer identified: ${result.report.matched_display_name || 'Unknown'}`);
      } else if (result.report?.fingerprint_found) {
        toast.info('Fingerprint found but could not match to a specific buyer');
      } else {
        toast.warning('No fingerprint found in the uploaded file. The file may not have been downloaded through our platform.');
      }

      setFile(null);
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
    pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
    confirmed: { icon: CheckCircle2, color: 'text-red-500', label: 'Confirmed Leak' },
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

        {/* Submit Report */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSearch className="h-4 w-4" />
              Report a Leaked File
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div>
              <label className="text-sm font-medium mb-1.5 block">Upload Leaked File</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-2">
                  {file ? file.name : 'Drop the leaked file here or click to browse'}
                </p>
                <Input
                  type="file"
                  className="max-w-xs mx-auto"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Where did you find this file? Any additional context..."
                rows={3}
              />
            </div>

            <Button onClick={handleSubmit} disabled={isSubmitting || !file || !productId}>
              {isSubmitting ? 'Analyzing...' : 'Submit Report'}
            </Button>
          </CardContent>
        </Card>

        {/* Reports List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Report History</CardTitle>
          </CardHeader>
          <CardContent>
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
                          <p>Submitted {format(new Date(report.created_at), 'MMM d, yyyy HH:mm')}</p>
                          {report.extracted_fingerprint && (
                            <p className="font-mono">
                              Fingerprint: <span className="text-primary">{report.extracted_fingerprint}</span>
                            </p>
                          )}
                          {report.matched_display_name && (
                            <p className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                              Matched buyer: <span className="font-semibold text-foreground">{report.matched_display_name}</span>
                            </p>
                          )}
                          {!report.extracted_fingerprint && (
                            <p className="text-yellow-500">No fingerprint detected</p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SellerLayout>
  );
}
