import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, formatDistanceToNow, isPast, isFuture } formatRelative } from '@/lib/dateUtils';
import { Calendar, Clock, Percent, Plus, Trash2, Megaphone, Timer } from 'lucide-react';

export default function SellerCampaigns() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newCampaign, setNewCampaign] = useState({
    name: '',
    discount_percent: 10,
    starts_at: '',
    ends_at: '',
    apply_to_all: true,
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['seller-campaigns', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];
      const { data } = await supabase
        .from('seller_campaigns')
        .select('*')
        .eq('store_id', store.id)
        .order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!store?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store');
      const { error } = await supabase.from('seller_campaigns').insert({
        store_id: store.id,
        name: newCampaign.name,
        discount_percent: newCampaign.discount_percent,
        starts_at: new Date(newCampaign.starts_at).toISOString(),
        ends_at: new Date(newCampaign.ends_at).toISOString(),
        apply_to_all: newCampaign.apply_to_all,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campaign created!');
      queryClient.invalidateQueries({ queryKey: ['seller-campaigns'] });
      setShowCreate(false);
      setNewCampaign({ name: '', discount_percent: 10, starts_at: '', ends_at: '', apply_to_all: true });
    },
    onError: (e) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('seller_campaigns')
        .update({ is_active })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['seller-campaigns'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seller_campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campaign deleted');
      queryClient.invalidateQueries({ queryKey: ['seller-campaigns'] });
    },
  });

  const getCampaignStatus = (campaign: { is_active: boolean; starts_at: string; ends_at: string }) => {
    if (!campaign.is_active) return { label: 'Paused', variant: 'secondary' as const };
    if (isFuture(new Date(campaign.starts_at))) return { label: 'Scheduled', variant: 'outline' as const };
    if (isPast(new Date(campaign.ends_at))) return { label: 'Ended', variant: 'secondary' as const };
    return { label: 'Active', variant: 'default' as const };
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold">Discount Campaigns</h1>
            <p className="text-muted-foreground text-sm">Schedule time-limited discounts across your store</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Campaign
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Discount Campaign</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Campaign Name</Label>
                  <Input
                    placeholder="e.g. Summer Sale"
                    value={newCampaign.name}
                    onChange={e => setNewCampaign(p => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Discount (%)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={80}
                    value={newCampaign.discount_percent}
                    onChange={e => setNewCampaign(p => ({ ...p, discount_percent: Number(e.target.value) }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start Date</Label>
                    <Input
                      type="datetime-local"
                      value={newCampaign.starts_at}
                      onChange={e => setNewCampaign(p => ({ ...p, starts_at: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="datetime-local"
                      value={newCampaign.ends_at}
                      onChange={e => setNewCampaign(p => ({ ...p, ends_at: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={newCampaign.apply_to_all}
                    onCheckedChange={v => setNewCampaign(p => ({ ...p, apply_to_all: v }))}
                  />
                  <Label>Apply to all products</Label>
                </div>
                <Button
                  className="w-full"
                  disabled={!newCampaign.name || !newCampaign.starts_at || !newCampaign.ends_at || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Campaign'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-lg" />)}
          </div>
        ) : campaigns?.length === 0 ? (
          <div className="border border-border rounded-xl py-12 text-center">
            <Megaphone className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No campaigns yet. Create your first discount campaign!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {campaigns?.map((campaign) => {
              const status = getCampaignStatus(campaign);
              const isLive = status.label === 'Active';
              return (
                <div key={campaign.id} className={`border border-border rounded-xl p-4 ${isLive ? 'border-primary/30' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-sm">{campaign.name}</h3>
                          <Badge variant={status.variant}>{status.label}</Badge>
                          <Badge variant="outline" className="text-xs">
                            <Percent className="h-3 w-3 mr-0.5" />
                            {campaign.discount_percent}% off
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(campaign.starts_at), 'MMM d')} — {format(new Date(campaign.ends_at), 'MMM d, yyyy')}
                          </span>
                          {isLive && (
                            <span className="flex items-center gap-1 text-primary">
                              <Timer className="h-3 w-3" />
                              Ends {formatRelative(campaign.ends_at)}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={campaign.is_active}
                          onCheckedChange={v => toggleMutation.mutate({ id: campaign.id, is_active: v })}
                        />
                        <Button
                          variant="ghost"
                          size="icon" aria-label="Delete"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(campaign.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SellerLayout>
  );
}
