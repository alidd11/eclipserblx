import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParams } from 'react-router-dom';
import { Settings, Key } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { BotSettingsGeneral } from '@/components/bot-dashboard/settings/BotSettingsGeneral';

const BotCodesContent = lazy(() => import('@/components/bot-dashboard/settings/BotCodesContent'));

function TabLoader() {
  return (
    <div className="space-y-4 py-4">
      <Skeleton className="h-8 w-48 bg-background/10" />
      <Skeleton className="h-64 w-full bg-background/10 rounded-xl" />
    </div>
  );
}

const tabs = [
  { value: 'general', label: 'General', icon: Settings },
  { value: 'license-codes', label: 'License Codes', icon: Key },
];

export default function BotSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'general';

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <BotDashboardLayout>
      <div className="max-w-5xl mx-auto">
        <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Settings className="h-6 w-6 text-[hsl(258,90%,66%)]" />
          Settings
        </h1>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="bg-background/5 border border-white/10 mb-6 flex-wrap h-auto gap-1 p-1">
            {tabs.map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="data-[state=active]:bg-[hsl(258,90%,66%)]/20 data-[state=active]:text-[hsl(258,90%,76%)] text-foreground/60 gap-1.5 text-xs sm:text-sm"
              >
                <tab.icon className="h-3.5 w-3.5" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general">
            <BotSettingsGeneral />
          </TabsContent>

          <TabsContent value="license-codes">
            <Suspense fallback={<TabLoader />}>
              <BotCodesContent />
            </Suspense>
          </TabsContent>

        </Tabs>
      </div>
    </BotDashboardLayout>
  );
}