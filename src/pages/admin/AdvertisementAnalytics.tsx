import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAdAnalytics } from '@/hooks/useAdminAdAnalytics';
import { RevolutLineChart, RevolutBarChart, RevolutAreaChart } from '@/components/ui/revolut-chart';
import { RevolutDonutChart } from '@/components/ui/revolut-donut-chart';
import { 
 Megaphone, 
 MousePointerClick, 
 TrendingUp, 
 Users, 
 Monitor,
 Smartphone,
 Tablet,
 ExternalLink,
 Clock
} from 'lucide-react';
import { format } from '@/lib/dateUtils';

const formatCurrency = (amount: number) => {
 return new Intl.NumberFormat('en-GB', {
 style: 'currency',
 currency: 'GBP',
 }).format(amount);
};

const getDeviceIcon = (device: string) => {
 const lowerDevice = device.toLowerCase();
 if (lowerDevice === 'mobile') return <Smartphone className="h-4 w-4" />;
 if (lowerDevice === 'tablet') return <Tablet className="h-4 w-4" />;
 return <Monitor className="h-4 w-4" />;
};

export default function AdvertisementAnalytics() {
 const {
 summary,
 dailyData,
 tierBreakdown,
 deviceBreakdown,
 topPerformingAds,
 recentAds,
 monthlyRevenue,
 isLoading,
 } = useAdminAdAnalytics();

 if (isLoading) {
 return (
 <AdminLayout requiredPermissions={['view_analytics']}>
 <div className="space-y-4">
 <Skeleton className="h-8 w-64" />
 <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
 {[...Array(8)].map((_, i) => (
 <Skeleton key={i} className="h-24" />
 ))}
 </div>
 <Skeleton className="h-80" />
 </div>
 </AdminLayout>
 );
 }

 // Transform tier breakdown for donut chart
 const tierDonutData = tierBreakdown.map(t => ({ name: t.tier, value: t.count }));

 return (
 <AdminLayout requiredPermissions={['view_analytics']}>
 <div className="space-y-4">
 {/* Header */}
 <div>
 <h1 className="text-2xl font-bold flex items-center gap-2">
 <Megaphone className="h-6 w-6 text-primary" />
 Advertisement Analytics
 </h1>
 <p className="text-muted-foreground">
 Overview of all advertisement performance and revenue
 </p>
 </div>

 {/* Summary Stats */}
 <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
 <AdminStatCard
 label="Total Ads"
 value={summary.totalAds}
 subtitle={`${summary.postedAds} posted, ${summary.pendingAds} pending`}
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 <AdminStatCard
 label="Total Clicks"
 value={summary.totalClicks.toLocaleString()}
 subtitle={`${summary.uniqueClicks.toLocaleString()} unique`}
 valueColor="blue"
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 <AdminStatCard
 label="Total Revenue"
 value={formatCurrency(summary.totalRevenue + summary.totalPingRevenue)}
 subtitle={`${formatCurrency(summary.totalPingRevenue)} from pings`}
 valueColor="green"
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 <AdminStatCard
 label="This Month"
 value={formatCurrency(monthlyRevenue)}
 subtitle="Revenue this month"
 valueColor="primary"
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 </div>

 <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
 <AdminStatCard
 label="Active Subscriptions"
 value={summary.activeSubscriptions}
 valueColor="blue"
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 <AdminStatCard
 label="Avg Clicks/Ad"
 value={summary.avgClicksPerAd}
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 <AdminStatCard
 label="Posted Ads"
 value={summary.postedAds}
 valueColor="green"
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 <AdminStatCard
 label="Pending Ads"
 value={summary.pendingAds}
 valueColor="yellow"
 className="min-w-[160px] flex-shrink-0 md:min-w-0"
 />
 </div>

 {/* Charts Row */}
 <div className="grid gap-6 lg:grid-cols-2">
 {/* Clicks Over Time */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <MousePointerClick className="h-5 w-5" />
 Clicks Over Time
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
 </div>
 <div className="p-4">
 <RevolutLineChart
 data={dailyData}
 xKey="date"
 series={[{ dataKey: 'clicks', color: 'hsl(262 100% 71%)', name: 'Clicks' }]}
 height={256}
 />
 </div>
 </div>

 {/* Revenue Over Time */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <TrendingUp className="h-5 w-5" />
 Revenue Over Time
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
 </div>
 <div className="p-4">
 <RevolutAreaChart
 data={dailyData}
 xKey="date"
 series={[{ dataKey: 'revenue', color: 'hsl(200 80% 45%)', name: 'Revenue' }]}
 height={256}
 yFormatter={(v) => `£${v}`}
 tooltipFormatter={(value: number) => [formatCurrency(value), 'Revenue']}
 />
 </div>
 </div>
 </div>

 {/* Breakdowns Row */}
 <div className="grid gap-6 lg:grid-cols-3">
 {/* Subscription Tiers */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Users className="h-5 w-5" />
 Subscription Tiers
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">Active subscriptions by tier</p>
 </div>
 <div className="p-4">
 {tierBreakdown.length > 0 ? (
 <RevolutDonutChart data={tierDonutData} height={192} />
 ) : (
 <p className="text-muted-foreground text-center py-8">No active subscriptions</p>
 )}
 </div>
 </div>

 {/* Device Breakdown */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Monitor className="h-5 w-5" />
 Device Breakdown
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">Clicks by device type</p>
 </div>
 <div className="p-4">
 {deviceBreakdown.length > 0 ? (
 <div className="space-y-3">
 {deviceBreakdown.map((item) => (
 <div key={item.device} className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 {getDeviceIcon(item.device)}
 <span>{item.device}</span>
 </div>
 <div className="flex items-center gap-2">
 <span className="text-muted-foreground text-sm">{item.count}</span>
 <Badge variant="secondary">{item.percentage}%</Badge>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-muted-foreground text-center py-8">No click data</p>
 )}
 </div>
 </div>

 {/* Ads Posted Per Day */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2">
 <Megaphone className="h-5 w-5" />
 Ads Posted
 </h3>
 <p className="text-xs text-muted-foreground mt-0.5">Last 30 days</p>
 </div>
 <div className="p-4">
 <RevolutAreaChart
 data={dailyData}
 xKey="date"
 series={[{ dataKey: 'adsPosted', color: 'hsl(185 85% 50%)', name: 'Ads Posted' }]}
 height={192}
 />
 </div>
 </div>
 </div>

 {/* Tables Row */}
 <div className="grid gap-6 lg:grid-cols-2">
 {/* Top Performing Ads */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm">Top Performing Ads</h3>
 <p className="text-xs text-muted-foreground mt-0.5">By total clicks</p>
 </div>
 <div className="p-4">
 {topPerformingAds.length > 0 ? (
 <div className="space-y-3">
 {topPerformingAds.map((ad, index) => (
 <div key={ad.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
 <div className="flex items-center gap-3 min-w-0">
 <span className="text-muted-foreground font-mono text-sm w-6">#{index + 1}</span>
 <div className="min-w-0">
 <p className="font-medium truncate">{ad.title}</p>
 <p className="text-sm text-muted-foreground">
 {ad.discord_username || 'Unknown user'}
 </p>
 </div>
 </div>
 <div className="flex items-center gap-4 shrink-0">
 <div className="text-right">
 <p className="font-medium">{ad.total_clicks || 0}</p>
 <p className="text-xs text-muted-foreground">clicks</p>
 </div>
 {ad.link_url && (
 <a 
 href={ad.link_url} 
 target="_blank" 
 rel="noopener noreferrer"
 className="text-primary hover:text-primary/80"
 >
 <ExternalLink className="h-4 w-4" />
 </a>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-muted-foreground text-center py-8">No posted ads yet</p>
 )}
 </div>
 </div>

 {/* Recent Ads */}
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm">Recent Ads</h3>
 <p className="text-xs text-muted-foreground mt-0.5">Latest advertisements</p>
 </div>
 <div className="p-4">
 {recentAds.length > 0 ? (
 <div className="space-y-3">
 {recentAds.map((ad) => (
 <div key={ad.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
 <div className="min-w-0 flex-1">
 <p className="font-medium truncate">{ad.title}</p>
 <div className="flex items-center gap-2 text-sm text-muted-foreground">
 <Clock className="h-3 w-3" />
 {format(new Date(ad.created_at), 'MMM dd, HH:mm')}
 </div>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 <Badge 
 variant={
 ad.status === 'posted' ? 'default' :
 ad.status === 'paid' ? 'secondary' :
 'outline'
 }
 >
 {ad.status}
 </Badge>
 {ad.price_paid && (
 <span className="text-sm font-medium text-green-500">
 {formatCurrency(ad.price_paid)}
 </span>
 )}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <p className="text-muted-foreground text-center py-8">No ads yet</p>
 )}
 </div>
 </div>
 </div>
 </div>
 </AdminLayout>
 );
}
