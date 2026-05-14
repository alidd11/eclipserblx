import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, BadgeDollarSign, MessageSquare, Zap, Gamepad2, RefreshCw, Send, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WebhookInput, TestResultBadge } from './WebhookInput';
import { DiscordRoleManager } from '@/components/discord/DiscordRoleManager';
import type { DiscordSettingsData, WebhookTestResult } from '@/hooks/useDiscordSettings';

interface ConfigurationTabProps {
  formData: DiscordSettingsData;
  handleChange: (key: keyof DiscordSettingsData, value: string) => void;
  testingWebhook: string | null;
  webhookTestResults: Record<string, WebhookTestResult>;
  onTest: (id: string, configured: string) => void;
  setTestingWebhook: (v: string | null) => void;
}

export function ConfigurationTab({ formData, handleChange, testingWebhook, webhookTestResults, onTest, setTestingWebhook }: ConfigurationTabProps) {
  const registerCommands = async (type: 'commands' | 'fun-commands' | 'auto-register') => {
    const fnMap = { commands: 'register-discord-commands', 'fun-commands': 'register-fun-bot-commands', 'auto-register': 'auto-register-discord-commands' };
    try {
      setTestingWebhook(type);
      const { data, error } = await supabase.functions.invoke(fnMap[type]);
      if (error) throw error;
      if (type === 'auto-register' && data?.errors?.length > 0) {
        toast.warning(`Registered with ${data.errors.length} warning(s). Check console for details.`);
        console.warn('[DiscordSettings] Auto-register warnings:', data.errors);
      } else if (type === 'auto-register') {
        toast.success(`All commands synced! Portal: ${data?.portal_bot?.commands || 0}, Fun: ${data?.fun_bot?.commands || 0}`);
      } else {
        toast.success(`${type === 'commands' ? 'Discord' : 'Fun Bot'} commands registered successfully!`);
      }
    } catch (err) {
      const ctx = (err as { context?: { details?: string; error?: string; body?: { details?: string; error?: string } } })?.context;
      const msg = ctx?.details || ctx?.error || ctx?.body?.details || ctx?.body?.error || errMsg(err) || 'Failed to register commands';
      toast.error(String(msg));
    } finally {
      setTestingWebhook(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Role Integration */}
      <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-blue-500/20"><UserCheck className="h-4 w-4 text-blue-400" /></div>
          <div>
            <h4 className="font-medium text-sm">Discord Role Integration</h4>
            <p className="text-xs text-muted-foreground">Auto-assign roles to subscribers</p>
          </div>
        </div>
        <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Environment variables:</p>
          <p><code className="bg-background px-1 rounded">DISCORD_BOT_TOKEN</code> • <code className="bg-background px-1 rounded">DISCORD_GUILD_ID</code> • <code className="bg-background px-1 rounded">DISCORD_ROLE_ID</code></p>
        </div>
        <Button onClick={() => onTest('roles', 'configured')} variant="outline" size="sm" disabled={testingWebhook === 'roles'} className="h-8">
          {testingWebhook === 'roles' ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Send className="h-3 w-3 mr-1.5" />}
          Test Role Assignment
        </Button>
        <TestResultBadge result={webhookTestResults.roles} />
      </div>

      {/* Advertisements */}
      <WebhookInput config={{ id: 'ads', label: 'Paid Promotions', description: 'User-submitted advertisements', settingKey: 'advertisements_discord_webhook_url', channelIdKey: 'advertisements_discord_channel_id', icon: <BadgeDollarSign className="h-4 w-4 text-amber-400" />, iconColor: 'bg-amber-500/20', roleIdKey: 'advertisements_partnership_ping_role_id', roleIdLabel: 'Partnership Ping Role ID' }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />

      {/* QOTD */}
      <WebhookInput config={{ id: 'qotd', label: 'Question of the Day', description: 'Daily engagement posts', settingKey: 'qotd_discord_webhook_url', channelIdKey: 'qotd_discord_channel_id', icon: <MessageSquare className="h-4 w-4 text-pink-400" />, iconColor: 'bg-pink-500/20', roleIdKey: 'qotd_discord_role_id', roleIdLabel: 'Role ID to Ping' }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />

      {/* Polls */}
      <WebhookInput config={{ id: 'polls', label: 'Discord Polls', description: 'Community polls and voting', settingKey: 'polls_discord_webhook_url', channelIdKey: 'polls_discord_channel_id', icon: <MessageSquare className="h-4 w-4 text-teal-400" />, iconColor: 'bg-teal-500/20', roleIdKey: 'polls_discord_role_id', roleIdLabel: 'Role ID to Ping' }} formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={onTest} />

      {/* Modmail */}
      <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-rose-500/20"><MessageSquare className="h-4 w-4 text-rose-400" /></div>
          <div>
            <h4 className="font-medium text-sm">Modmail Notifications</h4>
            <p className="text-xs text-muted-foreground">Notify staff when new support tickets arrive</p>
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Channel ID</Label>
            <Input value={formData.modmail_discord_channel_id} onChange={(e) => handleChange('modmail_discord_channel_id', e.target.value)} placeholder="Channel ID for modmail notifications" className="bg-background h-9 text-sm mt-1" />
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Staff Role ID to Ping</Label>
            <Input value={formData.modmail_discord_role_id} onChange={(e) => handleChange('modmail_discord_role_id', e.target.value)} placeholder="Role ID to ping for new tickets" className="bg-background h-9 text-sm mt-1" />
          </div>
        </div>
        <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground">
          <p>When a customer submits a ticket via <code className="bg-background px-1 rounded">/support</code>, a notification will be posted to the channel with a link to the admin dashboard.</p>
        </div>
      </div>

      {/* Customer Bot Commands */}
      <div className="space-y-4 p-4 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-purple-500/20"><Zap className="h-4 w-4 text-purple-400" /></div>
          <div>
            <h4 className="font-medium text-sm">Customer Bot Commands</h4>
            <p className="text-xs text-muted-foreground">Register Discord slash commands for customers</p>
          </div>
        </div>
        <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Available commands:</p>
          <p><code className="bg-background px-1 rounded">/link</code> • <code className="bg-background px-1 rounded">/verify</code> • <code className="bg-background px-1 rounded">/profile</code> • <code className="bg-background px-1 rounded">/purchases</code> • <code className="bg-background px-1 rounded">/retrieve</code> • <code className="bg-background px-1 rounded">/getrole</code> • <code className="bg-background px-1 rounded">/store</code> • <code className="bg-background px-1 rounded">/unlink</code></p>
        </div>
        <Button onClick={() => registerCommands('commands')} variant="outline" size="sm" disabled={testingWebhook === 'commands'} className="h-8">
          {testingWebhook === 'commands' ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Zap className="h-3 w-3 mr-1.5" />}
          Register Commands
        </Button>
      </div>

      {/* Fun Bot Commands */}
      <div className="space-y-3 p-4 rounded-lg border border-border bg-card/50">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-pink-500/20"><Gamepad2 className="h-4 w-4 text-pink-400" /></div>
          <div>
            <h4 className="font-medium text-sm">Fun Bot Commands</h4>
            <p className="text-xs text-muted-foreground">Register slash commands for games & XP</p>
          </div>
        </div>
        <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground space-y-1">
          <p className="font-medium text-foreground">Available commands:</p>
          <p><code className="bg-background px-1 rounded">/8ball</code> • <code className="bg-background px-1 rounded">/coinflip</code> • <code className="bg-background px-1 rounded">/roll</code> • <code className="bg-background px-1 rounded">/rps</code> • <code className="bg-background px-1 rounded">/daily</code> • <code className="bg-background px-1 rounded">/level</code> • <code className="bg-background px-1 rounded">/leaderboard</code> • <code className="bg-background px-1 rounded">/streak</code></p>
          <p><code className="bg-background px-1 rounded">/joke</code> • <code className="bg-background px-1 rounded">/quote</code> • <code className="bg-background px-1 rounded">/funfact</code> • <code className="bg-background px-1 rounded">/compliment</code> • <code className="bg-background px-1 rounded">/roast</code></p>
        </div>
        <Button onClick={() => registerCommands('fun-commands')} variant="outline" size="sm" disabled={testingWebhook === 'fun-commands'} className="h-8">
          {testingWebhook === 'fun-commands' ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <Zap className="h-3 w-3 mr-1.5" />}
          Register Fun Commands
        </Button>
      </div>

      {/* Sync All */}
      <div className="space-y-3 p-4 rounded-lg border border-green-500/30 bg-green-500/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded bg-green-500/20"><RefreshCw className="h-4 w-4 text-green-400" /></div>
          <div>
            <h4 className="font-medium text-sm">Sync All Bot Commands</h4>
            <p className="text-xs text-muted-foreground">Register commands for both bots + all store guilds (runs daily automatically)</p>
          </div>
        </div>
        <div className="bg-muted/50 p-3 rounded text-xs text-muted-foreground space-y-1">
          <p>• Portal Bot: Main guild (instant) + Global (1hr) + Store guilds</p>
          <p>• Fun Bot: Main guild only (instant)</p>
          <p>• This also runs automatically every day at midnight UTC</p>
        </div>
        <Button onClick={() => registerCommands('auto-register')} variant="default" size="sm" disabled={testingWebhook === 'auto-register'} className="h-8 bg-green-600 hover:bg-green-700">
          {testingWebhook === 'auto-register' ? <Loader2 className="h-3 w-3 mr-1.5 animate-spin" /> : <RefreshCw className="h-3 w-3 mr-1.5" />}
          Sync All Commands Now
        </Button>
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
    </div>
  );
}
