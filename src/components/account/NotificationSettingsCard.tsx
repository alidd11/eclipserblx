import { useState } from 'react';
import { Bell, BellOff, Loader2, Smartphone, Volume2, VolumeX } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useBackgroundPush } from '@/hooks/useBackgroundPush';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';

const SOUND_ENABLED_KEY = 'notification-sound-enabled';
const HAPTIC_ENABLED_KEY = 'haptic-feedback-enabled';

export function NotificationSettingsCard() {
  const { user } = useAuth();
  const { permission, isSubscribed, subscribe, unsubscribe, isLoading: pushLoading, isiOSDevice, isPWAMode } = useBackgroundPush();
  const [isTogglingPush, setIsTogglingPush] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    const saved = localStorage.getItem(SOUND_ENABLED_KEY);
    return saved !== 'false';
  });
  const [hapticEnabled, setHapticEnabled] = useState(() => {
    const saved = localStorage.getItem(HAPTIC_ENABLED_KEY);
    return saved !== 'false';
  });

  const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
    (window.navigator as any).standalone === true;

  const handleTogglePush = async () => {
    if (!user) {
      toast.error('Please sign in to manage notifications');
      return;
    }

    setIsTogglingPush(true);
    try {
      if (isSubscribed) {
        const success = await unsubscribe();
        if (success) {
          showSuccessNotification('Notifications Disabled', 'Push notifications turned off');
        } else {
          showErrorNotification('Error', 'Failed to disable push notifications');
        }
      } else {
        const result = await subscribe();
        if (result.success) {
          showSuccessNotification('Notifications Enabled!', 'You\'ll receive alerts for orders, messages, and updates');
        } else {
          showErrorNotification('Error', result.error || 'Failed to enable push notifications');
        }
      }
    } catch (error) {
      console.error('Push toggle error:', error);
      showErrorNotification('Error', 'Failed to update notification settings');
    } finally {
      setIsTogglingPush(false);
    }
  };

  const handleSoundToggle = (enabled: boolean) => {
    setSoundEnabled(enabled);
    localStorage.setItem(SOUND_ENABLED_KEY, String(enabled));
    showSuccessNotification(enabled ? 'Sound Enabled' : 'Sound Disabled', 'Notification sound preference updated');
  };

  const handleHapticToggle = (enabled: boolean) => {
    setHapticEnabled(enabled);
    localStorage.setItem(HAPTIC_ENABLED_KEY, String(enabled));
    if (enabled && 'vibrate' in navigator) {
      navigator.vibrate(50);
    }
    showSuccessNotification(enabled ? 'Haptic Enabled' : 'Haptic Disabled', 'Vibration preference updated');
  };

  const supportsHaptic = 'vibrate' in navigator;

  // Show iOS-specific message if not installed as PWA
  const showIOSInstallMessage = isiOSDevice && !isPWAMode;

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Settings
        </CardTitle>
        <CardDescription>
          Manage how you receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Push Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-notifications" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              Push Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              {showIOSInstallMessage
                ? 'Install the app to your Home Screen for push notifications'
                : isPWA 
                  ? 'Receive notifications even when the app is closed'
                  : 'Get notified about orders, messages, and updates'
              }
            </p>
          </div>
          {pushLoading || isTogglingPush ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : (
            <Switch
              id="push-notifications"
              checked={isSubscribed}
              onCheckedChange={handleTogglePush}
              disabled={permission === 'denied' || showIOSInstallMessage}
            />
          )}
        </div>

        {permission === 'denied' && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <BellOff className="h-4 w-4 inline mr-2" />
            Notifications are blocked. Enable them in your browser/device settings.
          </div>
        )}

        {showIOSInstallMessage && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            <Smartphone className="h-4 w-4 inline mr-2" />
            Tap the Share button, then "Add to Home Screen" to enable push notifications.
          </div>
        )}

        {/* Sound Notifications */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="sound-notifications" className="flex items-center gap-2">
              {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              Sound Notifications
            </Label>
            <p className="text-xs text-muted-foreground">
              Play a sound when receiving notifications
            </p>
          </div>
          <Switch
            id="sound-notifications"
            checked={soundEnabled}
            onCheckedChange={handleSoundToggle}
          />
        </div>

        {/* Haptic Feedback */}
        {supportsHaptic && (
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="haptic-feedback" className="flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Haptic Feedback
              </Label>
              <p className="text-xs text-muted-foreground">
                Vibrate on notifications and interactions
              </p>
            </div>
            <Switch
              id="haptic-feedback"
              checked={hapticEnabled}
              onCheckedChange={handleHapticToggle}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
