import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { IPShieldLayout } from '@/components/ip-shield/IPShieldLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Radar, Search, Loader2, ExternalLink, Gavel, Users,
  TrendingUp, TrendingDown, Minus, ShieldCheck, History, CheckSquare,
  Filter, Clock, AlertTriangle, Target, RefreshCw, X, ChevronDown, Globe
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { DetectionDetailPanel } from '@/components/ip-shield/DetectionDetailPanel';
import { ExternalWebScanner } from '@/components/ip-shield/ExternalWebScanner';
import { ManualReportDialog } from '@/components/ip-shield/ManualReportDialog';

type SortOption = 'score_desc' | 'score_asc' | 'newest' | 'oldest' | 'players';
type FilterOption = 'all' | 'critical' | 'high' | 'medium' | 'low' | 'actionable';

export default function IPShieldDetections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [scanning, setScanning] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkMode, setBulkMode] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('score_desc');
  const [filterBy, setFilterBy] = useState<FilterOption>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customKeywords, setCustomKeywords] = useState('');
  const [showCustomScan, setShowCustomScan] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showManualReport, setShowManualReport] = useState(false);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  }, []);

  const { data: detections, isLoading } = useQuery({
    queryKey: ['copy-detections', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_copy_detections' as any)
        .select('*')
        .eq('creator_id', user!.id)
        .is('dismissed_at', null)
        .order('similarity_score', { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const { data: lastScanRun } = useQuery({
    queryKey: ['last-scan-run', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ip_scan_runs' as any)
        .select('*')
        .eq('creator_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (error) return null;
      return data as any;
    },
    enabled: !!user,
  });

  const { data: registryEntries } = useQuery({
    queryKey: ['registry-entries', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_ip_registry' as any)
        .select('id, title')
        .eq('creator_id', user!.id);
      if (error) return [];
      return data as any[];
    },
    enabled: !!user,
  });

  const [selectedEntry, setSelectedEntry] = useState<string>('all');

  const runScan = async (options?: { registry_entry_id?: string; custom_search_terms?: string[] }) => {
    setScanning(true);
    try {
      const body: any = {};
      if (options?.registry_entry_id) body.registry_entry_id = options.registry_entry_id;
      if (options?.custom_search_terms?.length) body.custom_search_terms = options.custom_search_terms;
      if (options?.registry_entry_id) body.scan_type = 'targeted';
      
      const { data, error } = await supabase.functions.invoke('scan-roblox-copies', { body });
      if (error) throw error;
      toast.success('Scan complete', { description: `Found ${data?.total_detected || 0} potential copies. ${data?.thumbnails_analyzed || 0} thumbnails analysed. ${data?.evidence_collected || 0} evidence collected.` });
      queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
      queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
      queryClient.invalidateQueries({ queryKey: ['last-scan-run'] });
    } catch (err: any) {
      toast.error('Scan failed', { description: err.message });
    } finally {
      setScanning(false);
    }
  };

  const runCustomScan = () => {
    const terms = customKeywords.split(',').map(s => s.trim()).filter(Boolean);
    if (terms.length === 0) {
      toast.error('Enter keywords', { description: 'Add comma-separated keywords to search for.' });
      return;
    }
    runScan({ 
      custom_search_terms: terms,
      registry_entry_id: selectedEntry !== 'all' ? selectedEntry : undefined,
    });
    setShowCustomScan(false);
    setCustomKeywords('');
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
      if (next.has(id)) next.delete(id); else next.add(id);
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
          creator_id: user!.id,
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
        await supabase.from('ip_copy_detections' as any).update({ takedown_request_id: data.id, status: 'takedown_filed' } as any).eq('id', detection.id);
        await supabase.functions.invoke('file-dmca-takedown', { body: { takedown_id: data.id } });
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

  // Apply filters and sorting
  const filteredDetections = (detections || [])
    .filter((d: any) => {
      if (filterBy === 'critical') return d.similarity_score >= 75;
      if (filterBy === 'high') return d.similarity_score >= 55 && d.similarity_score < 75;
      if (filterBy === 'medium') return d.similarity_score >= 35 && d.similarity_score < 55;
      if (filterBy === 'low') return d.similarity_score < 35;
      if (filterBy === 'actionable') return !d.creator_verified && !d.takedown_request_id && d.similarity_score >= 30;
      return true;
    })
    .filter((d: any) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return d.game_name?.toLowerCase().includes(q) || d.game_creator_name?.toLowerCase().includes(q) || d.search_keyword?.toLowerCase().includes(q);
    })
    .sort((a: any, b: any) => {
      if (sortBy === 'score_desc') return (b.similarity_score || 0) - (a.similarity_score || 0);
      if (sortBy === 'score_asc') return (a.similarity_score || 0) - (b.similarity_score || 0);
      if (sortBy === 'newest') return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      if (sortBy === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === 'players') return (b.player_count || 0) - (a.player_count || 0);
      return 0;
    });

  const stats = {
    total: detections?.length || 0,
    critical: detections?.filter((d: any) => d.similarity_score >= 75).length || 0,
    high: detections?.filter((d: any) => d.similarity_score >= 55 && d.similarity_score < 75).length || 0,
    medium: detections?.filter((d: any) => d.similarity_score >= 35 && d.similarity_score < 55).length || 0,
    low: detections?.filter((d: any) => d.similarity_score < 35).length || 0,
  };

  const actionableDetections = (detections || []).filter((d: any) => !d.creator_verified && !d.takedown_request_id && d.similarity_score >= 30);

  return (
    <IPShieldLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Radar className="h-6 w-6 text-primary" />
              Copy Detection
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              AI-powered scanning across Roblox and external websites.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {actionableDetections.length > 0 && (
              <Button
                variant={bulkMode ? "default" : "outline"}
                size="sm"
                onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
              >
                <CheckSquare className="h-4 w-4 mr-1" />
                {bulkMode ? 'Cancel' : 'Bulk Takedown'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowManualReport(true)}>
              <AlertTriangle className="h-4 w-4 mr-1" />
              Report Game
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowCustomScan(!showCustomScan)}>
              <Target className="h-4 w-4 mr-1" />
              Custom Scan
            </Button>
            <Button size="sm" onClick={() => runScan()} disabled={scanning}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
              {scanning ? 'Scanning...' : 'Full Scan'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="roblox" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="roblox" className="gap-1.5"><Radar className="h-3.5 w-3.5" /> Roblox Scanner</TabsTrigger>
            <TabsTrigger value="external" className="gap-1.5"><Globe className="h-3.5 w-3.5" /> External Websites</TabsTrigger>
          </TabsList>

          <TabsContent value="external">
            <ExternalWebScanner />
          </TabsContent>

          <TabsContent value="roblox" className="space-y-6">
        {/* Last Scan Info */}
        {lastScanRun && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
            <Clock className="h-3.5 w-3.5" />
            <span>
              Last scan: {formatDistanceToNow(new Date(lastScanRun.completed_at || lastScanRun.created_at), { addSuffix: true })}
              {' · '}{lastScanRun.total_detected || 0} detected
              {' · '}{lastScanRun.thumbnails_analyzed || 0} thumbnails analysed
              {lastScanRun.status === 'running' && (
                <Badge variant="secondary" className="ml-2 text-[10px]"><Loader2 className="h-2.5 w-2.5 animate-spin mr-1" /> Running</Badge>
              )}
              {lastScanRun.status === 'failed' && (
                <Badge variant="destructive" className="ml-2 text-[10px]">Failed</Badge>
              )}
            </span>
          </div>
        )}

        {/* Custom Scan Panel */}
        {showCustomScan && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2"><Target className="h-4 w-4" /> Custom Scan</span>
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowCustomScan(false)}><X className="h-3.5 w-3.5" /></Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Registry Entry (optional)</label>
                <Select value={selectedEntry} onValueChange={setSelectedEntry}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All entries" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All entries</SelectItem>
                    {(registryEntries || []).map((e: any) => (
                      <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Custom Keywords (comma-separated)</label>
                <Input
                  value={customKeywords}
                  onChange={(e) => setCustomKeywords(e.target.value)}
                  placeholder="e.g. westbridge roleplay, ukrp westbridge"
                  className="h-9"
                />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={runCustomScan} disabled={scanning} className="gap-1">
                  {scanning ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
                  Run Custom Scan
                </Button>
                {selectedEntry !== 'all' && (
                  <Button size="sm" variant="outline" onClick={() => runScan({ registry_entry_id: selectedEntry })} disabled={scanning} className="gap-1">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Scan This Entry Only
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Row */}
        {stats.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <button onClick={() => setFilterBy('all')} className={`p-2.5 rounded-lg border text-center transition-colors ${filterBy === 'all' ? 'border-primary bg-primary/5' : 'hover:border-muted-foreground/30'}`}>
              <div className="text-lg font-bold">{stats.total}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</div>
            </button>
            <button onClick={() => setFilterBy('critical')} className={`p-2.5 rounded-lg border text-center transition-colors ${filterBy === 'critical' ? 'border-destructive bg-destructive/5' : 'hover:border-muted-foreground/30'}`}>
              <div className="text-lg font-bold text-destructive">{stats.critical}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">🔴 Critical</div>
            </button>
            <button onClick={() => setFilterBy('high')} className={`p-2.5 rounded-lg border text-center transition-colors ${filterBy === 'high' ? 'border-orange-500 bg-orange-500/5' : 'hover:border-muted-foreground/30'}`}>
              <div className="text-lg font-bold text-orange-500">{stats.high}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">🟠 High</div>
            </button>
            <button onClick={() => setFilterBy('medium')} className={`p-2.5 rounded-lg border text-center transition-colors ${filterBy === 'medium' ? 'border-yellow-500 bg-yellow-500/5' : 'hover:border-muted-foreground/30'}`}>
              <div className="text-lg font-bold text-yellow-500">{stats.medium}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">🟡 Medium</div>
            </button>
            <button onClick={() => setFilterBy('low')} className={`p-2.5 rounded-lg border text-center transition-colors ${filterBy === 'low' ? 'border-green-500 bg-green-500/5' : 'hover:border-muted-foreground/30'}`}>
              <div className="text-lg font-bold text-green-500">{stats.low}</div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider">🟢 Low</div>
            </button>
          </div>
        )}

        {/* Filters & Search */}
        {stats.total > 0 && (
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by game name, creator, or keyword..."
                className="pl-8 h-9"
              />
            </div>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px] h-9">
                <Filter className="h-3.5 w-3.5 mr-1" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="score_desc">Highest Score</SelectItem>
                <SelectItem value="score_asc">Lowest Score</SelectItem>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="players">Most Players</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Bulk Mode Bar */}
        {bulkMode && selectedIds.size > 0 && (
          <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
            <span className="text-sm font-medium">{selectedIds.size} selected</span>
            <Button variant="outline" size="sm" onClick={selectAllHigh}>Select All High+</Button>
            <div className="flex-1" />
            <Button variant="destructive" size="sm" onClick={bulkFileTakedowns} className="gap-1">
              <Gavel className="h-3.5 w-3.5" />
              File {selectedIds.size} Takedown{selectedIds.size > 1 ? 's' : ''}
            </Button>
          </div>
        )}

        {/* Results */}
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}</div>
        ) : !detections || detections.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Radar className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="font-semibold text-lg">No copies detected</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                Register works in the IP Registry with search keywords, then run a scan to find potential copies on Roblox.
              </p>
              <Button className="mt-4" onClick={() => runScan()} disabled={scanning}>
                {scanning ? 'Scanning...' : 'Run Your First Scan'}
              </Button>
            </CardContent>
          </Card>
        ) : filteredDetections.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Filter className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">No detections match your filters.</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={() => { setFilterBy('all'); setSearchQuery(''); }}>
                Clear Filters
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground mb-2">{filteredDetections.length} result{filteredDetections.length !== 1 ? 's' : ''}</p>
            <div className="grid gap-2">
              {filteredDetections.map((d: any) => {
                const score = d.similarity_score || 0;
                const reasons: string[] = d.match_reasons || [];
                const hasThumbMatch = reasons.some((r: string) => r.startsWith('thumbnail_similar'));
                const hasDescMatch = reasons.some((r: string) => r.includes('description') || r.includes('plagiarism') || r.includes('sentence'));
                const hasSuspicious = reasons.some((r: string) => r.startsWith('suspicious_phrase'));
                const creatorVerified = d.creator_verified;
                const ownsGroup = reasons.includes('creator_owns_group');
                const trend = d.player_count_trend || 'stable';
                const detectionCount = d.detection_count || 1;
                const isSelected = selectedIds.has(d.id);
                const canSelect = bulkMode && !creatorVerified && !d.takedown_request_id && score >= 30;

                const confidenceColor = score >= 75 ? 'destructive' : score >= 55 ? 'default' : score >= 35 ? 'secondary' : 'outline';
                const confidenceLabel = score >= 75 ? '🔴 Critical' : score >= 55 ? '🟠 High' : score >= 35 ? '🟡 Medium' : '🟢 Low';

                return (
                  <div key={d.id}>
                    <Card
                      className={`transition-colors cursor-pointer ${expandedId === d.id ? 'rounded-b-none border-primary/20' : ''} ${isSelected ? 'border-destructive ring-1 ring-destructive/20' : score >= 75 && !creatorVerified ? 'border-destructive/40' : 'hover:border-muted-foreground/20'}`}
                      onClick={() => !bulkMode && toggleExpand(d.id)}
                    >
                      <CardContent className="py-3 px-3 sm:px-4">
                        <div className="flex items-start gap-2 sm:gap-3">
                          {canSelect && (
                            <Checkbox checked={isSelected} onCheckedChange={(e) => { e && toggleSelect(d.id); }} className="mt-1" onClick={(e) => e.stopPropagation()} />
                          )}
                          <div className="flex-1 min-w-0 overflow-hidden">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
                                <span className="font-medium text-sm break-words">{d.game_name}</span>
                                {creatorVerified ? (
                                  <Badge variant="secondary" className="text-[10px] gap-1 shrink-0"><ShieldCheck className="h-3 w-3" /> Verified</Badge>
                                ) : (
                                  <Badge variant={confidenceColor as any} className="text-[10px] shrink-0">
                                    {confidenceLabel}{score > 0 && ` · ${score}%`}
                                  </Badge>
                                )}
                              </div>
                              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform shrink-0 mt-0.5 ${expandedId === d.id ? 'rotate-180' : ''}`} />
                            </div>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {d.takedown_request_id && (
                                <Badge variant="outline" className="text-[10px] gap-1 text-primary"><Gavel className="h-3 w-3" /> Takedown Filed</Badge>
                              )}
                              {d.player_count > 0 && (
                                <Badge variant="outline" className="text-[10px] gap-1"><Users className="h-3 w-3" /> {d.player_count.toLocaleString()} <TrendIcon trend={trend} /></Badge>
                              )}
                              {detectionCount > 1 && (
                                <Badge variant="outline" className="text-[10px] gap-1"><History className="h-3 w-3" /> {detectionCount}x</Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              by{' '}
                              <a
                                href={d.game_creator_type === 'Group'
                                  ? `https://www.roblox.com/groups/${d.game_creator_id}`
                                  : `https://www.roblox.com/users/${d.game_creator_id}/profile`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {d.game_creator_name}
                              </a>
                              {d.game_creator_type === 'Group' && (
                                <span>{' (Group'}{d.creator_group_name && `: ${d.creator_group_name}`}{ownsGroup && ' — member'}{')'}</span>
                              )}
                              {' · '}"{d.search_keyword}"
                            </p>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {hasThumbMatch && <Badge variant="outline" className="text-[10px] py-0">🖼️ Thumbnail</Badge>}
                              {hasDescMatch && <Badge variant="outline" className="text-[10px] py-0">📝 Description</Badge>}
                              {hasSuspicious && <Badge variant="outline" className="text-[10px] py-0 text-destructive">⚠️ Suspicious</Badge>}
                              {d.thumbnail_analyzed && !hasThumbMatch && (
                                <Badge variant="outline" className="text-[10px] py-0 text-muted-foreground">✓ Thumb Clear</Badge>
                              )}
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              ID: {d.detected_universe_id}
                              {' · '}Found {format(new Date(d.first_detected_at || d.created_at), 'MMM d, yyyy')}
                              {d.last_seen_at && ` · Last ${format(new Date(d.last_seen_at), 'MMM d')}`}
                            </p>
                            {/* Action buttons - stacked on mobile */}
                            <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                              {!creatorVerified && score >= 30 && !d.takedown_request_id && !bulkMode && (
                                <Button variant="destructive" size="sm" className="gap-1 h-7 text-xs" asChild onClick={(e: React.MouseEvent) => e.stopPropagation()}>
                                  <a href="/ip-shield/dashboard/takedowns"><Gavel className="h-3 w-3" /> Takedown</a>
                                </Button>
                              )}
                              <a href={`https://www.roblox.com/games/${d.detected_place_id || d.detected_universe_id}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                <Button variant="outline" size="sm" className="gap-1 h-7 text-xs"><ExternalLink className="h-3 w-3" /> View</Button>
                              </a>
                              {!bulkMode && (
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={(e) => { e.stopPropagation(); dismissDetection(d.id); }}>Dismiss</Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    {expandedId === d.id && (
                      <DetectionDetailPanel detection={d} onCollapse={() => setExpandedId(null)} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
          </TabsContent>
        </Tabs>
      </div>

      {user && (
        <ManualReportDialog
          open={showManualReport}
          onOpenChange={setShowManualReport}
          registryEntries={(registryEntries || []) as { id: string; title: string }[]}
          userId={user.id}
          onReported={() => {
            queryClient.invalidateQueries({ queryKey: ['copy-detections'] });
            queryClient.invalidateQueries({ queryKey: ['ip-shield-analytics'] });
          }}
        />
      )}
    </IPShieldLayout>
  );
}
