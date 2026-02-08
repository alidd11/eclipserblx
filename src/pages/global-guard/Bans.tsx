import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { BanListTable } from '@/components/global-guard/BanListTable';
import { AddBanDialog } from '@/components/global-guard/AddBanDialog';
import { useGlobalGuardData } from '@/hooks/useGlobalGuardData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
      
      <Card className="bg-card border-border">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-medium">Ban List</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Manage all your global bans across connected servers
            </p>
          </div>
          <AddBanDialog onSubmit={createBan} isSubmitting={isCreatingBan} />
        </CardHeader>
        <CardContent>
          <BanListTable 
            bans={bans} 
            isLoading={isLoading}
            onRevoke={revokeBan}
            onDelete={deleteBan}
          />
        </CardContent>
      </Card>
    </GlobalGuardLayout>
  );
}
