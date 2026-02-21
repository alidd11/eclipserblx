import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useCredits } from '@/hooks/useCredits';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PromotionCard } from '@/components/seller/PromotionCard';
import { CreatePromotionDialog } from '@/components/seller/CreatePromotionDialog';
import { Megaphone, Plus, Coins, Eye, MousePointerClick, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function SellerPromotions() {
  const { user } = useAuth();
  const { balance } = useCredits();
  const [createOpen, setCreateOpen] = useState(false);

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

  const activePromotions = promotions?.filter(p => p.status === 'active') || [];
  const pendingPromotions = promotions?.filter(p => p.status === 'pending_auction') || [];
  const pastPromotions = promotions?.filter(p => ['outbid', 'expired', 'cancelled', 'paused'].includes(p.status)) || [];

  const totalImpressions = promotions?.reduce((s, p) => s + (p.impressions || 0), 0) || 0;
  const totalClicks = promotions?.reduce((s, p) => s + (p.clicks || 0), 0) || 0;
  const avgCtr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Promotions
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Boost your products to premium marketplace positions
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4 mr-1" /> New Promotion
          </Button>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Megaphone className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{activePromotions.length}</p>
                <p className="text-[10px] text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted">
                <Eye className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold">{totalImpressions.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Impressions</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-muted">
                <MousePointerClick className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-lg font-bold">{totalClicks.toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground">Clicks</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Coins className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-lg font-bold">£{balance.toFixed(0)}</p>
                <p className="text-[10px] text-muted-foreground">
                  Credits{' '}
                  <Link to="/wallet" className="text-primary hover:underline">Top up</Link>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* How it works */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-2">How Promotions Work</h3>
            <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
              <li>Choose a product and promotion slot (Featured or Category Spotlight)</li>
              <li>Set a weekly bid in Eclipse Credits (minimum 5 credits)</li>
              <li>Every Monday, the highest bidders win their slots — credits are deducted</li>
              <li>Your product gets premium visibility and you earn analytics on performance</li>
            </ol>
          </CardContent>
        </Card>

        {/* Promotions list */}
        <Tabs defaultValue="active">
          <TabsList className="w-full">
            <TabsTrigger value="active" className="flex-1">Active ({activePromotions.length})</TabsTrigger>
            <TabsTrigger value="pending" className="flex-1">Pending ({pendingPromotions.length})</TabsTrigger>
            <TabsTrigger value="past" className="flex-1">Past ({pastPromotions.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="active" className="space-y-3 mt-3">
            {activePromotions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No active promotions. Create one to get started!</CardContent></Card>
            ) : (
              activePromotions.map(p => <PromotionCard key={p.id} promotion={p} />)
            )}
          </TabsContent>

          <TabsContent value="pending" className="space-y-3 mt-3">
            {pendingPromotions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No pending bids.</CardContent></Card>
            ) : (
              pendingPromotions.map(p => <PromotionCard key={p.id} promotion={p} />)
            )}
          </TabsContent>

          <TabsContent value="past" className="space-y-3 mt-3">
            {pastPromotions.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">No past promotions.</CardContent></Card>
            ) : (
              pastPromotions.map(p => <PromotionCard key={p.id} promotion={p} />)
            )}
          </TabsContent>
        </Tabs>

        <CreatePromotionDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </SellerLayout>
  );
}
