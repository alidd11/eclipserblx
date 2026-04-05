import { useState } from 'react';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';
import { Target, Plus, Trophy, TrendingUp, Calendar, Trash2 } from 'lucide-react';

export default function SellerGoals() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    target_amount: 100,
    goal_type: 'revenue',
    period: 'monthly',
  });

  const { data: goals, isLoading } = useQuery({
    queryKey: ['seller-goals', store?.id],
    queryFn: async () => {
      if (!store?.id) return [];

      // Get goals
      const { data: goalsData } = await supabase
        .from('seller_goals')
        .select('*')
        .eq('store_id', store.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (!goalsData?.length) return [];

      // Get current progress for each goal
      const enriched = await Promise.all(goalsData.map(async (goal: any) => {
        let currentAmount = 0;
        const since = goal.starts_at;
        const until = goal.ends_at;

        if (goal.goal_type === 'revenue') {
          const { data: txs } = await supabase
            .from('seller_transactions')
            .select('net_amount')
            .eq('store_id', store.id)
            .eq('type', 'sale')
            .is('refunded_at', null)
            .gte('created_at', since)
            .lte('created_at', until);
          currentAmount = txs?.reduce((s, t) => s + Number(t.net_amount || 0), 0) || 0;
        } else {
          const { count } = await supabase
            .from('seller_transactions')
            .select('id', { count: 'exact', head: true })
            .eq('store_id', store.id)
            .eq('type', 'sale')
            .is('refunded_at', null)
            .gte('created_at', since)
            .lte('created_at', until);
          currentAmount = count || 0;
        }

        return { ...goal, current_amount: currentAmount };
      }));

      return enriched;
    },
    enabled: !!store?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('No store');
      
      const now = new Date();
      let starts_at = now;
      let ends_at: Date;

      if (newGoal.period === 'weekly') {
        ends_at = new Date(now.getTime() + 7 * 86400000);
      } else if (newGoal.period === 'quarterly') {
        ends_at = new Date(now.getTime() + 90 * 86400000);
      } else {
        ends_at = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      const { error } = await supabase.from('seller_goals').insert({
        store_id: store.id,
        title: newGoal.title,
        target_amount: newGoal.target_amount,
        goal_type: newGoal.goal_type,
        period: newGoal.period,
        starts_at: starts_at.toISOString(),
        ends_at: ends_at.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Goal created!');
      queryClient.invalidateQueries({ queryKey: ['seller-goals'] });
      setShowCreate(false);
      setNewGoal({ title: '', target_amount: 100, goal_type: 'revenue', period: 'monthly' });
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('seller_goals').update({ is_active: false }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Goal removed');
      queryClient.invalidateQueries({ queryKey: ['seller-goals'] });
    },
  });

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold flex items-center gap-2">
              <Target className="h-6 w-6" />
              Sales Goals
            </h1>
            <p className="text-muted-foreground text-sm">Set targets and track your progress</p>
          </div>
          <Dialog open={showCreate} onOpenChange={setShowCreate}>
            <DialogTrigger asChild>
              <Button className="gradient-button border-0">
                <Plus className="mr-2 h-4 w-4" />
                New Goal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Sales Goal</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Goal Title</Label>
                  <Input
                    placeholder="e.g. Hit £500 this month"
                    value={newGoal.title}
                    onChange={e => setNewGoal(p => ({ ...p, title: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Type</Label>
                    <Select value={newGoal.goal_type} onValueChange={v => setNewGoal(p => ({ ...p, goal_type: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="revenue">Revenue (£)</SelectItem>
                        <SelectItem value="orders">Order Count</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Period</Label>
                    <Select value={newGoal.period} onValueChange={v => setNewGoal(p => ({ ...p, period: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label>Target {newGoal.goal_type === 'revenue' ? '(£)' : '(orders)'}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={newGoal.target_amount}
                    onChange={e => setNewGoal(p => ({ ...p, target_amount: Number(e.target.value) }))}
                  />
                </div>
                <Button
                  className="w-full gradient-button border-0"
                  disabled={!newGoal.title || createMutation.isPending}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Goal'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2].map(i => <Skeleton key={i} className="h-32 rounded-lg" />)}
          </div>
        ) : goals?.length === 0 ? (
          <div className="border border-border rounded-xl py-12 text-center">
            <Target className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No active goals. Set your first sales target!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals?.map((goal: any) => {
              const progress = Math.min(100, (goal.current_amount / goal.target_amount) * 100);
              const daysLeft = Math.max(0, differenceInDays(new Date(goal.ends_at), new Date()));
              const achieved = goal.current_amount >= goal.target_amount;

              return (
                <div key={goal.id} className={`border border-border rounded-xl p-5 ${achieved ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {achieved ? (
                            <Trophy className="h-5 w-5 text-yellow-400" />
                          ) : (
                            <TrendingUp className="h-5 w-5 text-primary" />
                          )}
                          <h3 className="font-semibold">{goal.title}</h3>
                          <Badge variant="outline" className="text-xs capitalize">{goal.period}</Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => deleteMutation.mutate(goal.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            {goal.goal_type === 'revenue'
                              ? `£${goal.current_amount.toFixed(2)} / £${goal.target_amount.toFixed(2)}`
                              : `${goal.current_amount} / ${goal.target_amount} orders`}
                          </span>
                          <span className="font-bold">{progress.toFixed(0)}%</span>
                        </div>
                        <Progress value={progress} className="h-2.5" />
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {daysLeft} day{daysLeft !== 1 ? 's' : ''} left
                        </span>
                        <span>
                          Ends {format(new Date(goal.ends_at), 'MMM d, yyyy')}
                        </span>
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
