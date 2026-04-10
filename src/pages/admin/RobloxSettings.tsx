import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Gamepad2, Loader2, Save, Percent, Shield, Link2, Webhook } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRobloxSettings } from '@/hooks/useRobloxSettings';
import { RobloxGeneralTab } from '@/components/admin/roblox/RobloxGeneralTab';
import { RobloxDiscountsTab } from '@/components/admin/roblox/RobloxDiscountsTab';
import { RobloxVerificationTab } from '@/components/admin/roblox/RobloxVerificationTab';
import { RobloxTransactionsTab } from '@/components/admin/roblox/RobloxTransactionsTab';

export default function RobloxSettings() {
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

  const [adBasicSubscriptionId, setAdBasicSubscriptionId] = useState('');
  const [adBasicRobuxPrice, setAdBasicRobuxPrice] = useState(0);
  const [adProSubscriptionId, setAdProSubscriptionId] = useState('');
  const [adProRobuxPrice, setAdProRobuxPrice] = useState(0);
  const [adPremiumSubscriptionId, setAdPremiumSubscriptionId] = useState('');
  const [adPremiumRobuxPrice, setAdPremiumRobuxPrice] = useState(0);

  const [isTestingGroup, setIsTestingGroup] = useState(false);
  const [groupTestResult, setGroupTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingPremium, setIsTestingPremium] = useState(false);
  const [premiumTestResult, setPremiumTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [testRobloxId, setTestRobloxId] = useState('');

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
      setAdBasicSubscriptionId(settings.robux_ad_basic_subscription_id);
      setAdBasicRobuxPrice(settings.robux_ad_basic_robux_price);
      setAdProSubscriptionId(settings.robux_ad_pro_subscription_id);
      setAdProRobuxPrice(settings.robux_ad_pro_robux_price);
      setAdPremiumSubscriptionId(settings.robux_ad_premium_subscription_id);
      setAdPremiumRobuxPrice(settings.robux_ad_premium_robux_price);
    }
  }, [settings, isLoading]);

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
    if (!testRobloxId || !groupId) { toast.error('Enter a Roblox User ID and Group ID first'); return; }
    setIsTestingGroup(true);
    setGroupTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-roblox', {
        body: { type: 'group', roblox_user_id: testRobloxId, group_id: groupId },
      });
      if (error) throw error;
      setGroupTestResult(data.inGroup
        ? { success: true, message: `User is in group "${data.groupName}" with rank "${data.role?.name}" (Rank ${data.role?.rank})` }
        : { success: false, message: 'User is not a member of this group' });
    } catch {
      setGroupTestResult({ success: false, message: 'Failed to verify group membership' });
    } finally {
      setIsTestingGroup(false);
    }
  };

  const handleTestPremiumVerification = async () => {
    if (!testRobloxId) { toast.error('Enter a Roblox User ID first'); return; }
    setIsTestingPremium(true);
    setPremiumTestResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('verify-roblox', {
        body: { type: 'premium', roblox_user_id: testRobloxId },
      });
      if (error) throw error;
      setPremiumTestResult({
        success: data.hasPremium,
        message: data.hasPremium ? 'User has Roblox Premium!' : 'User does not have Roblox Premium',
      });
    } catch {
      setPremiumTestResult({ success: false, message: 'Failed to verify premium status' });
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
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Gamepad2 className="h-6 w-6 text-emerald-500" />
              Roblox Settings
            </h1>
            <p className="text-muted-foreground text-sm">Configure Roblox integrations, discounts, and verification</p>
          </div>
          <Button onClick={handleSaveSettings} disabled={isSaving}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Settings
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-auto min-w-[140px] bg-background">
                <SelectValue placeholder="Select section" />
              </SelectTrigger>
              <SelectContent className="bg-card border-border z-50">
                <SelectItem value="general"><div className="flex items-center gap-2"><Link2 className="h-4 w-4" />General</div></SelectItem>
                <SelectItem value="discounts"><div className="flex items-center gap-2"><Percent className="h-4 w-4" />Discounts</div></SelectItem>
                <SelectItem value="verification"><div className="flex items-center gap-2"><Shield className="h-4 w-4" />Verification</div></SelectItem>
                <SelectItem value="transactions"><div className="flex items-center gap-2"><Webhook className="h-4 w-4" />Transactions</div></SelectItem>
              </SelectContent>
            </Select>
          </div>

          <TabsList className="hidden sm:inline-grid w-full grid-cols-4 lg:w-auto">
            <TabsTrigger value="general" className="gap-2"><Link2 className="h-4 w-4" />General</TabsTrigger>
            <TabsTrigger value="discounts" className="gap-2"><Percent className="h-4 w-4" />Discounts</TabsTrigger>
            <TabsTrigger value="verification" className="gap-2"><Shield className="h-4 w-4" />Verification</TabsTrigger>
            <TabsTrigger value="transactions" className="gap-2"><Webhook className="h-4 w-4" />Transactions</TabsTrigger>
          </TabsList>

          <RobloxGeneralTab
            gameUrl={gameUrl} setGameUrl={setGameUrl}
            groupId={groupId} setGroupId={setGroupId}
            adBasicSubscriptionId={adBasicSubscriptionId} setAdBasicSubscriptionId={setAdBasicSubscriptionId}
            adBasicRobuxPrice={adBasicRobuxPrice} setAdBasicRobuxPrice={setAdBasicRobuxPrice}
            adProSubscriptionId={adProSubscriptionId} setAdProSubscriptionId={setAdProSubscriptionId}
            adProRobuxPrice={adProRobuxPrice} setAdProRobuxPrice={setAdProRobuxPrice}
            adPremiumSubscriptionId={adPremiumSubscriptionId} setAdPremiumSubscriptionId={setAdPremiumSubscriptionId}
            adPremiumRobuxPrice={adPremiumRobuxPrice} setAdPremiumRobuxPrice={setAdPremiumRobuxPrice}
            copiedField={copiedField} copyToClipboard={copyToClipboard}
          />

          <RobloxDiscountsTab
            groupDiscountEnabled={groupDiscountEnabled} setGroupDiscountEnabled={setGroupDiscountEnabled}
            groupDiscountPercent={groupDiscountPercent} setGroupDiscountPercent={setGroupDiscountPercent}
            groupMinRank={groupMinRank} setGroupMinRank={setGroupMinRank}
            premiumDiscountEnabled={premiumDiscountEnabled} setPremiumDiscountEnabled={setPremiumDiscountEnabled}
            premiumDiscountPercent={premiumDiscountPercent} setPremiumDiscountPercent={setPremiumDiscountPercent}
            badgeRewardsEnabled={badgeRewardsEnabled} setBadgeRewardsEnabled={setBadgeRewardsEnabled}
          />

          <RobloxVerificationTab
            testRobloxId={testRobloxId} setTestRobloxId={setTestRobloxId}
            groupId={groupId}
            isTestingGroup={isTestingGroup} groupTestResult={groupTestResult}
            handleTestGroupVerification={handleTestGroupVerification}
            isTestingPremium={isTestingPremium} premiumTestResult={premiumTestResult}
            handleTestPremiumVerification={handleTestPremiumVerification}
          />

          <RobloxTransactionsTab recentTransactions={recentTransactions} />
        </Tabs>
      </div>
    </AdminLayout>
  );
}