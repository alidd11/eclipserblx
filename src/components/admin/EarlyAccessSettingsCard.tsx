import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Crown, Save, Loader2, Clock, Info } from 'lucide-react';

export function EarlyAccessSettingsCard() {
 const queryClient = useQueryClient();
 const [defaultHours, setDefaultHours] = useState('24');

 const { data: setting, isLoading } = useQuery({
 queryKey: ['early-access-default-hours'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('settings')
 .select('value')
 .eq('key', 'default_early_access_hours')
 .maybeSingle();

 if (error) throw error;
 return data?.value ? String(data.value).replace(/^"|"$/g, '') : '24';
 },
 });

 useEffect(() => {
 if (setting) {
 setDefaultHours(setting);
 }
 }, [setting]);

 const saveMutation = useMutation({
 mutationFn: async (hours: string) => {
 const { data: existing } = await supabase
 .from('settings')
 .select('id')
 .eq('key', 'default_early_access_hours')
 .maybeSingle();

 if (existing) {
 const { error } = await supabase
 .from('settings')
 .update({ value: hours })
 .eq('key', 'default_early_access_hours');
 if (error) throw error;
 } else {
 const { error } = await supabase
 .from('settings')
 .insert([{ key: 'default_early_access_hours', value: hours }]);
 if (error) throw error;
 }
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['early-access-default-hours'] });
 toast.success('Early access settings saved');
 },
 onError: () => {
 toast.error('Failed to save settings');
 },
 });

 const handleSave = () => {
 const hours = parseInt(defaultHours);
 if (isNaN(hours) || hours < 1 || hours > 168) {
 toast.error('Please enter a valid number between 1 and 168 hours');
 return;
 }
 saveMutation.mutate(defaultHours);
 };

 if (isLoading) {
 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="p-4 p-6 flex items-center justify-center">
 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
 </div>
 </div>
 );
 }

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-3">
 <div className="p-2 rounded-lg bg-amber-500/20">
 <Crown className="h-5 w-5 text-amber-500" />
 </div>
 <div>
 <h3 className="font-semibold text-sm text-lg">Early Product Drops</h3>
 <p className="text-sm text-muted-foreground">
 Configure early access settings
 </p>
 </div>
 </div>
 </div>
 <div className="p-4 space-y-4">
 <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5">
 <div className="flex items-start gap-2">
 <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
 <p className="text-sm text-muted-foreground">
 Eligible customers get early access to new product drops before public release. 
 This setting defines the default early access window for all scheduled products.
 </p>
 </div>
 </div>

 <div className="space-y-2">
 <Label htmlFor="default-hours" className="flex items-center gap-2">
 <Clock className="h-4 w-4 text-muted-foreground" />
 Default Early Access Window
 </Label>
 <div className="flex items-center gap-3">
 <Input
 id="default-hours"
 type="number"
 min="1"
 max="168"
 value={defaultHours}
 onChange={(e) => setDefaultHours(e.target.value)}
 className="w-24"
 />
 <span className="text-sm text-muted-foreground">hours before public release</span>
 </div>
 <p className="text-xs text-muted-foreground">
 Sellers can override this per-product. Maximum 168 hours (7 days).
 </p>
 </div>

 <Button onClick={handleSave} disabled={saveMutation.isPending}>
 {saveMutation.isPending ? (
 <Loader2 className="h-4 w-4 mr-2 animate-spin" />
 ) : (
 <Save className="h-4 w-4 mr-2" />
 )}
 Save Settings
 </Button>
 </div>
 </div>
 );
}
