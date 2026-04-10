import { useSearchParams } from 'react-router-dom';
import { Gift, Link2 } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { lazy, Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

const AffiliatesPage = lazy(() => import('@/pages/admin/Affiliates'));
const ReferralsPage = lazy(() => import('@/pages/admin/Referrals'));

const tabs = [
 { value: 'overview', label: 'Overview', icon: Gift },
 { value: 'referrals', label: 'Referrals', icon: Link2 },
] as const;

export default function AffiliateHub() {
 const [searchParams, setSearchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'overview';
 const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

 return (
 <AdminLayout requiredPermissions={['view_affiliates']}>
 <div className="space-y-6 w-full">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-4">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h3 className="font-semibold text-sm text-2xl sm:text-3xl font-display flex items-center gap-2">
 <Gift className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
 Affiliates
 </h3>
 <p className="text-muted-foreground text-sm mt-1">Manage commissions and referral tracking</p>
 </div>
 </div>
 </div>
 </div>

 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
 <TabsList className="hidden sm:grid w-full max-w-xl grid-cols-2">
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
 <TabsContent value="overview">
 <Suspense fallback={<Skeleton className="h-96 w-full" />}>
 <AffiliatesPage />
 </Suspense>
 </TabsContent>

 <TabsContent value="referrals">
 <Suspense fallback={<Skeleton className="h-96 w-full" />}>
 <ReferralsPage />
 </Suspense>
 </TabsContent>
 </AdminHubProvider>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
