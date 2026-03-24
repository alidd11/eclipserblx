import { Webhook, Star, Palette } from 'lucide-react';
import { WebhookInput } from './WebhookInput';
import type { DiscordSettingsData, WebhookTestResult } from '@/hooks/useDiscordSettings';

interface NotificationsTabProps {
  formData: DiscordSettingsData;
  handleChange: (key: keyof DiscordSettingsData, value: string) => void;
  testingWebhook: string | null;
  webhookTestResults: Record<string, WebhookTestResult>;
  onTest: (id: string, configured: string) => void;
}

export function NotificationsTab({ formData, handleChange, testingWebhook, webhookTestResults, onTest }: NotificationsTabProps) {
  return (
    <div className="space-y-4">
      <WebhookInput config={{ id: 'orders', label: 'Order Notifications', description: 'Notify when orders are placed', settingKey: 'discord_webhook_url', channelIdKey: 'orders_discord_channel_id', icon: <Webhook className="h-4 w-4 text-purple-400" />, iconColor: 'bg-purple-500/20', testable: true }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
      <WebhookInput config={{ id: 'reviews', label: 'Review Notifications', description: 'Notify when reviews are approved', settingKey: 'review_discord_webhook_url', channelIdKey: 'reviews_discord_channel_id', icon: <Star className="h-4 w-4 text-amber-400" />, iconColor: 'bg-amber-500/20', testable: true }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
      <WebhookInput config={{ id: 'promotions', label: 'Promotions', description: 'Discount codes and special offers', settingKey: 'promotions_discord_webhook_url', channelIdKey: 'promotions_discord_channel_id', icon: <Palette className="h-4 w-4 text-rose-400" />, iconColor: 'bg-rose-500/20', testable: true }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />
    </div>
  );
}
