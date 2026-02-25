import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Navigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { 
  Shield, Plus, Clock, CheckCircle, XCircle, AlertTriangle,
  FileText, Send, Eye, LogIn, UserCheck, Loader2, ExternalLink,
  CreditCard, Crown, Search, Radar, Users,
  TrendingUp, TrendingDown, Minus, Gavel, ShieldCheck, History,
  Copy, Mail, BarChart3, Target, Zap, CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { IPShieldContactDialog } from '@/components/ip-shield/IPShieldContactDialog';


const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: typeof Clock }> = {
  submitted: { label: 'Submitted', variant: 'secondary', icon: Clock },
  reviewing: { label: 'Under Review', variant: 'default', icon: Eye },
  notice_sent: { label: 'Notice Sent', variant: 'default', icon: Send },
  resolved: { label: 'Resolved', variant: 'secondary', icon: CheckCircle },
  rejected: { label: 'Rejected', variant: 'destructive', icon: XCircle },
  counter_notice: { label: 'Counter-Notice', variant: 'outline', icon: AlertTriangle },
};

const PLATFORM_LABELS: Record<string, string> = {
  roblox: 'Roblox',
  discord: 'Discord',
  youtube: 'YouTube',
  tiktok: 'TikTok',
  other_marketplace: 'Other Marketplace',
  other: 'Other',
};

const TYPE_LABELS: Record<string, string> = {
  copyright: 'Copyright Infringement',
  trademark: 'Trademark Violation',
  stolen_asset: 'Stolen Asset',
  unauthorized_resale: 'Unauthorized Resale',
  other: 'Other',
};

// ─── ANALYTICS DASHBOARD ───
function AnalyticsDashboard({ userId }: { userId?: string }) {
  const { data: stats } = useQuery({
    queryKey: ['ip-shield-analytics', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_shield_stats' as any)
        .select('*')
        .eq('creator_id', userId!)
        .single();
      if (error) return null;
      return data as any;
    },
    enabled: !!userId,
  });

  const { data: recentDetections } = useQuery({
    queryKey: ['recent-detections-count', userId],
    queryFn: async () => {
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const { count } = await supabase
        .from('ip_copy_detections' as any)
        .select('*', { count: 'exact', head: true })
        .eq('creator_id', userId!)
        .gte('created_at', sevenDaysAgo)
        .is('dismissed_at', null);
      return count || 0;
    },
    enabled: !!userId,
  });

  if (!stats) return null;

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card className="border-destructive/20">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-destructive" />
            <span className="text-xs text-muted-foreground">Active Threats</span>
          </div>
          <div className="text-2xl font-bold">{stats.active_detections || 0}</div>
          <div className="flex gap-1 mt-1">
            {stats.high_threat_count > 0 && <Badge variant="destructive" className="text-[10px] px-1.5 py-0">🔴 {stats.high_threat_count}</Badge>}
            {stats.medium_threat_count > 0 && <Badge className="text-[10px] px-1.5 py-0">🟡 {stats.medium_threat_count}</Badge>}
            {stats.low_threat_count > 0 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">🟢 {stats.low_threat_count}</Badge>}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Gavel className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Takedowns Filed</span>
          </div>
          <div className="text-2xl font-bold">{stats.takedowns_filed || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Radar className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Unique Copies</span>
          </div>
          <div className="text-2xl font-bold">{stats.unique_copies_found || 0}</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">Avg Similarity</span>
          </div>
          <div className="text-2xl font-bold">{Math.round(stats.avg_similarity || 0)}%</div>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-1">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-xs text-muted-foreground">New This Week</span>
          </div>
          <div className="text-2xl font-bold">{recentDetections || 0}</div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── COPY DETECTION TAB (with bulk takedowns) ───
function CopyDetectionTab({ userId }: { userId?: string }) {
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [takedownTarget, setTakedownTarget] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);

  const { data: detections, isLoading } = useQuery({
    queryKey: ['copy-detections', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_copy_detections' as any)
        .select('*')
        .eq('creator_id', userId!)
        .is('dismissed_at', null)
        .order('similarity_score', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!userId,
  });

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('scan-roblox-copies');
      if (error) throw error;
      toast({ title: 'Scan complete', description: `Found ${data?.total_detected || 0} potential copies. ${data?.thumbnails_analyzed || 0} thumbnails analysed.` });
      queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
      queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
    } catch (err: any) {
      toast({ title: 'Scan failed', description: err.message, variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const dismissDetection = async (id: string) => {
    const { error } = await supabase
      .from('ip_copy_detections' as any)
      .update({ dismissed_at: new Date().toISOString(), status: 'dismissed' } as any)
      .eq('id', id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
      queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllHigh = () => {
    const highIds = (detections || []).filter((d: any) => d.similarity_score >= 50 && !d.creator_verified && !d.takedown_request_id).map((d: any) => d.id);
    setSelectedIds(new Set(highIds));
  };

  const bulkFileTakedowns = async () => {
    if (selectedIds.size === 0) return;
    const selected = (detections || []).filter((d: any) => selectedIds.has(d.id));
    
    let filed = 0;
    for (const detection of selected) {
      const gameUrl = `https://www.roblox.com/games/${detection.detected_place_id || detection.detected_universe_id}`;
      const matchReasons = (detection.match_reasons || []).join(', ');
      
      const { data, error } = await supabase
        .from('takedown_requests')
        .insert({
          creator_id: userId,
          status: 'submitted',
          priority: detection.similarity_score >= 70 ? 'high' : 'medium',
          infringement_type: 'copyright',
          target_platform: 'roblox',
          infringing_url: gameUrl,
          original_work_description: `Auto-detected copy. Game: "${detection.game_name}" by ${detection.game_creator_name}. Similarity: ${detection.similarity_score}%. Matches: ${matchReasons}.`,
          evidence_notes: `Bulk filed. Score: ${detection.similarity_score}%. ${matchReasons}`,
          good_faith_statement: true,
          accuracy_statement: true,
          ownership_confirmed: true,
          filing_method: 'agent',
          agent_authorization: true,
        } as any)
        .select('id, case_number')
        .single();

      if (!error && data?.id) {
        await supabase
          .from('ip_copy_detections' as any)
          .update({ takedown_request_id: data.id, status: 'takedown_filed' } as any)
          .eq('id', detection.id);

        // Fire agent filing
        await supabase.functions.invoke('file-dmca-takedown', {
          body: { takedown_id: data.id },
        });
        filed++;
      }
    }

    toast({ title: `${filed} takedowns filed`, description: 'DMCA notices queued for review and sending.' });
    setSelectedIds(new Set());
    setBulkMode(false);
    queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
    queryClient.invalidateQueries({ queryKey: ['takedown-requests'] });
    queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
  };

  const TrendIcon = ({ trend }: { trend: string }) => {
    if (trend === 'rising') return <TrendingUp className="h-3 w-3 text-destructive" />;
    if (trend === 'falling') return <TrendingDown className="h-3 w-3 text-green-500" />;
    return <Minus className="h-3 w-3 text-muted-foreground" />;
  };

  const actionableDetections = (detections || []).filter((d: any) => !d.creator_verified && !d.takedown_request_id && d.similarity_score >= 30);

  return (
    <TabsContent value="copies" className="space-y-4 mt-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-sm text-muted-foreground">
          Multi-source Roblox scan using AI thumbnails, name matching, and description plagiarism detection.
        </p>
        <div className="flex items-center gap-2">
          {actionableDetections.length > 0 && (
            <Button
              variant={bulkMode ? "default" : "outline"}
              size="sm"
              onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
            >
              <CheckSquare className="h-4 w-4 mr-1" />
              {bulkMode ? 'Cancel Bulk' : 'Bulk Takedown'}
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={runScan} disabled={scanning}>
            {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
            {scanning ? 'Scanning...' : 'Run Scan'}
          </Button>
        </div>
      </div>

      {bulkMode && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button variant="outline" size="sm" onClick={selectAllHigh}>Select All High/Medium</Button>
          <div className="flex-1" />
          <Button variant="destructive" size="sm" onClick={bulkFileTakedowns} className="gap-1">
            <Gavel className="h-3.5 w-3.5" />
            File {selectedIds.size} Takedown{selectedIds.size > 1 ? 's' : ''}
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : !detections || detections.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Radar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
            <h3 className="font-semibold text-lg">No copies detected</h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
              Register works in the IP Registry with search keywords, then run a scan to find potential copies on Roblox.
            </p>
            <Button className="mt-4" variant="outline" onClick={runScan} disabled={scanning}>
              {scanning ? 'Scanning...' : 'Run Your First Scan'}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {detections.map((d: any) => {
            const score = d.similarity_score || 0;
            const reasons: string[] = d.match_reasons || [];
            const hasThumbMatch = reasons.some((r: string) => r.startsWith('thumbnail_similar'));
            const hasDescMatch = reasons.some((r: string) => r.includes('description') || r.includes('plagiarism') || r.includes('sentence'));
            const hasSuspicious = reasons.some((r: string) => r.startsWith('suspicious_phrase'));
            const creatorVerified = d.creator_verified;
            const ownsGroup = reasons.includes('creator_owns_group');
            const trend = d.player_count_trend || 'stable';
            const detectionCount = d.detection_count || 1;
            const threatLevel = creatorVerified ? 'secondary' : score >= 70 ? 'destructive' : score >= 40 ? 'default' : 'secondary';
            const isSelected = selectedIds.has(d.id);
            const canSelect = bulkMode && !creatorVerified && !d.takedown_request_id && score >= 30;

            return (
              <Card key={d.id} className={`transition-colors ${isSelected ? 'border-destructive ring-1 ring-destructive/20' : !creatorVerified && score >= 70 ? 'border-destructive/40' : 'hover:border-destructive/20'}`}>
                <CardContent className="py-4">
                  <div className="flex items-start gap-3">
                    {canSelect && (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggleSelect(d.id)}
                        className="mt-1"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium">{d.game_name}</span>
                        {creatorVerified ? (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Verified Owner
                          </Badge>
                        ) : (
                          <Badge variant={threatLevel as any} className="text-xs">
                            {score >= 70 ? '🔴 High Match' : score >= 40 ? '🟡 Moderate' : '🟢 Low'}
                            {score > 0 && ` · ${score}%`}
                          </Badge>
                        )}
                        {d.takedown_request_id && (
                          <Badge variant="outline" className="text-xs gap-1 text-primary">
                            <Gavel className="h-3 w-3" />
                            Takedown Filed
                          </Badge>
                        )}
                        {d.player_count > 0 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Users className="h-3 w-3" />
                            {d.player_count.toLocaleString()}
                            <TrendIcon trend={trend} />
                          </Badge>
                        )}
                        {detectionCount > 1 && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <History className="h-3 w-3" />
                            Seen {detectionCount}x
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Created by <span className="font-medium text-foreground">{d.game_creator_name}</span>
                        {d.game_creator_type === 'Group' && (
                          <span>
                            {' (Group'}
                            {d.creator_group_name && `: ${d.creator_group_name}`}
                            {ownsGroup && ' — you are a member'}
                            {')'}
                          </span>
                        )}
                        {' · '}Keyword: "{d.search_keyword}"
                      </p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {hasThumbMatch && <Badge variant="outline" className="text-xs">🖼️ Thumbnail Match</Badge>}
                        {hasDescMatch && <Badge variant="outline" className="text-xs">📝 Description Match</Badge>}
                        {hasSuspicious && <Badge variant="outline" className="text-xs text-destructive">⚠️ Suspicious Phrases</Badge>}
                        {d.thumbnail_analyzed && !hasThumbMatch && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">✓ Thumbnail Clear</Badge>
                        )}
                        {d.previous_player_count != null && d.previous_player_count !== d.player_count && (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            Was {d.previous_player_count.toLocaleString()} players
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Universe ID: {d.detected_universe_id}
                        {' · '}First seen {format(new Date(d.first_detected_at || d.created_at), 'MMM d, yyyy')}
                        {d.last_seen_at && ` · Last seen ${format(new Date(d.last_seen_at), 'MMM d')}`}
                        {d.game_created_at && ` · Game created ${format(new Date(d.game_created_at), 'MMM yyyy')}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {!creatorVerified && score >= 30 && !d.takedown_request_id && !bulkMode && (
                        <Button variant="destructive" size="sm" className="gap-1" onClick={() => setTakedownTarget(d)}>
                          <Gavel className="h-3.5 w-3.5" />
                          Takedown
                        </Button>
                      )}
                      <a
                        href={`https://www.roblox.com/games/${d.detected_place_id || d.detected_universe_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="outline" size="sm" className="gap-1">
                          <ExternalLink className="h-3.5 w-3.5" />
                          View
                        </Button>
                      </a>
                      {!bulkMode && (
                        <Button variant="ghost" size="sm" onClick={() => dismissDetection(d.id)}>
                          Dismiss
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <TakedownFromDetectionDialog
        detection={takedownTarget}
        onClose={() => setTakedownTarget(null)}
        userId={userId}
      />
    </TabsContent>
  );
}

// ─── TAKEDOWN DIALOG ───
function TakedownFromDetectionDialog({ detection, onClose, userId }: { detection: any; onClose: () => void; userId?: string }) {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [goodFaith, setGoodFaith] = useState(false);
  const [accuracy, setAccuracy] = useState(false);
  const [ownership, setOwnership] = useState(false);
  const [filingMethod, setFilingMethod] = useState<'self' | 'agent'>('self');
  const [agentAuth, setAgentAuth] = useState(false);
  const [templateCopied, setTemplateCopied] = useState(false);

  if (!detection) return null;

  const gameUrl = `https://www.roblox.com/games/${detection.detected_place_id || detection.detected_universe_id}`;
  const matchReasons = (detection.match_reasons || []).join(', ');

  const dmcaTemplate = `Dear Roblox Trust & Safety Team,

I am writing to report copyright infringement on your platform.

IDENTIFICATION OF COPYRIGHTED WORK:
I am the original creator of the work being infringed. My original work is registered with Eclipse IP Shield (case pending).

IDENTIFICATION OF INFRINGING MATERIAL:
Game URL: ${gameUrl}
Game Name: "${detection.game_name}"
Creator: ${detection.game_creator_name}
Universe ID: ${detection.detected_universe_id}

This game has been identified as a potential copy with ${detection.similarity_score}% similarity to my original work.
Detection details: ${matchReasons || 'Name match'}

${evidenceNotes ? `ADDITIONAL EVIDENCE:\n${evidenceNotes}\n` : ''}
STATEMENTS:
1. I have a good faith belief that use of the copyrighted materials described above is not authorised by the copyright owner, its agent, or the law.
2. The information in this notification is accurate.
3. Under penalty of perjury, I am the copyright owner or authorised to act on behalf of the owner.

CONTACT INFORMATION:
[Your Full Legal Name]
[Your Email Address]
[Your Address]

This notice is sent under the Digital Millennium Copyright Act (DMCA), 17 U.S.C. § 512(c).`;

  const copyTemplate = () => {
    navigator.clipboard.writeText(dmcaTemplate);
    setTemplateCopied(true);
    setTimeout(() => setTemplateCopied(false), 2000);
    toast({ title: 'DMCA template copied to clipboard' });
  };

  const handleSubmit = async () => {
    if (!goodFaith || !accuracy || !ownership) {
      toast({ title: 'Please confirm all statements', variant: 'destructive' });
      return;
    }
    if (filingMethod === 'agent' && !agentAuth) {
      toast({ title: 'Please authorise us to act on your behalf', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('takedown_requests')
        .insert({
          creator_id: userId,
          status: 'submitted',
          priority: detection.similarity_score >= 70 ? 'high' : 'medium',
          infringement_type: 'copyright',
          target_platform: 'roblox',
          infringing_url: gameUrl,
          original_work_description: `Auto-detected copy of registered work. Game: "${detection.game_name}" by ${detection.game_creator_name}. Similarity: ${detection.similarity_score}%. Match reasons: ${matchReasons}.`,
          evidence_notes: evidenceNotes || `Automated detection found this game with ${detection.similarity_score}% similarity score. ${matchReasons}`,
          good_faith_statement: true,
          accuracy_statement: true,
          ownership_confirmed: true,
          filing_method: filingMethod,
          agent_authorization: filingMethod === 'agent',
        } as any)
        .select('id, case_number')
        .single();

      if (error) throw error;

      if (data?.id) {
        await supabase
          .from('ip_copy_detections' as any)
          .update({ takedown_request_id: data.id, status: 'takedown_filed' } as any)
          .eq('id', detection.id);
      }

      if (filingMethod === 'agent' && data?.id) {
        const { error: dmcaError } = await supabase.functions.invoke('file-dmca-takedown', {
          body: { takedown_id: data.id },
        });
        if (dmcaError) {
          toast({ title: 'Case created but DMCA sending failed', description: 'Our team will follow up manually.', variant: 'destructive' });
        } else {
          toast({ title: 'DMCA filed on your behalf!', description: `Case ${data.case_number} — notice sent for review and forwarding.` });
        }
      } else {
        toast({ title: 'Takedown case created!', description: `Case ${data?.case_number}. Use the copied template to submit your DMCA notice directly.` });
      }

      queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
      queryClient.invalidateQueries({ queryKey: ['takedown-requests'] });
      queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
      onClose();
    } catch (err: any) {
      toast({ title: 'Failed to file takedown', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={!!detection} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gavel className="h-5 w-5" />
            File Takedown Request
          </DialogTitle>
          <DialogDescription>
            Pre-filled from detection: <strong>{detection.game_name}</strong> ({detection.similarity_score}% match)
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md bg-muted p-3 text-sm space-y-1">
            <p><strong>Target:</strong> {detection.game_name}</p>
            <p><strong>Creator:</strong> {detection.game_creator_name} ({detection.game_creator_type})</p>
            <p><strong>Platform:</strong> Roblox</p>
            <p><strong>Similarity:</strong> {detection.similarity_score}%</p>
            <p><strong>Match Reasons:</strong> {matchReasons || 'Name match'}</p>
            {detection.player_count > 0 && <p><strong>Players:</strong> {detection.player_count.toLocaleString()}</p>}
            {detection.game_created_at && <p><strong>Game Created:</strong> {format(new Date(detection.game_created_at), 'MMM d, yyyy')}</p>}
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">How would you like to file?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFilingMethod('self')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  filingMethod === 'self' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Copy className="h-4 w-4" />
                  <span className="font-medium text-sm">Self-File</span>
                </div>
                <p className="text-xs text-muted-foreground">Get a pre-filled DMCA template to submit yourself</p>
              </button>
              <button
                type="button"
                onClick={() => setFilingMethod('agent')}
                className={`p-3 rounded-lg border text-left transition-colors ${
                  filingMethod === 'agent' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Mail className="h-4 w-4" />
                  <span className="font-medium text-sm">We File For You</span>
                </div>
                <p className="text-xs text-muted-foreground">Authorise us to send the DMCA on your behalf</p>
              </button>
            </div>
          </div>

          <div>
            <Label>Additional Evidence Notes (optional)</Label>
            <Textarea
              value={evidenceNotes}
              onChange={(e) => setEvidenceNotes(e.target.value)}
              placeholder="Add any additional context about why this is infringing..."
              rows={3}
            />
          </div>

          {filingMethod === 'self' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-sm">DMCA Notice Template</Label>
                <Button variant="outline" size="sm" onClick={copyTemplate} className="gap-1">
                  <Copy className="h-3 w-3" />
                  {templateCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              <div className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                {dmcaTemplate}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Send this to <strong>dmca@roblox.com</strong> from your own email. Fill in your contact details.
              </p>
            </div>
          )}

          {filingMethod === 'agent' && (
            <div className="rounded-md border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">Agent Authorisation</p>
              <p className="text-xs text-muted-foreground">
                By authorising us, Eclipse IP Shield will submit the DMCA notice on your behalf as your designated agent.
              </p>
              <div className="flex items-start gap-2">
                <Checkbox id="agent-auth" checked={agentAuth} onCheckedChange={(v) => setAgentAuth(!!v)} />
                <Label htmlFor="agent-auth" className="text-xs">
                  I authorise Eclipse IP Shield to act as my agent and file DMCA notices on my behalf for this case.
                </Label>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Checkbox id="gf" checked={goodFaith} onCheckedChange={(v) => setGoodFaith(!!v)} />
              <Label htmlFor="gf" className="text-xs">I have a good faith belief that the use of the material is not authorised.</Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ac" checked={accuracy} onCheckedChange={(v) => setAccuracy(!!v)} />
              <Label htmlFor="ac" className="text-xs">The information in this notice is accurate.</Label>
            </div>
            <div className="flex items-start gap-2">
              <Checkbox id="ow" checked={ownership} onCheckedChange={(v) => setOwnership(!!v)} />
              <Label htmlFor="ow" className="text-xs">I am the owner or authorised to act on behalf of the owner.</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button
            variant="destructive"
            onClick={handleSubmit}
            disabled={submitting || !goodFaith || !accuracy || !ownership || (filingMethod === 'agent' && !agentAuth)}
          >
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : filingMethod === 'agent' ? <Mail className="h-4 w-4 mr-2" /> : <Gavel className="h-4 w-4 mr-2" />}
            {filingMethod === 'agent' ? 'File DMCA On My Behalf' : 'Create Case & Copy Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── CASE TIMELINE ───
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

// ─── MAIN COMPONENT ───
export default function IPShield() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showNewRequest, setShowNewRequest] = useState(false);
  const [activeTab, setActiveTab] = useState('cases');

  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [recheckingCaseId, setRecheckingCaseId] = useState<string | null>(null);
  const [recheckResults, setRecheckResults] = useState<{ caseNumber: string; findings: any[]; totalCreations: number } | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: 'Custom IP Shield Plan', message: '' });
  const [contactSubmitting, setContactSubmitting] = useState(false);
  // Check IP Shield subscription status
  const { data: subscriptionStatus, isLoading: subLoading, refetch: refetchSubscription } = useQuery({
    queryKey: ['ip-shield-subscription', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-ip-shield-subscription');
      if (error) throw error;
      return data as { subscribed: boolean; tier?: string; limits?: { takedowns_per_month: number; registry_limit: number; priority: boolean; monitoring: boolean; dedicated_agent: boolean }; subscription_end?: string; subscription_id?: string };
    },
    enabled: !!user,
  });

  const isSubscribed = subscriptionStatus?.subscribed === true;

  // Check identity verification status
  const { data: verificationStatus, isLoading: verifyLoading, refetch: refetchVerification } = useQuery({
    queryKey: ['ip-shield-identity-verification', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('check-identity-verification');
      if (error) throw error;
      return data as { verified: boolean; status: string; verifiedAt?: string };
    },
    enabled: !!user && isSubscribed,
  });

  const isVerified = verificationStatus?.verified === true;

  useEffect(() => {
    if (searchParams.get('verification') === 'complete' && user) refetchVerification();
    if (searchParams.get('subscription') === 'success' && user) refetchSubscription();
  }, [searchParams, user, refetchVerification, refetchSubscription]);

  const startVerification = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('create-identity-verification');
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (error) => {
      toast({ title: 'Verification failed', description: error.message, variant: 'destructive' });
      setVerifying(false);
    },
  });

  const startCheckout = useMutation({
    mutationFn: async (tier: string) => {
      const { data, error } = await supabase.functions.invoke('create-ip-shield-checkout', { body: { tier } });
      if (error) throw error;
      return data as { url: string };
    },
    onSuccess: (data) => { if (data.url) window.location.href = data.url; },
    onError: (error) => {
      toast({ title: 'Checkout failed', description: error.message, variant: 'destructive' });
      setSubscribing(false);
    },
  });

  const { data: userStore } = useQuery({
    queryKey: ['ip-shield-store', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('stores').select('id').eq('owner_id', user!.id).limit(1);
      return data?.[0] || null;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  // Form state
  const [form, setForm] = useState({
    infringement_type: '' as string,
    target_platform: '' as string,
    target_platform_other: '',
    infringing_url: '',
    original_work_url: '',
    original_work_description: '',
    evidence_notes: '',
    good_faith_statement: false,
    accuracy_statement: false,
    ownership_confirmed: false,
  });

  const { data: cases, isLoading } = useQuery({
    queryKey: ['takedown-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('takedown_requests').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  const { data: ipRegistry, isLoading: registryLoading } = useQuery({
    queryKey: ['ip-registry', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('creator_ip_registry').select('*').eq('creator_id', user!.id).order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && isSubscribed && isVerified,
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('takedown_requests').insert({
        creator_id: user!.id,
        store_id: userStore?.id || null,
        case_number: '',
        infringement_type: form.infringement_type,
        target_platform: form.target_platform,
        target_platform_other: form.target_platform === 'other' ? form.target_platform_other : null,
        infringing_url: form.infringing_url,
        original_work_url: form.original_work_url || null,
        original_work_description: form.original_work_description,
        evidence_notes: form.evidence_notes || null,
        good_faith_statement: form.good_faith_statement,
        accuracy_statement: form.accuracy_statement,
        ownership_confirmed: form.ownership_confirmed,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Takedown request submitted', description: 'We will review your case and notify you of any updates.' });
      setShowNewRequest(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['takedown-requests'] });
    },
    onError: (error) => {
      toast({ title: 'Failed to submit', description: error.message, variant: 'destructive' });
    },
  });

  // IP Registry
  const [registryForm, setRegistryForm] = useState({
    title: '', description: '', work_type: '' as string, proof_urls: '',
    roblox_asset_ids: '', roblox_universe_ids: '', search_keywords: '',
  });
  const [showAddWork, setShowAddWork] = useState(false);

  const addWorkMutation = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase
        .from('creator_ip_registry')
        .insert({
          creator_id: user!.id,
          store_id: userStore?.id || null,
          title: registryForm.title,
          description: registryForm.description || null,
          work_type: registryForm.work_type,
          proof_urls: registryForm.proof_urls ? registryForm.proof_urls.split('\n').filter(Boolean) : [],
          roblox_asset_ids: registryForm.roblox_asset_ids ? registryForm.roblox_asset_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
          roblox_universe_ids: registryForm.roblox_universe_ids ? registryForm.roblox_universe_ids.split(',').map(s => s.trim()).filter(Boolean) : [],
          search_keywords: registryForm.search_keywords ? registryForm.search_keywords.split(',').map(s => s.trim()).filter(Boolean) : [],
        } as any)
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async (data) => {
      toast({ title: 'Work registered', description: 'Running initial copy scan...' });
      setShowAddWork(false);
      setRegistryForm({ title: '', description: '', work_type: '', proof_urls: '', roblox_asset_ids: '', roblox_universe_ids: '', search_keywords: '' });
      queryClient.invalidateQueries({ queryKey: ['ip-registry'] });
      
      // Auto-scan for newly registered entry
      if (data?.id) {
        try {
          const { data: scanData } = await supabase.functions.invoke('scan-roblox-copies', {
            body: { registry_entry_id: data.id },
          });
          toast({ title: 'Initial scan complete', description: `Found ${scanData?.total_detected || 0} potential copies.` });
          queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
          queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
        } catch {
          // Silent fail - scan will happen on next scheduled run
        }
      }
    },
    onError: (error) => {
      toast({ title: 'Failed to register', description: error.message, variant: 'destructive' });
    },
  });

  const resetForm = () => {
    setForm({
      infringement_type: '', target_platform: '', target_platform_other: '',
      infringing_url: '', original_work_url: '', original_work_description: '',
      evidence_notes: '', good_faith_statement: false, accuracy_statement: false, ownership_confirmed: false,
    });
  };

  const canSubmit = form.infringement_type && form.target_platform && form.infringing_url &&
    form.original_work_description && form.good_faith_statement && form.accuracy_statement && form.ownership_confirmed;

  const activeCases = cases?.filter(c => !['resolved', 'rejected'].includes(c.status)) || [];
  const closedCases = cases?.filter(c => ['resolved', 'rejected'].includes(c.status)) || [];

  const tiers = [
    {
      id: 'starter', name: 'Starter', price: '24.99',
      description: 'Essential protection for individual creators',
      features: ['3 takedown requests/month', '15 registered works', 'Case tracking & updates', 'Cross-platform enforcement'],
      disabledFeatures: ['Priority handling', 'Monitoring & alerts', 'Dedicated agent'],
      popular: false,
    },
    {
      id: 'pro', name: 'Pro', price: '39.99',
      description: 'Advanced protection for serious creators',
      features: ['15 takedown requests/month', 'Unlimited registered works', 'Case tracking & updates', 'Cross-platform enforcement', 'Priority handling', 'Monitoring & alerts'],
      disabledFeatures: ['Dedicated agent'],
      popular: true,
    },
    {
      id: 'enterprise', name: 'Enterprise', price: '79.99',
      description: 'Complete protection with dedicated support',
      features: ['Unlimited takedown requests', 'Unlimited registered works', 'Case tracking & updates', 'Cross-platform enforcement', 'Priority handling', 'Monitoring & alerts', 'Dedicated DMCA agent'],
      disabledFeatures: [],
      popular: false,
    },
  ];

  // Not logged in
  if (!user) {
    const highlights = [
      { icon: Shield, title: 'DMCA Takedown Service', description: 'We file professional DMCA takedown notices on your behalf across Roblox, Discord, YouTube and more.' },
      { icon: FileText, title: 'IP Registry', description: 'Register your original works with timestamps and proof to strengthen your ownership claims.' },
      { icon: Eye, title: 'Automated Monitoring', description: 'Weekly scans detect if your Roblox assets or games appear under a different owner.' },
      { icon: UserCheck, title: 'Verified Identity', description: 'Identity verification ensures full legal standing when acting as your DMCA agent.' },
    ];

    return (
      <MainLayout>
        {/* Hero */}
        <div className="relative w-full overflow-hidden -mt-4 border-b border-border/40">
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 39px, hsl(var(--foreground)) 39px, hsl(var(--foreground)) 40px), repeating-linear-gradient(90deg, transparent, transparent 39px, hsl(var(--foreground)) 39px, hsl(var(--foreground)) 40px)' }} />
          <div className="relative z-10 flex flex-col items-center justify-center text-center px-4 py-20 md:py-28 lg:py-36">
            <div className="inline-flex items-center gap-2 border border-border/60 rounded-full px-4 py-1.5 mb-8 bg-muted/30 backdrop-blur-sm">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="uppercase tracking-[0.2em] text-[10px] font-medium text-muted-foreground">Active Protection</span>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-black mb-6 leading-[1.05] max-w-4xl tracking-tight">
              Your Work.<br />
              <span className="text-primary">Our Fight.</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-xl leading-relaxed">
              DMCA enforcement, automated monitoring, and copy detection for Roblox creators.
            </p>
          </div>
        </div>

        <div className="container py-16 max-w-5xl">

          <div className="grid sm:grid-cols-2 gap-5 mb-16">
            {highlights.map((h) => (
              <Card key={h.title}>
                <CardContent className="flex gap-4 pt-6">
                  <div className="shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <h.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{h.title}</h3>
                    <p className="text-sm text-muted-foreground">{h.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mb-8">
            <h2 className="text-2xl font-display font-bold mb-2">Choose Your Plan</h2>
            <p className="text-muted-foreground">All plans include cross-platform enforcement and case tracking.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-12">
            {tiers.map((tier) => (
              <Card key={tier.id} className={`relative flex flex-col ${tier.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : ''}`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-bold">£{tier.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <ul className="space-y-2 text-sm flex-1 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" />{f}</li>
                    ))}
                    {tier.disabledFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-muted-foreground/50"><XCircle className="h-4 w-4 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="w-full gap-2" variant={tier.popular ? 'default' : 'outline'} asChild>
                    <Link to="/auth"><LogIn className="h-4 w-4" /> Sign In to Subscribe</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="max-w-md mx-auto mt-6 border-dashed">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-bold mb-1">Custom Plan</h3>
              <p className="text-sm text-muted-foreground mb-4">Need a tailored plan with specific limits? Contact us and we'll create a bespoke plan for you.</p>
              <Button variant="outline" onClick={() => setShowContactForm(true)}>
                  <Mail className="h-4 w-4 mr-2" /> Contact Us
              </Button>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground">
            <p>Already have an account? <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to manage your IP Shield subscription.</p>
          </div>
        </div>
        <IPShieldContactDialog open={showContactForm} onOpenChange={setShowContactForm} />
      </MainLayout>
    );
  }

  if (subLoading) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center">
          <Skeleton className="h-16 w-16 mx-auto rounded-full mb-6" />
          <Skeleton className="h-8 w-48 mx-auto mb-3" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </MainLayout>
    );
  }

  if (!isSubscribed) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-5xl">
          <div className="text-center mb-10">
            <Crown className="h-14 w-14 mx-auto text-primary/60 mb-4" />
            <h1 className="text-3xl font-display font-bold mb-2">IP Shield</h1>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Protect your intellectual property — we'll file DMCA takedown notices on your behalf. Choose a plan to get started.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {tiers.map((tier) => (
              <Card key={tier.id} className={`relative flex flex-col ${tier.popular ? 'border-primary shadow-lg shadow-primary/10 scale-[1.02]' : ''}`}>
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3">Most Popular</Badge>
                  </div>
                )}
                <CardContent className="pt-6 flex flex-col flex-1">
                  <div className="mb-4">
                    <h3 className="text-lg font-bold">{tier.name}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{tier.description}</p>
                  </div>
                  <div className="mb-5">
                    <span className="text-3xl font-bold">£{tier.price}</span>
                    <span className="text-muted-foreground text-sm">/mo</span>
                  </div>
                  <ul className="space-y-2 text-sm flex-1 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary shrink-0" />{f}</li>
                    ))}
                    {tier.disabledFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-muted-foreground/50"><XCircle className="h-4 w-4 shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button
                    className="w-full gap-2"
                    variant={tier.popular ? 'default' : 'outline'}
                    onClick={() => { setSubscribing(true); startCheckout.mutate(tier.id); }}
                    disabled={subscribing || startCheckout.isPending}
                  >
                    {(subscribing || startCheckout.isPending) ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Processing...</>
                    ) : (
                      <><CreditCard className="h-4 w-4" /> Get {tier.name}</>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="max-w-md mx-auto mt-6 border-dashed">
            <CardContent className="pt-6 text-center">
              <Users className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-bold mb-1">Custom Plan</h3>
              <p className="text-sm text-muted-foreground mb-4">Need a tailored plan with specific limits? Contact us and we'll create a bespoke plan for you.</p>
              <Button variant="outline" onClick={() => setShowContactForm(true)}>
                  <Mail className="h-4 w-4 mr-2" /> Contact Us
              </Button>
            </CardContent>
          </Card>
        </div>
        <IPShieldContactDialog open={showContactForm} onOpenChange={setShowContactForm} />
      </MainLayout>
    );
  }

  if (verifyLoading) {
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center">
          <Skeleton className="h-16 w-16 mx-auto rounded-full mb-6" />
          <Skeleton className="h-8 w-48 mx-auto mb-3" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
      </MainLayout>
    );
  }

  if (!isVerified) {
    const isPending = verificationStatus?.status === 'processing';
    return (
      <MainLayout>
        <div className="container py-16 max-w-lg text-center">
          <UserCheck className="h-16 w-16 mx-auto text-primary/60 mb-6" />
          <h1 className="text-3xl font-display font-bold mb-3">Almost There!</h1>
          <p className="text-muted-foreground mb-2">
            Thanks for subscribing! One last step — <strong>verify your identity</strong> to activate IP Shield.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This includes uploading a government-issued ID and taking a selfie. This ensures we can act as your DMCA agent with full legal standing.
          </p>

          {isPending ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="font-medium">Verification in progress</span>
              </div>
              <p className="text-xs text-muted-foreground">Your identity is being reviewed. This usually takes a few minutes.</p>
              <Button variant="outline" size="sm" onClick={() => refetchVerification()}>Check Status</Button>
            </div>
          ) : (
            <Button
              onClick={() => { setVerifying(true); startVerification.mutate(); }}
              disabled={verifying || startVerification.isPending}
              className="gap-2"
            >
              {(verifying || startVerification.isPending) ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Starting Verification...</>
              ) : (
                <><ExternalLink className="h-4 w-4" /> Verify My Identity</>
              )}
            </Button>
          )}

          {verificationStatus?.status === 'requires_input' && (
            <p className="text-xs text-muted-foreground mt-4">
              A previous verification session was started but not completed. Click above to start again.
            </p>
          )}
        </div>
      </MainLayout>
    );
  }

  // Verified + subscribed users go to the dashboard
  return <Navigate to="/ip-shield/dashboard" replace />;
}
