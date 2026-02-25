import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { ImageZoomModal } from '@/components/ui/ImageZoomModal';
import {
  Users, Eye, Heart, ThumbsUp, ThumbsDown, Gamepad2, Calendar,
  Crown, Image as ImageIcon, Ticket, ChevronUp, AlertTriangle, CheckCircle2, XCircle, Fingerprint, ExternalLink
} from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface DetectionDetailPanelProps {
  detection: any;
  onCollapse: () => void;
}

export function DetectionDetailPanel({ detection, onCollapse }: DetectionDetailPanelProps) {
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['roblox-game-details', detection.detected_universe_id],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('fetch-roblox-game-details', {
        body: {
          universe_id: detection.detected_universe_id,
          place_id: detection.detected_place_id,
          creator_type: detection.game_creator_type,
          creator_id: detection.game_creator_id,
        },
      });
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <Card className="border-t-0 rounded-t-none border-primary/20 bg-muted/30">
        <CardContent className="py-4 space-y-3">
          <div className="flex gap-3">
            <Skeleton className="h-24 w-24 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data) return null;

  const game = data.game;
  const voteRatio = data.votes
    ? Math.round((data.votes.upVotes / (data.votes.upVotes + data.votes.downVotes || 1)) * 100)
    : null;

  return (
    <>
      <Card className="border-t-0 rounded-t-none border-primary/20 bg-muted/30 animate-in slide-in-from-top-2 duration-200 overflow-hidden">
        <CardContent className="py-4 px-3 sm:px-6 space-y-4 overflow-hidden">
          {/* Top section: Thumbnail + Stats */}
          <div className="flex gap-4">
            {/* Game thumbnail */}
            {data.thumbnail && (
              <img
                src={data.thumbnail}
                alt={game?.name || detection.game_name}
                className="h-24 w-24 rounded-lg object-cover shrink-0 cursor-pointer hover:opacity-80 transition-opacity border"
                onClick={() => setZoomImage(data.thumbnail)}
              />
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <h4 className="font-semibold text-sm truncate">{game?.name || detection.game_name}</h4>
              {game?.description && (
                <p className="text-xs text-muted-foreground line-clamp-3">{game.description}</p>
              )}
              {game?.genre && (
                <Badge variant="outline" className="text-[10px]">{game.genre}</Badge>
              )}
            </div>
          </div>

          {/* Stats grid */}
          {game && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatBox icon={<Gamepad2 className="h-3.5 w-3.5" />} label="Playing" value={game.playing?.toLocaleString() || '0'} />
              <StatBox icon={<Eye className="h-3.5 w-3.5" />} label="Visits" value={formatNumber(game.visits)} />
              <StatBox icon={<Heart className="h-3.5 w-3.5" />} label="Favourites" value={formatNumber(game.favoritedCount)} />
              {voteRatio !== null && (
                <StatBox
                  icon={<ThumbsUp className="h-3.5 w-3.5" />}
                  label="Rating"
                  value={`${voteRatio}%`}
                  subtitle={`${formatNumber(data.votes.upVotes)} / ${formatNumber(data.votes.downVotes)}`}
                  subtitleIcon={<ThumbsDown className="h-2.5 w-2.5" />}
                />
              )}
            </div>
          )}

          {/* Dates */}
          {game && (
            <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Created: {game.created ? format(new Date(game.created), 'MMM d, yyyy') : 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                Updated: {game.updated ? format(new Date(game.updated), 'MMM d, yyyy') : 'Unknown'}
              </span>
              {game.maxPlayers && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" /> Max {game.maxPlayers} players
                </span>
              )}
            </div>
          )}

          {/* Creator / Group Owner */}
          {(data.groupOwner || data.creatorAvatar) && (
            <div className="flex items-center gap-3 p-2.5 rounded-lg bg-background border overflow-hidden">
              {data.groupOwner ? (
                <>
                  {data.groupOwner.groupIcon && (
                    <a href={`https://www.roblox.com/groups/${detection.game_creator_id}`} target="_blank" rel="noopener noreferrer">
                      <img src={data.groupOwner.groupIcon} alt="Group" className="h-10 w-10 rounded-lg object-cover border shrink-0 hover:opacity-80 transition-opacity" />
                    </a>
                  )}
                  <div className="flex-1 min-w-0">
                    <a href={`https://www.roblox.com/groups/${detection.game_creator_id}`} target="_blank" rel="noopener noreferrer" className="text-xs font-medium truncate hover:text-primary hover:underline transition-colors flex items-center gap-1">
                      {data.groupOwner.groupName} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                    </a>
                    <p className="text-[10px] text-muted-foreground">{data.groupOwner.memberCount?.toLocaleString()} members</p>
                  </div>
                  {data.groupOwner.owner && (
                    <a href={`https://www.roblox.com/users/${data.groupOwner.owner.id}/profile`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 shrink-0 min-w-0 hover:opacity-80 transition-opacity">
                      <Avatar className="h-8 w-8 shrink-0">
                        {data.groupOwner.owner.avatar && <AvatarImage src={data.groupOwner.owner.avatar} />}
                        <AvatarFallback className="text-[10px]">
                          <Crown className="h-3.5 w-3.5" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-right min-w-0">
                        <p className="text-[10px] font-medium truncate">{data.groupOwner.owner.displayName}</p>
                        <p className="text-[10px] text-muted-foreground truncate">@{data.groupOwner.owner.username}</p>
                      </div>
                    </a>
                  )}
                </>
              ) : data.creatorAvatar ? (
                <a href={`https://www.roblox.com/users/${detection.game_creator_id}/profile`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={data.creatorAvatar} />
                    <AvatarFallback className="text-xs">{detection.game_creator_name?.[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-xs font-medium flex items-center gap-1">{detection.game_creator_name} <ExternalLink className="h-2.5 w-2.5" /></p>
                    <p className="text-[10px] text-muted-foreground">Creator</p>
                  </div>
                </a>
              ) : null}
            </div>
          )}

          {/* Game Pass Mirroring Results */}
          {detection.game_pass_match_data?.matched_passes?.length > 0 && (
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-500" /> Game Pass Mirroring Detected
                <Badge variant="destructive" className="text-[10px] ml-1">
                  {detection.game_pass_match_data.matched_passes.length}/{detection.game_pass_match_data.total_original} matched
                </Badge>
              </p>
              <div className="space-y-1">
                {detection.game_pass_match_data.matched_passes.map((mp: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-background border text-xs">
                    <span className="truncate flex-1 text-muted-foreground">{mp.original_name}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="truncate flex-1 font-medium">{mp.copy_name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground">
                      {mp.original_price != null ? `R$${mp.original_price}` : 'Free'}
                      {' / '}
                      {mp.copy_price != null ? `R$${mp.copy_price}` : 'Free'}
                    </span>
                    <Badge variant={mp.similarity >= 80 ? 'destructive' : 'secondary'} className="text-[10px] shrink-0">
                      {mp.similarity}%
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshot AI Comparison Results */}
          {detection.screenshot_comparison_data?.comparisons?.length > 0 && (
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <ImageIcon className="h-3.5 w-3.5 text-amber-500" /> Screenshot Comparison
                <Badge variant={detection.screenshot_comparison_data.overall_score >= 50 ? 'destructive' : 'secondary'} className="text-[10px] ml-1">
                  {detection.screenshot_comparison_data.overall_score}% match
                </Badge>
              </p>
              <div className="space-y-2">
                {detection.screenshot_comparison_data.comparisons.map((comp: any, i: number) => (
                  <div key={i} className="p-2 rounded-md bg-background border">
                    <div className="flex items-center gap-2 mb-1.5">
                      {comp.is_similar ? (
                        <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0" />
                      )}
                      <span className="text-[10px] text-muted-foreground flex-1">{comp.reasoning}</span>
                      <Badge variant={comp.is_similar ? 'destructive' : 'outline'} className="text-[10px] shrink-0">
                        {comp.confidence}%
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <img
                        src={comp.original_url}
                        alt="Original"
                        className="h-16 w-auto rounded object-cover cursor-pointer hover:opacity-80 transition-opacity border shrink-0"
                        onClick={() => setZoomImage(comp.original_url)}
                      />
                      <img
                        src={comp.copy_url}
                        alt="Copy"
                        className="h-16 w-auto rounded object-cover cursor-pointer hover:opacity-80 transition-opacity border shrink-0"
                        onClick={() => setZoomImage(comp.copy_url)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Asset Fingerprint Results */}
          {detection.asset_fingerprint_data?.shared_count > 0 && (
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <Fingerprint className="h-3.5 w-3.5 text-amber-500" /> Shared Asset IDs
                <Badge variant={detection.asset_fingerprint_data.shared_count >= 3 ? 'destructive' : 'secondary'} className="text-[10px] ml-1">
                  {detection.asset_fingerprint_data.shared_count} shared
                </Badge>
              </p>
              <div className="flex flex-wrap gap-1.5">
                {detection.asset_fingerprint_data.shared_asset_ids.slice(0, 10).map((id: string, i: number) => (
                  <a key={i} href={`https://www.roblox.com/library/${id}`} target="_blank" rel="noopener noreferrer">
                    <Badge variant="outline" className="text-[10px] hover:bg-muted transition-colors cursor-pointer gap-1">
                      {id} <ExternalLink className="h-2 w-2" />
                    </Badge>
                  </a>
                ))}
                {detection.asset_fingerprint_data.shared_count > 10 && (
                  <Badge variant="outline" className="text-[10px]">+{detection.asset_fingerprint_data.shared_count - 10} more</Badge>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                {detection.asset_fingerprint_data.shared_count} of {detection.asset_fingerprint_data.original_count} original assets found in suspect game ({detection.asset_fingerprint_data.candidate_count} total assets)
              </p>
            </div>
          )}

          {(detection.game_pass_match_data || detection.screenshot_comparison_data || detection.asset_fingerprint_data) && data.gamePasses?.length > 0 && (
            <Separator />
          )}

          {/* Game Passes */}
          {data.gamePasses?.length > 0 && (
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <Ticket className="h-3.5 w-3.5" /> Game Passes ({data.gamePasses.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                {data.gamePasses.map((gp: any) => (
                  <div key={gp.id} className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md bg-background border text-xs">
                    <span className="truncate">{gp.name}</span>
                    <span className="shrink-0 font-medium text-primary">
                      {gp.price != null ? `R$${gp.price.toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Screenshots */}
          {data.screenshots?.length > 0 && (
            <div>
              <p className="text-xs font-medium flex items-center gap-1.5 mb-2">
                <ImageIcon className="h-3.5 w-3.5" /> Screenshots ({data.screenshots.length})
              </p>
              <ScrollArea className="w-full whitespace-nowrap">
                <div className="flex gap-2">
                  {data.screenshots.map((url: string, i: number) => (
                    <img
                      key={i}
                      src={url}
                      alt={`Screenshot ${i + 1}`}
                      className="h-28 w-auto rounded-lg object-cover cursor-pointer hover:opacity-80 transition-opacity border shrink-0"
                      onClick={() => setZoomImage(url)}
                    />
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}

          <Button variant="ghost" size="sm" className="w-full text-xs gap-1" onClick={onCollapse}>
            <ChevronUp className="h-3.5 w-3.5" /> Collapse
          </Button>
        </CardContent>
      </Card>

      {zoomImage && (
        <ImageZoomModal
          src={zoomImage}
          alt="Game media"
          isOpen={!!zoomImage}
          onClose={() => setZoomImage(null)}
        />
      )}
    </>
  );
}

function StatBox({ icon, label, value, subtitle, subtitleIcon }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle?: string;
  subtitleIcon?: React.ReactNode;
}) {
  return (
    <div className="p-2 rounded-lg bg-background border text-center">
      <div className="flex items-center justify-center gap-1 text-muted-foreground mb-0.5">{icon}<span className="text-[10px]">{label}</span></div>
      <p className="text-sm font-semibold">{value}</p>
      {subtitle && (
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-0.5">{subtitleIcon}{subtitle}</p>
      )}
    </div>
  );
}

function formatNumber(n: number | null | undefined): string {
  if (n == null) return '0';
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
