import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { copyToClipboard } from '@/lib/copyToClipboard';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface DiscordSettingsData {
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
  orders_discord_channel_id: string;
  reviews_discord_channel_id: string;
  promotions_discord_channel_id: string;
  community_discord_channel_id: string;
  qotd_discord_channel_id: string;
  polls_discord_channel_id: string;
  product_drops_discord_channel_id: string;
  early_product_drops_discord_channel_id: string;
  affiliate_discord_channel_id: string;
  eclipse_plus_discord_channel_id: string;
  marketplace_discord_channel_id: string;
  advertisements_discord_channel_id: string;
  modmail_discord_channel_id: string;
  modmail_discord_role_id: string;
}

export const DEFAULT_SETTINGS: DiscordSettingsData = {
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
  orders_discord_channel_id: '',
  reviews_discord_channel_id: '',
  promotions_discord_channel_id: '',
  community_discord_channel_id: '',
  qotd_discord_channel_id: '',
  polls_discord_channel_id: '',
  product_drops_discord_channel_id: '',
  early_product_drops_discord_channel_id: '',
  affiliate_discord_channel_id: '',
  eclipse_plus_discord_channel_id: '',
  marketplace_discord_channel_id: '',
  advertisements_discord_channel_id: '',
  modmail_discord_channel_id: '',
  modmail_discord_role_id: '',
};

export interface WebhookTestResult {
  success: boolean;
  message: string;
  details?: string;
}

export interface WebhookConfig {
  id: string;
  label: string;
  description: string;
  settingKey: keyof DiscordSettingsData;
  icon: React.ReactNode;
  iconColor: string;
  testable?: boolean;
  roleIdKey?: keyof DiscordSettingsData;
  roleIdLabel?: string;
  channelIdKey?: keyof DiscordSettingsData;
}

export function useDiscordSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [formData, setFormData] = useState<DiscordSettingsData>(DEFAULT_SETTINGS);
  const [copiedField, setCopiedField] = useState<string | null>(null);
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
      const settingsMap: Partial<DiscordSettingsData> = {};
      data?.forEach((item) => {
        const val = typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : item.value;
        (settingsMap as any)[item.key] = String(val);
      });
      return { ...DEFAULT_SETTINGS, ...settingsMap };
    },
  });

  useEffect(() => {
    if (settings) setFormData(settings);
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: async (data: DiscordSettingsData) => {
      const entries = Object.entries(data) as [keyof DiscordSettingsData, string][];
      for (const [key, value] of entries) {
        const { data: existing } = await supabase.from('settings').select('id').eq('key', key).maybeSingle();
        if (existing) {
          const { error } = await supabase.from('settings').update({ value: JSON.stringify(value) }).eq('key', key);
          if (error) throw error;
        } else {
          const { error } = await supabase.from('settings').insert([{ key, value: JSON.stringify(value) }]);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discord-settings'] });
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success('Settings saved');
    },
    onError: () => toast.error('Failed to save settings'),
  });

  const handleSave = useCallback(() => saveMutation.mutate(formData), [saveMutation, formData]);
  const handleChange = useCallback((key: keyof DiscordSettingsData, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleCopy = useCallback((text: string, field: string) => {
    copyToClipboard(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }, []);

  const testWebhook = useCallback(async (type: string, webhookUrl: string, testFn: () => Promise<WebhookTestResult>) => {
    if (!webhookUrl) { toast.error('Please enter a webhook URL first'); return; }
    setTestingWebhook(type);
    setWebhookTestResults((prev) => ({ ...prev, [type]: undefined as any }));
    try {
      const result = await testFn();
      setWebhookTestResults((prev) => ({ ...prev, [type]: result }));
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    } catch (err) {
      const result = { success: false, message: 'Request failed', details: errMsg(err) };
      setWebhookTestResults((prev) => ({ ...prev, [type]: result }));
      toast.error('Test failed');
    } finally {
      setTestingWebhook(null);
    }
  }, []);

  // Test functions
  const testOrderWebhook = useCallback(async (): Promise<WebhookTestResult> => {
    const response = await fetch(formData.discord_webhook_url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ embeds: [{ title: 'New Purchase', description: '**Product Name**\nTest Product\n**Roblox**\nTestUser123\n(123456789)\n**Discord**\nTestUser#1234\n(987654321)', color: 0x9b59b6, thumbnail: { url: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B2C64A0E72EE2F26F0FCEC7D4FAD9E00-Png/150/150/AvatarHeadshot/Webp/noFilter' }, timestamp: new Date().toISOString() }] }),
    });
    return response.ok ? { success: true, message: 'Test sent!', details: 'Check Discord' } : { success: false, message: 'Webhook failed', details: `Status: ${response.status}` };
  }, [formData.discord_webhook_url]);

  const testReviewWebhook = useCallback(async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-review-discord-notification', { body: { reviewId: 'test', rating: 5, title: 'Test Review', content: 'Webhook test!', userId: user?.id } });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.success) return { success: true, message: 'Test sent!', details: 'Check Discord' };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  }, [user?.id]);

  const testPromotionsWebhook = useCallback(async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-promotion-discord-webhook', { body: { custom: { title: 'Test Promotion', description: 'Webhook test!', code: 'TEST25', discount_value: '25% OFF', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() } } });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.success) return { success: true, message: 'Test sent!', details: 'Check Discord' };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  }, []);

  const testCommunityWebhook = useCallback(async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-community-announcement', { body: { type: 'custom', title: 'Test Announcement', message: 'Webhook test!' } });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.success) return { success: true, message: 'Test sent!', details: 'Check Discord' };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  }, []);

  const testProductDropsWebhook = useCallback(async (): Promise<WebhookTestResult> => {
    const productLink = 'roleplay-hub-shop.lovable.app/products/test-product';
    const response = await fetch(formData.product_drops_discord_webhook_url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: formData.product_drops_discord_role_id ? `<@&${formData.product_drops_discord_role_id}>` : undefined,
        embeds: [
          { title: '🎉 New Product Drop!', description: '**Test Product**\nThis is a test notification for the product drops webhook.', color: 0x00CED1, fields: [{ name: '🏪 Store', value: 'Quantis', inline: true }, { name: '💰 Price', value: '£9.99', inline: true }, { name: '🔗 Link', value: `[${productLink}](https://${productLink})`, inline: false }], thumbnail: { url: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B2C64A0E72EE2F26F0FCEC7D4FAD9E00-Png/150/150/AvatarHeadshot/Webp/noFilter' }, footer: { text: 'Quantis • Product Drop' }, timestamp: new Date().toISOString() },
          { color: 0x00CED1, image: { url: 'https://tr.rbxcdn.com/180DAY-5d89c926bd1c2d32e8d7ca56d9fdc91e/420/420/Hat/Webp/noFilter' } },
          { color: 0x00CED1, image: { url: 'https://tr.rbxcdn.com/180DAY-d1f62c87adc09c73edbe15b0e6a9f5a1/420/420/Hat/Webp/noFilter' } },
        ],
      }),
    });
    return response.ok ? { success: true, message: 'Test sent!', details: 'Check Discord' } : { success: false, message: 'Webhook failed', details: `Status: ${response.status}` };
  }, [formData.product_drops_discord_webhook_url, formData.product_drops_discord_role_id]);

  const testEarlyProductDropsWebhook = useCallback(async (): Promise<WebhookTestResult> => {
    const productLink = 'roleplay-hub-shop.lovable.app/products/test-product';
    const response = await fetch(formData.early_product_drops_discord_webhook_url, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: formData.early_product_drops_discord_role_id ? `<@&${formData.early_product_drops_discord_role_id}>` : undefined,
        embeds: [
          { title: '👑 Early Access Drop!', description: '**Test Product**\nThis is a test notification for the early product drops webhook.\n\n*Subscribers get early access!*', color: 0x8B5CF6, fields: [{ name: '🏪 Store', value: 'Quantis', inline: true }, { name: '💰 Price', value: '£9.99', inline: true }, { name: '⏰ Early Access', value: '24 hours', inline: true }, { name: '🔗 Link', value: `[${productLink}](https://${productLink})`, inline: false }], thumbnail: { url: 'https://tr.rbxcdn.com/30DAY-AvatarHeadshot-B2C64A0E72EE2F26F0FCEC7D4FAD9E00-Png/150/150/AvatarHeadshot/Webp/noFilter' }, footer: { text: 'Quantis • Early Access' }, timestamp: new Date().toISOString() },
          { color: 0x8B5CF6, image: { url: 'https://tr.rbxcdn.com/180DAY-5d89c926bd1c2d32e8d7ca56d9fdc91e/420/420/Hat/Webp/noFilter' } },
          { color: 0x8B5CF6, image: { url: 'https://tr.rbxcdn.com/180DAY-d1f62c87adc09c73edbe15b0e6a9f5a1/420/420/Hat/Webp/noFilter' } },
        ],
      }),
    });
    return response.ok ? { success: true, message: 'Test sent!', details: 'Check Discord' } : { success: false, message: 'Webhook failed', details: `Status: ${response.status}` };
  }, [formData.early_product_drops_discord_webhook_url, formData.early_product_drops_discord_role_id]);

  const testRoleWebhook = useCallback(async (): Promise<WebhookTestResult> => {
    const { data, error } = await supabase.functions.invoke('send-discord-webhook', { body: { user_id: user?.id, event: 'subscription_activated', granted_by_admin: true } });
    if (error) return { success: false, message: 'Function failed', details: error.message };
    if (data?.skipped) return { success: false, message: 'Skipped', details: data.message || 'No Discord linked' };
    if (data?.success) return { success: true, message: 'Role assigned!', details: `Discord ID: ${data.discord_id}` };
    return { success: false, message: data?.error || 'Unknown error', details: data?.details };
  }, [user?.id]);

  const testFns: Record<string, () => Promise<WebhookTestResult>> = {
    orders: testOrderWebhook,
    reviews: testReviewWebhook,
    promotions: testPromotionsWebhook,
    community: testCommunityWebhook,
    roles: testRoleWebhook,
    'product-drops': testProductDropsWebhook,
    'early-drops': testEarlyProductDropsWebhook,
  };

  const sendAnnouncement = useCallback(async (type: 'affiliate' | 'eclipse_plus' | 'marketplace') => {
    if (!user?.id) { toast.error('You must be logged in'); return; }
    const config = {
      affiliate: { fn: 'send-affiliate-announcement', key: 'affiliate_discord_webhook_url' as const, label: 'Affiliate' },
      eclipse_plus: { fn: 'send-eclipse-plus-announcement', key: 'eclipse_plus_discord_webhook_url' as const, label: 'Subscription' },
      marketplace: { fn: 'send-marketplace-announcement', key: 'marketplace_discord_webhook_url' as const, label: 'Marketplace' },
    }[type];
    if (!formData[config.key]) { toast.error(`Configure ${config.label} webhook first`); return; }
    setIsSendingAnnouncement(type);
    try {
      const { data, error } = await supabase.functions.invoke(config.fn, { body: {} });
      if (error) toast.error(`${config.label} failed: ${error.message}`);
      else if (data?.success) toast.success(`${config.label} sent!`);
      else toast.error(data?.error || 'Failed');
    } catch (err) {
      toast.error(`Failed: ${errMsg(err)}`);
    } finally {
      setIsSendingAnnouncement(null);
    }
  }, [user?.id, formData]);

  return {
    formData,
    isLoading,
    isSaving: saveMutation.isPending,
    copiedField,
    testingWebhook,
    webhookTestResults,
    isSendingAnnouncement,
    handleSave,
    handleChange,
    handleCopy,
    testWebhook,
    testFns,
    sendAnnouncement,
    setTestingWebhook,
  };
}
