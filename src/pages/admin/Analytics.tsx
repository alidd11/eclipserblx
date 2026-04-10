import { useState } from 'react';
import { Package, ShoppingCart, Users, Download, TrendingUp, BarChart3, Eye, UserPlus, UserCheck, Monitor, Smartphone, Tablet, Globe, Clock, ArrowRight, Store, Link2, MousePointerClick, FileDown, MapPin } from 'lucide-react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { RevolutBarChart, RevolutAreaChart } from '@/components/ui/revolut-chart';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { format } from '@/lib/dateUtils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PercentChange } from '@/components/admin/analytics/PercentChange';
import { exportToCSV } from '@/lib/export-csv';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';

export default function AdminAnalytics() {
 const [activeTab, setActiveTab] = useState('overview');
 const [range, setRange] = useState<'7d' | '14d' | '30d'>('7d');
 const rangeLabel = range === '7d' ? '7 Days' : range === '14d' ? '14 Days' : '30 Days';

 const {
 stats, productDownloads, downloadTrend, orderTrend, categoryStats, userTrend,
 pageVisitStats, pageVisitsByPage, deviceStats, browserStats, visitTrend, recentVisits,
 sellerAnalyticsStats, sellerEventTypes, sellerAnalyticsTrend, topStores, sellerDeviceStats,
 referralStats, referralTrend, topReferrers, recentReferrals,
 currentPeriodStats, previousPeriodStats, countryStats,
 } = useAnalyticsData(range);

 const getDeviceIcon = (device: string) => {
 switch (device) {
 case 'mobile': return <Smartphone className="h-4 w-4" />;
 case 'tablet': return <Tablet className="h-4 w-4" />;
 default: return <Monitor className="h-4 w-4" />;
 }
 };

 return (
 <AdminLayout requiredPermissions={['view_analytics']}>
 <div className="space-y-6">
  <AdminPageHeader
    title="Analytics"
    description="Comprehensive platform metrics and insights"
    actions={
      <div className="flex items-center gap-2">
        <div className="flex items-center bg-muted rounded-lg p-0.5">
          {(['7d', '14d', '30d'] as const).map(r => (
            <Button key={r} variant={range === r ? 'default' : 'ghost'} size="sm" onClick={() => setRange(r)} className="text-xs h-7 px-3">
              {r}
            </Button>
          ))}
        </div>
        <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => {
          const exportData = activeTab === 'page-visits' ? recentVisits : activeTab === 'referrals' ? recentReferrals : downloadTrend;
          if (exportData?.length) exportToCSV(exportData as any[], `analytics-${activeTab}-${range}`);
        }}>
          <FileDown className="h-3.5 w-3.5 mr-1" />
          Export
        </Button>
      </div>
    }
  />

 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
 <div className="sm:hidden">
 <Select value={activeTab} onValueChange={setActiveTab}>
 <SelectTrigger className="w-auto min-w-[140px] bg-background">
 <SelectValue placeholder="Select view" />
 </SelectTrigger>
 <SelectContent className="bg-card border-border z-50">
 <SelectItem value="overview"><div className="flex items-center gap-2"><BarChart3 className="h-4 w-4" />Overview</div></SelectItem>
 <SelectItem value="page-visits"><div className="flex items-center gap-2"><Eye className="h-4 w-4" />Page Visits</div></SelectItem>
 <SelectItem value="seller-analytics"><div className="flex items-center gap-2"><Store className="h-4 w-4" />Seller Analytics</div></SelectItem>
 <SelectItem value="referrals"><div className="flex items-center gap-2"><Link2 className="h-4 w-4" />Referrals</div></SelectItem>
 </SelectContent>
 </Select>
 </div>

 <TabsList className="hidden sm:grid w-full grid-cols-4">
 <TabsTrigger value="overview">Overview</TabsTrigger>
 <TabsTrigger value="page-visits">Page Visits</TabsTrigger>
 <TabsTrigger value="seller-analytics">Seller Analytics</TabsTrigger>
 <TabsTrigger value="referrals">Referrals</TabsTrigger>
 </TabsList>

 {/* ============ OVERVIEW TAB ============ */}
 <TabsContent value="overview" className="space-y-4">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3">
 <h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-5 w-5" />Overview</h3>
 </div>
 <div className="p-4">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><ShoppingCart className="h-5 w-5 text-primary" /></div>
 <div><p className="text-2xl font-bold">{stats?.orders ?? 0}</p><p className="text-xs text-muted-foreground">Total Orders</p></div>
 {currentPeriodStats && previousPeriodStats && <PercentChange current={currentPeriodStats.orders} previous={previousPeriodStats.orders} label={`vs prev ${range}`} />}
 <p className="text-[10px] text-muted-foreground/70">{stats?.pendingOrders ?? 0} pending · {stats?.completedOrders ?? 0} completed</p>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><Package className="h-5 w-5 text-primary" /></div>
 <div><p className="text-2xl font-bold">{stats?.products ?? 0}</p><p className="text-xs text-muted-foreground">Products</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
 <div><p className="text-2xl font-bold">{stats?.users ?? 0}</p><p className="text-xs text-muted-foreground">Users</p></div>
 {currentPeriodStats && previousPeriodStats && <PercentChange current={currentPeriodStats.users} previous={previousPeriodStats.users} label={`vs prev ${range}`} />}
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><Download className="h-5 w-5 text-primary" /></div>
 <div><p className="text-2xl font-bold">{stats?.downloads ?? 0}</p><p className="text-xs text-muted-foreground">Downloads</p></div>
 {currentPeriodStats && previousPeriodStats && <PercentChange current={currentPeriodStats.downloads} previous={previousPeriodStats.downloads} label={`vs prev ${range}`} />}
 </div>
 </div>
 </div>
 </div>

 {/* Conversion Funnel */}
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><ArrowRight className="h-5 w-5" />Conversion Funnel</h3></div>
 <div className="p-4">
 {(() => {
 const visits = pageVisitStats?.total ?? 0;
 const productViews = sellerAnalyticsStats?.productViews ?? 0;
 const orders = stats?.orders ?? 0;
 const maxVal = Math.max(visits, 1);
 const stages = [
 { label: 'Page Visits', value: visits },
 { label: 'Product Views', value: productViews },
 { label: 'Orders', value: orders },
 ];
 return (
 <div className="space-y-3">
 {stages.map((stage, i) => {
 const pct = visits > 0 ? ((stage.value / maxVal) * 100).toFixed(1) : '0';
 const dropoff = i > 0 && stages[i - 1].value > 0 ? ((1 - stage.value / stages[i - 1].value) * 100).toFixed(0) : null;
 return (
 <div key={stage.label} className="space-y-1">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-sm font-medium">{stage.label}</span>
 {dropoff && <span className="text-[10px] text-muted-foreground">-{dropoff}% drop</span>}
 </div>
 <span className="text-sm font-bold">{stage.value.toLocaleString()}</span>
 </div>
 <div className="h-2 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${pct}%`, opacity: 1 - i * 0.2 }} />
 </div>
 </div>
 );
 })}
 </div>
 );
 })()}
 </div>
 </div>

 {/* Quick Stats Row */}
 <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><Eye className="h-4 w-4" />Page Visits</h3></div>
 <div className="p-4">
 <p className="text-3xl font-bold">{pageVisitStats?.total ?? 0}</p>
 <p className="text-xs text-muted-foreground mt-1">{pageVisitStats?.newVisitors ?? 0} new · {pageVisitStats?.returningVisitors ?? 0} returning</p>
 </div>
 </div>
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><Store className="h-4 w-4" />Seller Events</h3></div>
 <div className="p-4">
 <p className="text-3xl font-bold">{sellerAnalyticsStats?.total ?? 0}</p>
 <p className="text-xs text-muted-foreground mt-1">{sellerAnalyticsStats?.storeViews ?? 0} store views · {sellerAnalyticsStats?.productViews ?? 0} product views</p>
 </div>
 </div>
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-2"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><Link2 className="h-4 w-4" />Referral Clicks</h3></div>
 <div className="p-4">
 <p className="text-3xl font-bold">{referralStats?.totalClicks ?? 0}</p>
 <p className="text-xs text-muted-foreground mt-1">{referralStats?.uniqueReferrers ?? 0} referrers · {referralStats?.conversions ?? 0} conversions</p>
 </div>
 </div>
 </div>

 {/* Charts */}
 <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-5 w-5" />Downloads (Last {rangeLabel})</h3></div>
 <div className="p-4"><RevolutAreaChart data={downloadTrend || []} xKey="date" series={[{ dataKey: 'downloads', color: 'hsl(262 100% 71%)', name: 'Downloads', gradientId: 'dlGrad' }]} height={250} /></div>
 </div>
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><ShoppingCart className="h-5 w-5" />Orders (Last {rangeLabel})</h3></div>
 <div className="p-4"><RevolutAreaChart data={orderTrend || []} xKey="date" series={[{ dataKey: 'orders', color: 'hsl(220 95% 59%)', name: 'Orders', gradientId: 'ordGrad' }]} height={250} /></div>
 </div>
 </div>

 <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><Users className="h-5 w-5" />New Users (Last {rangeLabel})</h3></div>
 <div className="p-4"><RevolutAreaChart data={userTrend || []} xKey="date" series={[{ dataKey: 'users', color: 'hsl(240 90% 65%)', name: 'Users', gradientId: 'usrGrad' }]} height={250} /></div>
 </div>
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><BarChart3 className="h-5 w-5" />Products by Category</h3></div>
 <div className="p-4">
 {categoryStats?.length === 0 ? <p className="text-muted-foreground text-center py-8">No products yet</p> : (
 <RevolutDonutChart data={categoryStats || []} height={320} showLabels={false} showLegend innerRadius={50} outerRadius={85} />
 )}
 </div>
 </div>
 </div>

 {/* Top Downloaded Products */}
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><Download className="h-5 w-5" />Top Downloaded Products</h3></div>
 <div className="p-4">
 {productDownloads?.length === 0 ? <p className="text-muted-foreground text-center py-8">No downloads yet</p> : (
 <div className="space-y-3">
 {productDownloads?.map((product, index) => (
 <div key={product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
 <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">{index + 1}</div>
 {product.images?.[0] && <img src={product.images[0]} alt={product.name} className="w-9 h-9 rounded-lg object-cover shrink-0" />}
 <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{product.name}</p></div>
 <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0"><Download className="h-3.5 w-3.5" />{product.download_count ?? 0}</div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </TabsContent>

 {/* ============ PAGE VISITS TAB ============ */}
 <TabsContent value="page-visits" className="space-y-4">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><Eye className="h-5 w-5" />Visitor Overview</h3></div>
 <div className="p-4">
 <div className="grid grid-cols-3 gap-3">
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><Eye className="h-5 w-5 text-primary" /></div>
 <div><p className="text-2xl font-bold">{pageVisitStats?.total ?? 0}</p><p className="text-xs text-muted-foreground">Total Visits</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-2/10"><UserPlus className="h-5 w-5 text-chart-2" /></div>
 <div><p className="text-2xl font-bold">{pageVisitStats?.newVisitors ?? 0}</p><p className="text-xs text-muted-foreground">New Visitors</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-3/10"><UserCheck className="h-5 w-5 text-chart-3" /></div>
 <div><p className="text-2xl font-bold">{pageVisitStats?.returningVisitors ?? 0}</p><p className="text-xs text-muted-foreground">Returning</p></div>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-5 w-5" />Visitor Trend (Last {rangeLabel})</h3></div>
 <div className="p-4">
 <RevolutAreaChart data={visitTrend || []} xKey="date" series={[
 { dataKey: 'new', color: 'hsl(262 100% 71%)', name: 'New' },
 { dataKey: 'returning', color: 'hsl(220 95% 59%)', name: 'Returning' },
 ]} height={250} />
 </div>
 </div>

 <div className="grid gap-4 grid-cols-1 lg:grid-cols-3">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><Globe className="h-4 w-4" />By Page</h3></div>
 <div className="p-4">
 {pageVisitsByPage?.length === 0 ? <p className="text-muted-foreground text-center py-4 text-sm">No visits yet</p> : (
 <div className="space-y-2">
 {pageVisitsByPage?.slice(0, 5).map((item) => (
 <div key={item.page} className="flex items-center justify-between p-2 rounded bg-muted/50">
 <span className="text-sm truncate flex-1">{item.page}</span>
 <Badge variant="secondary" className="ml-2">{item.count}</Badge>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><Monitor className="h-4 w-4" />By Device</h3></div>
 <div className="p-4">
 {deviceStats?.length === 0 ? <p className="text-muted-foreground text-center py-4 text-sm">No data yet</p> : (
 <RevolutDonutChart data={deviceStats || []} height={150} innerRadius={30} outerRadius={50} showLegend={false} showLabels />
 )}
 </div>
 </div>
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><Globe className="h-4 w-4" />By Browser</h3></div>
 <div className="p-4">
 {browserStats?.length === 0 ? <p className="text-muted-foreground text-center py-4 text-sm">No data yet</p> : (
 <RevolutDonutChart data={browserStats || []} height={150} innerRadius={30} outerRadius={50} showLegend={false} showLabels />
 )}
 </div>
 </div>
 </div>

 {/* Country Breakdown */}
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><MapPin className="h-4 w-4" />By Country</h3></div>
 <div className="p-4">
 {!countryStats || countryStats.length === 0 ? <p className="text-muted-foreground text-center py-4 text-sm">No country data yet</p> : (
 <div className="space-y-2">
 {countryStats.slice(0, 8).map((item) => {
 const maxVal = countryStats[0]?.value || 1;
 return (
 <div key={item.name} className="space-y-1">
 <div className="flex items-center justify-between">
 <span className="text-sm">{item.name}</span>
 <span className="text-xs text-muted-foreground">{item.value}</span>
 </div>
 <div className="h-1.5 bg-muted rounded-full overflow-hidden">
 <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(item.value / maxVal) * 100}%` }} />
 </div>
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* Recent Visit Logs */}
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><Clock className="h-5 w-5" />Recent Visit Logs</h3></div>
 <div className="p-4 p-0 sm:p-6">
 <div className="overflow-x-auto">
 <div className="max-h-[400px] overflow-y-auto">
 <Table>
 <TableHeader className="sticky top-0 bg-card z-10">
 <TableRow>
 <TableHead className="whitespace-nowrap">Time</TableHead>
 <TableHead className="whitespace-nowrap">Page</TableHead>
 <TableHead className="whitespace-nowrap">Type</TableHead>
 <TableHead className="whitespace-nowrap">Device</TableHead>
 <TableHead className="whitespace-nowrap">Browser</TableHead>
 <TableHead className="whitespace-nowrap">Referrer</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {recentVisits?.map((visit) => (
 <TableRow key={visit.id}>
 <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(visit.created_at), 'MMM d, HH:mm')}</TableCell>
 <TableCell className="font-medium text-sm whitespace-nowrap">{visit.page_path}</TableCell>
 <TableCell className="whitespace-nowrap"><Badge variant={visit.is_new_visitor ? 'default' : 'secondary'} className="text-xs">{visit.is_new_visitor ? 'New' : 'Returning'}</Badge></TableCell>
 <TableCell className="whitespace-nowrap"><div className="flex items-center gap-1.5">{getDeviceIcon(visit.device_type || 'desktop')}<span className="text-xs capitalize">{visit.device_type || 'unknown'}</span></div></TableCell>
 <TableCell className="text-xs whitespace-nowrap">{visit.browser || 'unknown'}</TableCell>
 <TableCell className="text-xs text-muted-foreground whitespace-nowrap max-w-[150px] truncate">{visit.referrer || '-'}</TableCell>
 </TableRow>
 ))}
 {(!recentVisits || recentVisits.length === 0) && (
 <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No visits recorded yet</TableCell></TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 </div>
 </div>
 </div>
 </TabsContent>

 {/* ============ SELLER ANALYTICS TAB ============ */}
 <TabsContent value="seller-analytics" className="space-y-4">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><Store className="h-5 w-5" />Seller Analytics Overview</h3></div>
 <div className="p-4">
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><MousePointerClick className="h-5 w-5 text-primary" /></div>
 <div><p className="text-2xl font-bold">{sellerAnalyticsStats?.total ?? 0}</p><p className="text-xs text-muted-foreground">Total Events</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-2/10"><Store className="h-5 w-5 text-chart-2" /></div>
 <div><p className="text-2xl font-bold">{sellerAnalyticsStats?.storeViews ?? 0}</p><p className="text-xs text-muted-foreground">Store Views</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-3/10"><Package className="h-5 w-5 text-chart-3" /></div>
 <div><p className="text-2xl font-bold">{sellerAnalyticsStats?.productViews ?? 0}</p><p className="text-xs text-muted-foreground">Product Views</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-4/10"><Users className="h-5 w-5 text-chart-4" /></div>
 <div><p className="text-2xl font-bold">{sellerAnalyticsStats?.uniqueStores ?? 0}</p><p className="text-xs text-muted-foreground">Active Stores</p></div>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-5 w-5" />Seller Activity (Last {rangeLabel})</h3></div>
 <div className="p-4">
 <RevolutAreaChart data={sellerAnalyticsTrend || []} xKey="date" series={[
 { dataKey: 'storeViews', color: 'hsl(262 100% 71%)', name: 'Store Views' },
 { dataKey: 'productViews', color: 'hsl(220 95% 59%)', name: 'Product Views' },
 ]} height={250} />
 </div>
 </div>

 <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><BarChart3 className="h-4 w-4" />By Event Type</h3></div>
 <div className="p-4">{sellerEventTypes?.length === 0 ? <p className="text-muted-foreground text-center py-4 text-sm">No events yet</p> : <RevolutDonutChart data={sellerEventTypes || []} height={200} showLabels />}</div>
 </div>
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2 text-sm"><Monitor className="h-4 w-4" />By Device</h3></div>
 <div className="p-4">{sellerDeviceStats?.length === 0 ? <p className="text-muted-foreground text-center py-4 text-sm">No data yet</p> : <RevolutDonutChart data={sellerDeviceStats || []} height={200} showLabels />}</div>
 </div>
 </div>

 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><Store className="h-5 w-5" />Top Stores by Views</h3></div>
 <div className="p-4">
 {topStores?.length === 0 ? <p className="text-muted-foreground text-center py-8">No store activity yet</p> : (
 <div className="space-y-3">
 {topStores?.map((store, index) => (
 <div key={store.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
 <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">{index + 1}</div>
 {store.logo_url ? <img src={store.logo_url} alt={store.name} className="w-9 h-9 rounded-lg object-cover shrink-0" /> : (
 <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0"><Store className="h-4 w-4 text-muted-foreground" /></div>
 )}
 <div className="flex-1 min-w-0"><p className="font-medium text-sm truncate">{store.name}</p></div>
 <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0"><Eye className="h-3.5 w-3.5" />{store.views}</div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </TabsContent>

 {/* ============ REFERRALS TAB ============ */}
 <TabsContent value="referrals" className="space-y-4">
 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 pb-3"><h3 className="font-semibold text-sm flex items-center gap-2"><Link2 className="h-5 w-5" />Referral Analytics Overview</h3></div>
 <div className="p-4">
 <div className="grid grid-cols-3 gap-3">
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/10"><MousePointerClick className="h-5 w-5 text-primary" /></div>
 <div><p className="text-2xl font-bold">{referralStats?.totalClicks ?? 0}</p><p className="text-xs text-muted-foreground">Total Clicks</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-2/10"><Users className="h-5 w-5 text-chart-2" /></div>
 <div><p className="text-2xl font-bold">{referralStats?.uniqueReferrers ?? 0}</p><p className="text-xs text-muted-foreground">Active Referrers</p></div>
 </div>
 <div className="flex flex-col items-center gap-2 p-4 rounded-lg bg-muted/50 text-center">
 <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-chart-3/10"><UserPlus className="h-5 w-5 text-chart-3" /></div>
 <div><p className="text-2xl font-bold">{referralStats?.conversions ?? 0}</p><p className="text-xs text-muted-foreground">Conversions</p></div>
 </div>
 </div>
 </div>
 </div>

 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><TrendingUp className="h-5 w-5" />Referral Clicks (Last {rangeLabel})</h3></div>
 <div className="p-4"><RevolutAreaChart data={referralTrend || []} xKey="date" series={[{ dataKey: 'clicks', color: 'hsl(262 100% 71%)', name: 'Clicks' }]} height={250} /></div>
 </div>

 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><Users className="h-5 w-5" />Top Referrers</h3></div>
 <div className="p-4">
 {topReferrers?.length === 0 ? <p className="text-muted-foreground text-center py-8">No referral activity yet</p> : (
 <div className="space-y-3">
 {topReferrers?.map((referrer, index) => (
 <div key={referrer.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
 <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">{index + 1}</div>
 {referrer.avatar_url ? <img src={referrer.avatar_url} alt={referrer.name} className="w-9 h-9 rounded-full object-cover shrink-0" /> : (
 <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center shrink-0"><Users className="h-4 w-4 text-muted-foreground" /></div>
 )}
 <div className="flex-1 min-w-0">
 <p className="font-medium text-sm truncate">{referrer.name}</p>
 <p className="text-xs text-muted-foreground font-mono">{referrer.code}</p>
 </div>
 <div className="flex items-center gap-1 text-primary font-bold text-sm shrink-0"><MousePointerClick className="h-3.5 w-3.5" />{referrer.clicks}</div>
 </div>
 ))}
 </div>
 )}
 </div>
 </div>

 <div className="bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30"><h3 className="font-semibold text-sm flex items-center gap-2"><Clock className="h-5 w-5" />Recent Referral Clicks</h3></div>
 <div className="p-4 p-0 sm:p-6">
 <div className="overflow-x-auto">
 <div className="max-h-[400px] overflow-y-auto">
 <Table>
 <TableHeader className="sticky top-0 bg-card z-10">
 <TableRow>
 <TableHead className="whitespace-nowrap">Time</TableHead>
 <TableHead className="whitespace-nowrap">Referral Code</TableHead>
 <TableHead className="whitespace-nowrap">User Agent</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {recentReferrals?.map((referral) => (
 <TableRow key={referral.id}>
 <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(referral.created_at), 'MMM d, HH:mm')}</TableCell>
 <TableCell className="font-medium text-sm whitespace-nowrap font-mono">{referral.referral_code}</TableCell>
 <TableCell className="text-xs text-muted-foreground whitespace-nowrap max-w-[300px] truncate">{referral.user_agent || '-'}</TableCell>
 </TableRow>
 ))}
 {(!recentReferrals || recentReferrals.length === 0) && (
 <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">No referral clicks yet</TableCell></TableRow>
 )}
 </TableBody>
 </Table>
 </div>
 </div>
 </div>
 </div>
 </TabsContent>
 </Tabs>
 </div>
 </AdminLayout>
 );
}
