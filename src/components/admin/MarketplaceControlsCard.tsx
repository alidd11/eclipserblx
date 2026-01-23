import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Store, Globe, Eye, EyeOff, Rocket } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function MarketplaceControlsCard() {
  const queryClient = useQueryClient();
  const [isMarketplacePublic, setIsMarketplacePublic] = useState(false);

  // Fetch marketplace public setting
  const { data: marketplaceSetting, isLoading } = useQuery({
    queryKey: ['marketplace-public-setting'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'marketplace_public')
        .maybeSingle();
      
      if (error) throw error;
      const val = data?.value;
      return val === true || val === 'true';
    },
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (marketplaceSetting !== undefined) {
      setIsMarketplacePublic(marketplaceSetting);
    }
  }, [marketplaceSetting]);

  // Toggle marketplace public mutation
  const toggleMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'marketplace_public')
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value: enabled })
          .eq('key', 'marketplace_public');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert({ key: 'marketplace_public', value: enabled });
        if (error) throw error;
      }
    },
    onSuccess: (_, enabled) => {
      setIsMarketplacePublic(enabled);
      queryClient.invalidateQueries({ queryKey: ['marketplace-public-setting'] });
      toast.success(enabled 
        ? 'Marketplace is now public! All users can browse stores.'
        : 'Marketplace is now private. Only sellers and approved users can access.'
      );
    },
    onError: () => {
      toast.error('Failed to update marketplace visibility');
    },
  });

  const handleToggle = (enabled: boolean) => {
    toggleMutation.mutate(enabled);
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Store className="h-5 w-5 text-primary" />
          <CardTitle>Marketplace Controls</CardTitle>
        </div>
        <CardDescription>Control marketplace visibility and access</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Public Release Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isMarketplacePublic ? (
              <Globe className="h-5 w-5 text-green-500" />
            ) : (
              <EyeOff className="h-5 w-5 text-muted-foreground" />
            )}
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Label>Marketplace Public Release</Label>
                {isMarketplacePublic ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                    Live
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Private
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {isMarketplacePublic 
                  ? 'Marketplace is visible to all users'
                  : 'Only sellers and approved users can access the marketplace'
                }
              </p>
            </div>
          </div>
          <Switch
            checked={isMarketplacePublic}
            onCheckedChange={handleToggle}
            disabled={toggleMutation.isPending || isLoading}
          />
        </div>

        {/* Info Box */}
        <div className="rounded-lg bg-muted/50 p-4 space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Rocket className="h-4 w-4 text-primary" />
            Launch Checklist
          </div>
          <ul className="text-sm text-muted-foreground space-y-1 ml-6 list-disc">
            <li>Ensure all seller stores are reviewed and approved</li>
            <li>Test the marketplace with different user roles</li>
            <li>Verify payment processing is working correctly</li>
            <li>Check that all store pages load properly</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
