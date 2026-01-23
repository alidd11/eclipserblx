import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Webhook, Star, Send, Loader2, CheckCircle2, XCircle, Link2, ExternalLink, Copy, Check, Users, Zap, Calendar, UserCheck, AlertCircle, Gift } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format } from 'date-fns';

interface DiscordSettings {
  discord_invite_url: string;
  discord_webhook_url: string;
  review_discord_webhook_url: string;
  affiliate_discord_webhook_url: string;
  discord_widget_server_id: string;
}

interface BoostTrial {
  id: string;
  user_id: string;
  discord_id: string;
  boost_count: number;
  trial_start: string;
  trial_end: string;
  created_at: string;
  last_boost_at: string;
  revoked_at: string | null;
  profile?: {
    display_name: string | null;
    email: string;
    discord_username: string | null;
  };
}

const DEFAULT_SETTINGS: DiscordSettings = {
  discord_invite_url: '',
  discord_webhook_url: '',
  review_discord_webhook_url: '',
  affiliate_discord_webhook_url: '',
  discord_widget_server_id: '',
};

export default function DiscordSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState<DiscordSettings>(DEFAULT_SETTINGS);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  
  // Boost rewards state
  const [boostRewardsEnabled, setBoostRewardsEnabled] = useState(true);
  const [boostTrialDays, setBoostTrialDays] = useState(7);
  
  // Test states
  const [isTestingOrderWebhook, setIsTestingOrderWebhook] = useState(false);
  const [orderWebhookTestResult, setOrderWebhookTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  
  const [isTestingReviewWebhook, setIsTestingReviewWebhook] = useState(false);
  const [reviewWebhookTestResult, setReviewWebhookTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  
  const [isTestingRoleWebhook, setIsTestingRoleWebhook] = useState(false);
  const [roleWebhookTestResult, setRoleWebhookTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);
  
  const [isTestingAffiliateWebhook, setIsTestingAffiliateWebhook] = useState(false);
  const [affiliateWebhookTestResult, setAffiliateWebhookTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  // Fetch settings from database
  // Fetch boost rewards settings
  const { data: boostSettings } = useQuery({
    queryKey: ['boost-rewards-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['boost_rewards_enabled', 'boost_trial_days']);

      if (error) throw error;

      const result = { enabled: true, trialDays: 7 };
      data?.forEach((item) => {
        if (item.key === 'boost_rewards_enabled') {
          result.enabled = item.value === true || item.value === 'true';
        } else if (item.key === 'boost_trial_days') {
          result.trialDays = parseInt(String(item.value || '7'), 10) || 7;
        }
      });
      return result;
    },
  });

  // Fetch boost trials
  const { data: boostTrials, isLoading: isLoadingBoostTrials } = useQuery({
    queryKey: ['boost-trials'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('discord_boost_trials')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      // Fetch profiles for each trial
      const userIds = data?.map(t => t.user_id) || [];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, email, discord_username')
        .in('user_id', userIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));
      
      return data?.map(trial => ({
        ...trial,
        profile: profileMap.get(trial.user_id),
      })) as BoostTrial[];
    },
  });

  useEffect(() => {
    if (boostSettings) {
      setBoostRewardsEnabled(boostSettings.enabled);
      setBoostTrialDays(boostSettings.trialDays);
    }
  }, [boostSettings]);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['discord-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['discord_invite_url', 'discord_webhook_url', 'review_discord_webhook_url', 'affiliate_discord_webhook_url', 'discord_widget_server_id']);

      if (error) throw error;

      const settingsMap: Partial<DiscordSettings> = {};
      data?.forEach((item) => {
        const val = typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : item.value;
        if (item.key === 'discord_invite_url') {
          settingsMap.discord_invite_url = String(val);
        } else if (item.key === 'discord_webhook_url') {
          settingsMap.discord_webhook_url = String(val);
        } else if (item.key === 'review_discord_webhook_url') {
          settingsMap.review_discord_webhook_url = String(val);
        } else if (item.key === 'affiliate_discord_webhook_url') {
          settingsMap.affiliate_discord_webhook_url = String(val);
        } else if (item.key === 'discord_widget_server_id') {
          settingsMap.discord_widget_server_id = String(val);
        }
      });

      return { ...DEFAULT_SETTINGS, ...settingsMap };
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: DiscordSettings) => {
      const entries = Object.entries(data) as [keyof DiscordSettings, string][];
      
      for (const [key, value] of entries) {
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
      queryClient.invalidateQueries({ queryKey: ['discord-settings'] });
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success('Discord settings saved successfully');
    },
    onError: (error) => {
      console.error('Failed to save Discord settings:', error);
      toast.error('Failed to save Discord settings');
    },
  });

  // Save boost settings mutation
  const saveBoostSettingsMutation = useMutation({
    mutationFn: async ({ enabled, trialDays }: { enabled: boolean; trialDays: number }) => {
      const settings = [
        { key: 'boost_rewards_enabled', value: enabled },
        { key: 'boost_trial_days', value: trialDays },
      ];

      for (const setting of settings) {
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', setting.key)
          .maybeSingle();

        if (existing) {
          const { error } = await supabase
            .from('settings')
            .update({ value: setting.value })
            .eq('key', setting.key);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('settings')
            .insert([{ key: setting.key, value: setting.value }]);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boost-rewards-settings'] });
      toast.success('Boost rewards settings saved');
    },
    onError: (error) => {
      console.error('Failed to save boost settings:', error);
      toast.error('Failed to save boost settings');
    },
  });

  const handleSaveBoostSettings = () => {
    saveBoostSettingsMutation.mutate({ enabled: boostRewardsEnabled, trialDays: boostTrialDays });
  };

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleChange = (key: keyof DiscordSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Get stats for boost trials
  const activeBoostTrials = boostTrials?.filter(t => !t.revoked_at && new Date(t.trial_end) > new Date()) || [];
  const totalBoostTrials = boostTrials?.length || 0;
  const recentGrants = boostTrials?.filter(t => {
    const createdAt = new Date(t.created_at);
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return createdAt > weekAgo;
  }).length || 0;

  const handleTestOrderWebhook = async () => {
    if (!formData.discord_webhook_url) {
      toast.error('Please enter an Order Notification Webhook URL first');
      return;
    }

    setIsTestingOrderWebhook(true);
    setOrderWebhookTestResult(null);

    try {
      // Build Parcel-style description
      let description = '**Product Name**\nTest Product';
      description += '\n**Roblox**\nTestUser123\n(123456789)';
      description += '\n**Discord**\nTestUser#1234\n(987654321)';

      // Test by sending to the webhook directly with Parcel-style format
      const response = await fetch(formData.discord_webhook_url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [{
            title: 'New Purchase',
            description,
            color: 0x9b59b6,
            thumbnail: {
              url: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B2C64A0E72EE2F26F0FCEC7D4FAD9E00-Png/150/150/AvatarHeadshot/Webp/noFilter',
            },
            timestamp: new Date().toISOString(),
          }],
        }),
      });

      if (response.ok) {
        setOrderWebhookTestResult({
          success: true,
          message: 'Test notification sent!',
          details: 'Check your Discord channel',
        });
        toast.success('Order webhook test sent successfully!');
      } else {
        setOrderWebhookTestResult({
          success: false,
          message: 'Webhook request failed',
          details: `Status: ${response.status}`,
        });
        toast.error('Order webhook test failed');
      }
    } catch (err: any) {
      console.error('Order webhook test error:', err);
      setOrderWebhookTestResult({
        success: false,
        message: 'Request failed',
        details: err.message,
      });
      toast.error('Failed to test order webhook');
    } finally {
      setIsTestingOrderWebhook(false);
    }
  };

  const handleTestReviewWebhook = async () => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }
    
    if (!formData.review_discord_webhook_url) {
      toast.error('Please enter a Review Notification Webhook URL first');
      return;
    }
    
    setIsTestingReviewWebhook(true);
    setReviewWebhookTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-review-discord-notification', {
        body: {
          reviewId: 'test-review-id',
          rating: 5,
          title: 'Amazing Service!',
          content: 'This is a test review notification. The webhook is working correctly!',
          userId: user.id,
          productId: null,
        },
      });
      
      if (error) {
        setReviewWebhookTestResult({
          success: false,
          message: 'Function invocation failed',
          details: error.message,
        });
        toast.error('Review webhook test failed');
      } else if (data?.skipped) {
        setReviewWebhookTestResult({
          success: false,
          message: 'Webhook skipped',
          details: data.message || 'No webhook URL configured',
        });
        toast.warning('Webhook skipped - no URL configured');
      } else if (data?.success) {
        setReviewWebhookTestResult({
          success: true,
          message: 'Test review notification sent!',
          details: 'Check your Discord channel',
        });
        toast.success('Review webhook test sent successfully!');
      } else {
        setReviewWebhookTestResult({
          success: false,
          message: data?.error || 'Unknown error',
          details: data?.details,
        });
        toast.error('Review webhook test failed');
      }
    } catch (err: any) {
      console.error('Review webhook test error:', err);
      setReviewWebhookTestResult({
        success: false,
        message: 'Request failed',
        details: err.message,
      });
      toast.error('Failed to test review webhook');
    } finally {
      setIsTestingReviewWebhook(false);
    }
  };

  const handleTestRoleWebhook = async () => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }
    
    setIsTestingRoleWebhook(true);
    setRoleWebhookTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-discord-webhook', {
        body: {
          user_id: user.id,
          event: 'subscription_activated',
          granted_by_admin: true,
        },
      });
      
      if (error) {
        setRoleWebhookTestResult({
          success: false,
          message: 'Function invocation failed',
          details: error.message,
        });
        toast.error('Webhook test failed');
      } else if (data?.skipped) {
        setRoleWebhookTestResult({
          success: false,
          message: 'Webhook skipped',
          details: data.message || 'User has not linked their Discord account',
        });
        toast.warning('Webhook skipped - no Discord ID linked');
      } else if (data?.success) {
        setRoleWebhookTestResult({
          success: true,
          message: 'Webhook sent successfully!',
          details: `Sent to Discord ID: ${data.discord_id}`,
        });
        toast.success('Webhook test sent successfully!');
      } else {
        setRoleWebhookTestResult({
          success: false,
          message: data?.error || 'Unknown error',
          details: data?.details,
        });
        toast.error('Webhook test failed');
      }
    } catch (err: any) {
      console.error('Discord webhook test error:', err);
      setRoleWebhookTestResult({
        success: false,
        message: 'Request failed',
        details: err.message,
      });
      toast.error('Failed to test webhook');
    } finally {
      setIsTestingRoleWebhook(false);
    }
  };

  const handleTestAffiliateWebhook = async () => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }
    
    if (!formData.affiliate_discord_webhook_url) {
      toast.error('Please enter an Affiliate Webhook URL first');
      return;
    }
    
    setIsTestingAffiliateWebhook(true);
    setAffiliateWebhookTestResult(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-affiliate-announcement', {
        body: {},
      });
      
      if (error) {
        setAffiliateWebhookTestResult({
          success: false,
          message: 'Function invocation failed',
          details: error.message,
        });
        toast.error('Affiliate webhook test failed');
      } else if (data?.success) {
        setAffiliateWebhookTestResult({
          success: true,
          message: 'Affiliate announcement sent!',
          details: 'Check your Discord channel',
        });
        toast.success('Affiliate webhook test sent successfully!');
      } else {
        setAffiliateWebhookTestResult({
          success: false,
          message: data?.error || 'Unknown error',
          details: data?.details,
        });
        toast.error('Affiliate webhook test failed');
      }
    } catch (err: any) {
      console.error('Affiliate webhook test error:', err);
      setAffiliateWebhookTestResult({
        success: false,
        message: 'Request failed',
        details: err.message,
      });
      toast.error('Failed to test affiliate webhook');
    } finally {
      setIsTestingAffiliateWebhook(false);
    }
  };

  const TestResultBadge = ({ result }: { result: { success: boolean; message: string; details?: string } | null }) => {
    if (!result) return null;
    
    return (
      <div className={`mt-3 p-3 rounded-lg ${
        result.success 
          ? 'bg-green-500/10 border border-green-500/30' 
          : 'bg-red-500/10 border border-red-500/30'
      }`}>
        <div className="flex items-start gap-2">
          {result.success ? (
            <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" />
          ) : (
            <XCircle className="h-4 w-4 text-red-400 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className={`text-sm font-medium ${
              result.success ? 'text-green-400' : 'text-red-400'
            }`}>
              {result.message}
            </p>
            {result.details && (
              <p className="text-xs text-muted-foreground">
                {result.details}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-[#5865F2]/20">
                <MessageSquare className="h-6 w-6 text-[#5865F2]" />
              </div>
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display">Discord Settings</CardTitle>
                <CardDescription>Manage your Discord integrations and webhooks</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs defaultValue="invite" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-flex">
            <TabsTrigger value="invite" className="gap-2">
              <Link2 className="h-4 w-4 hidden sm:block" />
              Invite
            </TabsTrigger>
            <TabsTrigger value="widget" className="gap-2">
              <Users className="h-4 w-4 hidden sm:block" />
              Widget
            </TabsTrigger>
            <TabsTrigger value="orders" className="gap-2">
              <Webhook className="h-4 w-4 hidden sm:block" />
              Orders
            </TabsTrigger>
            <TabsTrigger value="reviews" className="gap-2">
              <Star className="h-4 w-4 hidden sm:block" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="roles" className="gap-2">
              <MessageSquare className="h-4 w-4 hidden sm:block" />
              Roles
            </TabsTrigger>
            <TabsTrigger value="boosts" className="gap-2">
              <Zap className="h-4 w-4 hidden sm:block" />
              Boosts
            </TabsTrigger>
            <TabsTrigger value="affiliate" className="gap-2">
              <Gift className="h-4 w-4 hidden sm:block" />
              Affiliate
            </TabsTrigger>
          </TabsList>

          {/* Discord Invite Link Tab */}
          <TabsContent value="invite">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Link2 className="h-5 w-5 text-[#5865F2]" />
                  <CardTitle>Discord Invite Link</CardTitle>
                </div>
                <CardDescription>
                  The invite link used across your website (Support, Footer, Legal pages, etc.)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="discordInvite">Invite URL</Label>
                  <div className="flex gap-2">
                    <Input
                      id="discordInvite"
                      value={formData.discord_invite_url}
                      onChange={(e) => handleChange('discord_invite_url', e.target.value)}
                      placeholder="https://discord.gg/yourserver"
                      className="bg-background flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleCopy(formData.discord_invite_url, 'invite')}
                      disabled={!formData.discord_invite_url}
                    >
                      {copiedField === 'invite' ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      asChild
                      disabled={!formData.discord_invite_url}
                    >
                      <a href={formData.discord_invite_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Make sure this is a permanent invite link that never expires
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Where this link is used:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Support page - Discord community link</li>
                    <li>Bot Installation page - Discord support button</li>
                    <li>Privacy Policy, Terms of Service, Refund Policy - Contact sections</li>
                    <li>Header navigation (if applicable)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discord Widget Tab */}
          <TabsContent value="widget">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#5865F2]" />
                  <CardTitle>Discord Widget</CardTitle>
                </div>
                <CardDescription>
                  Display your Discord server's online members on the homepage
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="widgetServerId">Server ID</Label>
                  <Input
                    id="widgetServerId"
                    value={formData.discord_widget_server_id}
                    onChange={(e) => handleChange('discord_widget_server_id', e.target.value)}
                    placeholder="1234567890123456789"
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Your Discord server ID (right-click server icon → Copy Server ID with Developer Mode enabled)
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <p className="text-sm font-medium">How to enable the widget:</p>
                  <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
                    <li>Go to your Discord server settings</li>
                    <li>Navigate to <span className="font-medium text-foreground">Widget</span> in the left sidebar</li>
                    <li>Enable <span className="font-medium text-foreground">"Enable Server Widget"</span></li>
                    <li>Choose which channel to show as the invite channel (optional)</li>
                    <li>Copy your Server ID and paste it above</li>
                  </ol>
                </div>

                <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                  <p className="text-sm text-amber-400">
                    <strong>Note:</strong> The server widget must be enabled in Discord settings for the online members to display. If disabled, a fallback "Join Discord" button will be shown instead.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Order Notifications Tab */}
          <TabsContent value="orders">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  <CardTitle>Order Notification Webhook</CardTitle>
                </div>
                <CardDescription>
                  Receive Discord notifications when orders are placed
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="orderWebhook">Webhook URL</Label>
                  <Input
                    id="orderWebhook"
                    value={formData.discord_webhook_url}
                    onChange={(e) => handleChange('discord_webhook_url', e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a webhook in your Discord server: Server Settings → Integrations → Webhooks
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Test Webhook</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Send a sample order notification to verify your webhook is configured correctly.
                  </p>
                  <Button
                    onClick={handleTestOrderWebhook}
                    variant="outline"
                    size="sm"
                    disabled={isTestingOrderWebhook || !formData.discord_webhook_url}
                  >
                    {isTestingOrderWebhook ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Test Order
                  </Button>
                  <TestResultBadge result={orderWebhookTestResult} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Review Notifications Tab */}
          <TabsContent value="reviews">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-amber-400" />
                  <CardTitle>Review Notification Webhook</CardTitle>
                </div>
                <CardDescription>
                  Receive Discord notifications when reviews are approved
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reviewWebhook">Webhook URL</Label>
                  <Input
                    id="reviewWebhook"
                    value={formData.review_discord_webhook_url}
                    onChange={(e) => handleChange('review_discord_webhook_url', e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    This can be the same or a different channel than order notifications
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Test Webhook</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Send a sample review notification to verify your webhook is configured correctly.
                  </p>
                  <Button
                    onClick={handleTestReviewWebhook}
                    variant="outline"
                    size="sm"
                    disabled={isTestingReviewWebhook || !formData.review_discord_webhook_url}
                  >
                    {isTestingReviewWebhook ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Test Review
                  </Button>
                  <TestResultBadge result={reviewWebhookTestResult} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Role Integration Tab */}
          <TabsContent value="roles">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Webhook className="h-5 w-5 text-primary" />
                  <CardTitle>Discord Role Integration</CardTitle>
                </div>
                <CardDescription>
                  Automatically assign Discord roles to Eclipse+ subscribers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                  <p className="text-sm font-medium">Configuration</p>
                  <p className="text-sm text-muted-foreground">
                    Role integration is configured via environment variables for security:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li><code className="bg-background px-1 rounded">DISCORD_BOT_TOKEN</code> - Your bot's token</li>
                    <li><code className="bg-background px-1 rounded">DISCORD_GUILD_ID</code> - Your server ID</li>
                    <li><code className="bg-background px-1 rounded">DISCORD_ROLE_ID</code> - The Eclipse+ role ID</li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-2">
                    Contact support if you need help configuring these values.
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Test Role Assignment</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    This will attempt to assign the Eclipse+ role to your linked Discord account.
                    Make sure you have linked your Discord account in your profile settings first.
                  </p>
                  <Button
                    onClick={handleTestRoleWebhook}
                    variant="outline"
                    size="sm"
                    disabled={isTestingRoleWebhook}
                  >
                    {isTestingRoleWebhook ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Test Role Assignment
                  </Button>
                  <TestResultBadge result={roleWebhookTestResult} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Boost Rewards Tab */}
          <TabsContent value="boosts">
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/20">
                        <UserCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{activeBoostTrials.length}</p>
                        <p className="text-sm text-muted-foreground">Active Trials</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-amber-500/20">
                        <Gift className="h-5 w-5 text-amber-500" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{recentGrants}</p>
                        <p className="text-sm text-muted-foreground">This Week</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card border-border">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-[#5865F2]/20">
                        <Zap className="h-5 w-5 text-[#5865F2]" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalBoostTrials}</p>
                        <p className="text-sm text-muted-foreground">Total Trials</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Configuration Card */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[#FF73FA]" />
                    <CardTitle>Boost Rewards Configuration</CardTitle>
                  </div>
                  <CardDescription>
                    Automatically grant Eclipse+ trials to users who boost your Discord server
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label htmlFor="boost-enabled">Enable Boost Rewards</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically grant Eclipse+ trials when users boost the server
                      </p>
                    </div>
                    <Switch
                      id="boost-enabled"
                      checked={boostRewardsEnabled}
                      onCheckedChange={setBoostRewardsEnabled}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trial-days">Trial Duration (days per boost)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        id="trial-days"
                        type="number"
                        min={1}
                        max={14}
                        value={boostTrialDays}
                        onChange={(e) => setBoostTrialDays(parseInt(e.target.value) || 7)}
                        className="bg-background w-24"
                      />
                      <p className="text-sm text-muted-foreground">
                        Max {boostTrialDays * 2} days for 2 boosts
                      </p>
                    </div>
                  </div>

                  <Button
                    onClick={handleSaveBoostSettings}
                    disabled={saveBoostSettingsMutation.isPending}
                    size="sm"
                  >
                    {saveBoostSettingsMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Save Boost Settings
                  </Button>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-3 mt-4">
                    <p className="text-sm font-medium">How it works:</p>
                    <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                      <li>Users must link their Discord account in their profile</li>
                      <li>When they boost your server, your Discord bot detects it</li>
                      <li>The bot calls the <code className="bg-background px-1 rounded">discord-boost-webhook</code> function</li>
                      <li>User receives Eclipse+ trial + Discord role + notifications</li>
                      <li>Maximum 2 boosts = {boostTrialDays * 2} days per user (anti-abuse)</li>
                    </ul>
                  </div>

                  <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-lg">
                    <div className="flex gap-2">
                      <AlertCircle className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-amber-400">Discord Bot Required</p>
                        <p className="text-sm text-muted-foreground">
                          Your Discord bot must listen for <code className="bg-background px-1 rounded">GUILD_MEMBER_UPDATE</code> events 
                          and call the webhook when <code className="bg-background px-1 rounded">premiumSince</code> changes.
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Boost Trials Table */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <CardTitle>Recent Boost Trials</CardTitle>
                  </div>
                  <CardDescription>
                    Users who have received Eclipse+ trials for boosting
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingBoostTrials ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : boostTrials && boostTrials.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>User</TableHead>
                            <TableHead>Discord</TableHead>
                            <TableHead>Boosts</TableHead>
                            <TableHead>Trial End</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {boostTrials.map((trial) => {
                            const isActive = !trial.revoked_at && new Date(trial.trial_end) > new Date();
                            const isExpired = !trial.revoked_at && new Date(trial.trial_end) <= new Date();
                            
                            return (
                              <TableRow key={trial.id}>
                                <TableCell>
                                  <div>
                                    <p className="font-medium">{trial.profile?.display_name || 'Unknown'}</p>
                                    <p className="text-xs text-muted-foreground">{trial.profile?.email}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm">{trial.profile?.discord_username || trial.discord_id}</p>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className="gap-1">
                                    <Zap className="h-3 w-3" />
                                    {trial.boost_count}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <p className="text-sm">{format(new Date(trial.trial_end), 'MMM d, yyyy')}</p>
                                </TableCell>
                                <TableCell>
                                  {isActive && (
                                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                      Active
                                    </Badge>
                                  )}
                                  {isExpired && (
                                    <Badge variant="secondary">
                                      Expired
                                    </Badge>
                                  )}
                                  {trial.revoked_at && (
                                    <Badge variant="destructive">
                                      Revoked
                                    </Badge>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">No boost trials yet</p>
                      <p className="text-sm text-muted-foreground">
                        Trials will appear here when users boost your server
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Affiliate Webhook Tab */}
          <TabsContent value="affiliate">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-green-400" />
                  <CardTitle>Affiliate Programme Webhook</CardTitle>
                </div>
                <CardDescription>
                  Send affiliate programme announcements to Discord
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="affiliateWebhook">Webhook URL</Label>
                  <Input
                    id="affiliateWebhook"
                    value={formData.affiliate_discord_webhook_url}
                    onChange={(e) => handleChange('affiliate_discord_webhook_url', e.target.value)}
                    placeholder="https://discord.com/api/webhooks/..."
                    className="bg-background"
                  />
                  <p className="text-xs text-muted-foreground">
                    Create a dedicated webhook for affiliate programme announcements in your Discord server
                  </p>
                </div>

                <div className="pt-4 border-t border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Send className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium text-sm">Send Announcement</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-3">
                    Send the affiliate programme advertisement to your Discord channel to attract new affiliates.
                  </p>
                  <Button
                    onClick={handleTestAffiliateWebhook}
                    variant="outline"
                    size="sm"
                    disabled={isTestingAffiliateWebhook || !formData.affiliate_discord_webhook_url}
                  >
                    {isTestingAffiliateWebhook ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Send Announcement
                  </Button>
                  <TestResultBadge result={affiliateWebhookTestResult} />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">What gets sent:</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Eye-catching affiliate programme advert</li>
                    <li>Current commission rate from your settings</li>
                    <li>Minimum payout threshold</li>
                    <li>Cookie duration (referral tracking period)</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Button
          onClick={handleSave}
          className="w-fit"
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Save Discord Settings
        </Button>
      </div>
    </AdminLayout>
  );
}
