import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Gamepad2, Users, Crown, Award, Webhook, Loader2, 
  CheckCircle2, XCircle, ExternalLink, Save, Percent,
  Shield, Link2, Copy, Check, Settings, Megaphone
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';
import { Slider } from '@/components/ui/slider';
import { useRobloxSettings } from '@/hooks/useRobloxSettings';

export default function RobloxSettings() {
  const queryClient = useQueryClient();
  const { settings, isLoading, updateSettings } = useRobloxSettings();
  const [isSaving, setIsSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('general');
  
  // Local form state
  const [gameUrl, setGameUrl] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groupDiscountEnabled, setGroupDiscountEnabled] = useState(false);
  const [groupDiscountPercent, setGroupDiscountPercent] = useState(10);
  const [groupMinRank, setGroupMinRank] = useState(1);
  const [premiumDiscountEnabled, setPremiumDiscountEnabled] = useState(false);
  const [premiumDiscountPercent, setPremiumDiscountPercent] = useState(5);
  const [badgeRewardsEnabled, setBadgeRewardsEnabled] = useState(false);
  
  // Tier-specific advertisement subscription settings (Roblox Subscriptions)
  const [adBasicSubscriptionId, setAdBasicSubscriptionId] = useState('');
  const [adBasicRobuxPrice, setAdBasicRobuxPrice] = useState(0);
  const [adProSubscriptionId, setAdProSubscriptionId] = useState('');
  const [adProRobuxPrice, setAdProRobuxPrice] = useState(0);
  const [adPremiumSubscriptionId, setAdPremiumSubscriptionId] = useState('');
  const [adPremiumRobuxPrice, setAdPremiumRobuxPrice] = useState(0);
  
  // Test states
  const [isTestingGroup, setIsTestingGroup] = useState(false);
  const [groupTestResult, setGroupTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingPremium, setIsTestingPremium] = useState(false);
  const [premiumTestResult, setPremiumTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testRobloxId, setTestRobloxId] = useState('');
  
  // Sync form with settings
  useEffect(() => {
    if (!isLoading) {
      setGameUrl(settings.roblox_game_url);
      setGroupId(settings.roblox_group_id);
      setGroupDiscountEnabled(settings.roblox_group_discount_enabled);
      setGroupDiscountPercent(settings.roblox_group_discount_percent);
      setGroupMinRank(settings.roblox_group_min_rank);
      setPremiumDiscountEnabled(settings.roblox_premium_discount_enabled);
      setPremiumDiscountPercent(settings.roblox_premium_discount_percent);
      setBadgeRewardsEnabled(settings.roblox_badge_rewards_enabled);
      // Tier-specific advertisement subscriptions
      setAdBasicSubscriptionId(settings.robux_ad_basic_subscription_id);
      setAdBasicRobuxPrice(settings.robux_ad_basic_robux_price);
      setAdProSubscriptionId(settings.robux_ad_pro_subscription_id);
      setAdProRobuxPrice(settings.robux_ad_pro_robux_price);
      setAdPremiumSubscriptionId(settings.robux_ad_premium_subscription_id);
      setAdPremiumRobuxPrice(settings.robux_ad_premium_robux_price);
    }
  }, [settings, isLoading]);
  
  // Fetch recent Robux transactions
  const { data: recentTransactions = [] } = useQuery({
    queryKey: ['robux-transactions-recent'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('robux_transactions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (error) throw error;
      return data || [];
    },
  });

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync({
        roblox_game_url: gameUrl,
        roblox_group_id: groupId,
        roblox_group_discount_enabled: groupDiscountEnabled,
        roblox_group_discount_percent: groupDiscountPercent,
        roblox_group_min_rank: groupMinRank,
        roblox_premium_discount_enabled: premiumDiscountEnabled,
        roblox_premium_discount_percent: premiumDiscountPercent,
        roblox_badge_rewards_enabled: badgeRewardsEnabled,
        // Tier-specific advertisement subscriptions
        robux_ad_basic_subscription_id: adBasicSubscriptionId,
        robux_ad_basic_robux_price: adBasicRobuxPrice,
        robux_ad_pro_subscription_id: adProSubscriptionId,
        robux_ad_pro_robux_price: adProRobuxPrice,
        robux_ad_premium_subscription_id: adPremiumSubscriptionId,
        robux_ad_premium_robux_price: adPremiumRobuxPrice,
      });
      toast.success('Roblox settings saved');
    } catch (error) {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGroupVerification = async () => {
    if (!testRobloxId || !groupId) {
      toast.error('Enter a Roblox User ID and Group ID first');
      return;
    }
    
    setIsTestingGroup(true);
    setGroupTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-roblox-group', {
        body: { roblox_user_id: testRobloxId, group_id: groupId },
      });
      
      if (error) throw error;
      
      if (data.inGroup) {
        setGroupTestResult({
          success: true,
          message: `User is in group "${data.groupName}" with rank "${data.role?.name}" (Rank ${data.role?.rank})`,
        });
      } else {
        setGroupTestResult({
          success: false,
          message: 'User is not a member of this group',
        });
      }
    } catch (error) {
      console.error('Group test error:', error);
      setGroupTestResult({
        success: false,
        message: 'Failed to verify group membership',
      });
    } finally {
      setIsTestingGroup(false);
    }
  };

  const handleTestPremiumVerification = async () => {
    if (!testRobloxId) {
      toast.error('Enter a Roblox User ID first');
      return;
    }
    
    setIsTestingPremium(true);
    setPremiumTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('verify-roblox-premium', {
        body: { roblox_user_id: testRobloxId },
      });
      
      if (error) throw error;
      
      setPremiumTestResult({
        success: data.hasPremium,
        message: data.hasPremium ? 'User has Roblox Premium!' : 'User does not have Roblox Premium',
      });
    } catch (error) {
      console.error('Premium test error:', error);
      setPremiumTestResult({
        success: false,
        message: 'Failed to verify premium status',
      });
    } finally {
      setIsTestingPremium(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  if (isLoading) {
    return (
      <AdminLayout requiredPermissions={['manage_settings']}>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout requiredPermissions={['manage_settings']}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-emerald-500" />
              Roblox Settings
            </h1>
            <p className="text-muted-foreground text-sm">
              Configure Roblox integrations, discounts, and verification
            </p>
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Settings
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-background">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="general">
                  <div className="flex items-center gap-2">
                    <Link2 className="h-4 w-4" />
                    General
                  </div>
                </SelectItem>
                <SelectItem value="discounts">
                  <div className="flex items-center gap-2">
                    <Percent className="h-4 w-4" />
                    Discounts
                  </div>
                </SelectItem>
                <SelectItem value="verification">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Verification
                  </div>
                </SelectItem>
                <SelectItem value="transactions">
                  <div className="flex items-center gap-2">
                    <Webhook className="h-4 w-4" />
                    Transactions
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Desktop tabs */}
          <TabsList className="hidden sm:inline-grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="general" className="gap-2">
              <Link2 className="h-4 w-4" />
              General
            </TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2">
              <Percent className="h-4 w-4" />
              Discounts
            </TabsTrigger>
            <TabsTrigger value="verification" className="gap-2">
              <Shield className="h-4 w-4" />
              Verification
            </TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2">
              <Webhook className="h-4 w-4" />
              Transactions
            </TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Game Configuration
                </CardTitle>
                <CardDescription>
                  Configure your Roblox game URL for Robux payments
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="game-url">Roblox Game URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="game-url"
                      placeholder="https://www.roblox.com/games/123456789/Your-Game"
                      value={gameUrl}
                      onChange={(e) => setGameUrl(e.target.value)}
                    />
                    {gameUrl && (
                      <Button variant="outline" size="icon" asChild>
                        <a href={gameUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This URL is used for the "Pay with Robux" button on product pages
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="group-id">Roblox Group ID</Label>
                  <Input
                    id="group-id"
                    placeholder="12345678"
                    value={groupId}
                    onChange={(e) => setGroupId(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Roblox group ID for membership verification and discounts
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Webhook Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Webhook Configuration
                </CardTitle>
                <CardDescription>
                  Configuration for receiving Robux purchase notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Webhook Endpoint</p>
                      <p className="text-xs text-muted-foreground">POST requests from your Roblox game</p>
                    </div>
                    <Badge variant="outline" className="text-emerald-500 border-emerald-500/50">
                      Active
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-webhook`}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-webhook`,
                        'webhook'
                      )}
                    >
                      {copiedField === 'webhook' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium mb-2">Setup Instructions:</p>
                  <ol className="list-decimal list-inside space-y-1">
                    <li>Copy the webhook URL above</li>
                    <li>Add the RobuxWebhook.lua script to ServerScriptService</li>
                    <li>Configure the WEBHOOK_SECRET in both Roblox and your backend</li>
                    <li>Map your Roblox Product IDs to website products</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Advertisement Subscription Configuration */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-purple-500" />
                  Advertisement Tier Subscriptions
                </CardTitle>
                <CardDescription>
                  Configure Roblox Subscriptions for each advertisement tier (Basic, Pro, Premium)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Basic Tier */}
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">Basic</Badge>
                    {adBasicSubscriptionId && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ad-basic-subscription-id">Subscription ID</Label>
                      <Input
                        id="ad-basic-subscription-id"
                        placeholder="Enter Roblox Subscription ID"
                        value={adBasicSubscriptionId}
                        onChange={(e) => setAdBasicSubscriptionId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-basic-robux-price">Robux Price (per month)</Label>
                      <Input
                        id="ad-basic-robux-price"
                        type="number"
                        min={0}
                        placeholder="100"
                        value={adBasicRobuxPrice}
                        onChange={(e) => setAdBasicRobuxPrice(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Pro Tier */}
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-500 border-purple-500/30">Pro</Badge>
                    {adProSubscriptionId && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ad-pro-subscription-id">Subscription ID</Label>
                      <Input
                        id="ad-pro-subscription-id"
                        placeholder="Enter Roblox Subscription ID"
                        value={adProSubscriptionId}
                        onChange={(e) => setAdProSubscriptionId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-pro-robux-price">Robux Price (per month)</Label>
                      <Input
                        id="ad-pro-robux-price"
                        type="number"
                        min={0}
                        placeholder="200"
                        value={adProRobuxPrice}
                        onChange={(e) => setAdProRobuxPrice(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {/* Premium Tier */}
                <div className="p-4 border border-border rounded-lg space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/30">Premium</Badge>
                    {adPremiumSubscriptionId && (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Enabled
                      </Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="ad-premium-subscription-id">Subscription ID</Label>
                      <Input
                        id="ad-premium-subscription-id"
                        placeholder="Enter Roblox Subscription ID"
                        value={adPremiumSubscriptionId}
                        onChange={(e) => setAdPremiumSubscriptionId(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ad-premium-robux-price">Robux Price (per month)</Label>
                      <Input
                        id="ad-premium-robux-price"
                        type="number"
                        min={0}
                        placeholder="500"
                        value={adPremiumRobuxPrice}
                        onChange={(e) => setAdPremiumRobuxPrice(parseInt(e.target.value) || 0)}
                      />
                    </div>
                  </div>
                </div>

                {(adBasicSubscriptionId || adProSubscriptionId || adPremiumSubscriptionId) && (
                  <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Robux subscriptions enabled for configured tiers</span>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">Advertisement Subscription Webhook</p>
                      <p className="text-xs text-muted-foreground">Use this for Roblox Subscription events</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-ad-webhook`}
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(
                        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/robux-ad-webhook`,
                        'ad-webhook'
                      )}
                    >
                      {copiedField === 'ad-webhook' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Configure your Roblox game to send SubscriptionPurchased, SubscriptionRenewed, SubscriptionExpired, and SubscriptionRefunded events to this webhook.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discounts Tab */}
          <TabsContent value="discounts" className="space-y-6">
            {/* Group Discount */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Group Member Discount
                </CardTitle>
                <CardDescription>
                  Offer discounts to members of your Roblox group
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Group Discount</Label>
                    <p className="text-xs text-muted-foreground">
                      Linked group members get automatic discounts
                    </p>
                  </div>
                  <Switch
                    checked={groupDiscountEnabled}
                    onCheckedChange={setGroupDiscountEnabled}
                  />
                </div>

                {groupDiscountEnabled && (
                  <>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Discount Percentage</Label>
                        <Badge variant="secondary">{groupDiscountPercent}%</Badge>
                      </div>
                      <Slider
                        value={[groupDiscountPercent]}
                        onValueChange={([v]) => setGroupDiscountPercent(v)}
                        min={1}
                        max={50}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="min-rank">Minimum Rank Required</Label>
                      <Input
                        id="min-rank"
                        type="number"
                        min={1}
                        max={255}
                        value={groupMinRank}
                        onChange={(e) => setGroupMinRank(parseInt(e.target.value) || 1)}
                      />
                      <p className="text-xs text-muted-foreground">
                        Only members with this rank or higher get the discount (1 = all members)
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Premium Discount */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  Roblox Premium Discount
                </CardTitle>
                <CardDescription>
                  Reward Roblox Premium subscribers with exclusive discounts
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Premium Discount</Label>
                    <p className="text-xs text-muted-foreground">
                      Roblox Premium users get automatic discounts
                    </p>
                  </div>
                  <Switch
                    checked={premiumDiscountEnabled}
                    onCheckedChange={setPremiumDiscountEnabled}
                  />
                </div>

                {premiumDiscountEnabled && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Discount Percentage</Label>
                      <Badge variant="secondary">{premiumDiscountPercent}%</Badge>
                    </div>
                    <Slider
                      value={[premiumDiscountPercent]}
                      onValueChange={([v]) => setPremiumDiscountPercent(v)}
                      min={1}
                      max={25}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Badge Rewards */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-purple-500" />
                  Badge Rewards
                </CardTitle>
                <CardDescription>
                  Unlock site badges for Roblox achievements
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Badge Sync</Label>
                    <p className="text-xs text-muted-foreground">
                      Award site badges based on Roblox badge ownership
                    </p>
                  </div>
                  <Switch
                    checked={badgeRewardsEnabled}
                    onCheckedChange={setBadgeRewardsEnabled}
                  />
                </div>

                {badgeRewardsEnabled && (
                  <div className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Configure badge mappings in the Badges section to link Roblox badges to site rewards.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Verification Tab */}
          <TabsContent value="verification" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Test Verification
                </CardTitle>
                <CardDescription>
                  Test group membership and premium status verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="test-roblox-id">Roblox User ID to Test</Label>
                  <Input
                    id="test-roblox-id"
                    placeholder="Enter a Roblox User ID"
                    value={testRobloxId}
                    onChange={(e) => setTestRobloxId(e.target.value)}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Group Test */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      <p className="font-medium text-sm">Group Membership</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleTestGroupVerification}
                      disabled={isTestingGroup || !testRobloxId || !groupId}
                      className="w-full"
                    >
                      {isTestingGroup ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                      )}
                      Test Group
                    </Button>
                    {groupTestResult && (
                      <div className={`flex items-start gap-2 text-sm p-2 rounded ${
                        groupTestResult.success 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {groupTestResult.success ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        )}
                        <span>{groupTestResult.message}</span>
                      </div>
                    )}
                  </div>

                  {/* Premium Test */}
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-amber-500" />
                      <p className="font-medium text-sm">Premium Status</p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleTestPremiumVerification}
                      disabled={isTestingPremium || !testRobloxId}
                      className="w-full"
                    >
                      {isTestingPremium ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Crown className="h-4 w-4 mr-2" />
                      )}
                      Test Premium
                    </Button>
                    {premiumTestResult && (
                      <div className={`flex items-start gap-2 text-sm p-2 rounded ${
                        premiumTestResult.success 
                          ? 'bg-green-500/10 text-green-500' 
                          : 'bg-destructive/10 text-destructive'
                      }`}>
                        {premiumTestResult.success ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        )}
                        <span>{premiumTestResult.message}</span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Recent Robux Transactions
                </CardTitle>
                <CardDescription>
                  Latest purchases made with Robux
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentTransactions.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Gamepad2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No Robux transactions yet</p>
                    <p className="text-sm">Transactions will appear here once customers purchase with Robux</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-6">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Player</TableHead>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">After Tax</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentTransactions.map((tx) => (
                          <TableRow key={tx.id}>
                            <TableCell className="whitespace-nowrap">
                              {format(new Date(tx.created_at), 'MMM d, HH:mm')}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium text-sm">{tx.roblox_username}</p>
                                <p className="text-xs text-muted-foreground">ID: {tx.roblox_user_id}</p>
                              </div>
                            </TableCell>
                            <TableCell className="max-w-[150px] truncate">
                              {tx.product_name}
                            </TableCell>
                            <TableCell className="text-right font-mono">
                              R${tx.robux_amount.toLocaleString()}
                            </TableCell>
                            <TableCell className="text-right font-mono text-emerald-500">
                              R${tx.robux_after_tax.toLocaleString()}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
