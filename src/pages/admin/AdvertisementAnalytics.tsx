import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminStatCard } from '@/components/admin/AdminStatCard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminAdAnalytics } from '@/hooks/useAdminAdAnalytics';
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
import { format } from 'date-fns';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};

const CHART_COLORS = ['hsl(var(--primary))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

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
      <AdminLayout>
        <div className="space-y-6">
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

  return (
    <AdminLayout>
      <div className="space-y-6">
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Total Ads"
            value={summary.totalAds}
            subtitle={`${summary.postedAds} posted, ${summary.pendingAds} pending`}
          />
          <AdminStatCard
            label="Total Clicks"
            value={summary.totalClicks.toLocaleString()}
            subtitle={`${summary.uniqueClicks.toLocaleString()} unique`}
            valueColor="blue"
          />
          <AdminStatCard
            label="Total Revenue"
            value={formatCurrency(summary.totalRevenue + summary.totalPingRevenue)}
            subtitle={`${formatCurrency(summary.totalPingRevenue)} from pings`}
            valueColor="green"
          />
          <AdminStatCard
            label="This Month"
            value={formatCurrency(monthlyRevenue)}
            subtitle="Revenue this month"
            valueColor="primary"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <AdminStatCard
            label="Active Subscriptions"
            value={summary.activeSubscriptions}
            valueColor="blue"
          />
          <AdminStatCard
            label="Avg Clicks/Ad"
            value={summary.avgClicksPerAd}
          />
          <AdminStatCard
            label="Posted Ads"
            value={summary.postedAds}
            valueColor="green"
          />
          <AdminStatCard
            label="Pending Ads"
            value={summary.pendingAds}
            valueColor="yellow"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Clicks Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MousePointerClick className="h-5 w-5" />
                Clicks Over Time
              </CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      className="text-muted-foreground"
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="clicks" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Revenue Over Time
              </CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      className="text-muted-foreground"
                    />
                    <YAxis 
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      className="text-muted-foreground"
                      tickFormatter={(value) => `£${value}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    />
                    <Bar 
                      dataKey="revenue" 
                      fill="hsl(var(--chart-2))" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdowns Row */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Subscription Tiers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Subscription Tiers
              </CardTitle>
              <CardDescription>Active subscriptions by tier</CardDescription>
            </CardHeader>
            <CardContent>
              {tierBreakdown.length > 0 ? (
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={tierBreakdown}
                        dataKey="count"
                        nameKey="tier"
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={2}
                      >
                        {tierBreakdown.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No active subscriptions</p>
              )}
            </CardContent>
          </Card>

          {/* Device Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Device Breakdown
              </CardTitle>
              <CardDescription>Clicks by device type</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Ads Posted Per Day */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Megaphone className="h-5 w-5" />
                Ads Posted
              </CardTitle>
              <CardDescription>Last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis 
                      tick={{ fontSize: 10 }}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="adsPosted" 
                      fill="hsl(var(--chart-3))" 
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tables Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Performing Ads */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Ads</CardTitle>
              <CardDescription>By total clicks</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>

          {/* Recent Ads */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Ads</CardTitle>
              <CardDescription>Latest advertisements</CardDescription>
            </CardHeader>
            <CardContent>
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
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
