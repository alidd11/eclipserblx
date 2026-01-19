import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BadgePercent, Loader2, Save, DollarSign, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAffiliateSettings } from '@/hooks/useAffiliateSettings';

export function AffiliateSettingsCard() {
  const queryClient = useQueryClient();
  const { settings, isLoading } = useAffiliateSettings();
  
  const [commissionRate, setCommissionRate] = useState('10');
  const [minimumPayout, setMinimumPayout] = useState('10');

  // Sync form with loaded settings
  useEffect(() => {
    if (settings) {
      setCommissionRate(String(settings.commissionRate));
      setMinimumPayout(String(settings.minimumPayout));
    }
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const updates = [
        { key: 'affiliate_commission_rate', value: commissionRate },
        { key: 'affiliate_minimum_payout', value: minimumPayout },
      ];

      for (const { key, value } of updates) {
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('settings')
            .update({ value: JSON.stringify(value) })
            .eq('key', key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('settings')
            .insert([{ key, value: JSON.stringify(value) }]);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['affiliate-settings'] });
      toast.success('Affiliate settings saved');
    },
    onError: (error) => {
      console.error('Failed to save affiliate settings:', error);
      toast.error('Failed to save settings');
    },
  });

  const handleSave = () => {
    const rate = parseFloat(commissionRate);
    const payout = parseFloat(minimumPayout);

    if (isNaN(rate) || rate < 0 || rate > 100) {
      toast.error('Commission rate must be between 0 and 100');
      return;
    }

    if (isNaN(payout) || payout < 1) {
      toast.error('Minimum payout must be at least £1');
      return;
    }

    saveMutation.mutate();
  };

  if (isLoading) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <BadgePercent className="h-5 w-5 text-primary" />
          <CardTitle>Affiliate Program Settings</CardTitle>
        </div>
        <CardDescription>
          Configure commission rates and payout thresholds for the affiliate program.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="commission_rate" className="flex items-center gap-2">
              <BadgePercent className="h-4 w-4 text-muted-foreground" />
              Commission Rate (%)
            </Label>
            <div className="relative">
              <Input
                id="commission_rate"
                type="number"
                min="0"
                max="100"
                step="0.5"
                value={commissionRate}
                onChange={(e) => setCommissionRate(e.target.value)}
                className="pr-8"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Percentage of order total given to affiliates
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="minimum_payout" className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              Minimum Payout (£)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
              <Input
                id="minimum_payout"
                type="number"
                min="1"
                step="1"
                value={minimumPayout}
                onChange={(e) => setMinimumPayout(e.target.value)}
                className="pl-7"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Minimum balance required to request a payout
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <Settings className="h-5 w-5 text-muted-foreground shrink-0" />
          <p className="text-sm text-muted-foreground">
            Changes will apply to new commissions. Existing commissions use the rate at the time of sale.
          </p>
        </div>

        <Button 
          onClick={handleSave} 
          disabled={saveMutation.isPending}
          className="w-full sm:w-auto"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
