import { useState } from 'react';
import { Settings, Shield, Bell, Users, Trash2, RefreshCw, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import type { ConnectedServer } from '@/types/global-guard';

interface ServerSettingsCardProps {
  server: ConnectedServer;
  onSettingsChange?: (guildId: string, settings: ServerSettings) => void;
  onRemoveServer?: (guildId: string) => void;
  onSyncNow?: (guildId: string) => void;
}

interface ServerSettings {
  autoSync: boolean;
  syncNewBans: boolean;
  notifyOnBan: boolean;
  banMessageEnabled: boolean;
  syncPriority: 'normal' | 'high';
}

export function ServerSettingsCard({ 
  server, 
  onSettingsChange, 
  onRemoveServer,
  onSyncNow,
}: ServerSettingsCardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [settings, setSettings] = useState<ServerSettings>({
    autoSync: true,
    syncNewBans: true,
    notifyOnBan: false,
    banMessageEnabled: true,
    syncPriority: 'normal',
  });

  const handleSave = () => {
    onSettingsChange?.(server.guild_id, settings);
    toast.success('Server settings updated');
    setIsOpen(false);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await onSyncNow?.(server.guild_id);
      toast.success('Sync initiated');
    } catch {
      toast.error('Sync failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRemove = () => {
    onRemoveServer?.(server.guild_id);
    setIsOpen(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Card className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer group">
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              <Avatar className="w-12 h-12 rounded-xl">
                <AvatarImage 
                  src={server.guild_icon 
                    ? `https://cdn.discordapp.com/icons/${server.guild_id}/${server.guild_icon}.png` 
                    : undefined
                  } 
                />
                <AvatarFallback className="rounded-xl bg-muted text-muted-foreground">
                  <Shield className="w-6 h-6" />
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-medium text-foreground truncate">
                    {server.guild_name || 'Unknown Server'}
                  </h3>
                  <Settings className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Users className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {server.member_count?.toLocaleString() || '?'} members
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge 
                    variant="outline" 
                    className={server.license_status === 'active' 
                      ? 'border-green-500/50 text-green-600 dark:text-green-400' 
                      : 'border-muted'
                    }
                  >
                    {server.license_status === 'active' ? 'Protected' : 'Inactive'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Avatar className="w-8 h-8 rounded-lg">
              <AvatarImage 
                src={server.guild_icon 
                  ? `https://cdn.discordapp.com/icons/${server.guild_id}/${server.guild_icon}.png` 
                  : undefined
                } 
              />
              <AvatarFallback className="rounded-lg bg-muted">
                <Shield className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
            {server.guild_name}
          </DialogTitle>
          <DialogDescription>
            Configure how Global Guard protects this server
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Auto Sync */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-sync">Auto-sync bans</Label>
              <p className="text-xs text-muted-foreground">
                Automatically apply new bans to this server
              </p>
            </div>
            <Switch
              id="auto-sync"
              checked={settings.autoSync}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, autoSync: checked }))}
            />
          </div>

          {/* Sync new bans */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="sync-new">Receive new bans</Label>
              <p className="text-xs text-muted-foreground">
                Get bans from other connected servers
              </p>
            </div>
            <Switch
              id="sync-new"
              checked={settings.syncNewBans}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, syncNewBans: checked }))}
            />
          </div>

          {/* Ban notifications */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notify">Log channel notifications</Label>
              <p className="text-xs text-muted-foreground">
                Post ban events to a designated channel
              </p>
            </div>
            <Switch
              id="notify"
              checked={settings.notifyOnBan}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, notifyOnBan: checked }))}
            />
          </div>

          {/* DM banned users */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="ban-message">DM banned users</Label>
              <p className="text-xs text-muted-foreground">
                Send a message to users before banning
              </p>
            </div>
            <Switch
              id="ban-message"
              checked={settings.banMessageEnabled}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, banMessageEnabled: checked }))}
            />
          </div>

          {/* Sync Priority */}
          <div className="space-y-2">
            <Label>Sync priority</Label>
            <Select 
              value={settings.syncPriority} 
              onValueChange={(value: 'normal' | 'high') => setSettings(s => ({ ...s, syncPriority: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">High (Premium)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              High priority servers are synced first
            </p>
          </div>

          {/* Quick Actions */}
          <div className="pt-4 border-t border-border space-y-2">
            <Label className="text-muted-foreground">Quick Actions</Label>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1"
                onClick={handleSync}
                disabled={isSyncing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                Sync Now
              </Button>
              <Button 
                variant="outline" 
                size="sm"
                asChild
              >
                <a 
                  href={`https://discord.com/channels/${server.guild_id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={handleRemove}
            className="sm:mr-auto"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Remove Server
          </Button>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
