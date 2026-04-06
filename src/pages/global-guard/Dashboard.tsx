import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { BanStatsCards } from '@/components/global-guard/BanStatsCards';
import { BanListTable } from '@/components/global-guard/BanListTable';
import { AddBanDialog } from '@/components/global-guard/AddBanDialog';
import { UpgradeBanner } from '@/components/global-guard/UpgradeBanner';
import { TierBadge } from '@/components/global-guard/TierBadge';
import { FeatureCards } from '@/components/global-guard/FeatureCards';
import { useGlobalGuardData } from '@/hooks/useGlobalGuardData';
import { useGlobalGuardLimits } from '@/hooks/useGlobalGuardLimits';

export default function GlobalGuardDashboard() {
 const { 
 bans, 
 stats, 
 servers,
 isLoading, 
 createBan, 
 revokeBan, 
 deleteBan,
 isCreatingBan 
 } = useGlobalGuardData();

 const { data: limits, isLoadingLimits } = useGlobalGuardLimits();
 const isPremium = limits?.isPremium ?? false;

 // Show only the 5 most recent bans on dashboard
 const recentBans = bans.slice(0, 5);

 return (
 <GlobalGuardLayout>
 <div className="flex items-center justify-between mb-2">
 <GlobalGuardHeader />
 <TierBadge isPremium={isPremium} />
 </div>
 
 {/* Upgrade Banner for Free Users - only show after limits have loaded */}
 {!isLoadingLimits && !isPremium && (
 <div className="mb-6">
 <UpgradeBanner 
 currentServers={servers.length} 
 maxServers={limits?.maxServers} 
 />
 </div>
 )}
 
 {/* Stats Cards */}
 <BanStatsCards stats={stats} isLoading={isLoading} />

 {/* Quick Actions & Recent Bans */}
 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
 <div className="border border-border rounded-xl overflow-hidden lg:col-span-2 bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
 <h3 className="font-semibold text-sm text-lg font-medium">Recent Bans</h3>
 <AddBanDialog onSubmit={createBan} isSubmitting={isCreatingBan} />
 </div>
 <div className="p-4">
 <BanListTable 
 bans={recentBans} 
 isLoading={isLoading}
 onRevoke={revokeBan}
 onDelete={deleteBan}
 />
 </div>
 </div>

 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-lg font-medium">Quick Actions</h3>
 </div>
 <div className="p-4 space-y-3">
 <p className="text-sm text-muted-foreground">
 Use the Discord command <code className="px-1 py-0.5 bg-muted rounded text-xs">/globalban</code> to 
 quickly ban users directly from any of your servers.
 </p>
 <div className="pt-4 border-t border-border">
 <h4 className="text-sm font-medium text-foreground mb-2">Available Commands</h4>
 <ul className="space-y-2 text-sm text-muted-foreground">
 <li><code className="text-primary">/globalban</code> - Ban across all servers</li>
 <li><code className="text-primary">/globalunban</code> - Remove a global ban</li>
 <li><code className="text-primary">/globalbans</code> - View active bans</li>
 </ul>
 </div>
 </div>
 </div>
 </div>

 {/* Feature Cards */}
 <div className="mt-6">
 <h3 className="text-lg font-medium text-foreground mb-4">What Global Guard Does</h3>
 <FeatureCards />
 </div>
 </GlobalGuardLayout>
 );
}
