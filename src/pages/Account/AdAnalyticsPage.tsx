import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useAdAnalytics } from '@/hooks/useAdAnalytics';
import { 
  BarChart3, 
  TrendingUp, 
  MousePointerClick, 
  Users, 
  PoundSterling,
  Megaphone,
  Plus,
  ExternalLink,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  Clock,
} from 'lucide-react';
import { format } from 'date-fns';
import { Link, Navigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

const DeviceIcon = ({ device }: { device: string }) => {
  switch (device.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />;
    case 'tablet':
      return <Tablet className="h-4 w-4" />;
    default:
      return <Monitor className="h-4 w-4" />;
  }
};

export default function AdAnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState('overview');
  const {
    advertisements,
    summary,
    dailyClickData,
    deviceBreakdown,
    referrerBreakdown,
    topPerformingAds,
    isLoading,
  } = useAdAnalytics();

  if (authLoading || isLoading) {
    return (
      <MainLayout>
        <div className="container max-w-6xl py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-80" />
        </div>
      </MainLayout>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <MainLayout>
      <div className="container max-w-6xl py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-primary/20 rounded-full flex items-center justify-center">
              <BarChart3 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Ad Analytics</h1>
              <p className="text-sm text-muted-foreground">
                Track your advertisement performance
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/account/advertisements">
                <Megaphone className="h-4 w-4 mr-2" />
                My Ads
              </Link>
            </Button>
            <Button asChild>
              <Link to="/advertise">
                <Plus className="h-4 w-4 mr-2" />
                New Ad
              </Link>
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Clicks</CardTitle>
              <MousePointerClick className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.uniqueClicks.toLocaleString()} unique visitors
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Posted Ads</CardTitle>
              <Megaphone className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.postedAds}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.totalAds} total created
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. Clicks/Ad</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageClicksPerAd}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Per posted advertisement
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Spent</CardTitle>
              <PoundSterling className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalSpent)}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {summary.totalClicks > 0 ? formatCurrency(summary.totalSpent / summary.totalClicks) : '£0'} per click
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Mobile Tab Dropdown */}
        {isMobile && (
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-card">
              <SelectItem value="overview">Overview</SelectItem>
              <SelectItem value="breakdown">Breakdown</SelectItem>
              <SelectItem value="top-ads">Top Ads</SelectItem>
            </SelectContent>
          </Select>
        )}

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {!isMobile && (
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="breakdown">Breakdown</TabsTrigger>
              <TabsTrigger value="top-ads">Top Ads</TabsTrigger>
            </TabsList>
          )}

          <TabsContent value="overview" className="space-y-6">
            {/* Click Trend Chart */}
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Click Trends (Last 30 Days)
                </CardTitle>
                <CardDescription>Daily click activity across all your advertisements</CardDescription>
              </CardHeader>
              <CardContent>
                {dailyClickData.length > 0 ? (
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyClickData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                        <XAxis 
                          dataKey="date" 
                          className="text-xs fill-muted-foreground"
                          tick={{ fontSize: 12 }}
                          interval={isMobile ? 6 : 2}
                        />
                        <YAxis 
                          className="text-xs fill-muted-foreground"
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))', 
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="clicks" 
                          stroke="hsl(var(--primary))" 
                          strokeWidth={2}
                          dot={false}
                          name="Total Clicks"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="h-80 flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <MousePointerClick className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No click data yet</p>
                      <p className="text-sm">Post an advertisement to start tracking</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              {/* Device Breakdown */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Device Breakdown
                  </CardTitle>
                  <CardDescription>Where your clicks are coming from</CardDescription>
                </CardHeader>
                <CardContent>
                  {deviceBreakdown.length > 0 ? (
                    <div className="space-y-4">
                      {deviceBreakdown.map((item, index) => (
                        <div key={item.device} className="flex items-center gap-3">
                          <div 
                            className="h-10 w-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}20` }}
                          >
                            <DeviceIcon device={item.device} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium">{item.device}</span>
                              <span className="text-sm text-muted-foreground">{item.percentage}%</span>
                            </div>
                            <div className="h-2 bg-secondary rounded-full overflow-hidden">
                              <div 
                                className="h-full rounded-full transition-all"
                                style={{ 
                                  width: `${item.percentage}%`,
                                  backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
                                }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{item.count}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <Monitor className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No device data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Traffic Sources */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                    Traffic Sources
                  </CardTitle>
                  <CardDescription>Top referrers to your ads</CardDescription>
                </CardHeader>
                <CardContent>
                  {referrerBreakdown.length > 0 ? (
                    <div className="space-y-3">
                      {referrerBreakdown.map((item, index) => (
                        <div key={item.source} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-5">{index + 1}.</span>
                            <span className="font-medium truncate max-w-[150px]">{item.source}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant="secondary">{item.percentage}%</Badge>
                            <span className="text-sm text-muted-foreground w-12 text-right">{item.count}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-muted-foreground">
                      <ArrowUpRight className="h-10 w-10 mx-auto mb-2 opacity-50" />
                      <p>No referrer data yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="top-ads" className="space-y-6">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-primary" />
                  Top Performing Advertisements
                </CardTitle>
                <CardDescription>Your best performing ads by click count</CardDescription>
              </CardHeader>
              <CardContent>
                {topPerformingAds.length > 0 ? (
                  <div className="space-y-4">
                    {topPerformingAds.map((ad, index) => (
                      <div 
                        key={ad.id} 
                        className="flex items-center gap-4 p-4 rounded-lg bg-secondary/30 border border-border"
                      >
                        <div 
                          className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-lg"
                          style={{ 
                            backgroundColor: index === 0 ? 'hsl(var(--chart-1))' : 'hsl(var(--secondary))',
                            color: index === 0 ? 'white' : 'inherit',
                          }}
                        >
                          {index + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{ad.title}</h4>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {ad.posted_at ? format(new Date(ad.posted_at), 'MMM dd, yyyy') : 'Not posted'}
                            </span>
                            {ad.link_url && (
                              <a 
                                href={ad.link_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 hover:text-primary transition-colors"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Link
                              </a>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold">{ad.total_clicks || 0}</div>
                          <p className="text-xs text-muted-foreground">
                            {ad.unique_clicks || 0} unique
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-muted-foreground">
                    <Megaphone className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No posted advertisements yet</p>
                    <p className="text-sm mb-4">Create and post an ad to see performance data</p>
                    <Button asChild>
                      <Link to="/advertise">Create Advertisement</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
