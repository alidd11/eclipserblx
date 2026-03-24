import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Send, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DiscordSettingsData, WebhookConfig, WebhookTestResult } from '@/hooks/useDiscordSettings';

interface WebhookInputProps {
  config: WebhookConfig;
  formData: DiscordSettingsData;
  handleChange: (key: keyof DiscordSettingsData, value: string) => void;
  testingWebhook: string | null;
  webhookTestResults: Record<string, WebhookTestResult>;
  onTest: (id: string, configured: string) => void;
}

export function TestResultBadge({ result }: { result: WebhookTestResult | undefined }) {
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
}

export function WebhookInput({ config, formData, handleChange, testingWebhook, webhookTestResults, onTest }: WebhookInputProps) {
  const hasChannelId = config.channelIdKey && formData[config.channelIdKey];
  const hasWebhook = formData[config.settingKey];
  const usingBot = hasChannelId;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded', config.iconColor)}>{config.icon}</div>
          <div>
            <h4 className="font-medium text-sm">{config.label}</h4>
            <p className="text-xs text-muted-foreground">{config.description}</p>
          </div>
        </div>
        {config.channelIdKey && (
          <div className={cn(
            'px-2 py-0.5 rounded-full text-xs font-medium',
            usingBot ? 'bg-emerald-500/20 text-emerald-400' : hasWebhook ? 'bg-amber-500/20 text-amber-400' : 'bg-muted text-muted-foreground'
          )}>
            {usingBot ? '🤖 Bot' : hasWebhook ? 'Webhook' : 'Not configured'}
          </div>
        )}
      </div>

      {config.channelIdKey && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor={`${config.id}-channel`} className="text-xs">Channel ID (Bot)</Label>
            <span className="text-xs text-emerald-400 font-medium">Preferred</span>
          </div>
          <Input
            id={`${config.id}-channel`}
            value={formData[config.channelIdKey]}
            onChange={(e) => handleChange(config.channelIdKey!, e.target.value)}
            placeholder="1234567890123456789"
            className="bg-background text-sm h-9"
          />
          <p className="text-xs text-muted-foreground">Right-click channel in Discord → Copy Channel ID</p>
        </div>
      )}

      {config.channelIdKey && (
        <div className="flex items-center gap-3">
          <div className="flex-1 border-t border-border" />
          <span className="text-xs text-muted-foreground">or use legacy webhook</span>
          <div className="flex-1 border-t border-border" />
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor={config.id} className="text-xs">
          Webhook URL {config.channelIdKey && <span className="text-muted-foreground">(Legacy)</span>}
        </Label>
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
            const configured = config.channelIdKey ? (formData[config.channelIdKey] || formData[config.settingKey]) : formData[config.settingKey];
            onTest(config.id, configured);
          }}
          variant="outline"
          size="sm"
          disabled={testingWebhook === config.id || !(config.channelIdKey ? (formData[config.channelIdKey] || formData[config.settingKey]) : formData[config.settingKey])}
          className="h-8"
        >
          {testingWebhook === config.id ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Send className="h-3 w-3 mr-1.5" />}
          Test
        </Button>
      )}

      <TestResultBadge result={webhookTestResults[config.id]} />
    </div>
  );
}
