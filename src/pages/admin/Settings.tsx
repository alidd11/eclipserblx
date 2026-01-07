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
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Bell, Fingerprint, CheckCircle2, XCircle, AlertCircle, Volume2, VolumeX, Trash2, BellRing } from 'lucide-react';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useBackgroundPush } from '@/hooks/useBackgroundPush';
import { useAuth } from '@/hooks/useAuth';

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
  const { user } = useAuth();
  const [formData, setFormData] = useState<StoreSettings>(DEFAULT_SETTINGS);
  
  // Notification settings
  const { isSupported: notifSupported, permission, requestPermission } = usePushNotifications();
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('notification_sound_enabled') !== 'false';
  });
  
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
    localStorage.setItem('notification_sound_enabled', String(enabled));
    toast.success(enabled ? 'Notification sounds enabled' : 'Notification sounds disabled');
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

  // Background push handlers
  const handleEnablePush = async () => {
    const result = await subscribePush();
    if (result.success) {
      toast.success('Background push notifications enabled! You\'ll receive notifications even when the app is closed.');
    } else {
      toast.error(result.error || 'Failed to enable push notifications. Please check browser permissions.');
    }
  };

  const handleDisablePush = async () => {
    const success = await unsubscribePush();
    if (success) {
      toast.success('Background push notifications disabled');
    } else {
      toast.error('Failed to disable push notifications');
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
    if (!user?.id) return;
    
    const { authenticateWithBiometric } = await import('@/hooks/useBiometricAuth').then(m => {
      const hook = m.useBiometricAuth();
      return hook;
    });
    
    // We need to test using the current instance
    try {
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);
      
      const storedCredential = localStorage.getItem(`biometric_credential_${user.id}`);
      if (!storedCredential) {
        toast.error('No biometric credential found');
        return;
      }
      
      const credentialData = JSON.parse(storedCredential);
      const rawIdArray = Uint8Array.from(atob(credentialData.rawId), c => c.charCodeAt(0));

      const assertion = await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          allowCredentials: [{
            id: rawIdArray,
            type: 'public-key',
            transports: ['internal'],
          }],
          userVerification: 'required',
          timeout: 60000,
        },
      });

      if (assertion) {
        toast.success('Biometric authentication successful!');
      } else {
        toast.error('Biometric authentication failed');
      }
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        toast.error('Authentication cancelled');
      } else {
        toast.error('Biometric test failed');
      }
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

          {/* Discord Integration */}
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

          {/* Payment Settings */}
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
