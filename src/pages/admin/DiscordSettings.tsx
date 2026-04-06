import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { MessageSquare, Loader2, Gift, Sparkles, ChevronDown, Megaphone, Settings, Bell, Zap } from 'lucide-react';
import { useDiscordSettings } from '@/hooks/useDiscordSettings';
import { GeneralTab } from '@/components/admin/discord-settings/GeneralTab';
import { NotificationsTab } from '@/components/admin/discord-settings/NotificationsTab';
import { AnnouncementsTab } from '@/components/admin/discord-settings/AnnouncementsTab';
import { ConfigurationTab } from '@/components/admin/discord-settings/ConfigurationTab';

const tabs = [
  { value: 'general', label: 'General', icon: Settings },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'announcements', label: 'Announcements', icon: Megaphone },
  { value: 'configuration', label: 'Configuration', icon: Zap },
] as const;

export default function DiscordSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';
  const setActiveTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const {
    formData, isLoading, isSaving, copiedField,
    testingWebhook, webhookTestResults, isSendingAnnouncement,
    handleSave, handleChange, handleCopy, testWebhook, testFns,
    sendAnnouncement, setTestingWebhook,
  } = useDiscordSettings();

  const handleTest = (id: string, configured: string) => {
    if (testFns[id]) testWebhook(id, configured, testFns[id]);
  };

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
                <DropdownMenuItem onClick={() => sendAnnouncement('marketplace')} disabled={isSendingAnnouncement !== null || !formData.marketplace_discord_webhook_url} className="gap-3">
                  <Megaphone className="h-4 w-4 text-purple-400" />
                  <span>Marketplace</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={handleSave} disabled={isSaving} size="sm">
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full max-w-xl grid-cols-4">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-2">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* Mobile dropdown */}
          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <span className="flex items-center gap-2">
                      <t.icon className="h-4 w-4" />
                      {t.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="general">
            <GeneralTab formData={formData} handleChange={handleChange} handleCopy={handleCopy} copiedField={copiedField} />
          </TabsContent>
          <TabsContent value="notifications">
            <NotificationsTab formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={handleTest} />
          </TabsContent>
          <TabsContent value="announcements">
            <AnnouncementsTab formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={handleTest} />
          </TabsContent>
          <TabsContent value="configuration">
            <ConfigurationTab formData={formData} handleChange={handleChange} testingWebhook={testingWebhook} webhookTestResults={webhookTestResults} onTest={handleTest} setTestingWebhook={setTestingWebhook} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
