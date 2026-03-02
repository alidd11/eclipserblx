import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useCredits } from '@/hooks/useCredits';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Eye, MousePointerClick, Pause, Play, X, TrendingUp, Megaphone, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Promotion {
  id: string;
  product_id: string;
  slot_type: string;
  max_bid: number;
  current_bid: number;
  status: string;
  impressions: number;
  clicks: number;
  started_at: string | null;
  expires_at: string | null;
  paused_at: string | null;
  created_at: string;
  products?: { name: string; images: string[] | null; slug: string } | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  pending_auction: { label: 'Pending', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  outbid: { label: 'Outbid', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  paused: { label: 'Paused', className: 'bg-muted text-muted-foreground border-border' },
  expired: { label: 'Expired', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
};

export function PromotionCard({ promotion }: { promotion: Promotion }) {
  const queryClient = useQueryClient();
  const { balance } = useCredits();
  const [showRebid, setShowRebid] = useState(false);
  const [newBid, setNewBid] = useState(Math.max(promotion.max_bid + 1, 5));
  const rebidExceedsBalance = newBid > balance;
  const ctr = promotion.impressions > 0 ? ((promotion.clicks / promotion.impressions) * 100).toFixed(1) : '0.0';
  const config = statusConfig[promotion.status] || statusConfig.pending_auction;

  const updateStatus = useMutation({
    mutationFn: async ({ newStatus, bidAmount }: { newStatus: string; bidAmount?: number }) => {
      const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'paused') updates.paused_at = new Date().toISOString();
      if (newStatus === 'pending_auction') {
        updates.paused_at = null;
        if (bidAmount && bidAmount >= 5) {
          updates.max_bid = bidAmount;
          updates.current_bid = bidAmount;
        }
      }

      const { error } = await supabase
        .from('product_promotions')
        .update(updates)
        .eq('id', promotion.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-promotions'] });
      setShowRebid(false);
      toast.success('Promotion updated');
    },
    onError: () => toast.error('Failed to update promotion'),
  });

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-0">
        <div className="flex items-stretch">
          {/* Thumbnail */}
          <div className="w-20 h-20 sm:w-24 sm:h-24 flex-shrink-0 bg-muted">
            {promotion.products?.images?.[0] ? (
              <img src={promotion.products.images[0]} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Megaphone className="h-6 w-6 text-muted-foreground/30" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold truncate">{promotion.products?.name || 'Unknown Product'}</h4>
                <p className="text-[10px] text-muted-foreground capitalize">{promotion.slot_type.replace('_', ' ')}</p>
              </div>
              <Badge variant="outline" className={cn('text-[10px] shrink-0', config.className)}>
                {config.label}
              </Badge>
            </div>

            {/* Stats row */}
            <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-2">
              <span className="flex items-center gap-1">
                <Eye className="h-3 w-3" /> {promotion.impressions.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <MousePointerClick className="h-3 w-3" /> {promotion.clicks.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> {ctr}% CTR
              </span>
              <span className="ml-auto font-semibold text-foreground">
                £{Number(promotion.current_bid).toFixed(0)}/wk
              </span>
            </div>

            {/* Re-bid input */}
            {showRebid && (
              <div className="space-y-1.5 mt-2">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={Math.max(promotion.max_bid + 1, 5)}
                    max={500}
                    value={newBid}
                    onChange={(e) => setNewBid(Math.max(5, parseInt(e.target.value) || 5))}
                    className="h-6 w-20 text-xs"
                    placeholder="New bid"
                  />
                  <Button
                    variant="default"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateStatus.mutate({ newStatus: 'pending_auction', bidAmount: newBid })}
                    disabled={updateStatus.isPending || newBid < 5 || rebidExceedsBalance}
                  >
                    Confirm
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => setShowRebid(false)}
                  >
                    Cancel
                  </Button>
                </div>
                {rebidExceedsBalance && (
                  <p className="flex items-center gap-1 text-[10px] text-destructive">
                    <AlertTriangle className="h-3 w-3" />
                    Insufficient credits (£{balance.toFixed(0)} available)
                  </p>
                )}
              </div>
            )}

            {/* Actions */}
            {!showRebid && ['active', 'pending_auction', 'paused', 'outbid'].includes(promotion.status) && (
              <div className="flex items-center gap-1.5 mt-2">
                {promotion.status === 'active' || promotion.status === 'pending_auction' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateStatus.mutate({ newStatus: 'paused' })}
                    disabled={updateStatus.isPending}
                  >
                    <Pause className="h-3 w-3 mr-1" /> Pause
                  </Button>
                ) : promotion.status === 'outbid' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-primary"
                    onClick={() => setShowRebid(true)}
                    disabled={updateStatus.isPending}
                  >
                    <Play className="h-3 w-3 mr-1" /> Re-bid
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateStatus.mutate({ newStatus: 'pending_auction' })}
                    disabled={updateStatus.isPending}
                  >
                    <Play className="h-3 w-3 mr-1" /> Resume
                  </Button>
                )}
                {promotion.status !== 'active' && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                    onClick={() => updateStatus.mutate({ newStatus: 'cancelled' })}
                    disabled={updateStatus.isPending}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
