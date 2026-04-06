import { MessageSquare, Package, Shield, Gift, Megaphone } from 'lucide-react';
import { WebhookInput } from './WebhookInput';
import type { DiscordSettingsData, WebhookTestResult } from '@/hooks/useDiscordSettings';

interface AnnouncementsTabProps {
  formData: DiscordSettingsData;
  handleChange: (key: keyof DiscordSettingsData, value: string) => void;
  testingWebhook: string | null;
  webhookTestResults: Record<string, WebhookTestResult>;
  onTest: (id: string, configured: string) => void;
}

export function AnnouncementsTab({ formData, handleChange, testingWebhook, webhookTestResults, onTest }: AnnouncementsTabProps) {
  return (
    <div className="space-y-4">
      <WebhookInput config={{ id: 'community', label: 'Community Announcements', description: 'General community updates', settingKey: 'community_discord_webhook_url', channelIdKey: 'community_discord_channel_id', icon: <MessageSquare className="h-4 w-4 text-blue-400" />, iconColor: 'bg-blue-500/20', roleIdKey: 'community_discord_role_id', roleIdLabel: 'Role ID to Ping', testable: true }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
      <WebhookInput config={{ id: 'product-drops', label: 'Product Drops', description: 'New product announcements', settingKey: 'product_drops_discord_webhook_url', channelIdKey: 'product_drops_discord_channel_id', icon: <Package className="h-4 w-4 text-cyan-400" />, iconColor: 'bg-cyan-500/20', roleIdKey: 'product_drops_discord_role_id', roleIdLabel: 'Role ID to Ping', testable: true }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
      <WebhookInput config={{ id: 'early-drops', label: 'Early Product Drops', description: 'VIP early access', settingKey: 'early_product_drops_discord_webhook_url', channelIdKey: 'early_product_drops_discord_channel_id', icon: <Shield className="h-4 w-4 text-violet-400" />, iconColor: 'bg-violet-500/20', roleIdKey: 'early_product_drops_discord_role_id', roleIdLabel: 'Role ID to Ping', testable: true }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
      <WebhookInput config={{ id: 'affiliate', label: 'Affiliate Programme', description: 'Affiliate programme announcements', settingKey: 'affiliate_discord_webhook_url', channelIdKey: 'affiliate_discord_channel_id', icon: <Gift className="h-4 w-4 text-emerald-400" />, iconColor: 'bg-emerald-500/20' }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
      <WebhookInput config={{ id: 'marketplace', label: 'Marketplace', description: 'Seller marketplace announcements', settingKey: 'marketplace_discord_webhook_url', channelIdKey: 'marketplace_discord_channel_id', icon: <Megaphone className="h-4 w-4 text-purple-400" />, iconColor: 'bg-purple-500/20' }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
    </div>
  );
}
