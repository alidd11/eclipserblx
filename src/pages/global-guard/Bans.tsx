import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { BanListTable } from '@/components/global-guard/BanListTable';
import { AddBanDialog } from '@/components/global-guard/AddBanDialog';
import { useGlobalGuardData } from '@/hooks/useGlobalGuardData';

export default function GlobalGuardBans() {
 const { 
 bans, 
 isLoading, 
 createBan, 
 revokeBan, 
 deleteBan,
 isCreatingBan 
 } = useGlobalGuardData();

 return (
 <GlobalGuardLayout>
 <GlobalGuardHeader />
 
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between">
 <div>
 <h3 className="font-semibold text-sm text-xl font-medium">Ban List</h3>
 <p className="text-sm text-muted-foreground mt-1">
 Manage all your global bans across connected servers
 </p>
 </div>
 <AddBanDialog onSubmit={createBan} isSubmitting={isCreatingBan} />
 </div>
 <div className="p-4">
 <BanListTable 
 bans={bans} 
 isLoading={isLoading}
 onRevoke={revokeBan}
 onDelete={deleteBan}
 />
 </div>
 </div>
 </GlobalGuardLayout>
 );
}
