import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Wallet, DollarSign, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const SellerPayoutsPage = lazy(() => import('@/pages/admin/SellerPayouts'));
const DeveloperPaymentsPage = lazy(() => import('@/pages/admin/DeveloperPayments'));
const ManualPayoutsPage = lazy(() => import('@/pages/admin/ManualPayouts'));

const tabs = [
  { value: 'seller', label: 'Seller Payouts', icon: TrendingUp },
  { value: 'developer', label: 'Developer Payments', icon: Wallet },
  { value: 'manual', label: 'Manual Payouts', icon: DollarSign },
] as const;

export default function PayoutsHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'seller';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  return (
    <AdminLayout requiredPermissions={['view_seller_payouts']}>
      <div className="space-y-6 w-full">
        {/* Page Header */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
                  <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Payouts
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Manage seller payouts, developer payments, and affiliate payouts</p>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="hidden sm:grid w-full max-w-xl grid-cols-3">
            {tabs.map(t => (
              <TabsTrigger key={t.value} value={t.value} className="gap-2">
                <t.icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <div className="sm:hidden">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {tabs.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="seller">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <SellerPayoutsPage />
            </Suspense>
          </TabsContent>

          <TabsContent value="developer">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <DeveloperPaymentsPage />
            </Suspense>
          </TabsContent>

          <TabsContent value="manual">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ManualPayoutsPage />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
