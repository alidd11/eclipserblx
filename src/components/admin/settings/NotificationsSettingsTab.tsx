import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import {
 Bell, BellRing, Volume2, VolumeX, Vibrate, Key, RefreshCw, Copy,
 CheckCircle2, XCircle, AlertCircle, Loader2,
} from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useBackgroundPush } from '@/hooks/useBackgroundPush';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { safeStorage } from '@/lib/safeStorage';

export function NotificationsSettingsTab() {
 const queryClient = useQueryClient();
 const { user } = useAuth();
 const { isAdmin } = useAdminAuth();

 // Local notification settings
 const { isSupported: notifSupported, permission, requestPermission } = usePushNotifications();
 const [soundEnabled, setSoundEnabled] = useState(() => safeStorage.getItem('notification_sound_enabled') !== 'false');
 const [hapticEnabled, setHapticEnabled] = useState(() => safeStorage.getItem('notification_haptic_enabled') !== 'false');
 const isHapticSupported = 'vibrate' in navigator;

 // Background push
 const {
 isSupported: pushSupported,
 isSubscribed: isPushSubscribed,
 isLoading: pushLoading,
 isiOSDevice,
 isPWAMode,
 subscribe: subscribePush,
 unsubscribe: unsubscribePush,
 } = useBackgroundPush();

 // VAPID key generation (admin only)
 const [isGeneratingVapid, setIsGeneratingVapid] = useState(false);
 const [generatedVapidKeys, setGeneratedVapidKeys] = useState<{ publicKey: string; privateKey: string } | null>(null);

 // Global notification toggles (admin only)
 const [newProductNotificationsEnabled, setNewProductNotificationsEnabled] = useState(true);
 const [discountNotificationsEnabled, setDiscountNotificationsEnabled] = useState(true);

 useQuery({
 queryKey: ['notification-settings'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('settings')
 .select('key, value')
 .in('key', ['new_product_notifications_enabled', 'discount_notifications_enabled']);
 if (error) throw error;
 data?.forEach((item) => {
 const val = typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : item.value;
 if (item.key === 'new_product_notifications_enabled') setNewProductNotificationsEnabled(val !== false && val !== 'false');
 if (item.key === 'discount_notifications_enabled') setDiscountNotificationsEnabled(val !== false && val !== 'false');
 });
 return data;
 },
 });

 const handleEnableNotifications = async () => {
 const granted = await requestPermission();
 if (granted) toast.success('Notifications enabled successfully');
 else toast.error('Notification permission denied. Please enable in browser settings.');
 };

 const handleToggleSound = (enabled: boolean) => {
 setSoundEnabled(enabled);
 safeStorage.setItem('notification_sound_enabled', String(enabled));
 toast.success(enabled ? 'Notification sounds enabled' : 'Notification sounds disabled');
 };

 const handleToggleHaptic = (enabled: boolean) => {
 setHapticEnabled(enabled);
 safeStorage.setItem('notification_haptic_enabled', String(enabled));
 if (enabled && 'vibrate' in navigator) navigator.vibrate(100);
 toast.success(enabled ? 'Haptic feedback enabled' : 'Haptic feedback disabled');
 };

 const handleTestNotification = () => {
 if (permission === 'granted') {
 new Notification('Test Notification', { body: 'Notifications are working correctly!', icon: '/favicon.ico' });
 toast.success('Test notification sent');
 } else toast.error('Please enable notifications first');
 };

 const handleEnablePush = async () => {
 const result = await subscribePush();
 if (result.success) showSuccessNotification('Push Enabled!', "You'll receive notifications even when the app is closed");
 else showErrorNotification('Push Failed', result.error || 'Please check browser permissions');
 };

 const handleDisablePush = async () => {
 const success = await unsubscribePush();
 if (success) showSuccessNotification('Push Disabled', 'Background notifications turned off');
 else showErrorNotification('Error', 'Failed to disable push notifications');
 };

 const handleToggleGlobalSetting = async (key: string, enabled: boolean, setter: (v: boolean) => void) => {
 try {
 const { data: existing } = await supabase.from('settings').select('id').eq('key', key).maybeSingle();
 if (existing) await supabase.from('settings').update({ value: enabled }).eq('key', key);
 else await supabase.from('settings').insert({ key, value: enabled });
 setter(enabled);
 queryClient.invalidateQueries({ queryKey: ['notification-settings'] });
 toast.success(`Setting ${enabled ? 'enabled' : 'disabled'}`);
 } catch { toast.error('Failed to update setting'); }
 };

 const handleGenerateVapid = async () => {
 setIsGeneratingVapid(true);
 try {
 const keyPair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
 const pubRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
 const privJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);
 const toB64Url = (buf: ArrayBuffer) => {
 const bytes = new Uint8Array(buf);
 let bin = '';
 bytes.forEach(b => bin += String.fromCharCode(b));
 return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
 };
 setGeneratedVapidKeys({ publicKey: toB64Url(pubRaw), privateKey: privJwk.d! });
 toast.success('VAPID keys generated!');
 } catch { toast.error('Failed to generate VAPID keys'); }
 finally { setIsGeneratingVapid(false); }
 };

 const getPermissionBadge = () => {
 switch (permission) {
 case 'granted':
 return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Enabled</Badge>;
 case 'denied':
 return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Denied</Badge>;
 default:
 return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><AlertCircle className="h-3 w-3 mr-1" /> Not Set</Badge>;
 }
 };

 return (
 <div className="space-y-6">
 {/* Device Notifications */}
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 <Bell className="h-5 w-5 text-primary" />
 <h3 className="font-semibold text-sm">Device Notifications</h3>
 </div>
 <p className="text-sm text-muted-foreground">Manage push notification preferences for this device</p>
 </div>
 <div className="p-4 space-y-5">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Browser Support</Label>
 <p className="text-sm text-muted-foreground">
 {notifSupported ? 'Your browser supports notifications' : 'Notifications not supported'}
 </p>
 </div>
 {notifSupported ? (
 <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Supported</Badge>
 ) : (
 <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Not Supported</Badge>
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Permission Status</Label>
 <p className="text-sm text-muted-foreground">Current notification permission</p>
 </div>
 {getPermissionBadge()}
 </div>

 {notifSupported && permission !== 'granted' && (
 <Button onClick={handleEnableNotifications} variant="outline" className="w-full" disabled={permission === 'denied'}>
 <Bell className="h-4 w-4 mr-2" />
 {permission === 'denied' ? 'Enable in Browser Settings' : 'Enable Notifications'}
 </Button>
 )}

 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 {soundEnabled ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
 <div className="space-y-0.5">
 <Label>Notification Sounds</Label>
 <p className="text-sm text-muted-foreground">Play sound for new notifications</p>
 </div>
 </div>
 <Switch checked={soundEnabled} onCheckedChange={handleToggleSound} />
 </div>

 {isHapticSupported && (
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <Vibrate className="h-4 w-4 text-muted-foreground" />
 <div className="space-y-0.5">
 <Label>Haptic Feedback</Label>
 <p className="text-sm text-muted-foreground">Vibrate on new notifications (mobile)</p>
 </div>
 </div>
 <Switch checked={hapticEnabled} onCheckedChange={handleToggleHaptic} />
 </div>
 )}

 {permission === 'granted' && (
 <Button onClick={handleTestNotification} variant="secondary" className="w-full">
 Send Test Notification
 </Button>
 )}
 </div>
 </div>

 {/* Background Push */}
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 <BellRing className="h-5 w-5 text-primary" />
 <h3 className="font-semibold text-sm">Background Push</h3>
 </div>
 <p className="text-sm text-muted-foreground">Receive notifications even when the app is closed</p>
 </div>
 <div className="p-4 space-y-5">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Push Support</Label>
 <p className="text-sm text-muted-foreground">
 {pushSupported ? 'Your browser supports background push' : 'Push not supported'}
 </p>
 </div>
 {pushSupported ? (
 <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Supported</Badge>
 ) : (
 <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="h-3 w-3 mr-1" /> Not Supported</Badge>
 )}
 </div>

 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Subscription Status</Label>
 <p className="text-sm text-muted-foreground">
 {isPushSubscribed ? 'You will receive background notifications' : 'Background notifications disabled'}
 </p>
 </div>
 {pushLoading ? (
 <Loader2 className="h-4 w-4 animate-spin" />
 ) : isPushSubscribed ? (
 <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="h-3 w-3 mr-1" /> Active</Badge>
 ) : (
 <Badge className="bg-muted text-muted-foreground"><AlertCircle className="h-3 w-3 mr-1" /> Inactive</Badge>
 )}
 </div>

 {pushSupported && user && (
 <div className="space-y-2">
 {!isPushSubscribed ? (
 <Button onClick={handleEnablePush} variant="outline" className="w-full" disabled={pushLoading}>
 {pushLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BellRing className="h-4 w-4 mr-2" />}
 Enable Background Push
 </Button>
 ) : (
 <Button onClick={handleDisablePush} variant="destructive" className="w-full" disabled={pushLoading}>
 {pushLoading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
 Disable Background Push
 </Button>
 )}
 </div>
 )}

 {isiOSDevice && !isPWAMode && pushSupported && (
 <div className="text-sm bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg space-y-2">
 <p className="font-medium text-yellow-400">iOS Setup Required</p>
 <p className="text-muted-foreground">To receive push notifications on iOS, install this app first:</p>
 <ol className="list-decimal list-inside text-muted-foreground space-y-1">
 <li>Tap the <strong>Share</strong> button in Safari</li>
 <li>Select <strong>"Add to Home Screen"</strong></li>
 <li>Open the app from your Home Screen</li>
 <li>Return here to enable notifications</li>
 </ol>
 </div>
 )}

 {!pushSupported && (
 <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
 Background push notifications require a modern browser with service worker support.
 </p>
 )}

 {pushSupported && !user && (
 <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
 Please sign in to enable background push notifications.
 </p>
 )}

 {/* VAPID Key Management - Admin Only */}
 {isAdmin && (
 <div className="border-t border-border pt-4 mt-4 space-y-3">
 <div className="flex items-center gap-2">
 <Key className="h-4 w-4 text-muted-foreground" />
 <Label>VAPID Key Management</Label>
 </div>
 <p className="text-sm text-muted-foreground">
 If push notifications show "invalid characters" errors, regenerate your VAPID keys below.
 </p>
 <Button onClick={handleGenerateVapid} variant="outline" className="w-full" disabled={isGeneratingVapid}>
 {isGeneratingVapid ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
 Generate New VAPID Keys
 </Button>

 {generatedVapidKeys && (
 <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
 <p className="text-sm font-medium text-green-400">✓ Keys Generated Successfully!</p>
 <p className="text-xs text-muted-foreground">Update these secrets in your backend settings:</p>
 {[
 { label: 'VAPID_PUBLIC_KEY & VITE_VAPID_PUBLIC_KEY:', value: generatedVapidKeys.publicKey },
 { label: 'VAPID_PRIVATE_KEY:', value: generatedVapidKeys.privateKey },
 ].map(({ label, value }) => (
 <div key={label} className="space-y-1">
 <Label className="text-xs">{label}</Label>
 <div className="flex gap-2">
 <code className="flex-1 text-xs bg-background p-2 rounded border break-all">{value}</code>
 <Button size="sm" variant="ghost" onClick={() => { navigator.clipboard.writeText(value); toast.success('Copied!'); }}>
 <Copy className="h-4 w-4" />
 </Button>
 </div>
 </div>
 ))}
 <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
 <strong>Important:</strong> After updating secrets, all users must re-subscribe to push notifications.
 </div>
 </div>
 )}
 </div>
 )}
 </div>
 </div>

 {/* Global Notification Controls - Admin Only */}
 {isAdmin && (
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <div className="flex items-center gap-2">
 <BellRing className="h-5 w-5 text-primary" />
 <h3 className="font-semibold text-sm">Global Notification Controls</h3>
 </div>
 <p className="text-sm text-muted-foreground">Enable or disable push notifications for all users</p>
 </div>
 <div className="p-4 space-y-5">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>New Product Notifications</Label>
 <p className="text-sm text-muted-foreground">Notify users when new products are added</p>
 </div>
 <Switch
 checked={newProductNotificationsEnabled}
 onCheckedChange={(v) => handleToggleGlobalSetting('new_product_notifications_enabled', v, setNewProductNotificationsEnabled)}
 />
 </div>
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label>Discount Code Notifications</Label>
 <p className="text-sm text-muted-foreground">Notify users when new discount codes are created</p>
 </div>
 <Switch
 checked={discountNotificationsEnabled}
 onCheckedChange={(v) => handleToggleGlobalSetting('discount_notifications_enabled', v, setDiscountNotificationsEnabled)}
 />
 </div>
 </div>
 </div>
 )}
 </div>
 );
}
