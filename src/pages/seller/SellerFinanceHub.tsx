import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { AdminHubProvider } from '@/components/admin/AdminHubContext';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Info, DollarSign, LineChart, Receipt, TrendingUp, Calculator } from 'lucide-react';

const SellerBalance = lazy(() => import('@/pages/seller/SellerBalance'));
const SellerRevenueBreakdown = lazy(() => import('@/pages/seller/SellerRevenueBreakdown'));
const SellerTransactionHistory = lazy(() => import('@/pages/seller/SellerTransactionHistory'));
const SellerTaxFeeSummary = lazy(() => import('@/pages/seller/SellerTaxFeeSummary'));
const SellerTaxSummary = lazy(() => import('@/pages/seller/SellerTaxSummary'));

const tabs = [
  { value: 'overview', label: 'Overview', icon: DollarSign },
  { value: 'revenue', label: 'Revenue', icon: LineChart },
  { value: 'transactions', label: 'Transactions', icon: Receipt },
  { value: 'fees', label: 'Fees', icon: TrendingUp },
  { value: 'tax', label: 'Tax', icon: Calculator },
] as const;

export default function SellerFinanceHub() {
  const { balance, balanceLoading } = useSellerStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => setSearchParams({ tab }, { replace: true });

  const fmt = (v: number) =>
    new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(v);

  return (
    <SellerLayout>
      <TooltipProvider>
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h1 className="text-2xl font-display font-bold">Finance</h1>
            <p className="text-sm text-muted-foreground">
              Track earnings, payouts, transactions, fees, and tax summaries in one place.
            </p>
          </div>

          {/* Inline Summary Stats */}
          <div className="flex items-center gap-6 text-sm flex-wrap">
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-default">
                  Ready to withdraw: <span className="font-semibold text-green-500">{balanceLoading ? '...' : fmt(balance?.available_balance || 0)}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Net earnings available for payout right now.</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-default">
                  Clearing: <span className="font-semibold text-yellow-500">{balanceLoading ? '...' : fmt(balance?.pending_balance || 0)}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Recent sales still being processed (7–14 days).</p></TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-muted-foreground cursor-default">
                  Lifetime: <span className="font-semibold text-foreground">{balanceLoading ? '...' : fmt(balance?.total_earned || 0)}</span>
                </span>
              </TooltipTrigger>
              <TooltipContent><p className="text-xs">Total net earnings across all time.</p></TooltipContent>
            </Tooltip>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            {/* Desktop */}
            <TabsList className="hidden sm:grid w-full max-w-2xl grid-cols-5">
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value} className="gap-1.5">
                  <t.icon className="h-4 w-4" />
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>

            {/* Mobile */}
            <div className="sm:hidden">
              <Select value={activeTab} onValueChange={setActiveTab}>
                <SelectTrigger className="w-auto min-w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tabs.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <AdminHubProvider>
              <TabsContent value="overview">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <SellerBalance />
                </Suspense>
              </TabsContent>

              <TabsContent value="revenue">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <SellerRevenueBreakdown />
                </Suspense>
              </TabsContent>

              <TabsContent value="transactions">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <SellerTransactionHistory />
                </Suspense>
              </TabsContent>

              <TabsContent value="fees">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <SellerTaxFeeSummary />
                </Suspense>
              </TabsContent>

              <TabsContent value="tax">
                <Suspense fallback={<Skeleton className="h-96 w-full" />}>
                  <SellerTaxSummary />
                </Suspense>
              </TabsContent>
            </AdminHubProvider>
          </Tabs>
        </div>
      </TooltipProvider>
    </SellerLayout>
  );
}
