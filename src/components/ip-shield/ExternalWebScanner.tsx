import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import {
  Globe, Search, Loader2, ExternalLink, Shield, AlertTriangle,
  Send, FileWarning, Link2, Server, Mail, CheckCircle2, Clock, Eye
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

export function ExternalWebScanner() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [urlToScan, setUrlToScan] = useState('');
  const [scanMode, setScanMode] = useState<'name' | 'url'>('name');
  const [complaintDialogOpen, setComplaintDialogOpen] = useState(false);
  const [selectedDetection, setSelectedDetection] = useState<any>(null);
  const [whoisData, setWhoisData] = useState<any>(null);
  const [lookingUp, setLookingUp] = useState(false);
  const [complaintForm, setComplaintForm] = useState({
    original_work_title: '',
    original_work_description: '',
  });

  // Fetch existing external detections
  const { data: detections, isLoading } = useQuery({
    queryKey: ['external-detections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_external_detections' as any)
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Fetch existing complaints
  const { data: complaints } = useQuery({
    queryKey: ['abuse-complaints', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_abuse_complaints' as any)
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  // Scan mutation
  const scanMutation = useMutation({
    mutationFn: async () => {
      const body: any = {};
      if (scanMode === 'name' && searchQuery) {
        body.query = searchQuery;
      } else if (scanMode === 'url' && urlToScan) {
        body.url = urlToScan;
      } else {
        throw new Error('Please enter a search query or URL');
      }

      const { data, error } = await supabase.functions.invoke('scan-external-websites', {
        body,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['external-detections'] });
      toast({
        title: 'Scan Complete',
        description: `Found ${data.detections_found} results across external websites.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Scan Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // WHOIS lookup
  const handleLookupAbuse = async (detection: any) => {
    setSelectedDetection(detection);
    setLookingUp(true);
    setComplaintDialogOpen(true);
    setWhoisData(null);

    try {
      const { data, error } = await supabase.functions.invoke('whois-abuse-lookup', {
        body: {
          action: 'lookup',
          domain: detection.source_website,
        },
      });
      if (error) throw error;
      setWhoisData(data);
    } catch (err: any) {
      toast({ title: 'Lookup Failed', description: err.message, variant: 'destructive' });
    } finally {
      setLookingUp(false);
    }
  };

  // File complaint mutation
  const fileComplaintMutation = useMutation({
    mutationFn: async () => {
      if (!selectedDetection || !complaintForm.original_work_title) {
        throw new Error('Please fill in your original work details');
      }

      const { data, error } = await supabase.functions.invoke('whois-abuse-lookup', {
        body: {
          action: 'file_complaint',
          detection_id: selectedDetection.id,
          target_url: selectedDetection.source_url,
          original_work_title: complaintForm.original_work_title,
          original_work_description: complaintForm.original_work_description,
          send_complaint: true,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['external-detections'] });
      queryClient.invalidateQueries({ queryKey: ['abuse-complaints'] });
      setComplaintDialogOpen(false);
      setComplaintForm({ original_work_title: '', original_work_description: '' });
      toast({
        title: 'Complaint Filed!',
        description: `DMCA complaint sent to our legal team for forwarding to ${data.registrar || 'the registrar'}.`,
      });
    },
    onError: (error: any) => {
      toast({ title: 'Failed to File', description: error.message, variant: 'destructive' });
    },
  });

  const getConfidenceBadge = (score: number) => {
    if (score >= 70) return <Badge variant="destructive" className="text-[10px]">High {score}%</Badge>;
    if (score >= 50) return <Badge className="text-[10px] bg-amber-500/20 text-amber-700 border-amber-500/30">Medium {score}%</Badge>;
    return <Badge variant="secondary" className="text-[10px]">Low {score}%</Badge>;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'complaint_filed': return <Badge variant="outline" className="text-[10px] border-primary/50 text-primary gap-1"><Send className="h-2.5 w-2.5" /> Complaint Filed</Badge>;
      case 'resolved': return <Badge variant="outline" className="text-[10px] border-green-500/50 text-green-700 gap-1"><CheckCircle2 className="h-2.5 w-2.5" /> Resolved</Badge>;
      case 'dismissed': return <Badge variant="secondary" className="text-[10px]">Dismissed</Badge>;
      default: return <Badge variant="outline" className="text-[10px] border-amber-500/50 text-amber-700 gap-1"><AlertTriangle className="h-2.5 w-2.5" /> Detected</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search Controls */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="h-4 w-4" /> External Website Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'name' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('name')}
              className="gap-1.5"
            >
              <Search className="h-3.5 w-3.5" /> Search by Name
            </Button>
            <Button
              variant={scanMode === 'url' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('url')}
              className="gap-1.5"
            >
              <Link2 className="h-3.5 w-3.5" /> Scan URL
            </Button>
          </div>

          {scanMode === 'name' ? (
            <div className="flex gap-2">
              <Input
                placeholder="Search darkblox, script sites, etc. for your game name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && scanMutation.mutate()}
              />
              <Button
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending || !searchQuery}
                className="shrink-0 gap-1.5"
              >
                {scanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                Scan
              </Button>
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                placeholder="https://darkblox.gg/game/... or any URL"
                value={urlToScan}
                onChange={(e) => setUrlToScan(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && scanMutation.mutate()}
              />
              <Button
                onClick={() => scanMutation.mutate()}
                disabled={scanMutation.isPending || !urlToScan}
                className="shrink-0 gap-1.5"
              >
                {scanMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                Scan URL
              </Button>
            </div>
          )}

          <p className="text-[10px] text-muted-foreground">
            Searches across Darkblox, ScriptBlox, Pastebin, V3rmillion, and other known sites for stolen Roblox content.
          </p>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : detections && detections.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {detections.length} External Detection{detections.length !== 1 ? 's' : ''}
          </h3>
          {detections.map((d: any) => (
            <Card key={d.id} className="overflow-hidden hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <a
                        href={d.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium hover:text-primary hover:underline transition-colors truncate flex items-center gap-1"
                      >
                        {d.page_title || d.source_url}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                      {getConfidenceBadge(d.confidence_score)}
                      {getStatusBadge(d.status)}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      <span className="font-medium">{d.source_website}</span> · {d.match_type === 'url_scan' ? 'URL Scan' : 'Name Search'}
                      {' · '}{formatDistanceToNow(new Date(d.created_at), { addSuffix: true })}
                    </p>
                    {d.matched_content && (
                      <p className="text-[11px] text-muted-foreground line-clamp-2">{d.matched_content.substring(0, 200)}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => handleLookupAbuse(d)}
                    >
                      <Shield className="h-3 w-3" /> File Complaint
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs gap-1"
                      onClick={() => window.open(d.source_url, '_blank', 'noopener,noreferrer')}
                    >
                      <ExternalLink className="h-3 w-3" /> View
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Globe className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">No external detections yet</p>
            <p className="text-xs text-muted-foreground mt-1">Search by game name or scan a specific URL to find stolen content on external websites.</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Complaints */}
      {complaints && complaints.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileWarning className="h-3.5 w-3.5" /> Filed Complaints ({complaints.length})
          </h3>
          {complaints.map((c: any) => (
            <Card key={c.id} className="overflow-hidden">
              <CardContent className="p-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{c.target_domain}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{c.target_url}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.registrar_name && (
                      <Badge variant="outline" className="text-[10px]">
                        <Server className="h-2.5 w-2.5 mr-1" /> {c.registrar_name}
                      </Badge>
                    )}
                    <Badge
                      variant={c.status === 'sent' ? 'default' : c.status === 'resolved' ? 'outline' : 'secondary'}
                      className="text-[10px]"
                    >
                      {c.status === 'sent' ? 'Sent' : c.status === 'resolved' ? 'Resolved' : c.status}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Complaint Dialog */}
      <Dialog open={complaintDialogOpen} onOpenChange={setComplaintDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> File DMCA Abuse Complaint
            </DialogTitle>
            <DialogDescription>
              File a DMCA complaint against the domain registrar or hosting provider for {selectedDetection?.source_website}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-4 pr-2">
              {/* WHOIS Results */}
              {lookingUp ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                  <Loader2 className="h-4 w-4 animate-spin" /> Looking up domain registrar & hosting provider...
                </div>
              ) : whoisData ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Card className="p-3">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">REGISTRAR</p>
                      <p className="text-xs font-medium">{whoisData.registrar || 'Unknown'}</p>
                      {whoisData.registrar_abuse_email && (
                        <p className="text-[10px] text-primary flex items-center gap-1 mt-1">
                          <Mail className="h-2.5 w-2.5" /> {whoisData.registrar_abuse_email}
                        </p>
                      )}
                    </Card>
                    <Card className="p-3">
                      <p className="text-[10px] text-muted-foreground font-medium mb-1">HOSTING</p>
                      <p className="text-xs font-medium">{whoisData.hosting_provider || 'Unknown'}</p>
                      {whoisData.hosting_abuse_email && (
                        <p className="text-[10px] text-primary flex items-center gap-1 mt-1">
                          <Mail className="h-2.5 w-2.5" /> {whoisData.hosting_abuse_email}
                        </p>
                      )}
                    </Card>
                  </div>
                  {whoisData.registrant_org && (
                    <p className="text-[10px] text-muted-foreground">Registrant: {whoisData.registrant_org}</p>
                  )}
                  {whoisData.creation_date && (
                    <p className="text-[10px] text-muted-foreground">Domain created: {format(new Date(whoisData.creation_date), 'MMM d, yyyy')}</p>
                  )}
                </div>
              ) : null}

              <Separator />

              {/* Original work details */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Your Original Work Title</Label>
                  <Input
                    placeholder="e.g. My Roblox Game Name"
                    value={complaintForm.original_work_title}
                    onChange={(e) => setComplaintForm(f => ({ ...f, original_work_title: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Description of Your Original Work</Label>
                  <Textarea
                    placeholder="Describe your original work and how the detected content infringes upon it..."
                    value={complaintForm.original_work_description}
                    onChange={(e) => setComplaintForm(f => ({ ...f, original_work_description: e.target.value }))}
                    rows={3}
                  />
                </div>
              </div>

              <div className="bg-muted/50 rounded-lg p-3 text-[10px] text-muted-foreground space-y-1">
                <p className="font-medium text-foreground text-xs">What happens next:</p>
                <p>1. A DMCA complaint is generated and sent to our legal team</p>
                <p>2. Our team reviews and forwards it to the domain registrar ({whoisData?.registrar || 'TBD'}) and hosting provider ({whoisData?.hosting_provider || 'TBD'})</p>
                <p>3. The provider is legally required to act within 10-14 business days</p>
                <p>4. You'll be notified of any updates</p>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setComplaintDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={() => fileComplaintMutation.mutate()}
              disabled={fileComplaintMutation.isPending || !complaintForm.original_work_title || lookingUp}
              className="gap-1.5"
            >
              {fileComplaintMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Filing...</>
              ) : (
                <><Send className="h-4 w-4" /> File Complaint</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
