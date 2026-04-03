import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ChevronDown, MousePointerClick, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CampaignAnalytics } from './CampaignAnalytics';
import { TableRow, TableCell } from '@/components/ui/table';

interface Campaign {
  id: string;
  campaign_name: string | null;
  product_id: string;
  status: string;
  impressions: number;
  clicks: number;
  total_spent: number;
  total_budget: number;
  pricing_model: string;
  cpc_bid: number | null;
  cpm_bid: number | null;
  goal: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  placement_zones: string[] | null;
  products?: { name: string; images: string[] | null; slug: string } | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: { label: 'Active', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' },
  pending_auction: { label: 'In Review', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20' },
  scheduled: { label: 'Scheduled', className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  paused: { label: 'Paused', className: 'bg-muted text-muted-foreground border-border' },
  outbid: { label: 'Outbid', className: 'bg-red-500/10 text-red-500 border-red-500/20' },
  expired: { label: 'Completed', className: 'bg-muted text-muted-foreground border-border' },
  cancelled: { label: 'Cancelled', className: 'bg-muted text-muted-foreground border-border' },
};

export function CampaignRow({ campaign }: { campaign: Campaign }) {
  const [expanded, setExpanded] = useState(false);
  const queryClient = useQueryClient();

  const ctr = campaign.impressions > 0
    ? ((campaign.clicks / campaign.impressions) * 100).toFixed(1)
    : '0.0';

  const costPerResult = campaign.pricing_model === 'cpc'
    ? (campaign.clicks > 0 ? (Number(campaign.total_spent || 0) / campaign.clicks).toFixed(2) : '—')
    : (campaign.impressions > 0 ? ((Number(campaign.total_spent || 0) / campaign.impressions) * 1000).toFixed(2) : '—');

  const config = statusConfig[campaign.status] || statusConfig.pending_auction;
  const isToggleable = ['active', 'paused', 'pending_auction'].includes(campaign.status);
  const budgetPercent = campaign.total_budget > 0
    ? Math.min(100, (Number(campaign.total_spent || 0) / campaign.total_budget) * 100)
    : 0;

  const toggleStatus = useMutation({
    mutationFn: async () => {
      const newStatus = campaign.status === 'paused' ? 'active' : 'paused';
      const updates: Record<string, unknown> = { status: newStatus, updated_at: new Date().toISOString() };
      if (newStatus === 'paused') updates.paused_at = new Date().toISOString();
      else updates.paused_at = null;

      const { error } = await supabase
        .from('product_promotions')
        .update(updates)
        .eq('id', campaign.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-promotions'] });
      toast.success('Campaign updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <TableCell className="py-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-muted overflow-hidden shrink-0">
              {campaign.products?.images?.[0] ? (
                <img src={campaign.products.images[0]} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {campaign.campaign_name || campaign.products?.name || 'Untitled'}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  {campaign.pricing_model === 'cpc' ? (
                    <><MousePointerClick className="h-2 w-2 mr-0.5" />CPC</>
                  ) : (
                    <><Eye className="h-2 w-2 mr-0.5" />CPM</>
                  )}
                </Badge>
                <span className="text-[10px] text-muted-foreground capitalize">
                  {campaign.goal}
                </span>
              </div>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <Badge variant="outline" className={cn('text-[10px]', config.className)}>
            {config.label}
          </Badge>
        </TableCell>
        <TableCell>
          <div className="space-y-1">
            <p className="text-sm">£{Number(campaign.total_spent || 0).toFixed(0)}<span className="text-muted-foreground text-[10px]"> / £{campaign.total_budget}</span></p>
            <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  budgetPercent >= 90 ? "bg-destructive" : budgetPercent >= 60 ? "bg-amber-500" : "bg-emerald-500"
                )}
                style={{ width: `${budgetPercent}%` }}
              />
            </div>
          </div>
        </TableCell>
        <TableCell className="text-sm">{campaign.impressions.toLocaleString()}</TableCell>
        <TableCell className="text-sm">{campaign.clicks.toLocaleString()}</TableCell>
        <TableCell className="text-sm">
          {costPerResult !== '—' ? `£${costPerResult}` : '—'}
        </TableCell>
        <TableCell className="text-sm">{ctr}%</TableCell>
        <TableCell onClick={e => e.stopPropagation()}>
          {isToggleable && (
            <Switch
              checked={campaign.status !== 'paused'}
              onCheckedChange={() => toggleStatus.mutate()}
              disabled={toggleStatus.isPending}
            />
          )}
        </TableCell>
        <TableCell>
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            expanded && "rotate-180"
          )} />
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={9} className="p-0">
            <CampaignAnalytics
              campaignId={campaign.id}
              productSlug={campaign.products?.slug}
              startedAt={campaign.started_at}
              expiresAt={campaign.expires_at}
            />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}
