import { useState, useEffect } from 'react';
import { GlobalGuardLayout, GlobalGuardHeader } from '@/components/global-guard/GlobalGuardLayout';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const STORAGE_KEY = 'global-guard-settings';

interface GuardSettings {
 autoSyncNewServers: boolean;
 notifyOnSyncFailure: boolean;
 defaultBanReason: string;
}

const defaultSettings: GuardSettings = {
 autoSyncNewServers: true,
 notifyOnSyncFailure: true,
 defaultBanReason: '',
};

export default function GlobalGuardSettings() {
 const [settings, setSettings] = useState<GuardSettings>(() => {
 try {
 const stored = localStorage.getItem(STORAGE_KEY);
 return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
 } catch {
 return defaultSettings;
 }
 });
 const [isSaving, setIsSaving] = useState(false);

 const handleSave = async () => {
 setIsSaving(true);
 try {
 localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
 toast.success('Settings saved');
 } catch {
 toast.error('Failed to save settings');
 } finally {
 setIsSaving(false);
 }
 };

 return (
 <GlobalGuardLayout>
 <GlobalGuardHeader />
 
 <div className="space-y-6">
 <div className="border border-border rounded-xl overflow-hidden bg-card border-border">
 <div className="px-4 py-3 border-b border-border bg-muted/30">
 <h3 className="font-semibold text-sm text-xl font-medium">Ban Settings</h3>
 <p className="text-sm text-muted-foreground">
 Configure how Global Guard handles bans across your servers
 </p>
 </div>
 <div className="p-4 space-y-6">
 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label htmlFor="auto-sync">Auto-sync new servers</Label>
 <p className="text-sm text-muted-foreground">
 Automatically apply existing bans when a new server is connected
 </p>
 </div>
 <Switch
 id="auto-sync"
 checked={settings.autoSyncNewServers}
 onCheckedChange={(checked) => 
 setSettings(s => ({ ...s, autoSyncNewServers: checked }))
 }
 />
 </div>

 <div className="flex items-center justify-between">
 <div className="space-y-0.5">
 <Label htmlFor="notify-failure">Notify on sync failure</Label>
 <p className="text-sm text-muted-foreground">
 Receive notifications when a ban fails to sync to a server
 </p>
 </div>
 <Switch
 id="notify-failure"
 checked={settings.notifyOnSyncFailure}
 onCheckedChange={(checked) => 
 setSettings(s => ({ ...s, notifyOnSyncFailure: checked }))
 }
 />
 </div>

 <div className="space-y-2">
 <Label htmlFor="default-reason">Default ban reason</Label>
 <Input
 id="default-reason"
 placeholder="Enter a default reason for new bans..."
 value={settings.defaultBanReason}
 onChange={(e) => 
 setSettings(s => ({ ...s, defaultBanReason: e.target.value }))
 }
 />
 <p className="text-sm text-muted-foreground">
 This will be pre-filled when creating new bans
 </p>
 </div>
 </div>
 </div>

 <div className="flex justify-end">
 <Button 
 onClick={handleSave}
 disabled={isSaving}
 className="bg-primary hover:bg-primary/90"
 >
 {isSaving ? 'Saving...' : 'Save Settings'}
 </Button>
 </div>
 </div>
 </GlobalGuardLayout>
 );
}
