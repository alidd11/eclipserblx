import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertTriangle, CheckCircle2, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ManualReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  registryEntries: { id: string; title: string }[];
  userId: string;
  onReported: () => void;
}

interface GamePreview {
  name: string;
  description: string;
  creator: { id: string; name: string; type: string };
  visits: number;
  playing: number;
  favoriteCount: number;
  universeId: string;
  placeId?: string;
}

function extractRobloxId(input: string): { universeId?: string; placeId?: string } {
  const trimmed = input.trim();

  // Direct universe ID
  if (/^\d+$/.test(trimmed)) {
    return { universeId: trimmed };
  }

  // URL patterns: /games/PLACEID or /universes/UNIVERSEID
  const placeMatch = trimmed.match(/roblox\.com\/games\/(\d+)/i);
  if (placeMatch) return { placeId: placeMatch[1] };

  const universeMatch = trimmed.match(/roblox\.com\/universes\/(\d+)/i);
  if (universeMatch) return { universeId: universeMatch[1] };

  // /discover or /experiences
  const expMatch = trimmed.match(/roblox\.com\/(?:discover|experiences?)\/(\d+)/i);
  if (expMatch) return { placeId: expMatch[1] };

  return {};
}

export function ManualReportDialog({ open, onOpenChange, registryEntries, userId, onReported }: ManualReportDialogProps) {
  const [gameUrl, setGameUrl] = useState('');
  const [selectedEntryId, setSelectedEntryId] = useState('');
  const [notes, setNotes] = useState('');
  const [gamePreview, setGamePreview] = useState<GamePreview | null>(null);
  const [fetching, setFetching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');

  const reset = () => {
    setGameUrl('');
    setSelectedEntryId('');
    setNotes('');
    setGamePreview(null);
    setFetchError('');
  };

  const fetchGameDetails = async () => {
    setFetching(true);
    setFetchError('');
    setGamePreview(null);

    try {
      const { universeId, placeId } = extractRobloxId(gameUrl);

      let resolvedUniverseId = universeId;

      // If we have a place ID, resolve it to universe
      if (!resolvedUniverseId && placeId) {
        const res = await fetch(`https://apis.roblox.com/universes/v1/places/${placeId}/universe`);
        if (!res.ok) throw new Error('Could not resolve game. Check the URL.');
        const data = await res.json();
        resolvedUniverseId = String(data.universeId);
      }

      if (!resolvedUniverseId) {
        setFetchError('Enter a valid Roblox game URL or universe ID.');
        setFetching(false);
        return;
      }

      // Fetch game details
      const res = await fetch(`https://games.roblox.com/v1/games?universeIds=${resolvedUniverseId}`);
      if (!res.ok) throw new Error('Failed to fetch game details.');
      const data = await res.json();
      const game = data.data?.[0];
      if (!game) throw new Error('Game not found.');

      setGamePreview({
        name: game.name,
        description: game.description || '',
        creator: { id: String(game.creator.id), name: game.creator.name, type: game.creator.type },
        visits: game.visits || 0,
        playing: game.playing || 0,
        favoriteCount: game.favoritedCount || 0,
        universeId: resolvedUniverseId,
        placeId: placeId || String(game.rootPlaceId),
      });
    } catch (err: any) {
      setFetchError(err.message || 'Failed to fetch game.');
    } finally {
      setFetching(false);
    }
  };

  const handleSubmit = async () => {
    if (!gamePreview || !selectedEntryId) return;
    setSubmitting(true);

    try {
      // Check for duplicate
      const { data: existing } = await supabase
        .from('ip_copy_detections' as any)
        .select('id')
        .eq('creator_id', userId)
        .eq('detected_universe_id', gamePreview.universeId)
        .eq('registry_entry_id', selectedEntryId)
        .is('dismissed_at', null)
        .limit(1);

      if (existing && existing.length > 0) {
        toast.error('Already reported', { description: 'This game is already in your detections for this registry entry.' });
        setSubmitting(false);
        return;
      }

      const matchReasons = ['manual_report'];
      if (notes) matchReasons.push('user_notes');

      const { error } = await supabase
        .from('ip_copy_detections' as any)
        .insert({
          creator_id: userId,
          registry_entry_id: selectedEntryId,
          detected_universe_id: gamePreview.universeId,
          detected_place_id: gamePreview.placeId,
          game_name: gamePreview.name,
          game_description: gamePreview.description?.substring(0, 500),
          game_creator_id: gamePreview.creator.id,
          game_creator_name: gamePreview.creator.name,
          game_creator_type: gamePreview.creator.type,
          game_visits: gamePreview.visits,
          player_count: gamePreview.playing,
          game_favorites: gamePreview.favoriteCount,
          search_keyword: 'manual_report',
          similarity_score: 100,
          confidence_level: 'critical',
          match_reasons: matchReasons,
          status: 'active',
          first_detected_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          evidence_data: notes ? { manual_notes: notes } : null,
        } as any);

      if (error) throw error;

      toast.success('Game reported', { description: `"${gamePreview.name}" has been added to your detections.` });
      reset();
      onOpenChange(false);
      onReported();
    } catch (err: any) {
      toast({ title: 'Failed to report', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-primary" />
            Report a Game
          </DialogTitle>
          <DialogDescription>
            Manually flag a Roblox game that's using your assets without permission. This will add it to your detections so you can file a takedown.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Game URL input */}
          <div className="space-y-1.5">
            <Label>Roblox Game URL or Universe ID</Label>
            <div className="flex gap-2">
              <Input
                value={gameUrl}
                onChange={(e) => setGameUrl(e.target.value)}
                placeholder="https://www.roblox.com/games/123456789 or universe ID"
                className="flex-1"
                onKeyDown={(e) => e.key === 'Enter' && fetchGameDetails()}
              />
              <Button variant="outline" size="icon" onClick={fetchGameDetails} disabled={fetching || !gameUrl.trim()}>
                {fetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            {fetchError && <p className="text-xs text-destructive">{fetchError}</p>}
          </div>

          {/* Game preview */}
          {gamePreview && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                <span className="font-medium text-sm">{gamePreview.name}</span>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span>by <strong className="text-foreground">{gamePreview.creator.name}</strong> ({gamePreview.creator.type})</span>
                <Badge variant="outline" className="text-[10px]">{gamePreview.visits.toLocaleString()} visits</Badge>
                <Badge variant="outline" className="text-[10px]">{gamePreview.playing.toLocaleString()} playing</Badge>
              </div>
              {gamePreview.description && (
                <p className="text-xs text-muted-foreground line-clamp-2">{gamePreview.description}</p>
              )}
            </div>
          )}

          {/* Registry entry selector */}
          <div className="space-y-1.5">
            <Label>Which of your works is being infringed?</Label>
            <Select value={selectedEntryId} onValueChange={setSelectedEntryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a registry entry" />
              </SelectTrigger>
              <SelectContent>
                {registryEntries.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Details (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Describe what assets they're using — e.g. 'They're using my vehicle model (Asset ID 12345) in their game without permission'"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!gamePreview || !selectedEntryId || submitting}>
            {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <AlertTriangle className="h-4 w-4 mr-2" />}
            Report Game
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
