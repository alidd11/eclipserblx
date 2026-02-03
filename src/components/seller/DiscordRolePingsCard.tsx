import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AtSign, Loader2, Save, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export function DiscordRolePingsCard() {
  const { store } = useSellerStatus();
  const queryClient = useQueryClient();
  
  const [productDropsRoleId, setProductDropsRoleId] = useState('');
  const [earlyProductDropsRoleId, setEarlyProductDropsRoleId] = useState('');

  useEffect(() => {
    if (store?.credentials) {
      setProductDropsRoleId(store.credentials.product_drops_role_id || '');
      setEarlyProductDropsRoleId(store.credentials.early_product_drops_role_id || '');
    }
  }, [store?.credentials]);

  const updateRolePings = useMutation({
    mutationFn: async () => {
      if (!store?.id) throw new Error('Store not found');

      const { error } = await supabase
        .from('store_credentials')
        .update({
          product_drops_role_id: productDropsRoleId.trim() || null,
          early_product_drops_role_id: earlyProductDropsRoleId.trim() || null,
        })
        .eq('store_id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Role pings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update role pings');
    },
  });

  const hasChanges = 
    productDropsRoleId !== (store?.credentials?.product_drops_role_id || '') ||
    earlyProductDropsRoleId !== (store?.credentials?.early_product_drops_role_id || '');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AtSign className="h-5 w-5" />
          Role Pings
        </CardTitle>
        <CardDescription>
          Configure Discord role pings for product announcements
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground">
          <p>
            Enter Discord role IDs to automatically ping when new products are released.
            Right-click a role in Discord → Copy ID to get the role ID.
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="productDropsRoleId">Product Drops Role ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This role will be pinged for all product releases</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="productDropsRoleId"
              value={productDropsRoleId}
              onChange={(e) => setProductDropsRoleId(e.target.value)}
              placeholder="e.g. 1234567890123456789"
              className="font-mono"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="earlyProductDropsRoleId">Early Product Drops Role ID</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>This role will be pinged for early access product releases</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Input
              id="earlyProductDropsRoleId"
              value={earlyProductDropsRoleId}
              onChange={(e) => setEarlyProductDropsRoleId(e.target.value)}
              placeholder="e.g. 1234567890123456789"
              className="font-mono"
            />
          </div>
        </div>

        <Button
          onClick={() => updateRolePings.mutate()}
          disabled={!hasChanges || updateRolePings.isPending}
          className="w-full"
        >
          {updateRolePings.isPending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Role Pings
        </Button>
      </CardContent>
    </Card>
  );
}
