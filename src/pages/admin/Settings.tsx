import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { supabase } from '@/integrations/supabase/client';
import { Check, X, Sparkles, Trash2, Plus, Globe, Loader2, Bell, Fingerprint, CheckCircle2, XCircle, AlertCircle, Volume2, VolumeX, Vibrate, Key, RefreshCw, Copy, BellRing } from 'lucide-react';
import { ForceUpdateCard } from '@/components/admin/ForceUpdateCard';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useBackgroundPush } from '@/hooks/useBackgroundPush';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { safeStorage } from '@/lib/safeStorage';

interface StoreSettings {
  store_name: string;
  contact_email: string;
  roblox_game_url: string;
}

const DEFAULT_SETTINGS: StoreSettings = {
  store_name: 'Eclipse',
  contact_email: '',
  roblox_game_url: '',
};

export default function AdminSettings() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const [formData, setFormData] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [isGeneratingVapid, setIsGeneratingVapid] = useState(false);
  const [generatedVapidKeys, setGeneratedVapidKeys] = useState<{
    publicKey: string;
    privateKey: string;
  } | null>(null);
  
  // Global notification toggles (admin only)
  const [newProductNotificationsEnabled, setNewProductNotificationsEnabled] = useState(true);
  const [discountNotificationsEnabled, setDiscountNotificationsEnabled] = useState(true);
  // Notification settings
  const { isSupported: notifSupported, permission, requestPermission } = usePushNotifications();
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return safeStorage.getItem('notification_sound_enabled') !== 'false';
  });
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    return safeStorage.getItem('notification_haptic_enabled') !== 'false';
  });
  const isHapticSupported = 'vibrate' in navigator;
  
  // Background push notifications
  const {
    isSupported: pushSupported,
    isSubscribed: isPushSubscribed,
    isLoading: pushLoading,
    permission: pushPermission,
    isiOSDevice,
    isPWAMode,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
  } = useBackgroundPush();
  
  // Biometric settings
  const {
    isSupported: biometricSupported,
    isEnrolled,
    loading: biometricLoading,
    checkSupport,
    checkEnrollment,
    enrollBiometric,
    removeBiometric,
    authenticateWithBiometric,
  } = useBiometricAuth();

  // Check biometric support and enrollment on mount
  useEffect(() => {
    checkSupport();
  }, [checkSupport]);

  useEffect(() => {
    if (user?.id) {
      checkEnrollment(user.id);
    }
  }, [user?.id, checkEnrollment]);

  // Fetch settings from database
  const { data: settings, isLoading } = useQuery({
    queryKey: ['store-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['store_name', 'contact_email', 'roblox_game_url', 'new_product_notifications_enabled', 'discount_notifications_enabled']);

      if (error) throw error;

      const settingsMap: Partial<StoreSettings> & { new_product_notifications_enabled?: boolean; discount_notifications_enabled?: boolean } = {};
      data?.forEach((item) => {
        const val = typeof item.value === 'string' ? item.value.replace(/^"|"$/g, '') : item.value;
        if (item.key === 'store_name') {
          settingsMap.store_name = String(val);
        } else if (item.key === 'contact_email') {
          settingsMap.contact_email = String(val);
        } else if (item.key === 'roblox_game_url') {
          settingsMap.roblox_game_url = String(val);
        } else if (item.key === 'new_product_notifications_enabled') {
          settingsMap.new_product_notifications_enabled = val !== false && val !== 'false';
        } else if (item.key === 'discount_notifications_enabled') {
          settingsMap.discount_notifications_enabled = val !== false && val !== 'false';
        }
      });

      return { 
        ...DEFAULT_SETTINGS, 
        ...settingsMap,
        new_product_notifications_enabled: settingsMap.new_product_notifications_enabled ?? true,
        discount_notifications_enabled: settingsMap.discount_notifications_enabled ?? true,
      };
    },
  });

  // Update form and notification states when settings load
  useEffect(() => {
    if (settings) {
      setFormData(settings);
      if ('new_product_notifications_enabled' in settings) {
        setNewProductNotificationsEnabled(settings.new_product_notifications_enabled);
      }
      if ('discount_notifications_enabled' in settings) {
        setDiscountNotificationsEnabled(settings.discount_notifications_enabled);
      }
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

  // Notification handlers
  const handleEnableNotifications = async () => {
    const granted = await requestPermission();
    if (granted) {
      toast.success('Notifications enabled successfully');
    } else {
      toast.error('Notification permission denied. Please enable in browser settings.');
    }
  };

  const handleToggleSound = (enabled: boolean) => {
    setSoundEnabled(enabled);
    safeStorage.setItem('notification_sound_enabled', String(enabled));
    toast.success(enabled ? 'Notification sounds enabled' : 'Notification sounds disabled');
  };

  const handleToggleHaptic = (enabled: boolean) => {
    setHapticEnabled(enabled);
    safeStorage.setItem('notification_haptic_enabled', String(enabled));
    if (enabled && 'vibrate' in navigator) {
      navigator.vibrate(100); // Quick feedback vibration
    }
    toast.success(enabled ? 'Haptic feedback enabled' : 'Haptic feedback disabled');
  };

  const handleTestNotification = () => {
    if (permission === 'granted') {
      new Notification('Test Notification', {
        body: 'Notifications are working correctly!',
        icon: '/favicon.ico',
      });
      toast.success('Test notification sent');
    } else {
      toast.error('Please enable notifications first');
    }
  };

  // Global notification toggle handlers (admin only)
  const handleToggleNewProductNotifications = async (enabled: boolean) => {
    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'new_product_notifications_enabled')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('settings')
          .update({ value: enabled })
          .eq('key', 'new_product_notifications_enabled');
      } else {
        await supabase
          .from('settings')
          .insert({ key: 'new_product_notifications_enabled', value: enabled });
      }

      setNewProductNotificationsEnabled(enabled);
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success(enabled ? 'New product notifications enabled' : 'New product notifications disabled');
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      toast.error('Failed to update setting');
    }
  };

  const handleToggleDiscountNotifications = async (enabled: boolean) => {
    try {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'discount_notifications_enabled')
        .maybeSingle();

      if (existing) {
        await supabase
          .from('settings')
          .update({ value: enabled })
          .eq('key', 'discount_notifications_enabled');
      } else {
        await supabase
          .from('settings')
          .insert({ key: 'discount_notifications_enabled', value: enabled });
      }

      setDiscountNotificationsEnabled(enabled);
      queryClient.invalidateQueries({ queryKey: ['store-settings'] });
      toast.success(enabled ? 'Discount notifications enabled' : 'Discount notifications disabled');
    } catch (error) {
      console.error('Failed to update notification setting:', error);
      toast.error('Failed to update setting');
    }
  };

  // Background push handlers
  const handleEnablePush = async () => {
    const result = await subscribePush();
    if (result.success) {
      showSuccessNotification('Push Enabled!', 'You\'ll receive notifications even when the app is closed');
    } else {
      showErrorNotification('Push Failed', result.error || 'Please check browser permissions');
    }
  };

  const handleDisablePush = async () => {
    const success = await unsubscribePush();
    if (success) {
      showSuccessNotification('Push Disabled', 'Background notifications turned off');
    } else {
      showErrorNotification('Error', 'Failed to disable push notifications');
    }
  };

  // Biometric handlers
  const handleEnrollBiometric = async () => {
    if (!user?.id || !user?.email) {
      toast.error('Please sign in first');
      return;
    }

    const result = await enrollBiometric(user.id, user.email);
    if (result.success) {
      toast.success('Face ID / Touch ID enrolled successfully');
    } else {
      toast.error(result.error || 'Failed to enroll biometric');
    }
  };

  const handleRemoveBiometric = () => {
    if (!user?.id) return;
    removeBiometric(user.id);
    toast.success('Biometric authentication removed');
  };

  const handleTestBiometric = async () => {
    if (!user?.id) {
      toast.error('You must be logged in to test biometric');
      return;
    }
    
    if (!biometricSupported) {
      toast.error('Biometric authentication is not supported on this device');
      return;
    }
    
    if (!isEnrolled) {
      toast.error('Please enroll biometric first');
      return;
    }
    
    const result = await authenticateWithBiometric(user.id);
    
    if (result.success) {
      toast.success('Biometric authentication successful!');
    } else {
      toast.error(result.error || 'Biometric authentication failed');
    }
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

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-2xl sm:text-3xl font-display">Settings</CardTitle>
            <CardDescription>Configure your store and personal settings</CardDescription>
          </CardHeader>
        </Card>

        <div className="grid gap-6 max-w-2xl">
          {/* Notifications Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" />
                <CardTitle>Notifications</CardTitle>
              </div>
              <CardDescription>Manage push notification preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Browser Support Check */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Browser Support</Label>
                  <p className="text-sm text-muted-foreground">
                    {notifSupported ? 'Your browser supports notifications' : 'Notifications not supported'}
                  </p>
                </div>
                {notifSupported ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Supported
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" /> Not Supported
                  </Badge>
                )}
              </div>

              {/* Permission Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Permission Status</Label>
                  <p className="text-sm text-muted-foreground">Current notification permission</p>
                </div>
                {getPermissionBadge()}
              </div>

              {/* Enable Notifications Button */}
              {notifSupported && permission !== 'granted' && (
                <Button 
                  onClick={handleEnableNotifications}
                  variant="outline"
                  className="w-full"
                  disabled={permission === 'denied'}
                >
                  <Bell className="h-4 w-4 mr-2" />
                  {permission === 'denied' ? 'Enable in Browser Settings' : 'Enable Notifications'}
                </Button>
              )}

              {/* Sound Toggle */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {soundEnabled ? <Volume2 className="h-4 w-4 text-muted-foreground" /> : <VolumeX className="h-4 w-4 text-muted-foreground" />}
                  <div className="space-y-0.5">
                    <Label>Notification Sounds</Label>
                    <p className="text-sm text-muted-foreground">Play sound for new notifications</p>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={handleToggleSound}
                />
              </div>

              {/* Haptic Feedback Toggle */}
              {isHapticSupported && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Vibrate className="h-4 w-4 text-muted-foreground" />
                    <div className="space-y-0.5">
                      <Label>Haptic Feedback</Label>
                      <p className="text-sm text-muted-foreground">Vibrate on new notifications (mobile)</p>
                    </div>
                  </div>
                  <Switch
                    checked={hapticEnabled}
                    onCheckedChange={handleToggleHaptic}
                  />
                </div>
              )}

              {/* Test Notification */}
              {permission === 'granted' && (
                <Button 
                  onClick={handleTestNotification}
                  variant="secondary"
                  className="w-full"
                >
                  Send Test Notification
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Background Push Notifications */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <BellRing className="h-5 w-5 text-primary" />
                <CardTitle>Background Push Notifications</CardTitle>
              </div>
              <CardDescription>Receive notifications even when the app is closed</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Push Support Check */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Push Support</Label>
                  <p className="text-sm text-muted-foreground">
                    {pushSupported ? 'Your browser supports background push' : 'Push not supported'}
                  </p>
                </div>
                {pushSupported ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Supported
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" /> Not Supported
                  </Badge>
                )}
              </div>

              {/* Subscription Status */}
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
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                  </Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground">
                    <AlertCircle className="h-3 w-3 mr-1" /> Inactive
                  </Badge>
                )}
              </div>

              {/* Enable/Disable Push */}
              {pushSupported && user && (
                <div className="space-y-2">
                  {!isPushSubscribed ? (
                    <Button 
                      onClick={handleEnablePush}
                      variant="outline"
                      className="w-full"
                      disabled={pushLoading}
                    >
                      {pushLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <BellRing className="h-4 w-4 mr-2" />
                      )}
                      Enable Background Push
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleDisablePush}
                      variant="destructive"
                      className="w-full"
                      disabled={pushLoading}
                    >
                      {pushLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <XCircle className="h-4 w-4 mr-2" />
                      )}
                      Disable Background Push
                    </Button>
                  )}
                </div>
              )}

              {/* iOS-specific guidance */}
              {isiOSDevice && !isPWAMode && pushSupported && (
                <div className="text-sm bg-yellow-500/10 border border-yellow-500/30 p-3 rounded-lg space-y-2">
                  <p className="font-medium text-yellow-400">iOS Setup Required</p>
                  <p className="text-muted-foreground">
                    To receive push notifications on iOS, you need to install this app first:
                  </p>
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
                  For the best experience, use Chrome, Firefox, or Edge.
                </p>
              )}

              {pushSupported && !user && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  Please sign in to enable background push notifications.
                </p>
              )}

              {/* VAPID Key Management - Admin Only */}
              {isAdmin && (
                <div className="border-t border-border pt-4 mt-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-muted-foreground" />
                      <Label>VAPID Key Management</Label>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      If push notifications show "invalid characters" errors, regenerate your VAPID keys below.
                    </p>
                    
                    <Button
                      onClick={async () => {
                        setIsGeneratingVapid(true);
                        try {
                          const { data, error } = await supabase.functions.invoke('generate-vapid-keys');
                          if (error) throw error;
                          setGeneratedVapidKeys({
                            publicKey: data.publicKey,
                            privateKey: data.privateKey,
                          });
                          toast.success('VAPID keys generated! Copy and update your secrets below.');
                        } catch (err: any) {
                          console.error('Failed to generate VAPID keys:', err);
                          toast.error('Failed to generate VAPID keys');
                        } finally {
                          setIsGeneratingVapid(false);
                        }
                      }}
                      variant="outline"
                      className="w-full"
                      disabled={isGeneratingVapid}
                    >
                      {isGeneratingVapid ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4 mr-2" />
                      )}
                      Generate New VAPID Keys
                    </Button>

                    {generatedVapidKeys && (
                      <div className="space-y-3 bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm font-medium text-green-400">✓ Keys Generated Successfully!</p>
                        <p className="text-xs text-muted-foreground">
                          You must update these secrets in your backend settings for push notifications to work:
                        </p>
                        
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">VAPID_PUBLIC_KEY & VITE_VAPID_PUBLIC_KEY:</Label>
                            <div className="flex gap-2">
                              <code className="flex-1 text-xs bg-background p-2 rounded border break-all">
                                {generatedVapidKeys.publicKey}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedVapidKeys.publicKey);
                                  toast.success('Public key copied!');
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-xs">VAPID_PRIVATE_KEY:</Label>
                            <div className="flex gap-2">
                              <code className="flex-1 text-xs bg-background p-2 rounded border break-all">
                                {generatedVapidKeys.privateKey}
                              </code>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedVapidKeys.privateKey);
                                  toast.success('Private key copied!');
                                }}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-xs text-yellow-400 bg-yellow-500/10 p-2 rounded">
                          <strong>Important:</strong> After updating secrets, all users must re-subscribe to push notifications.
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Face ID / Biometric Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Fingerprint className="h-5 w-5 text-primary" />
                <CardTitle>Face ID / Touch ID</CardTitle>
              </div>
              <CardDescription>Use biometric authentication for quick login</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Device Support Check */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Device Support</Label>
                  <p className="text-sm text-muted-foreground">
                    {biometricSupported === null 
                      ? 'Checking...' 
                      : biometricSupported 
                        ? 'Your device supports biometric authentication'
                        : 'Biometric auth not available on this device'}
                  </p>
                </div>
                {biometricSupported === null ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : biometricSupported ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Available
                  </Badge>
                ) : (
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                    <XCircle className="h-3 w-3 mr-1" /> Not Available
                  </Badge>
                )}
              </div>

              {/* Enrollment Status */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enrollment Status</Label>
                  <p className="text-sm text-muted-foreground">
                    {isEnrolled ? 'Biometric login is set up' : 'Not enrolled yet'}
                  </p>
                </div>
                {isEnrolled ? (
                  <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Enrolled
                  </Badge>
                ) : (
                  <Badge className="bg-muted text-muted-foreground">
                    <AlertCircle className="h-3 w-3 mr-1" /> Not Enrolled
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              {biometricSupported && (
                <div className="space-y-2">
                  {!isEnrolled ? (
                    <Button 
                      onClick={handleEnrollBiometric}
                      variant="outline"
                      className="w-full"
                      disabled={biometricLoading}
                    >
                      {biometricLoading ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Fingerprint className="h-4 w-4 mr-2" />
                      )}
                      Set Up Face ID / Touch ID
                    </Button>
                  ) : (
                    <>
                      <Button 
                        onClick={handleTestBiometric}
                        variant="secondary"
                        className="w-full"
                        disabled={biometricLoading}
                      >
                        {biometricLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Fingerprint className="h-4 w-4 mr-2" />
                        )}
                        Test Biometric Login
                      </Button>
                      <Button 
                        onClick={handleRemoveBiometric}
                        variant="destructive"
                        className="w-full"
                        disabled={biometricLoading}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove Biometric Login
                      </Button>
                    </>
                  )}
                </div>
              )}

              {!biometricSupported && biometricSupported !== null && (
                <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
                  Biometric authentication requires a device with Face ID, Touch ID, or Windows Hello. 
                  Try accessing the admin dashboard from your phone or a compatible laptop.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Admin-Only Settings */}
          {isAdmin && (
            <>
              {/* Global Notification Controls */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BellRing className="h-5 w-5 text-primary" />
                    <CardTitle>Global Notification Controls</CardTitle>
                  </div>
                  <CardDescription>Enable or disable push notifications for all users</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* New Product Notifications Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>New Product Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify users when new products are added to the store
                      </p>
                    </div>
                    <Switch
                      checked={newProductNotificationsEnabled}
                      onCheckedChange={handleToggleNewProductNotifications}
                    />
                  </div>

                  {/* Discount Code Notifications Toggle */}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Discount Code Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Notify subscribed users when new discount codes are created
                      </p>
                    </div>
                    <Switch
                      checked={discountNotificationsEnabled}
                      onCheckedChange={handleToggleDiscountNotifications}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Store Information */}
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

              {/* PWA Force Update - Admin Only */}
              {isAdmin && <ForceUpdateCard />}

              {/* Roblox Integration */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Roblox Integration</CardTitle>
                  <CardDescription>Configure Robux payment redirect</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="robloxGameUrl">Roblox Game URL</Label>
                    <Input
                      id="robloxGameUrl"
                      value={formData.roblox_game_url}
                      onChange={(e) => handleChange('roblox_game_url', e.target.value)}
                      placeholder="https://www.roblox.com/games/YOUR_GAME_ID"
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter the URL of your Roblox game where customers can purchase products with Robux.
                    </p>
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
            </>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
