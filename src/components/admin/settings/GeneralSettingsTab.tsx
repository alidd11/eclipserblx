import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Store } from 'lucide-react';

interface StoreSettings {
 store_name: string;
 contact_email: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
 store_name: 'Eclipse',
 contact_email: '',
};

export function GeneralSettingsTab() {
 const queryClient = useQueryClient();
 const [formData, setFormData] = useState<StoreSettings>(DEFAULT_SETTINGS);

 const { data: settings, isLoading } = useQuery({
 queryKey: ['store-settings-general'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('settings')
 .select('key, value')
 .in('key', ['store_name', 'contact_email']);

 if (error) throw error;

 const settingsMap: Partial<StoreSettings> = {};
 data?.forEach((item) => {
 const val = typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : item.value;
 if (item.key === 'store_name') settingsMap.store_name = String(val);
 else if (item.key === 'contact_email') settingsMap.contact_email = String(val);
 });

 return { ...DEFAULT_SETTINGS, ...settingsMap };
 },
 });

 useEffect(() => {
 if (settings) setFormData(settings);
 }, [settings]);

 const saveMutation = useMutation({
 mutationFn: async (data: StoreSettings) => {
 for (const [key, value] of Object.entries(data)) {
 const { data: existing } = await supabase
 .from('settings')
 .select('id')
 .eq('key', key)
 .maybeSingle();

 if (existing) {
 const { error } = await supabase.from('settings').update({ value: JSON.stringify(value) }).eq('key', key);
 if (error) throw error;
 } else {
 const { error } = await supabase.from('settings').insert([{ key, value: JSON.stringify(value) }]);
 if (error) throw error;
 }
 }
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['store-settings-general'] });
 toast.success('Settings saved successfully');
 },
 onError: () => toast.error('Failed to save settings'),
 });

 const handleSave = () => {
 if (formData.store_name.length > 100) return toast.error('Store name must be under 100 characters');
 if (formData.contact_email && formData.contact_email.length > 255) return toast.error('Contact email must be under 255 characters');
 if (formData.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) return toast.error('Please enter a valid email address');
 saveMutation.mutate(formData);
 };

 if (isLoading) {
 return (
 <div className="flex items-center justify-center py-16">
 <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 <Store className="h-5 w-5 text-primary" />
 <h3 className="font-semibold text-sm">Store Information</h3>
 </div>
 <p className="text-sm text-muted-foreground">Basic information about your store</p>
 </div>
 <div className="p-4 space-y-4">
 <div className="space-y-2">
 <Label htmlFor="storeName">Store Name</Label>
 <Input
 id="storeName"
 value={formData.store_name}
 onChange={(e) => setFormData(prev => ({ ...prev, store_name: e.target.value }))}
 className="bg-background"
 />
 </div>
 <div className="space-y-2">
 <Label htmlFor="storeEmail">Contact Email</Label>
 <Input
 id="storeEmail"
 type="email"
 value={formData.contact_email}
 onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
 placeholder="support@example.com"
 className="bg-background"
 />
 </div>
 <Button onClick={handleSave} disabled={saveMutation.isPending} className="w-full sm:w-auto">
 {saveMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
 Save Changes
 </Button>
 </div>
 </div>

 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm">Payment Settings</h3>
 <p className="text-sm text-muted-foreground">Configure payment providers</p>
 </div>
 <div className="p-4">
 <p className="text-sm text-muted-foreground">
 Payment integration with Stripe can be enabled from the Stripe connector.
 </p>
 </div>
 </div>
 </div>
 );
}
