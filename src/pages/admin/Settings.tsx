import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface StoreSettings {
  store_name: string;
  contact_email: string;
  discord_webhook_url: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'Eclipse',
  contact_email: '',
  discord_webhook_url: '',
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<StoreSettings>(DEFAULT_SETTINGS);

  // Fetch settings from database
  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['store_name', 'contact_email', 'discord_webhook_url']);

      if (error) throw error;

      const settingsMap: Partial<StoreSettings> = {};
      data?.forEach((item) => {
        const val = typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : String(item.value);
        if (item.key === 'store_name') {
          settingsMap.store_name = val;
        } else if (item.key === 'contact_email') {
          settingsMap.contact_email = val;
        } else if (item.key === 'discord_webhook_url') {
          settingsMap.discord_webhook_url = val;
        }
      });

      return { ...DEFAULT_SETTINGS, ...settingsMap };
    },
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: async (data: StoreSettings) => {
      const entries = Object.entries(data) as [keyof StoreSettings, string][];
      
      for (const [key, value] of entries) {
        // Check if setting exists
        const { data: existing } = await supabase
          .from('settings')
          .select('id')
          .eq('key', key)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('settings')
            .update({ value: JSON.stringify(value) })
            .eq('key', key);
          if (error) throw error;
        } else {
          // Insert new
          const { error } = await supabase
            .from('settings')
            .insert([{ key, value: JSON.stringify(value) }]);
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success('Settings saved successfully');
    },
    onError: (error) => {
      console.error('Failed to save settings:', error);
      toast.error('Failed to save settings');
    },
  });

  const handleSave = () => {
    saveMutation.mutate(formData);
  };

  const handleChange = (key: keyof StoreSettings, value: string) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  if (isLoading) {
    return (
      <AdminLayout requiredRoles={['admin']}>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout requiredRoles={['admin']}>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl sm:text-3xl font-display">Settings</CardTitle>
            <CardDescription>Configure your store settings</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 max-w-2xl">
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle>Store Information</CardTitle>
              <CardDescription>Basic information about your store</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="storeName">Store Name</Label>
                <Input
                  id="storeName"
                  value={formData.store_name}
                  onChange={(e) => handleChange('store_name', e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="storeEmail">Contact Email</Label>
                <Input
                  id="storeEmail"
                  type="email"
                  value={formData.contact_email}
                  onChange={(e) => handleChange('contact_email', e.target.value)}
                  placeholder="support@example.com"
                  className="bg-background"
                />
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
                <Input
                  id="webhookUrl"
                  value={formData.discord_webhook_url}
                  onChange={(e) => handleChange('discord_webhook_url', e.target.value)}
                  placeholder="https://discord.com/api/webhooks/..."
                  className="bg-background"
                />
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

          <Button
            onClick={handleSave}
            className="w-fit"
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}

