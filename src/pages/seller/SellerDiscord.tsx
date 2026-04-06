import { useSearchParams } from 'react-router-dom';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { AddPortalBotCard } from '@/components/seller/AddPortalBotCard';
import { ScheduledAnnouncementCard } from '@/components/seller/ScheduledAnnouncementCard';
import { DiscordRolePingsCard } from '@/components/seller/DiscordRolePingsCard';
import { DiscordServerOverview } from '@/components/seller/DiscordServerOverview';
import { DiscordNotificationsTab } from '@/components/seller/discord/DiscordNotificationsTab';
import { CommandPermissionsTab } from '@/components/seller/discord/CommandPermissionsTab';
import { WelcomeEmbedBuilder } from '@/components/seller/WelcomeEmbedBuilder';

import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bot, Megaphone, Bell, AtSign, Shield, Settings, MessageCircle } from 'lucide-react';

const tabs = [
  { value: 'bot', label: 'Bot', icon: Bot },
  { value: 'welcome', label: 'Welcome', icon: MessageCircle },
  { value: 'announcements', label: 'Announcements', icon: Megaphone },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'roles', label: 'Roles', icon: AtSign },
  { value: 'permissions', label: 'Permissions', icon: Shield },
];

export default function SellerDiscord() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'bot';

  const setTab = (tab: string) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  };

  return (
    <SellerLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Discord Integration</h1>
          <p className="text-muted-foreground text-sm">
            Promote your store and engage your community through Discord.
          </p>
        </div>

        {/* Server Stats Overview */}
        <DiscordServerOverview />

        {/* Mobile: Select dropdown */}
        <div className="sm:hidden">
          <Select value={activeTab} onValueChange={setTab}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {tabs.map((tab) => (
                <SelectItem key={tab.value} value={tab.value}>
                  <div className="flex items-center gap-2">
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Desktop: Tabs */}
        <Tabs value={activeTab} onValueChange={setTab}>
          <TabsList className="hidden sm:flex w-full">
            {tabs.map((tab) => (
              <TabsTrigger key={tab.value} value={tab.value} className="flex-1 gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="bot" className="mt-4 space-y-4">
            <AddPortalBotCard />

            {/* Webhook Config Link */}
            <div className="border border-border rounded-xl overflow-hidden border-border/50">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <Settings className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm text-muted-foreground">
                    Configure your Discord webhook URL for fallback announcements
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="shrink-0 self-start sm:self-auto">
                  <Link to="/seller/settings/notifications">
                    Configure
                  </Link>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="welcome" className="mt-4">
            <WelcomeEmbedBuilder />
          </TabsContent>

          <TabsContent value="announcements" className="mt-4">
            <ScheduledAnnouncementCard />
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <DiscordNotificationsTab />
          </TabsContent>

          <TabsContent value="roles" className="mt-4">
            <DiscordRolePingsCard />
          </TabsContent>

          <TabsContent value="permissions" className="mt-4">
            <CommandPermissionsTab />
          </TabsContent>
        </Tabs>
      </div>
    </SellerLayout>
  );
}
