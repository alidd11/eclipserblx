import { useSearchParams } from 'react-router-dom';
import { AdminLayout } from '@/components/admin/AdminLayout';
// Card imports removed — using enterprise flat sections
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings as SettingsIcon, Bell, Shield, Rocket } from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { GeneralSettingsTab } from '@/components/admin/settings/GeneralSettingsTab';
import { NotificationsSettingsTab } from '@/components/admin/settings/NotificationsSettingsTab';
import { SecuritySettingsTab } from '@/components/admin/settings/SecuritySettingsTab';
import { PlatformSettingsTab } from '@/components/admin/settings/PlatformSettingsTab';

const tabs: Array<{ value: string; label: string; icon: typeof SettingsIcon; adminOnly?: boolean }> = [
  { value: 'general', label: 'General', icon: SettingsIcon },
  { value: 'notifications', label: 'Notifications', icon: Bell },
  { value: 'security', label: 'Security', icon: Shield },
  { value: 'platform', label: 'Platform', icon: Rocket, adminOnly: true },
];

export default function AdminSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAdmin } = useAdminAuth();
  const activeTab = searchParams.get('tab') || 'general';

  const setActiveTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };

  const visibleTabs = tabs.filter(t => !t.adminOnly || isAdmin);

  return (
    <AdminLayout>
      <div className="space-y-6 w-full">
        {/* Page Header */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
              <SettingsIcon className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              Settings
            </CardTitle>
            <CardDescription>Configure your store, notifications, security, and platform settings</CardDescription>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Desktop tabs */}
          <div className="hidden sm:block">
            <TabsList className={`grid w-full max-w-xl ${visibleTabs.length === 4 ? 'grid-cols-4' : 'grid-cols-3'}`}>
              {visibleTabs.map(t => (
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
                {visibleTabs.map(t => (
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
            <GeneralSettingsTab />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationsSettingsTab />
          </TabsContent>

          <TabsContent value="security">
            <SecuritySettingsTab />
          </TabsContent>

          {isAdmin && (
            <TabsContent value="platform">
              <PlatformSettingsTab />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
}
