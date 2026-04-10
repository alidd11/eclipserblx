import { useSearchParams } from 'react-router-dom';
import { TrendingUp, Wallet, DollarSign, Users } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
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

const sellerStatusOptions = [
 { value: 'pending', label: 'Pending' },
 { value: 'awaiting_funds', label: 'Awaiting Funds' },
 { value: 'processing', label: 'Processing' },
 { value: 'completed', label: 'Completed' },
 { value: 'rejected', label: 'Rejected' },
 { value: 'all', label: 'All Payouts' },
] as const;

export default function PayoutsHub() {
 const [searchParams, setSearchParams] = useSearchParams();
 const activeTab = searchParams.get('tab') || 'seller';
 const sellerStatus = searchParams.get('sellerStatus') || 'pending';

 const updateSearchParam = (key: string, value: string) => {
 const next = new URLSearchParams(searchParams);
 next.set(key, value);
 setSearchParams(next, { replace: true });
 };

 const setActiveTab = (tab: string) => updateSearchParam('tab', tab);
 const setSellerStatus = (status: string) => updateSearchParam('sellerStatus', status);

 return (
 <AdminLayout requiredPermissions={['view_seller_payouts']}>
 <div className="space-y-6 w-full">
 {/* Page Header */}
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-4">
 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
 <div>
 <h3 className="font-semibold text-sm text-2xl sm:text-3xl font-display flex items-center gap-2">
 <Users className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
 Payouts
 </h3>
 <p className="text-muted-foreground text-sm mt-1">Manage seller payouts, developer payments, and affiliate payouts</p>
 </div>
 </div>
 </div>
 </div>

 {/* Tabs */}
 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
 <div className="hidden sm:flex items-center justify-between gap-3">
 <TabsList className="grid w-full max-w-xl grid-cols-3">
 {tabs.map(t => (
 <TabsTrigger key={t.value} value={t.value} className="gap-2">
 <t.icon className="h-4 w-4" />
 {t.label}
 </TabsTrigger>
 ))}
 </TabsList>

 {activeTab === 'seller' && (
 <Select value={sellerStatus} onValueChange={setSellerStatus}>
 <SelectTrigger className="w-auto min-w-[140px]">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {sellerStatusOptions.map(option => (
 <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 </div>

 <div className="sm:hidden flex items-center justify-between gap-2">
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

 {activeTab === 'seller' && (
 <Select value={sellerStatus} onValueChange={setSellerStatus}>
 <SelectTrigger className="w-auto min-w-[140px]">
 <SelectValue />
 </SelectTrigger>
 <SelectContent>
 {sellerStatusOptions.map(option => (
 <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
 ))}
 </SelectContent>
 </Select>
 )}
 </div>

 <AdminHubProvider>
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
 </AdminHubProvider>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
