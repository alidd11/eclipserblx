import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useIdentityVerification } from '@/hooks/useIdentityVerification';
import { IPShieldLayout } from '@/components/ip-shield/IPShieldLayout';
import { TakedownEvidenceUpload } from '@/components/ip-shield/TakedownEvidenceUpload';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import {
  Shield, Plus, Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Send, Eye, Loader2, ExternalLink, Gavel, Radar,
  Copy, Mail, History
} from 'lucide-react';
import { format } from 'date-fns';

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  submitted: { label: 'Submitted', variant: 'secondary', icon: Clock },
  reviewing: { label: 'Under Review', variant: 'default', icon: Eye },
  notice_sent: { label: 'Notice Sent', variant: 'default', icon: Send },
  resolved: { label: 'Resolved', variant: 'secondary', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  counter_notice: { label: 'Counter-Notice', variant: 'outline', icon: AlertTriangle },
};

const PLATFORM_LABELS: Record<string, string> = {
  roblox: 'Roblox', discord: 'Discord', youtube: 'YouTube',
  tiktok: 'TikTok', other_marketplace: 'Other Marketplace', other: 'Other',
};

const TYPE_LABELS: Record<string, string> = {
  copyright: 'Copyright Infringement', trademark: 'Trademark Violation',
  stolen_asset: 'Stolen Asset', unauthorized_resale: 'Unauthorized Resale', other: 'Other',
};

function CaseTimeline({ caseData }: { caseData: any }) {
  const steps = [
    { key: 'submitted', label: 'Submitted', date: caseData.created_at },
    { key: 'notice_sent', label: 'Notice Sent', date: caseData.dmca_sent_at || caseData.notice_sent_at },
    { key: 'reviewing', label: 'Under Review', date: caseData.status === 'reviewing' ? caseData.updated_at : null },
    { key: 'resolved', label: 'Resolved', date: caseData.resolved_at },
  ];
  const currentIdx = steps.findIndex(s => s.key === caseData.status);
  const progressPct = caseData.status === 'resolved' ? 100 : caseData.status === 'rejected' ? 100 : Math.max(((currentIdx + 1) / steps.length) * 100, 25);

  return (
    <div className="space-y-2">
      <Progress value={progressPct} className="h-1.5" />
      <div className="flex justify-between text-[10px] text-muted-foreground">
        {steps.map((step, i) => (
          <div key={step.key} className={`text-center ${i <= currentIdx ? 'text-primary font-medium' : ''}`}>
            <div>{step.label}</div>
            {step.date && <div>{format(new Date(step.date), 'MMM d')}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function IPShieldTakedowns() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [recheckingCaseId, setRecheckingCaseId] = useState<string | null>(null);
  const [recheckResults, setRecheckResults] = useState<any>(null);
  const [originalProofFiles, setOriginalProofFiles] = useState<string[]>([]);
  const [infringingEvidenceFiles, setInfringingEvidenceFiles] = useState<string[]>([]);

  const [form, setForm] = useState({
    claimant_name: '', claimant_email: '', claimant_address: '',
    infringement_type: '', target_platform: '', target_platform_other: '',
    infringing_url: '', original_work_url: '', original_work_description: '',
    evidence_notes: '', good_faith_statement: false, accuracy_statement: false, ownership_confirmed: false,
  });

  // Fetch verified identity details to pre-populate form
  const { data: verificationData } = useIdentityVerification();

  // Fetch user profile for fallback
  const { data: userProfile } = useQuery({
    queryKey: ['ip-shield-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('display_name, email').eq('user_id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  // Fetch registry entries for original work pre-population
  const { data: registryEntries } = useQuery({
    queryKey: ['ip-shield-registry-entries', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('creator_ip_registry')
        .select('id, title, description, work_type, proof_urls')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  // Pre-populate form when dialog opens
  const openNewRequest = () => {
    const name = verificationData?.verifiedName || userProfile?.display_name || '';
    const email = verificationData?.verifiedEmail || userProfile?.email || user?.email || '';
    const address = verificationData?.verifiedAddress || '';
    setForm(f => ({
      ...f,
      claimant_name: name,
      claimant_email: email,
      claimant_address: address,
    }));
    setSelectedRegistryId('');
    setOriginalProofFiles([]);
    setInfringingEvidenceFiles([]);
    setShowNewRequest(true);
  };

  const [selectedRegistryId, setSelectedRegistryId] = useState('');

  const { data: cases, isLoading } = useQuery({
    queryKey: ['ip-shield-cases', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('takedown_requests' as any)
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: userStore } = useQuery({
    queryKey: ['ip-shield-store', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id').eq('owner_id', user!.id).limit(1);
      return data?.[0] || null;
    },
    enabled: !!user,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const platform = form.target_platform === 'other' && form.target_platform_other ? form.target_platform_other : form.target_platform;
      const { error } = await supabase.from('takedown_requests').insert({
        creator_id: user!.id,
        store_id: userStore?.id || null,
        status: 'submitted',
        claimant_name: form.claimant_name || null,
        claimant_email: form.claimant_email || null,
        claimant_address: form.claimant_address || null,
        infringement_type: form.infringement_type,
        target_platform: platform,
        infringing_url: form.infringing_url,
        original_work_url: form.original_work_url || null,
        original_work_description: form.original_work_description,
        evidence_notes: form.evidence_notes || null,
        original_proof_screenshots: originalProofFiles.length > 0 ? originalProofFiles : null,
        infringing_evidence_screenshots: infringingEvidenceFiles.length > 0 ? infringingEvidenceFiles : null,
        good_faith_statement: form.good_faith_statement,
        accuracy_statement: form.accuracy_statement,
        ownership_confirmed: form.ownership_confirmed,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Takedown request submitted', description: 'Our team will review your request shortly.' });
      setShowNewRequest(false);
      setForm({ claimant_name: '', claimant_email: '', claimant_address: '', infringement_type: '', target_platform: '', target_platform_other: '', infringing_url: '', original_work_url: '', original_work_description: '', evidence_notes: '', good_faith_statement: false, accuracy_statement: false, ownership_confirmed: false });
      setOriginalProofFiles([]);
      setInfringingEvidenceFiles([]);
      queryClient.invalidateQueries({ queryKey: ['ip-shield-cases'] });
    },
    onError: (error) => {
      toast({ title: 'Submission failed', description: error.message, variant: 'destructive' });
    },
  });

  const canSubmit = form.claimant_name && form.claimant_email && form.infringement_type && form.target_platform && form.infringing_url &&
    form.original_work_url && form.original_work_description && form.good_faith_statement && form.accuracy_statement && form.ownership_confirmed;

  return (
    <IPShieldLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Gavel className="h-6 w-6 text-primary" />
              Takedown Cases
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              File and track DMCA takedown requests.
            </p>
          </div>
          <Button onClick={openNewRequest}>
            <Plus className="h-4 w-4 mr-2" /> New Takedown
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
        ) : cases?.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No takedown requests yet</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                If someone is using your work without permission, submit a takedown request and we'll handle it for you.
              </p>
              <Button className="mt-4" onClick={openNewRequest}>
                <Plus className="h-4 w-4 mr-2" /> Submit Your First Request
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cases?.map(c => {
              const statusConf = STATUS_CONFIG[c.status] || STATUS_CONFIG.submitted;
              const StatusIcon = statusConf.icon;
              return (
                <Card key={c.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-medium">{c.case_number}</span>
                          <Badge variant={statusConf.variant} className="gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusConf.label}
                          </Badge>
                          <Badge variant="outline">{TYPE_LABELS[c.infringement_type] || c.infringement_type}</Badge>
                          {c.filing_method === 'agent' && (
                            <Badge variant="outline" className="text-xs gap-1">
                              <Mail className="h-3 w-3" /> Agent Filed
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {PLATFORM_LABELS[c.target_platform] || c.target_platform} · {c.infringing_url}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Submitted {format(new Date(c.created_at), 'MMM d, yyyy')}
                          {c.dmca_sent_at && ` · DMCA sent ${format(new Date(c.dmca_sent_at), 'MMM d')}`}
                          {c.resolved_at && ` · Resolved ${format(new Date(c.resolved_at), 'MMM d, yyyy')}`}
                        </p>
                      </div>
                      {c.resolution_notes && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 max-w-xs">
                          <span className="font-medium">Resolution: </span>{c.resolution_notes}
                        </div>
                      )}
                    </div>
                    <CaseTimeline caseData={c} />
                    {['notice_sent', 'resolved'].includes(c.status) && c.target_platform === 'roblox' && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={recheckingCaseId === c.id}
                          onClick={async () => {
                            setRecheckingCaseId(c.id);
                            try {
                              const { data, error } = await supabase.functions.invoke('check-offender-activity', {
                                body: { takedown_id: c.id },
                              });
                              if (error) throw error;
                              if (data?.error) throw new Error(data.error);
                              setRecheckResults({
                                caseNumber: c.case_number,
                                findings: data.findings || [],
                                totalCreations: data.total_creations || 0,
                              });
                              queryClient.invalidateQueries({ queryKey: ['ip-shield-cases'] });
                              toast({ title: data.suspicious_count > 0 ? `⚠️ ${data.suspicious_count} suspicious find(s)` : '✅ No suspicious activity', description: `Scanned ${data.total_creations} creations from offender.` });
                            } catch (err: any) {
                              toast({ title: 'Re-check failed', description: err.message, variant: 'destructive' });
                            } finally {
                              setRecheckingCaseId(null);
                            }
                          }}
                        >
                          {recheckingCaseId === c.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Radar className="h-3 w-3 mr-1" />}
                          Re-check Offender
                        </Button>
                        {c.last_recheck_at && (
                          <span className="text-xs text-muted-foreground">
                            Last checked {format(new Date(c.last_recheck_at), 'MMM d, HH:mm')}
                            {(c.recheck_results as any)?.suspicious_count > 0 && (
                              <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                                {(c.recheck_results as any).suspicious_count} found
                              </Badge>
                            )}
                          </span>
                        )}
                        {(c.recheck_results as any)?.suspicious_count > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs"
                            onClick={() => setRecheckResults({
                              caseNumber: c.case_number,
                              findings: (c.recheck_results as any).findings || [],
                              totalCreations: (c.recheck_results as any).total_creations || 0,
                            })}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View Results
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Re-check Results Dialog */}
        <Dialog open={!!recheckResults} onOpenChange={() => setRecheckResults(null)}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Offender Activity — {recheckResults?.caseNumber}</DialogTitle>
              <DialogDescription>
                Scanned {recheckResults?.totalCreations || 0} creations
              </DialogDescription>
            </DialogHeader>
            {recheckResults?.findings?.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No suspicious activity found.</p>
            ) : (
              <div className="space-y-3">
                {recheckResults?.findings?.map((f: any, i: number) => (
                  <Card key={i}>
                    <CardContent className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-medium text-sm">{f.name}</span>
                          <p className="text-xs text-muted-foreground mt-0.5">{f.reason}</p>
                          {f.similarity_score && <Badge variant="outline" className="text-xs mt-1">{f.similarity_score}% match</Badge>}
                        </div>
                        {f.url && (
                          <a href={f.url} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm"><ExternalLink className="h-3 w-3" /></Button>
                          </a>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* New Request Dialog */}
        <Dialog open={showNewRequest} onOpenChange={setShowNewRequest}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> New Takedown Request
              </DialogTitle>
              <DialogDescription>
                Provide details about the infringement and we'll file a takedown notice on your behalf.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Claimant Info - Pre-populated from verified identity */}
              <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <p className="text-xs font-medium text-primary flex items-center gap-1">
                  <Shield className="h-3 w-3" />
                  {verificationData?.verified ? 'Verified Identity — Auto-filled' : 'Claimant Information'}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Full Legal Name *</Label>
                    <Input value={form.claimant_name} onChange={e => setForm(f => ({ ...f, claimant_name: e.target.value }))} placeholder="Your full legal name" />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Email *</Label>
                    <Input type="email" value={form.claimant_email} onChange={e => setForm(f => ({ ...f, claimant_email: e.target.value }))} placeholder="your@email.com" />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Address (optional)</Label>
                  <Input value={form.claimant_address} onChange={e => setForm(f => ({ ...f, claimant_address: e.target.value }))} placeholder="Your address" />
                </div>
              </div>

              {/* Registry Entry Selector */}
              {registryEntries && registryEntries.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Registry Entry (optional)</Label>
                  <Select value={selectedRegistryId} onValueChange={v => {
                    setSelectedRegistryId(v);
                    const entry = registryEntries.find((e: any) => e.id === v);
                    if (entry) {
                      setForm(f => ({
                        ...f,
                        original_work_description: entry.description || entry.title || f.original_work_description,
                        original_work_url: entry.proof_urls?.[0] || f.original_work_url,
                        infringement_type: entry.work_type === 'game' || entry.work_type === 'model' ? 'copyright' : f.infringement_type,
                      }));
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Pre-fill from your registry..." /></SelectTrigger>
                    <SelectContent>
                      {registryEntries.map((entry: any) => (
                        <SelectItem key={entry.id} value={entry.id}>{entry.title} ({entry.work_type})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Infringement Type *</Label>
                <Select value={form.infringement_type} onValueChange={v => setForm(f => ({ ...f, infringement_type: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Target Platform *</Label>
                <Select value={form.target_platform} onValueChange={v => setForm(f => ({ ...f, target_platform: v }))}>
                  <SelectTrigger><SelectValue placeholder="Where is the infringement?" /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PLATFORM_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {form.target_platform === 'other' && (
                <div className="space-y-2">
                  <Label>Platform Name</Label>
                  <Input value={form.target_platform_other} onChange={e => setForm(f => ({ ...f, target_platform_other: e.target.value }))} placeholder="Specify..." />
                </div>
              )}

              <div className="space-y-2">
                <Label>Infringing Content URL *</Label>
                <Input value={form.infringing_url} onChange={e => setForm(f => ({ ...f, infringing_url: e.target.value }))} placeholder="https://..." />
              </div>

              <div className="space-y-2">
                <Label>Your Original Work URL *</Label>
                <Input value={form.original_work_url} onChange={e => setForm(f => ({ ...f, original_work_url: e.target.value }))} placeholder="Link to your original work" />
              </div>

              <div className="space-y-2">
                <Label>Description of Your Original Work *</Label>
                <Textarea value={form.original_work_description} onChange={e => setForm(f => ({ ...f, original_work_description: e.target.value }))} placeholder="Describe your original work..." rows={3} />
              </div>

              {/* Original Content Proof Screenshots */}
              <div className="p-3 border rounded-lg space-y-2 bg-muted/30">
                <TakedownEvidenceUpload
                  userId={user!.id}
                  folder="original-proof"
                  files={originalProofFiles}
                  onFilesChange={setOriginalProofFiles}
                  maxFiles={5}
                  label="📸 Original Content Proof"
                  description="Upload screenshots proving your ownership — e.g. creation dates, Roblox Studio, original files."
                />
              </div>

              {/* Infringing Content Evidence Screenshots */}
              <div className="p-3 border rounded-lg space-y-2 bg-destructive/5">
                <TakedownEvidenceUpload
                  userId={user!.id}
                  folder="infringing-evidence"
                  files={infringingEvidenceFiles}
                  onFilesChange={setInfringingEvidenceFiles}
                  maxFiles={5}
                  label="🚨 Infringing Content Evidence"
                  description="Upload screenshots of the infringing content — e.g. copied game pages, stolen assets in use."
                />
              </div>

              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea value={form.evidence_notes} onChange={e => setForm(f => ({ ...f, evidence_notes: e.target.value }))} placeholder="Any other context, timestamps, etc." rows={2} />
              </div>

              <div className="space-y-3 pt-2 border-t">
                <p className="text-xs text-muted-foreground font-medium">Legal Declarations</p>
                <div className="flex items-start gap-2">
                  <Checkbox id="gf" checked={form.good_faith_statement} onCheckedChange={v => setForm(f => ({ ...f, good_faith_statement: !!v }))} />
                  <Label htmlFor="gf" className="text-xs">I have a good faith belief that the use of this material is not authorised.</Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="ac" checked={form.accuracy_statement} onCheckedChange={v => setForm(f => ({ ...f, accuracy_statement: !!v }))} />
                  <Label htmlFor="ac" className="text-xs">The information in this notice is accurate.</Label>
                </div>
                <div className="flex items-start gap-2">
                  <Checkbox id="ow" checked={form.ownership_confirmed} onCheckedChange={v => setForm(f => ({ ...f, ownership_confirmed: !!v }))} />
                  <Label htmlFor="ow" className="text-xs">I am the owner or authorised to act on behalf of the owner.</Label>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowNewRequest(false)}>Cancel</Button>
              <Button onClick={() => submitMutation.mutate()} disabled={!canSubmit || submitMutation.isPending}>
                {submitMutation.isPending ? 'Submitting...' : 'Submit Request'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </IPShieldLayout>
  );
}
