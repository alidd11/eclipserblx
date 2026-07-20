import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Tag, Package, MessageCircle, ArrowLeft, Loader2, BellOff, Save, Send, Headphones } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useBackgroundPush } from '@/hooks/useBackgroundPush';
import { sendPushNotification } from '@/lib/pushNotifications';

export default function NotificationPreferences() {
 const { user } = useAuth();
 
 const queryClient = useQueryClient();
 const { isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, isSupported: pushSupported } = useBackgroundPush();

 // Local state for preferences
 const [productAlerts, setProductAlerts] = useState(true);
 const [discountAlerts, setDiscountAlerts] = useState(true);
 const [newsletterAlerts, setNewsletterAlerts] = useState(true);
 const [supportReplies, setSupportReplies] = useState(true);
 const [testingPush, setTestingPush] = useState(false);

 // Fetch existing subscription
 const { data: subscription, isLoading } = useQuery({
 queryKey: ['email-subscription', user?.id],
 queryFn: async () => {
 if (!user?.id) return null;
 const { data, error } = await supabase
 .from('email_subscriptions')
 .select('*')
 .eq('user_id', user.id)
 .maybeSingle();
 if (error) throw error;
 return data;
 },
 enabled: !!user?.id,
 });

 // Sync local state with fetched data
 useEffect(() => {
 if (subscription) {
 setProductAlerts(subscription.subscribed_to_updates);
 setDiscountAlerts(subscription.subscribed_to_discounts);
 setNewsletterAlerts(subscription.subscribed_to_newsletters);
 setSupportReplies(subscription.subscribed_to_support_replies ?? true);
 }
 }, [subscription]);

 const updateMutation = useMutation({
 mutationFn: async (preferences: {
 subscribed_to_updates: boolean;
 subscribed_to_discounts: boolean;
 subscribed_to_newsletters: boolean;
 subscribed_to_support_replies: boolean;
 }) => {
 if (!user?.id || !user?.email) throw new Error('Not authenticated');

 if (subscription) {
 const { error } = await supabase
 .from('email_subscriptions')
 .update({
 ...preferences,
 updated_at: new Date().toISOString(),
 })
 .eq('user_id', user.id);
 if (error) throw error;
 } else {
 const { error } = await supabase
 .from('email_subscriptions')
 .insert({
 user_id: user.id,
 email: user.email,
 ...preferences,
 });
 if (error) throw error;
 }
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['email-subscription', user?.id] });
 toast.success('Preferences Saved', { description: 'Your notification preferences have been updated.' });
 },
 onError: () => {
 toast.error('Error', { description: 'Failed to update preferences. Please try again.' });
 },
 });

 const handleSave = () => {
 updateMutation.mutate({
 subscribed_to_updates: productAlerts,
 subscribed_to_discounts: discountAlerts,
 subscribed_to_newsletters: newsletterAlerts,
 subscribed_to_support_replies: supportReplies,
 });
 };

 const handleTogglePush = async () => {
 if (isSubscribed) {
 const success = await unsubscribe();
 if (success) {
 toast.success('Push Disabled', { description: 'You will no longer receive push notifications.' });
 }
 } else {
 const result = await subscribe();
 if (result.success) {
 toast.success('Push Enabled', { description: 'You will now receive push notifications.' });
 } else if (result.error) {
 toast.error('Error', { description: result.error });
 }
 }
 };

 const handleDisableAll = () => {
 setProductAlerts(false);
 setDiscountAlerts(false);
 setNewsletterAlerts(false);
 setSupportReplies(false);
 updateMutation.mutate({
 subscribed_to_updates: false,
 subscribed_to_discounts: false,
 subscribed_to_newsletters: false,
 subscribed_to_support_replies: false,
 });
 };

 const handleTestPush = async () => {
 if (!user?.id) return;
 
 setTestingPush(true);
 try {
 const result = await sendPushNotification([user.id], {
 title: '🔔 Test Notification',
 body: 'Your push notifications are working correctly!',
 tag: `test-notification-${Date.now()}`,
 url: '/notifications',
 });
 
 if (result.success) {
 toast.success('Test Sent', { description: 'Check your device for the notification.' });
 } else {
 toast.error('Test Failed', { description: result.error || 'Could not send test notification.' });
 }
 } catch (error) {
 toast.error('Error', { description: 'Failed to send test notification.' });
 } finally {
 setTestingPush(false);
 }
 };

 const hasChanges = subscription
 ? (productAlerts !== subscription.subscribed_to_updates ||
 discountAlerts !== subscription.subscribed_to_discounts ||
 newsletterAlerts !== subscription.subscribed_to_newsletters ||
 supportReplies !== (subscription.subscribed_to_support_replies ?? true))
 : true;

 if (!user) {
 return (
 <MainLayout>
 <div className="container py-16 text-center space-y-4">
 <h1 className="text-2xl font-display font-bold">Please Sign In</h1>
 <p className="text-muted-foreground">You need to be signed in to manage notification preferences.</p>
 <Button asChild className="gradient-button border-0">
 <Link to="/auth">Sign In</Link>
 </Button>
 </div>
 </MainLayout>
 );
 }

 return (
 <MainLayout>
 <div className="container py-8 max-w-2xl space-y-6">
 {/* Header */}
 <div className="flex items-center gap-4">
 <Button variant="ghost" size="icon" aria-label="Go back" asChild>
 <Link to="/account">
 <ArrowLeft className="h-5 w-5" />
 </Link>
 </Button>
 <div>
 <h1 className="text-2xl font-display font-bold">Notification Preferences</h1>
 <p className="text-muted-foreground text-sm">Choose what notifications you want to receive</p>
 </div>
 </div>

 {isLoading ? (
 <div className="space-y-6">
 {Array.from({ length: 2 }).map((_, i) => (
 <div key={i} className="border border-border rounded-xl overflow-hidden bg-card">
 <div className="px-4 py-3 border-b border-border bg-muted/30 space-y-2">
 <Skeleton className="h-5 w-40" />
 <Skeleton className="h-3 w-56" />
 </div>
 <div className="p-4 space-y-3">
 {Array.from({ length: 2 }).map((_, j) => (
 <div key={j} className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
 <div className="space-y-2"><Skeleton className="h-4 w-40" /><Skeleton className="h-3 w-56" /></div>
 <Skeleton className="h-6 w-10 rounded-full" />
 </div>
 ))}
 </div>
 </div>
 ))}
 </div>
 ) : (
 <div className="space-y-6">
 {/* Push Notifications Card */}
 {pushSupported && (
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
  <div className="px-4 py-3 border-b border-border bg-muted/30">
  <h3 className="font-semibold text-lg">Push Notifications</h3>
  <p className="text-sm text-muted-foreground">
  Receive instant notifications on your device
  </p>
  </div>
 <div className="p-4 space-y-4">
 <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
 <div>
 <Label className="font-medium">Enable Push Notifications</Label>
 <p className="text-sm text-muted-foreground">Get notified even when the app is closed</p>
 </div>
 <Switch
 checked={isSubscribed}
 onCheckedChange={handleTogglePush}
 disabled={pushLoading}
 />
 </div>
 
 {isSubscribed && (
 <Button
 variant="outline"
 onClick={handleTestPush}
 disabled={testingPush}
 className="w-full"
 >
 {testingPush ? (
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 ) : (
 <Send className="mr-2 h-4 w-4" />
 )}
 Send Test Notification
 </Button>
 )}
 </div>
 </div>
 )}

 {/* Alert Preferences Card */}
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
  <div className="px-4 py-3 border-b border-border bg-muted/30">
  <h3 className="font-semibold text-lg">Alert Preferences</h3>
  <p className="text-sm text-muted-foreground">
  Control which types of alerts you receive
  </p>
 </div>
 <div className="p-4 space-y-4">
 {/* Product Alerts */}
 <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
 <div className="flex items-center gap-3">
 <Package className="h-5 w-5 text-primary" />
 <div>
 <Label htmlFor="product-alerts" className="font-medium cursor-pointer">Product Alerts</Label>
 <p className="text-sm text-muted-foreground">New products and updates</p>
 </div>
 </div>
 <Switch
 id="product-alerts"
 checked={productAlerts}
 onCheckedChange={setProductAlerts}
 />
 </div>

 {/* Discount Alerts */}
 <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
 <div className="flex items-center gap-3">
 <Tag className="h-5 w-5 text-primary" />
 <div>
 <Label htmlFor="discount-alerts" className="font-medium cursor-pointer">Discount Alerts</Label>
 <p className="text-sm text-muted-foreground">Exclusive deals and promo codes</p>
 </div>
 </div>
 <Switch
 id="discount-alerts"
 checked={discountAlerts}
 onCheckedChange={setDiscountAlerts}
 />
 </div>

 {/* Newsletter Alerts */}
 <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
 <div className="flex items-center gap-3">
 <MessageCircle className="h-5 w-5 text-primary" />
 <div>
 <Label htmlFor="newsletter-alerts" className="font-medium cursor-pointer">Newsletter</Label>
 <p className="text-sm text-muted-foreground">Community updates and newsletters</p>
 </div>
 </div>
 <Switch
 id="newsletter-alerts"
 checked={newsletterAlerts}
 onCheckedChange={setNewsletterAlerts}
 />
 </div>

 {/* Support Reply Alerts */}
 <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
 <div className="flex items-center gap-3">
 <Headphones className="h-5 w-5 text-primary" />
 <div>
 <Label htmlFor="support-alerts" className="font-medium cursor-pointer">Support Replies</Label>
 <p className="text-sm text-muted-foreground">Push notifications when staff replies to your messages</p>
 </div>
 </div>
 <Switch
 id="support-alerts"
 checked={supportReplies}
 onCheckedChange={setSupportReplies}
 />
 </div>

 <Separator className="my-4" />

 {/* Action Buttons */}
 <div className="flex flex-col sm:flex-row gap-3">
 <Button
 onClick={handleSave}
 disabled={!hasChanges || updateMutation.isPending}
 className="gradient-button border-0"
 >
 {updateMutation.isPending ? (
 <Loader2 className="mr-2 h-4 w-4 animate-spin" />
 ) : (
 <Save className="mr-2 h-4 w-4" />
 )}
 Save Preferences
 </Button>
 <Button
 variant="outline"
 onClick={handleDisableAll}
 disabled={updateMutation.isPending || (!productAlerts && !discountAlerts && !newsletterAlerts && !supportReplies)}
 >
 <BellOff className="mr-2 h-4 w-4" />
 Disable All Alerts
 </Button>
 </div>
 </div>
 </div>

 {/* Info Card */}
 <div className="border border-border rounded-xl overflow-hidden bg-muted/30 border-border">
 <div className="p-4 py-4">
 <p className="text-sm text-muted-foreground text-center">
 These preferences control both email and in-app notifications. Push notifications require browser permission.
 </p>
 </div>
 </div>
 </div>
 )}
 </div>
 </MainLayout>
 );
}
