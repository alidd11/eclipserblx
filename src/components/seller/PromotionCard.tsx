import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Eye, MousePointerClick, Pause, Play, X, TrendingUp, Megaphone } from 'lucide-react';
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
  const ctr = promotion.impressions > 0 ? ((promotion.clicks / promotion.impressions) * 100).toFixed(1) : '0.0';
  const config = statusConfig[promotion.status] || statusConfig.pending_auction;

  const updateStatus = useMutation({
    mutationFn: async (newStatus: string) => {
      const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'paused') updates.paused_at = new Date().toISOString();
      if (newStatus === 'pending_auction') updates.paused_at = null;

      const { error } = await supabase
        .from('product_promotions')
        .update(updates)
        .eq('id', promotion.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-promotions'] });
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
              <img src={promotion.products.images[0]} alt="" className="w-full h-full object-cover" />
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

            {/* Actions */}
            {['active', 'pending_auction', 'paused'].includes(promotion.status) && (
              <div className="flex items-center gap-1.5 mt-2">
                {promotion.status === 'active' || promotion.status === 'pending_auction' ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateStatus.mutate('paused')}
                    disabled={updateStatus.isPending}
                  >
                    <Pause className="h-3 w-3 mr-1" /> Pause
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => updateStatus.mutate('pending_auction')}
                    disabled={updateStatus.isPending}
                  >
                    <Play className="h-3 w-3 mr-1" /> Resume
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2 text-destructive hover:text-destructive"
                  onClick={() => updateStatus.mutate('cancelled')}
                  disabled={updateStatus.isPending}
                >
                  <X className="h-3 w-3 mr-1" /> Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
