import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CampaignRow } from '@/components/seller/CampaignRow';
import { CreateCampaignWizard } from '@/components/seller/CreateCampaignWizard';
import { Megaphone, Plus, Coins, Eye, MousePointerClick, TrendingUp, ArrowLeft, Receipt } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { format, subDays } from '@/lib/dateUtils';
import { formatGBP } from '@/lib/formatters';

type DateRange = '7d' | '30d' | 'all';

export default function SellerPromotions() {
  const { user } = useAuth();
  const { balance } = useCredits();
  const [showCreate, setShowCreate] = useState(false);
  const [dateRange, setDateRange] = useState<DateRange>('30d');

  const { data: promotions, isLoading } = useQuery({
    queryKey: ['seller-promotions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('product_promotions')
        .select('*, products(name, images, slug)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Filter by date range
  const filtered = promotions?.filter(p => {
    if (dateRange === 'all') return true;
    const days = dateRange === '7d' ? 7 : 30;
    return new Date(p.created_at) >= subDays(new Date(), days);
  }) || [];

  const activeCampaigns = filtered.filter(p => p.status === 'active');
  const pendingCampaigns = filtered.filter(p => ['scheduled', 'in_review'].includes(p.status));
  const pastCampaigns = filtered.filter(p => ['expired', 'cancelled', 'paused'].includes(p.status));

  const totalSpent = filtered.reduce((s, p) => s + Number(p.total_spent || 0), 0);
  const totalImpressions = filtered.reduce((s, p) => s + (p.impressions || 0), 0);
  const totalClicks = filtered.reduce((s, p) => s + (p.clicks || 0), 0);
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  // Credit transaction history (billing tab)
  const { data: creditHistory } = useQuery({
    queryKey: ['ad-credit-history', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('credit_transactions')
        .select('*')
        .eq('user_id', user.id)
        .or('description.ilike.%Ad click%,description.ilike.%Ad CPM%,description.ilike.%promotion%')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) return [];
      return data || [];
    },
    enabled: !!user,
  });

  if (showCreate) {
    return (
      <SellerLayout>
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center gap-2 mb-5">
            <Button variant="ghost" size="icon" aria-label="Go back" className="h-8 w-8" onClick={() => setShowCreate(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-bold">Create Campaign</h1>
          </div>
          <CreateCampaignWizard onClose={() => setShowCreate(false)} />
        </div>
      </SellerLayout>
    );
  }

  return (
    <SellerLayout>
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Ad Manager
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Create and manage advertising campaigns for your products
            </p>
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> Create Campaign
          </Button>
        </div>

        {/* Date range filter */}
        <div className="flex items-center gap-1.5">
          {(['7d', '30d', 'all'] as const).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className={cn(
                "px-3 py-1 rounded-full text-xs font-medium transition-all",
                dateRange === r
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              )}
            >
              {r === '7d' ? '7 Days' : r === '30d' ? '30 Days' : 'All Time'}
            </button>
          ))}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Amount Spent', value: `£${totalSpent.toFixed(0)}`, icon: Coins, color: 'text-amber-500', bg: 'bg-amber-500/10' },
            { label: 'Impressions', value: totalImpressions.toLocaleString(), icon: Eye, color: 'text-blue-500', bg: 'bg-blue-500/10' },
            { label: 'Clicks', value: totalClicks.toLocaleString(), icon: MousePointerClick, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
            { label: 'CTR', value: `${avgCtr}%`, icon: TrendingUp, color: 'text-primary', bg: 'bg-primary/10' },
          ].map(m => (
            <div key={m.label}>
              <div className="p-4 p-3 flex items-center gap-3">
                <div className={cn("p-2 rounded-lg", m.bg)}>
                  <m.icon className={cn("h-4 w-4", m.color)} />
                </div>
                <div>
                  <p className="text-lg font-bold">{m.value}</p>
                  <p className="text-[10px] text-muted-foreground">{m.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs: Campaigns + Billing */}
        <Tabs defaultValue="campaigns">
          <TabsList>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="campaigns" className="mt-3">
            <Tabs defaultValue="active">
              <TabsList className="w-full">
                <TabsTrigger value="active" className="flex-1">Active ({activeCampaigns.length})</TabsTrigger>
                <TabsTrigger value="pending" className="flex-1">In Review ({pendingCampaigns.length})</TabsTrigger>
                <TabsTrigger value="past" className="flex-1">Completed ({pastCampaigns.length})</TabsTrigger>
              </TabsList>

              {(['active', 'pending', 'past'] as const).map(tab => {
                const campaigns = tab === 'active' ? activeCampaigns : tab === 'pending' ? pendingCampaigns : pastCampaigns;
                return (
                  <TabsContent key={tab} value={tab} className="mt-3">
                    {campaigns.length === 0 ? (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="p-4 py-10 text-center text-sm text-muted-foreground">
                          {tab === 'active' ? 'No active campaigns. Create one to get started!' :
                           tab === 'pending' ? 'No campaigns in review.' :
                           'No completed campaigns yet.'}
                        </div>
                      </div>
                    ) : (
                      <div className="border border-border rounded-xl overflow-hidden">
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Campaign</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Spent</TableHead>
                                <TableHead>Impr.</TableHead>
                                <TableHead>Clicks</TableHead>
                                <TableHead>CPC</TableHead>
                                <TableHead>CTR</TableHead>
                                <TableHead>On/Off</TableHead>
                                <TableHead className="w-8"></TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {campaigns.map(c => (
                                <CampaignRow key={c.id} campaign={c} />
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                  </TabsContent>
                );
              })}
            </Tabs>
          </TabsContent>

          <TabsContent value="billing" className="mt-3 space-y-4">
            {/* Balance card */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="p-4 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-amber-500/10">
                    <Coins className="h-5 w-5 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-lg font-bold">£{balance.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Available Credits</p>
                  </div>
                </div>
                <Button size="sm" asChild>
                  <Link to="/credits">Top Up</Link>
                </Button>
              </div>
            </div>

            {/* Spend summary */}
            <div className="grid grid-cols-2 gap-3">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-4 p-4">
                  <p className="text-xs text-muted-foreground">This Month</p>
                  <p className="text-xl font-bold mt-1">
                    £{filtered
                      .filter(p => new Date(p.created_at).getMonth() === new Date().getMonth())
                      .reduce((s, p) => s + Number(p.total_spent || 0), 0)
                      .toFixed(0)}
                  </p>
                </div>
              </div>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="p-4 p-4">
                  <p className="text-xs text-muted-foreground">All Time</p>
                  <p className="text-xl font-bold mt-1">
                    £{(promotions || []).reduce((s, p) => s + Number(p.total_spent || 0), 0).toFixed(0)}
                  </p>
                </div>
              </div>
            </div>

            {/* Transaction history */}
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
                <h3 className="font-semibold text-sm text-sm font-semibold flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  Ad Spend History
                </h3>
              </div>
              <div className="p-4 p-0">
                {!creditHistory || creditHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No ad spend transactions yet.</p>
                ) : (
                  <div className="divide-y divide-border">
                    {creditHistory.map((tx) => (
                      <div key={tx.id} className="flex items-center justify-between px-4 py-2.5">
                        <div>
                          <p className="text-sm">{tx.description}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {format(new Date(tx.created_at), 'MMM d, yyyy')}
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-destructive">
                          -£{Math.abs(Number(tx.amount)).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* How it works */}
        <div className="border border-border rounded-xl overflow-hidden border-primary/20 bg-primary/5">
          <div className="p-4 p-4">
            <h3 className="text-sm font-semibold mb-2">How Spend-Based Ads Work</h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Create a campaign — choose CPC (pay per click) or CPM (pay per 1,000 views)</li>
              <li>Set your total budget and optional daily cap — no auctions, no waiting</li>
              <li>Your ad goes live immediately across your selected placements</li>
              <li>Higher bids = more visibility. Budget depletes in real-time as you get results</li>
              <li>Campaign auto-pauses when budget is spent. Top up anytime to resume</li>
            </ol>
          </div>
        </div>
      </div>
    </SellerLayout>
  );
}
