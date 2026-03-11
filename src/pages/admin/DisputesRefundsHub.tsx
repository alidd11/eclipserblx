import { useSearchParams } from 'react-router-dom';
import { RotateCcw, AlertTriangle } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const RefundsPage = lazy(() => import('@/pages/admin/Refunds'));
const DisputesPage = lazy(() => import('@/pages/admin/Disputes'));

const tabs = [
  { value: 'refunds', label: 'Refunds', icon: RotateCcw },
  { value: 'disputes', label: 'Disputes', icon: AlertTriangle },
] as const;

export default function DisputesRefundsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'refunds';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  return (
    <AdminLayout requiredPermissions={['manage_orders']}>
      <div className="space-y-6 w-full">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
                  <RotateCcw className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Refunds & Disputes
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Track refunded orders, commission reversals, and customer disputes</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden sm:grid w-full max-w-md grid-cols-2">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <t.icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-auto min-w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <AdminHubProvider>
            <TabsContent value="refunds">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <RefundsPage />
              </Suspense>
            </TabsContent>

            <TabsContent value="disputes">
              <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                <DisputesPage />
              </Suspense>
            </TabsContent>
          </AdminHubProvider>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
