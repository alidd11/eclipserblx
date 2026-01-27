import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { 
  Gamepad2,
  Users,
  Crown,
  Ticket,
  Save,
  CheckCircle,
  ExternalLink,
  AlertCircle,
  Percent,
  Info
} from 'lucide-react';
import { toast } from 'sonner';
import { useFormPersistence } from '@/hooks/useFormPersistence';

const INITIAL_FORM_DATA = {
  roblox_url: '',
  roblox_group_id: '',
  roblox_group_discount_enabled: false,
  roblox_group_discount_percent: 10,
  roblox_group_min_rank: 1,
  roblox_premium_discount_enabled: false,
  roblox_premium_discount_percent: 5,
  roblox_gamepass_id: '',
  roblox_gamepass_discount_enabled: false,
  roblox_gamepass_discount_percent: 15,
};

export default function SellerSettingsRoblox() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  const [formData, setFormData, clearFormData] = useFormPersistence(
    'seller-settings-roblox',
    INITIAL_FORM_DATA
  );

  useEffect(() => {
    if (store) {
      setFormData({
        roblox_url: (store as any).roblox_url || '',
        roblox_group_id: (store as any).roblox_group_id || '',
        roblox_group_discount_enabled: (store as any).roblox_group_discount_enabled || false,
        roblox_group_discount_percent: (store as any).roblox_group_discount_percent || 10,
        roblox_group_min_rank: (store as any).roblox_group_min_rank || 1,
        roblox_premium_discount_enabled: (store as any).roblox_premium_discount_enabled || false,
        roblox_premium_discount_percent: (store as any).roblox_premium_discount_percent || 5,
        roblox_gamepass_id: (store as any).roblox_gamepass_id || '',
        roblox_gamepass_discount_enabled: (store as any).roblox_gamepass_discount_enabled || false,
        roblox_gamepass_discount_percent: (store as any).roblox_gamepass_discount_percent || 15,
      });
    }
  }, [store]);

  const updateStore = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) throw new Error('No store found');
      
      const { error } = await supabase
        .from('stores')
        .update({
          roblox_url: data.roblox_url || null,
          roblox_group_id: data.roblox_group_id || null,
          roblox_group_discount_enabled: data.roblox_group_discount_enabled,
          roblox_group_discount_percent: data.roblox_group_discount_percent,
          roblox_group_min_rank: data.roblox_group_min_rank,
          roblox_premium_discount_enabled: data.roblox_premium_discount_enabled,
          roblox_premium_discount_percent: data.roblox_premium_discount_percent,
          roblox_gamepass_id: data.roblox_gamepass_id || null,
          roblox_gamepass_discount_enabled: data.roblox_gamepass_discount_enabled,
          roblox_gamepass_discount_percent: data.roblox_gamepass_discount_percent,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Roblox settings updated successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => {
      toast.error('Failed to update settings: ' + error.message);
    },
  });

  const handleSubmit = () => {
    updateStore.mutate(formData);
  };

  const extractGroupId = (url: string): string | null => {
    const match = url.match(/groups\/(\d+)/);
    return match ? match[1] : null;
  };

  const handleRobloxUrlChange = (url: string) => {
    setFormData(prev => ({ ...prev, roblox_url: url }));
    
    // Auto-extract group ID if it's a group URL
    if (url.includes('roblox.com/groups/')) {
      const groupId = extractGroupId(url);
      if (groupId && !formData.roblox_group_id) {
        setFormData(prev => ({ ...prev, roblox_group_id: groupId }));
      }
    }
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Roblox Settings</h1>
          <p className="text-muted-foreground">
            Configure Roblox integrations and customer rewards for your store
          </p>
        </div>

        <div className="space-y-6">
          {/* Roblox Game/Group Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gamepad2 className="h-5 w-5 text-red-500" />
                Roblox Game/Group
              </CardTitle>
              <CardDescription>
                Link your Roblox game or group to display on your store page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="roblox_url" className="flex items-center gap-2">
                  Roblox URL
                </Label>
                <Input
                  id="roblox_url"
                  value={formData.roblox_url}
                  onChange={(e) => handleRobloxUrlChange(e.target.value)}
                  placeholder="https://www.roblox.com/games/... or https://www.roblox.com/groups/..."
                />
                <p className="text-xs text-muted-foreground">
                  This link will be displayed on your store page for customers to visit.
                </p>
              </div>

              {formData.roblox_url && (
                <div className="flex items-center gap-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-red-500" />
                  <div>
                    <p className="text-sm font-medium">Roblox Link Configured</p>
                    <p className="text-xs text-muted-foreground">
                      Customers can visit your Roblox presence from your store page
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Group Member Discounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-500" />
                Group Member Discounts
              </CardTitle>
              <CardDescription>
                Reward customers who are members of your Roblox group with automatic discounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">How it works</p>
                  <p className="text-xs text-muted-foreground">
                    Customers with linked Roblox accounts who are members of your group will automatically receive the discount at checkout.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roblox_group_id">Group ID</Label>
                  <Input
                    id="roblox_group_id"
                    value={formData.roblox_group_id}
                    onChange={(e) => setFormData({ ...formData, roblox_group_id: e.target.value })}
                    placeholder="12345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your group's URL: roblox.com/groups/<strong>12345678</strong>/...
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Group Discount</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically apply discounts to group members
                    </p>
                  </div>
                  <Switch
                    checked={formData.roblox_group_discount_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, roblox_group_discount_enabled: checked })}
                    disabled={!formData.roblox_group_id}
                  />
                </div>

                {formData.roblox_group_discount_enabled && (
                  <div className="space-y-4 pl-4 border-l-2 border-blue-500/30">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Percent className="h-4 w-4" />
                          Discount Amount
                        </Label>
                        <span className="text-lg font-bold text-blue-500">
                          {formData.roblox_group_discount_percent}%
                        </span>
                      </div>
                      <Slider
                        value={[formData.roblox_group_discount_percent]}
                        onValueChange={([value]) => setFormData({ ...formData, roblox_group_discount_percent: value })}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="roblox_group_min_rank">Minimum Rank Required</Label>
                      <Input
                        id="roblox_group_min_rank"
                        type="number"
                        min={1}
                        max={255}
                        value={formData.roblox_group_min_rank}
                        onChange={(e) => setFormData({ ...formData, roblox_group_min_rank: parseInt(e.target.value) || 1 })}
                      />
                      <p className="text-xs text-muted-foreground">
                        Set to 1 for all members. Higher values require specific roles in your group.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {formData.roblox_group_id && formData.roblox_group_discount_enabled && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Group Discount Active</p>
                    <p className="text-xs text-muted-foreground">
                      Group members with rank {formData.roblox_group_min_rank}+ get {formData.roblox_group_discount_percent}% off
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Roblox Premium Discounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" />
                Premium User Discounts
              </CardTitle>
              <CardDescription>
                Reward customers who have Roblox Premium with exclusive discounts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable Premium Discount</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically apply discounts to Roblox Premium users
                  </p>
                </div>
                <Switch
                  checked={formData.roblox_premium_discount_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, roblox_premium_discount_enabled: checked })}
                />
              </div>

              {formData.roblox_premium_discount_enabled && (
                <div className="space-y-3 pl-4 border-l-2 border-amber-500/30">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Percent className="h-4 w-4" />
                      Discount Amount
                    </Label>
                    <span className="text-lg font-bold text-amber-500">
                      {formData.roblox_premium_discount_percent}%
                    </span>
                  </div>
                  <Slider
                    value={[formData.roblox_premium_discount_percent]}
                    onValueChange={([value]) => setFormData({ ...formData, roblox_premium_discount_percent: value })}
                    min={1}
                    max={50}
                    step={1}
                    className="w-full"
                  />
                </div>
              )}

              {formData.roblox_premium_discount_enabled && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="text-sm font-medium">Premium Discount Active</p>
                    <p className="text-xs text-muted-foreground">
                      Roblox Premium users get {formData.roblox_premium_discount_percent}% off
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gamepass Rewards */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ticket className="h-5 w-5 text-purple-500" />
                Gamepass Owner Discounts
              </CardTitle>
              <CardDescription>
                Reward customers who own a specific gamepass from your game
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                <Info className="h-5 w-5 text-purple-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">VIP Gamepass Integration</p>
                  <p className="text-xs text-muted-foreground">
                    Perfect for rewarding your VIP gamepass owners with exclusive website discounts.
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="roblox_gamepass_id">Gamepass ID</Label>
                  <Input
                    id="roblox_gamepass_id"
                    value={formData.roblox_gamepass_id}
                    onChange={(e) => setFormData({ ...formData, roblox_gamepass_id: e.target.value })}
                    placeholder="12345678"
                  />
                  <p className="text-xs text-muted-foreground">
                    Found in your gamepass's URL or in Game Settings → Passes.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Gamepass Discount</Label>
                    <p className="text-xs text-muted-foreground">
                      Automatically apply discounts to gamepass owners
                    </p>
                  </div>
                  <Switch
                    checked={formData.roblox_gamepass_discount_enabled}
                    onCheckedChange={(checked) => setFormData({ ...formData, roblox_gamepass_discount_enabled: checked })}
                    disabled={!formData.roblox_gamepass_id}
                  />
                </div>

                {formData.roblox_gamepass_discount_enabled && (
                  <div className="space-y-3 pl-4 border-l-2 border-purple-500/30">
                    <div className="flex items-center justify-between">
                      <Label className="flex items-center gap-2">
                        <Percent className="h-4 w-4" />
                        Discount Amount
                      </Label>
                      <span className="text-lg font-bold text-purple-500">
                        {formData.roblox_gamepass_discount_percent}%
                      </span>
                    </div>
                    <Slider
                      value={[formData.roblox_gamepass_discount_percent]}
                      onValueChange={([value]) => setFormData({ ...formData, roblox_gamepass_discount_percent: value })}
                      min={1}
                      max={50}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>

              {formData.roblox_gamepass_id && formData.roblox_gamepass_discount_enabled && (
                <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <div>
                    <p className="text-sm font-medium">Gamepass Discount Active</p>
                    <p className="text-xs text-muted-foreground">
                      Gamepass owners get {formData.roblox_gamepass_discount_percent}% off
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* How to Find IDs */}
          <Card className="border-muted">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertCircle className="h-5 w-5" />
                How to Find Roblox IDs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1">Group ID</h4>
                  <p className="text-xs text-muted-foreground">
                    Go to your group page and copy the number from the URL:<br />
                    roblox.com/groups/<strong className="text-foreground">12345678</strong>/Group-Name
                  </p>
                </div>
                <Separator />
                <div>
                  <h4 className="font-medium text-sm mb-1">Gamepass ID</h4>
                  <p className="text-xs text-muted-foreground">
                    Open your game in Roblox Studio → Configure Game → Passes → Click the pass → Copy ID
                  </p>
                </div>
              </div>
              <a 
                href="https://create.roblox.com/dashboard/creations" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-primary hover:underline mt-3"
              >
                Open Roblox Creator Dashboard
                <ExternalLink className="h-3 w-3 ml-1" />
              </a>
            </CardContent>
          </Card>

          {/* Save Button */}
          <Button 
            onClick={handleSubmit}
            disabled={updateStore.isPending}
            className="w-full"
            size="lg"
          >
            <Save className="h-4 w-4 mr-2" />
            {updateStore.isPending ? 'Saving...' : 'Save All Roblox Settings'}
          </Button>
        </div>
      </div>
    </SellerLayout>
  );
}
