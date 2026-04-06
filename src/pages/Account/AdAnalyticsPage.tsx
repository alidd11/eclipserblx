import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useAdAnalytics } from '@/hooks/useAdAnalytics';
import { AccountPageLayout } from '@/components/account/AccountPageLayout';
import { 
 BarChart3, TrendingUp, MousePointerClick, PoundSterling,
 Megaphone, Plus, ExternalLink, Monitor, Smartphone, Tablet,
 ArrowUpRight, Clock,
} from 'lucide-react';
import { format } from '@/lib/dateUtils';
import { Link, Navigate } from 'react-router-dom';
import { RevolutLineChart } from '@/components/ui/revolut-chart';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const formatCurrency = (amount: number) =>
 new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(amount);

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const DeviceIcon = ({ device }: { device: string }) => {
 switch (device.toLowerCase()) {
 case 'mobile': return <Smartphone className="h-4 w-4" />;
 case 'tablet': return <Tablet className="h-4 w-4" />;
 default: return <Monitor className="h-4 w-4" />;
 }
};

export default function AdAnalyticsPage() {
 const { user, loading: authLoading } = useAuth();
 const isMobile = useIsMobile();
 const [activeTab, setActiveTab] = useState('overview');
 const { summary, dailyClickData, deviceBreakdown, referrerBreakdown, topPerformingAds, isLoading } = useAdAnalytics();

 if (authLoading || isLoading) {
 return (
 <AccountPageLayout title="Ad Analytics" icon={BarChart3} description="Track your advertisement performance" backTo="/account/advertisements" backLabel="My Advertisements">
 <div className="grid gap-4 grid-cols-2 md:grid-cols-4 mb-6">
 {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
 </div>
 <Skeleton className="h-80" />
 </AccountPageLayout>
 );
 }

 if (!user) return <Navigate to="/auth" replace />;

 const headerActions = (
 <>
 <Button variant="outline" size="sm" asChild>
 <Link to="/account/advertisements"><Megaphone className="h-4 w-4 mr-1.5" />My Ads</Link>
 </Button>
 <Button size="sm" asChild>
 <Link to="/advertise"><Plus className="h-4 w-4 mr-1.5" />New Ad</Link>
 </Button>
 </>
 );

 return (
 <AccountPageLayout
 title="Ad Analytics"
 description="Track your advertisement performance"
 icon={BarChart3}
 actions={headerActions}
 backTo="/account/advertisements"
 backLabel="My Advertisements"
 >
 {/* Summary Cards */}
 <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:overflow-visible">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border min-w-[140px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-2">
 <h3 className="font-semibold text-sm text-xs font-medium text-muted-foreground">Total Clicks</h3>
 <MousePointerClick className="h-4 w-4 text-primary" />
 </div>
 <div className="p-4">
 <div className="text-xl font-bold">{summary.totalClicks.toLocaleString()}</div>
 <p className="text-[10px] text-muted-foreground mt-0.5">{summary.uniqueClicks.toLocaleString()} unique</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border min-w-[140px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-2">
 <h3 className="font-semibold text-sm text-xs font-medium text-muted-foreground">Posted Ads</h3>
 <Megaphone className="h-4 w-4 text-green-500" />
 </div>
 <div className="p-4">
 <div className="text-xl font-bold">{summary.postedAds}</div>
 <p className="text-[10px] text-muted-foreground mt-0.5">{summary.totalAds} total</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border min-w-[140px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-2">
 <h3 className="font-semibold text-sm text-xs font-medium text-muted-foreground">Avg. Clicks/Ad</h3>
 <TrendingUp className="h-4 w-4 text-blue-500" />
 </div>
 <div className="p-4">
 <div className="text-xl font-bold">{summary.averageClicksPerAd}</div>
 <p className="text-[10px] text-muted-foreground mt-0.5">Per posted ad</p>
 </div>
 </div>
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border min-w-[140px] flex-shrink-0 md:min-w-0">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-2">
 <h3 className="font-semibold text-sm text-xs font-medium text-muted-foreground">Total Spent</h3>
 <PoundSterling className="h-4 w-4 text-yellow-500" />
 </div>
 <div className="p-4">
 <div className="text-xl font-bold">{formatCurrency(summary.totalSpent)}</div>
 <p className="text-[10px] text-muted-foreground mt-0.5">
 {summary.totalClicks > 0 ? formatCurrency(summary.totalSpent / summary.totalClicks) : '£0'}/click
 </p>
 </div>
 </div>
 </div>

 {/* Mobile Tab Dropdown */}
 {isMobile && (
 <Select value={activeTab} onValueChange={setActiveTab}>
 <SelectTrigger className="w-auto min-w-[140px] bg-card">
 <SelectValue />
 </SelectTrigger>
 <SelectContent className="z-[100] bg-card">
 <SelectItem value="overview">Overview</SelectItem>
 <SelectItem value="breakdown">Breakdown</SelectItem>
 <SelectItem value="top-ads">Top Ads</SelectItem>
 </SelectContent>
 </Select>
 )}

 <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-5">
 {!isMobile && (
 <TabsList>
 <TabsTrigger value="overview">Overview</TabsTrigger>
 <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
 <TabsTrigger value="top-ads">Top Ads</TabsTrigger>
 </TabsList>
 )}

 <TabsContent value="overview" className="space-y-5">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2 text-base">
 <TrendingUp className="h-4 w-4 text-primary" />
 Click Trends (Last 30 Days)
 </h3>
 <p className="text-sm text-muted-foreground text-xs">Daily click activity across all your advertisements</p>
 </div>
 <div className="p-4">
 {dailyClickData.length > 0 ? (
 <RevolutLineChart
 data={dailyClickData}
 xKey="date"
 series={[{ dataKey: 'clicks', color: 'hsl(262 100% 71%)', name: 'Total Clicks' }]}
 height={280}
 />
 ) : (
 <div className="h-60 flex items-center justify-center text-muted-foreground">
 <div className="text-center">
 <MousePointerClick className="h-10 w-10 mx-auto mb-3 opacity-50" />
 <p className="text-sm">No click data yet</p>
 <p className="text-xs">Post an advertisement to start tracking</p>
 </div>
 </div>
 )}
 </div>
 </div>
 </TabsContent>

 <TabsContent value="breakdown" className="space-y-5">
 <div className="grid gap-5 md:grid-cols-2">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2 text-base"><Monitor className="h-4 w-4 text-primary" />Device Breakdown</h3>
 <p className="text-sm text-muted-foreground text-xs">Where your clicks are coming from</p>
 </div>
 <div className="p-4">
 {deviceBreakdown.length > 0 ? (
 <div className="space-y-4">
 {deviceBreakdown.map((item, index) => (
 <div key={item.device} className="flex items-center gap-3">
 <div className="h-9 w-9 rounded-full flex items-center justify-center" style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}>
 <DeviceIcon device={item.device} />
 </div>
 <div className="flex-1">
 <div className="flex items-center justify-between mb-1">
 <span className="text-sm font-medium">{item.device}</span>
 <span className="text-xs text-muted-foreground">{item.percentage}%</span>
 </div>
 <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
 <div className="h-full rounded-full transition-all" style={{ width: `${item.percentage}%`, backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
 </div>
 </div>
 <span className="text-xs font-medium w-10 text-right">{item.count}</span>
 </div>
 ))}
 </div>
 ) : (
 <div className="py-8 text-center text-muted-foreground">
 <Monitor className="h-8 w-8 mx-auto mb-2 opacity-50" />
 <p className="text-sm">No device data yet</p>
 </div>
 )}
 </div>
 </div>

 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2 text-base"><ArrowUpRight className="h-4 w-4 text-primary" />Traffic Sources</h3>
 <p className="text-sm text-muted-foreground text-xs">Top referrers to your ads</p>
 </div>
 <div className="p-4">
 {referrerBreakdown.length > 0 ? (
 <div className="space-y-3">
 {referrerBreakdown.map((item, index) => (
 <div key={item.source} className="flex items-center justify-between py-2 border-b border-border last:border-0">
 <div className="flex items-center gap-2">
 <span className="text-xs text-muted-foreground w-4">{index + 1}.</span>
 <span className="text-sm font-medium truncate max-w-[120px]">{item.source}</span>
 </div>
 <div className="flex items-center gap-2">
 <Badge variant="secondary" className="text-[10px]">{item.percentage}%</Badge>
 <span className="text-xs text-muted-foreground w-10 text-right">{item.count}</span>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="py-8 text-center text-muted-foreground">
 <ArrowUpRight className="h-8 w-8 mx-auto mb-2 opacity-50" />
 <p className="text-sm">No referrer data yet</p>
 </div>
 )}
 </div>
 </div>
 </div>
 </TabsContent>

 <TabsContent value="top-ads" className="space-y-5">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm flex items-center gap-2 text-base"><Megaphone className="h-4 w-4 text-primary" />Top Performing Ads</h3>
 <p className="text-sm text-muted-foreground text-xs">Your best performing ads by click count</p>
 </div>
 <div className="p-4">
 {topPerformingAds.length > 0 ? (
 <div className="space-y-3">
 {topPerformingAds.map((ad, index) => (
 <div key={ad.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/30 border border-border">
 <div className="h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
 style={{ backgroundColor: index === 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--secondary))', color: index === 0 ? 'white' : 'inherit' }}>
 {index + 1}
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="text-sm font-medium truncate">{ad.title}</h4>
 <div className="flex items-center gap-3 text-xs text-muted-foreground">
 <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{ad.posted_at ? format(new Date(ad.posted_at), 'MMM dd, yyyy') : 'Not posted'}</span>
 {ad.link_url && (
 <a href={ad.link_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:text-primary transition-colors">
 <ExternalLink className="h-3 w-3" />Link
 </a>
 )}
 </div>
 </div>
 <div className="text-right shrink-0">
 <div className="text-lg font-bold">{ad.total_clicks || 0}</div>
 <p className="text-[10px] text-muted-foreground">{ad.unique_clicks || 0} unique</p>
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="py-10 text-center text-muted-foreground">
 <Megaphone className="h-10 w-10 mx-auto mb-3 opacity-50" />
 <p className="text-sm">No posted advertisements yet</p>
 <p className="text-xs mb-4">Create and post an ad to see performance data</p>
 <Button size="sm" asChild>
 <Link to="/advertise">Create Advertisement</Link>
 </Button>
 </div>
 )}
 </div>
 </div>
 </TabsContent>
 </Tabs>
 </AccountPageLayout>
 );
}
