import { AdminLayout } from '@/components/admin/AdminLayout';
import { OrionActivityPanel } from '@/components/admin/OrionActivityPanel';
import { OrionChangeRequests } from '@/components/admin/OrionChangeRequests';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function OrionPage() {
  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6 p-4 md:p-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight">Orion</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Bi-directional automation loop between RoleplayHub and the Orion agent platform.
          </p>
        </header>
        <Tabs defaultValue="activity">
          <TabsList>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="proposals">Proposals</TabsTrigger>
          </TabsList>
          <TabsContent value="activity" className="mt-4">
            <OrionActivityPanel />
          </TabsContent>
          <TabsContent value="proposals" className="mt-4">
            <OrionChangeRequests />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
