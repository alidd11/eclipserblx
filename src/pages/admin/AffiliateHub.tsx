import { useSearchParams } from 'react-router-dom';
import { Gift, FileText, Link2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const AffiliatesPage = lazy(() => import('@/pages/admin/Affiliates'));
const AffiliateApplicationsPage = lazy(() => import('@/pages/admin/AffiliateApplications'));
const ReferralsPage = lazy(() => import('@/pages/admin/Referrals'));

const tabs = [
  { value: 'overview', label: 'Overview', icon: Gift },
  { value: 'applications', label: 'Applications', icon: FileText },
  { value: 'referrals', label: 'Referrals', icon: Link2 },
] as const;

export default function AffiliateHub() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  return (
    <AdminLayout requiredPermissions={['view_affiliates']}>
      <div className="space-y-6 w-full">
        <Card className="bg-card border-border">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-2xl sm:text-3xl font-display flex items-center gap-2">
                  <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  Affiliates
                </CardTitle>
                <p className="text-muted-foreground text-sm mt-1">Manage commissions, applications, and referral tracking</p>
              </div>
            </div>
          </CardHeader>
        </Card>

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

          <TabsContent value="overview">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AffiliatesPage />
            </Suspense>
          </TabsContent>

          <TabsContent value="applications">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <AffiliateApplicationsPage />
            </Suspense>
          </TabsContent>

          <TabsContent value="referrals">
            <Suspense fallback={<Skeleton className="h-96 w-full" />}>
              <ReferralsPage />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
