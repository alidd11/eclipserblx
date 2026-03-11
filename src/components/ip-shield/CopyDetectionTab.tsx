import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { TabsContent } from '@/components/ui/tabs';
import { toast } from 'sonner';
import {
  Search, Loader2, ExternalLink, Gavel, Radar, Users,
  TrendingUp, TrendingDown, Minus, ShieldCheck, History, CheckSquare,
} from 'lucide-react';
import { format } from 'date-fns';
import { TakedownFromDetectionDialog } from './TakedownFromDetectionDialog';

export function CopyDetectionTab({ userId }: { userId?: string }) {
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
      toast.success('Scan complete', { description: `Found ${data?.total_detected || 0} potential copies. ${data?.thumbnails_analyzed || 0} thumbnails analysed.` });
      queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
      queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
    } catch (err: any) {
      toast.error('Scan failed', { description: err.message });
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

        await supabase.functions.invoke('file-dmca-takedown', {
          body: { takedown_id: data.id },
        });
        filed++;
      }
    }

    toast.success(`${filed} takedowns filed`, { description: 'DMCA notices queued for review and sending.' });
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
