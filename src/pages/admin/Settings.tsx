import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function AdminSettings() {
  const handleSave = () => {
    toast.success('Settings saved');
  };

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-display font-bold">Settings</h1>
          <p className="text-muted-foreground">Configure your store settings</p>
        </div>

        <div className="grid gap-6 max-w-2xl">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Basic information about your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input id="storeName" defaultValue="UK Roleplay Assets" className="bg-background" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeEmail">Contact Email</Label>
                <Input id="storeEmail" type="email" placeholder="support@example.com" className="bg-background" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Discord Integration</CardTitle>
              <CardDescription>Send notifications to Discord</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="webhookUrl">Order Notification Webhook</Label>
                <Input id="webhookUrl" placeholder="https://discord.com/api/webhooks/..." className="bg-background" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Payment Settings</CardTitle>
              <CardDescription>Configure payment providers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Payment integration with Stripe can be enabled from the Stripe connector.
              </p>
            </CardContent>
          </Card>

          <Button onClick={handleSave} className="w-fit">Save Changes</Button>
        </div>
      </div>
    </AdminLayout>
  );
}
