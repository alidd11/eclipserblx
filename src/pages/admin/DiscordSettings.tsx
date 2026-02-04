import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Webhook, Star, Send, Loader2, CheckCircle2, XCircle, Link2, ExternalLink, Copy, Check, Users, UserCheck, Gift, Sparkles, ChevronDown, Megaphone, Package, Palette, BadgeDollarSign, Shield, Settings, Bell, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DiscordRoleManager } from '@/components/discord/DiscordRoleManager';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

interface DiscordSettings {
  discord_invite_url: string;
  discord_webhook_url: string;
  review_discord_webhook_url: string;
  affiliate_discord_webhook_url: string;
  eclipse_plus_discord_webhook_url: string;
  marketplace_discord_webhook_url: string;
  promotions_discord_webhook_url: string;
  advertisements_discord_webhook_url: string;
  advertisements_partnership_ping_role_id: string;
  discord_widget_server_id: string;
  community_discord_webhook_url: string;
  community_discord_role_id: string;
  discord_ping_role_id: string;
  qotd_discord_webhook_url: string;
  qotd_discord_role_id: string;
  polls_discord_webhook_url: string;
  polls_discord_role_id: string;
  product_drops_discord_webhook_url: string;
  product_drops_discord_role_id: string;
  early_product_drops_discord_webhook_url: string;
  early_product_drops_discord_role_id: string;
}

const DEFAULT_SETTINGS: DiscordSettings = {
  discord_invite_url: '',
  discord_webhook_url: '',
  review_discord_webhook_url: '',
  affiliate_discord_webhook_url: '',
  eclipse_plus_discord_webhook_url: '',
  marketplace_discord_webhook_url: '',
  promotions_discord_webhook_url: '',
  advertisements_discord_webhook_url: '',
  advertisements_partnership_ping_role_id: '',
  discord_widget_server_id: '',
  community_discord_webhook_url: '',
  community_discord_role_id: '',
  discord_ping_role_id: '',
  qotd_discord_webhook_url: '',
  qotd_discord_role_id: '',
  polls_discord_webhook_url: '',
  polls_discord_role_id: '',
  product_drops_discord_webhook_url: '',
  product_drops_discord_role_id: '',
  early_product_drops_discord_webhook_url: '',
  early_product_drops_discord_role_id: '',
};

interface WebhookTestResult {
  success: boolean;
  message: string;
  details?: string;
}

// Webhook field configuration for reusable components
interface WebhookConfig {
  id: string;
  label: string;
  description: string;
  settingKey: keyof DiscordSettings;
  icon: React.ReactNode;
  iconColor: string;
  testable?: boolean;
  roleIdKey?: keyof DiscordSettings;
  roleIdLabel?: string;
  infoItems?: string[];
  alertInfo?: { title: string; description: string; color: string };
}

export default function DiscordSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState<DiscordSettings>(DEFAULT_SETTINGS);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    notifications: false,
    announcements: false,
    configuration: false,
  });

  // Test states - consolidated
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [webhookTestResults, setWebhookTestResults] = useState<Record<string, WebhookTestResult>>({});
  const [isSendingAnnouncement, setIsSendingAnnouncement] = useState<string | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['discord-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', Object.keys(DEFAULT_SETTINGS));

      if (error) throw error;

      const settingsMap: Partial<DiscordSettings> = {};
      data?.forEach((item) => {
        const val = typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : item.value;
        (settingsMap as any)[item.key] = String(val);
      });

      return { ...DEFAULT_SETTINGS, ...settingsMap };
    },
  });

  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

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
      toast.success('Settings saved');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });

  const handleSave = () => saveMutation.mutate(formData);
  const handleChange = (key: keyof DiscordSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('Copied');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  // Generic webhook test handler
  const testWebhook = async (type: string, webhookUrl: string, testFn: () => Promise<WebhookTestResult>) => {
    if (!webhookUrl) {
      toast.error('Please enter a webhook URL first');
      return;
    }
    setTestingWebhook(type);
    setWebhookTestResults((prev) => ({ ...prev, [type]: undefined as any }));
    
    try {
      const result = await testFn();
      setWebhookTestResults((prev) => ({ ...prev, [type]: result }));
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
    } catch (err: any) {
      const result = { success: false, message: 'Request failed', details: err.message };
      setWebhookTestResults((prev) => ({ ...prev, [type]: result }));
      toast.error('Test failed');
    } finally {
      setTestingWebhook(null);
    }
  };

  // Test functions for each webhook type
  const testOrderWebhook = async (): Promise<WebhookTestResult> => {
    const response = await fetch(formData.discord_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        embeds: [{
          title: 'New Purchase',
          description: '**Product Name**\nTest Product\n**Roblox**\nTestUser123\n(123456789)\n**Discord**\nTestUser#1234\n(987654321)',
          color: 0x9b59b6,
          thumbnail: { url: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B2C64A0E72EE2F26F0FCEC7D4FAD9E00-Png/150/150/AvatarHeadshot/Webp/noFilter' },
          timestamp: new Date().toISOString(),
        }],
      }),
    });
    return response.ok 
      ? { success: true, message: 'Test sent!', details: 'Check Discord' }
      : { success: false, message: 'Webhook failed', details: `Status: ${response.status}` };
  };

  const testReviewWebhook = async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-review-discord-notification', {
      body: { reviewId: 'test', rating: 5, title: 'Test Review', content: 'Webhook test!', userId: user?.id },
    });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.success) return { success: true, message: 'Test sent!', details: 'Check Discord' };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  };

  const testPromotionsWebhook = async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-promotion-discord-webhook', {
      body: { custom: { title: 'Test Promotion', description: 'Webhook test!', code: 'TEST25', discount_value: '25% OFF', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } },
    });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.success) return { success: true, message: 'Test sent!', details: 'Check Discord' };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  };

  const testCommunityWebhook = async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-community-announcement', {
      body: { type: 'custom', title: 'Test Announcement', message: 'Webhook test!' },
    });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.success) return { success: true, message: 'Test sent!', details: 'Check Discord' };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  };

  const testProductDropsWebhook = async (): Promise<WebhookTestResult> => {
    const productLink = 'roleplay-hub-shop.lovable.app/products/test-product';
    const response = await fetch(formData.product_drops_discord_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: formData.product_drops_discord_role_id ? `<@&${formData.product_drops_discord_role_id}>` : undefined,
        embeds: [
          {
            title: '🎉 New Product Drop!',
            description: '**Test Product**\nThis is a test notification for the product drops webhook.',
            color: 0x00CED1, // Cyan
            fields: [
              { name: '🏪 Store', value: 'Eclipse Store', inline: true },
              { name: '💰 Price', value: '£9.99', inline: true },
              { name: '🔗 Link', value: `[${productLink}](https://${productLink})`, inline: false },
            ],
            thumbnail: { url: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B2C64A0E72EE2F26F0FCEC7D4FAD9E00-Png/150/150/AvatarHeadshot/Webp/noFilter' },
            footer: { text: 'Eclipse Marketplace • Product Drop' },
            timestamp: new Date().toISOString(),
          },
          {
            color: 0x00CED1,
            image: { url: 'https://tr.rbxcdn.com/180DAY-5d89c926bd1c2d32e8d7ca56d9fdc91e/420/420/Hat/Webp/noFilter' },
          },
          {
            color: 0x00CED1,
            image: { url: 'https://tr.rbxcdn.com/180DAY-d1f62c87adc09c73edbe15b0e6a9f5a1/420/420/Hat/Webp/noFilter' },
          },
        ],
      }),
    });
    return response.ok 
      ? { success: true, message: 'Test sent!', details: 'Check Discord' }
      : { success: false, message: 'Webhook failed', details: `Status: ${response.status}` };
  };

  const testEarlyProductDropsWebhook = async (): Promise<WebhookTestResult> => {
    const productLink = 'roleplay-hub-shop.lovable.app/products/test-product';
    const response = await fetch(formData.early_product_drops_discord_webhook_url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: formData.early_product_drops_discord_role_id ? `<@&${formData.early_product_drops_discord_role_id}>` : undefined,
        embeds: [
          {
            title: '👑 Early Access Drop!',
            description: '**Test Product**\nThis is a test notification for the early product drops webhook.\n\n*Eclipse+ members get early access!*',
            color: 0x8B5CF6, // Violet
            fields: [
              { name: '🏪 Store', value: 'Eclipse Store', inline: true },
              { name: '💰 Price', value: '£9.99', inline: true },
              { name: '⏰ Early Access', value: '24 hours', inline: true },
              { name: '🔗 Link', value: `[${productLink}](https://${productLink})`, inline: false },
            ],
            thumbnail: { url: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B2C64A0E72EE2F26F0FCEC7D4FAD9E00-Png/150/150/AvatarHeadshot/Webp/noFilter' },
            footer: { text: 'Eclipse Marketplace • Eclipse+ Early Access' },
            timestamp: new Date().toISOString(),
          },
          {
            color: 0x8B5CF6,
            image: { url: 'https://tr.rbxcdn.com/180DAY-5d89c926bd1c2d32e8d7ca56d9fdc91e/420/420/Hat/Webp/noFilter' },
          },
          {
            color: 0x8B5CF6,
            image: { url: 'https://tr.rbxcdn.com/180DAY-d1f62c87adc09c73edbe15b0e6a9f5a1/420/420/Hat/Webp/noFilter' },
          },
        ],
      }),
    });
    return response.ok 
      ? { success: true, message: 'Test sent!', details: 'Check Discord' }
      : { success: false, message: 'Webhook failed', details: `Status: ${response.status}` };
  };

  const testRoleWebhook = async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-discord-webhook', {
      body: { user_id: user?.id, event: 'subscription_activated', granted_by_admin: true },
    });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.skipped) return { success: false, message: 'Skipped', details: data.message || 'No Discord linked' };
    if (data?.success) return { success: true, message: 'Role assigned!', details: `Discord ID: ${data.discord_id}` };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  };

  // Announcement handlers
  const sendAnnouncement = async (type: 'affiliate' | 'eclipse_plus' | 'marketplace') => {
    if (!user?.id) {
      toast.error('You must be logged in');
      return;
    }

    const config = {
      affiliate: { fn: 'send-affiliate-announcement', key: 'affiliate_discord_webhook_url' as const, label: 'Affiliate' },
      eclipse_plus: { fn: 'send-eclipse-plus-announcement', key: 'eclipse_plus_discord_webhook_url' as const, label: 'Eclipse+' },
      marketplace: { fn: 'send-marketplace-announcement', key: 'marketplace_discord_webhook_url' as const, label: 'Marketplace' },
    }[type];

    if (!formData[config.key]) {
      toast.error(`Configure ${config.label} webhook first`);
      return;
    }

    setIsSendingAnnouncement(type);
    try {
      const { data, error } = await supabase.functions.invoke(config.fn, { body: {} });
      if (error) toast.error(`${config.label} failed: ${error.message}`);
      else if (data?.success) toast.success(`${config.label} sent!`);
      else toast.error(data?.error || 'Failed');
    } catch (err: any) {
      toast.error(`Failed: ${err.message}`);
    } finally {
      setIsSendingAnnouncement(null);
    }
  };

  // Test result badge component
  const TestResultBadge = ({ result }: { result: WebhookTestResult | undefined }) => {
    if (!result) return null;
    return (
      <div className={cn(
        'mt-3 p-3 rounded-lg flex items-start gap-2',
        result.success ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'
      )}>
        {result.success ? <CheckCircle2 className="h-4 w-4 text-green-400 mt-0.5" /> : <XCircle className="h-4 w-4 text-red-400 mt-0.5" />}
        <div>
          <p className={cn('text-sm font-medium', result.success ? 'text-green-400' : 'text-red-400')}>{result.message}</p>
          {result.details && <p className="text-xs text-muted-foreground">{result.details}</p>}
        </div>
      </div>
    );
  };

  // Reusable webhook input component
  const WebhookInput = ({ config }: { config: WebhookConfig }) => (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
      <div className="flex items-center gap-2">
        <div className={cn('p-1.5 rounded', config.iconColor)}>{config.icon}</div>
        <div>
          <h4 className="font-medium text-sm">{config.label}</h4>
          <p className="text-xs text-muted-foreground">{config.description}</p>
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor={config.id} className="text-xs">Webhook URL</Label>
        <Input
          id={config.id}
          value={formData[config.settingKey]}
          onChange={(e) => handleChange(config.settingKey, e.target.value)}
          placeholder="https://discord.com/api/webhooks/..."
          className="bg-background text-sm h-9"
        />
      </div>

      {config.roleIdKey && (
        <div className="space-y-2">
          <Label htmlFor={`${config.id}-role`} className="text-xs">{config.roleIdLabel || 'Role ID'}</Label>
          <Input
            id={`${config.id}-role`}
            value={formData[config.roleIdKey]}
            onChange={(e) => handleChange(config.roleIdKey!, e.target.value)}
            placeholder="1234567890123456789"
            className="bg-background text-sm h-9"
          />
        </div>
      )}

      {config.testable && (
        <Button
          onClick={() => {
            const testFns: Record<string, () => Promise<WebhookTestResult>> = {
              orders: testOrderWebhook,
              reviews: testReviewWebhook,
              promotions: testPromotionsWebhook,
              community: testCommunityWebhook,
              roles: testRoleWebhook,
              'product-drops': testProductDropsWebhook,
              'early-drops': testEarlyProductDropsWebhook,
            };
            if (testFns[config.id]) testWebhook(config.id, formData[config.settingKey], testFns[config.id]);
          }}
          variant="outline"
          size="sm"
          disabled={testingWebhook === config.id || !formData[config.settingKey]}
          className="h-8"
        >
          {testingWebhook === config.id ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Send className="h-3 w-3 mr-1.5" />}
          Test
        </Button>
      )}
      
      <TestResultBadge result={webhookTestResults[config.id]} />
    </div>
  );

  // Section header component
  const SectionHeader = ({ id, icon, title, description, color }: { id: string; icon: React.ReactNode; title: string; description: string; color: string }) => (
    <CollapsibleTrigger asChild>
      <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors rounded-lg">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', color)}>{icon}</div>
          <div className="text-left">
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        <ChevronDown className={cn('h-5 w-5 text-muted-foreground transition-transform', expandedSections[id] && 'rotate-180')} />
      </button>
    </CollapsibleTrigger>
  );

  if (isLoading) {
    return (
      <AdminLayout requiredPermissions={['manage_settings']}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout requiredPermissions={['manage_settings']}>
      <div className="space-y-4 max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#5865F2]/20">
              <MessageSquare className="h-6 w-6 text-[#5865F2]" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-bold">Discord Settings</h1>
              <p className="text-sm text-muted-foreground hidden sm:block">Manage webhooks and integrations</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Quick Announce Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5">
                  {isSendingAnnouncement ? <Loader2 className="h-4 w-4 animate-spin" /> : <Megaphone className="h-4 w-4" />}
                  <span className="hidden sm:inline">Announce</span>
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 bg-card border-border">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Send Announcement</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => sendAnnouncement('affiliate')} disabled={isSendingAnnouncement !== null || !formData.affiliate_discord_webhook_url} className="gap-3">
                  <Gift className="h-4 w-4 text-emerald-500" />
                  <span>Affiliate Programme</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sendAnnouncement('eclipse_plus')} disabled={isSendingAnnouncement !== null || !formData.eclipse_plus_discord_webhook_url} className="gap-3">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Eclipse+ Membership</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => sendAnnouncement('marketplace')} disabled={isSendingAnnouncement !== null || !formData.marketplace_discord_webhook_url} className="gap-3">
                  <Megaphone className="h-4 w-4 text-purple-400" />
                  <span>Marketplace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={handleSave} disabled={saveMutation.isPending} size="sm">
              {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>

        {/* General Section */}
        <Collapsible open={expandedSections.general} onOpenChange={() => toggleSection('general')}>
          <Card className="bg-card border-border overflow-hidden">
            <SectionHeader id="general" icon={<Settings className="h-5 w-5 text-slate-400" />} title="General" description="Invite link and widget settings" color="bg-slate-500/20" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-4">
                {/* Invite URL */}
                <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-blue-500/20"><Link2 className="h-4 w-4 text-blue-400" /></div>
                    <div>
                      <h4 className="font-medium text-sm">Discord Invite</h4>
                      <p className="text-xs text-muted-foreground">Used across website (Support, Footer, Legal)</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={formData.discord_invite_url}
                      onChange={(e) => handleChange('discord_invite_url', e.target.value)}
                      placeholder="https://discord.gg/yourserver"
                      className="bg-background flex-1 h-9 text-sm"
                    />
                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleCopy(formData.discord_invite_url, 'invite')} disabled={!formData.discord_invite_url}>
                      {copiedField === 'invite' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                    </Button>
                    <Button variant="outline" size="icon" className="h-9 w-9" asChild disabled={!formData.discord_invite_url}>
                      <a href={formData.discord_invite_url} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a>
                    </Button>
                  </div>
                </div>

                {/* Widget */}
                <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-indigo-500/20"><Users className="h-4 w-4 text-indigo-400" /></div>
                    <div>
                      <h4 className="font-medium text-sm">Discord Widget</h4>
                      <p className="text-xs text-muted-foreground">Display online members on homepage</p>
                    </div>
                  </div>
                  <Input
                    value={formData.discord_widget_server_id}
                    onChange={(e) => handleChange('discord_widget_server_id', e.target.value)}
                    placeholder="Server ID (enable widget in Discord settings)"
                    className="bg-background h-9 text-sm"
                  />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Notifications Section */}
        <Collapsible open={expandedSections.notifications} onOpenChange={() => toggleSection('notifications')}>
          <Card className="bg-card border-border overflow-hidden">
            <SectionHeader id="notifications" icon={<Bell className="h-5 w-5 text-amber-400" />} title="Notifications" description="Order, review, and promotion webhooks" color="bg-amber-500/20" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-4">
                <WebhookInput config={{
                  id: 'orders',
                  label: 'Order Notifications',
                  description: 'Notify when orders are placed',
                  settingKey: 'discord_webhook_url',
                  icon: <Webhook className="h-4 w-4 text-purple-400" />,
                  iconColor: 'bg-purple-500/20',
                  testable: true,
                }} />
                
                <WebhookInput config={{
                  id: 'reviews',
                  label: 'Review Notifications',
                  description: 'Notify when reviews are approved',
                  settingKey: 'review_discord_webhook_url',
                  icon: <Star className="h-4 w-4 text-amber-400" />,
                  iconColor: 'bg-amber-500/20',
                  testable: true,
                }} />
                
                <WebhookInput config={{
                  id: 'promotions',
                  label: 'Promotions',
                  description: 'Discount codes and special offers',
                  settingKey: 'promotions_discord_webhook_url',
                  icon: <Palette className="h-4 w-4 text-rose-400" />,
                  iconColor: 'bg-rose-500/20',
                  testable: true,
                }} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Announcements Section */}
        <Collapsible open={expandedSections.announcements} onOpenChange={() => toggleSection('announcements')}>
          <Card className="bg-card border-border overflow-hidden">
            <SectionHeader id="announcements" icon={<Megaphone className="h-5 w-5 text-cyan-400" />} title="Announcements" description="Community, product drops, and programme announcements" color="bg-cyan-500/20" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-4">
                <WebhookInput config={{
                  id: 'community',
                  label: 'Community Announcements',
                  description: 'General community updates',
                  settingKey: 'community_discord_webhook_url',
                  icon: <MessageSquare className="h-4 w-4 text-blue-400" />,
                  iconColor: 'bg-blue-500/20',
                  roleIdKey: 'community_discord_role_id',
                  roleIdLabel: 'Role ID to Ping',
                  testable: true,
                }} />

                <WebhookInput config={{
                  id: 'product-drops',
                  label: 'Product Drops',
                  description: 'New product announcements',
                  settingKey: 'product_drops_discord_webhook_url',
                  icon: <Package className="h-4 w-4 text-cyan-400" />,
                  iconColor: 'bg-cyan-500/20',
                  roleIdKey: 'product_drops_discord_role_id',
                  roleIdLabel: 'Role ID to Ping',
                  testable: true,
                }} />

                <WebhookInput config={{
                  id: 'early-drops',
                  label: 'Early Product Drops',
                  description: 'VIP/Eclipse+ early access',
                  settingKey: 'early_product_drops_discord_webhook_url',
                  icon: <Shield className="h-4 w-4 text-violet-400" />,
                  iconColor: 'bg-violet-500/20',
                  roleIdKey: 'early_product_drops_discord_role_id',
                  roleIdLabel: 'Role ID to Ping',
                  testable: true,
                }} />

                <WebhookInput config={{
                  id: 'affiliate',
                  label: 'Affiliate Programme',
                  description: 'Affiliate programme announcements',
                  settingKey: 'affiliate_discord_webhook_url',
                  icon: <Gift className="h-4 w-4 text-emerald-400" />,
                  iconColor: 'bg-emerald-500/20',
                }} />

                <WebhookInput config={{
                  id: 'eclipse-plus',
                  label: 'Eclipse+ Membership',
                  description: 'Membership programme announcements',
                  settingKey: 'eclipse_plus_discord_webhook_url',
                  icon: <Sparkles className="h-4 w-4 text-amber-400" />,
                  iconColor: 'bg-amber-500/20',
                }} />

                <WebhookInput config={{
                  id: 'marketplace',
                  label: 'Marketplace',
                  description: 'Seller marketplace announcements',
                  settingKey: 'marketplace_discord_webhook_url',
                  icon: <Megaphone className="h-4 w-4 text-purple-400" />,
                  iconColor: 'bg-purple-500/20',
                }} />
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Configuration Section */}
        <Collapsible open={expandedSections.configuration} onOpenChange={() => toggleSection('configuration')}>
          <Card className="bg-card border-border overflow-hidden">
            <SectionHeader id="configuration" icon={<Zap className="h-5 w-5 text-emerald-400" />} title="Configuration" description="Roles, ads, and ping settings" color="bg-emerald-500/20" />
            <CollapsibleContent>
              <CardContent className="pt-0 pb-4 space-y-4">
                {/* Role Integration */}
                <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-blue-500/20"><UserCheck className="h-4 w-4 text-blue-400" /></div>
                    <div>
                      <h4 className="font-medium text-sm">Discord Role Integration</h4>
                      <p className="text-xs text-muted-foreground">Auto-assign roles to Eclipse+ subscribers</p>
                    </div>
                  </div>
                  <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Environment variables:</p>
                    <p><code className="bg-background px-1 rounded">DISCORD_BOT_TOKEN</code> • <code className="bg-background px-1 rounded">DISCORD_GUILD_ID</code> • <code className="bg-background px-1 rounded">DISCORD_ROLE_ID</code></p>
                  </div>
                  <Button
                    onClick={() => testWebhook('roles', 'configured', testRoleWebhook)}
                    variant="outline"
                    size="sm"
                    disabled={testingWebhook === 'roles'}
                    className="h-8"
                  >
                    {testingWebhook === 'roles' ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Send className="h-3 w-3 mr-1.5" />}
                    Test Role Assignment
                  </Button>
                  <TestResultBadge result={webhookTestResults.roles} />
                </div>

                {/* Advertisements */}
                <WebhookInput config={{
                  id: 'ads',
                  label: 'Paid Promotions',
                  description: 'User-submitted advertisements',
                  settingKey: 'advertisements_discord_webhook_url',
                  icon: <BadgeDollarSign className="h-4 w-4 text-amber-400" />,
                  iconColor: 'bg-amber-500/20',
                  roleIdKey: 'advertisements_partnership_ping_role_id',
                  roleIdLabel: 'Partnership Ping Role ID',
                }} />

                {/* QOTD */}
                <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-pink-500/20"><MessageSquare className="h-4 w-4 text-pink-400" /></div>
                    <div>
                      <h4 className="font-medium text-sm">Question of the Day</h4>
                      <p className="text-xs text-muted-foreground">Daily engagement posts</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Webhook URL</Label>
                      <Input
                        value={formData.qotd_discord_webhook_url}
                        onChange={(e) => handleChange('qotd_discord_webhook_url', e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="bg-background h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Role ID to Ping</Label>
                      <Input
                        value={formData.qotd_discord_role_id}
                        onChange={(e) => handleChange('qotd_discord_role_id', e.target.value)}
                        placeholder="1234567890123456789"
                        className="bg-background h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Polls */}
                <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-teal-500/20"><MessageSquare className="h-4 w-4 text-teal-400" /></div>
                    <div>
                      <h4 className="font-medium text-sm">Discord Polls</h4>
                      <p className="text-xs text-muted-foreground">Community polls and voting</p>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Webhook URL</Label>
                      <Input
                        value={formData.polls_discord_webhook_url}
                        onChange={(e) => handleChange('polls_discord_webhook_url', e.target.value)}
                        placeholder="https://discord.com/api/webhooks/..."
                        className="bg-background h-9 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Role ID to Ping</Label>
                      <Input
                        value={formData.polls_discord_role_id}
                        onChange={(e) => handleChange('polls_discord_role_id', e.target.value)}
                        placeholder="1234567890123456789"
                        className="bg-background h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Role Ping Manager */}
                <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded bg-orange-500/20"><UserCheck className="h-4 w-4 text-orange-400" /></div>
                    <div>
                      <h4 className="font-medium text-sm">Role Ping Manager</h4>
                      <p className="text-xs text-muted-foreground">Manage customer Discord roles</p>
                    </div>
                  </div>
                  <DiscordRoleManager />
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>
    </AdminLayout>
  );
}
