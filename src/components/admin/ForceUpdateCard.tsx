import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Loader2, AlertTriangle, CheckCircle, Smartphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { showSuccessNotification, showErrorNotification } from '@/lib/nativeNotification';
import { useAuth } from '@/hooks/useAuth';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface AppVersion {
  id: string;
  version: string;
  force_update: boolean;
  updated_at: string;
  updated_by: string | null;
}

export function ForceUpdateCard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [newVersion, setNewVersion] = useState('');

  const { data: appVersion, isLoading } = useQuery({
    queryKey: ['app-version'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_version')
        .select('*')
        .eq('id', 'current')
        .single();

      if (error) throw error;
      return data as AppVersion;
    },
  });

  const { data: subscriberCount } = useQuery({
    queryKey: ['push-subscriber-count'],
    queryFn: async () => {
      const { count, error } = await supabase
        .from('push_subscriptions')
        .select('*', { count: 'exact', head: true });

      if (error) throw error;
      return count || 0;
    },
  });

  const triggerUpdateMutation = useMutation({
    mutationFn: async (version: string) => {
      const { error } = await supabase
        .from('app_version')
        .update({
          version,
          force_update: true,
          updated_at: new Date().toISOString(),
          updated_by: user?.email || 'admin',
        })
        .eq('id', 'current');

      if (error) throw error;

      // Send push notification to all users to wake up their PWAs
      try {
        await supabase.functions.invoke('send-push-notification', {
          body: {
            broadcast: true,
            title: 'App Update Available',
            body: 'A new version is being installed...',
            tag: `app-update-${version}`,
            url: '/',
          },
        });
      } catch (pushError) {
        console.warn('Could not send push notification:', pushError);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-version'] });
      showSuccessNotification('Update Triggered', 'All connected PWAs will update automatically');
      setNewVersion('');
    },
    onError: (error) => {
      console.error('Failed to trigger update:', error);
      showErrorNotification('Update Failed', 'Could not trigger force update');
    },
  });

  const resetForceFlagMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('app_version')
        .update({
          force_update: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 'current');

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-version'] });
      showSuccessNotification('Force Flag Reset', 'Force update flag has been cleared');
    },
  });

  const handleTriggerUpdate = () => {
    const version = newVersion.trim() || generateNextVersion(appVersion?.version || '1.0.0');
    triggerUpdateMutation.mutate(version);
  };

  const generateNextVersion = (current: string): string => {
    const parts = current.split('.');
    const patch = parseInt(parts[2] || '0', 10) + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          PWA Force Update
        </CardTitle>
        <CardDescription>
          Push updates to all installed PWAs without requiring reinstallation
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Current Status */}
        <div className="flex flex-wrap items-center gap-4 p-4 rounded-lg bg-muted/50">
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">Active Subscribers:</span>
            <Badge variant="secondary">{subscriberCount ?? 0}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Current Version:</span>
            <Badge variant="outline">{appVersion?.version || '1.0.0'}</Badge>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">Force Update:</span>
            {appVersion?.force_update ? (
              <Badge className="bg-amber-500/20 text-amber-600 border-amber-500/30">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Active
              </Badge>
            ) : (
              <Badge variant="secondary">
                <CheckCircle className="h-3 w-3 mr-1" />
                Inactive
              </Badge>
            )}
          </div>
        </div>

        {/* Version Input */}
        <div className="space-y-2">
          <Label htmlFor="new-version">New Version (optional)</Label>
          <Input
            id="new-version"
            placeholder={`Leave blank for ${generateNextVersion(appVersion?.version || '1.0.0')}`}
            value={newVersion}
            onChange={(e) => setNewVersion(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Specify a version number or leave blank to auto-increment
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button 
                className="gap-2"
                disabled={triggerUpdateMutation.isPending}
              >
                {triggerUpdateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Trigger Force Update
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Force Update</AlertDialogTitle>
                <AlertDialogDescription>
                  This will push an update to all {subscriberCount ?? 0} installed PWAs. 
                  Users will see their app refresh automatically within 30 seconds.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleTriggerUpdate}>
                  Confirm Update
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {appVersion?.force_update && (
            <Button
              variant="outline"
              onClick={() => resetForceFlagMutation.mutate()}
              disabled={resetForceFlagMutation.isPending}
            >
              Reset Force Flag
            </Button>
          )}
        </div>

        {/* Info */}
        <div className="p-3 rounded-md bg-blue-500/10 border border-blue-500/20 text-sm text-blue-600 dark:text-blue-400">
          <p className="font-medium mb-1">How it works:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>PWAs check for updates every 30 seconds via realtime subscription</li>
            <li>When force update is triggered, all caches are cleared and the app reloads</li>
            <li>Push notifications wake up background PWAs to apply the update</li>
            <li>Users don't need to uninstall or reinstall the app</li>
          </ul>
        </div>

        {appVersion?.updated_by && (
          <p className="text-xs text-muted-foreground">
            Last updated by {appVersion.updated_by} on{' '}
            {new Date(appVersion.updated_at).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
