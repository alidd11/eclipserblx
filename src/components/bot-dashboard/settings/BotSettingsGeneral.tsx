import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Settings, Save, Loader2, AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface BotSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

interface ErrorLog {
  id: string;
  context: string;
  error_message: string;
  stack_trace: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function BotSettingsGeneral() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data: settings = [], isLoading: settingsLoading } = useQuery({
    queryKey: ['bot-settings'],
    queryFn: async () => {
      const { data, error } = await supabase.from('bot_settings').select('*').order('key');
      if (error) throw error;
      return data as BotSetting[];
    },
  });

  const { data: errors = [], isLoading: errorsLoading, refetch: refetchErrors, isFetching: fetchingErrors } = useQuery({
    queryKey: ['bot-error-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as ErrorLog[];
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (settings.length) {
      const map: Record<string, string> = {};
      settings.forEach((s) => { map[s.key] = s.value; });
      setValues(map);
      setDirty(false);
    }
  }, [settings]);

  const saveSettings = useMutation({
    mutationFn: async () => {
      const updates = settings
        .filter((s) => values[s.key] !== s.value)
        .map((s) =>
          supabase.from('bot_settings').update({ value: values[s.key], updated_at: new Date().toISOString() }).eq('id', s.id)
        );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-settings'] });
      toast.success('Settings saved');
      setDirty(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const clearLogs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('bot_error_logs').delete().lt('created_at', new Date().toISOString());
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bot-error-logs'] });
      toast.success('Error logs cleared');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const formatLabel = (key: string) => key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMin = Math.floor((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return `${Math.floor(diffHr / 24)}d ago`;
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Settings Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Settings className="h-5 w-5 text-[hsl(258,90%,66%)] shrink-0" />
              <span className="truncate">Bot Settings</span>
            </h2>
            <p className="text-xs sm:text-sm text-foreground/50 mt-1">Configure bot environment values</p>
          </div>
          {dirty && (
            <Button
              size="sm"
              onClick={() => saveSettings.mutate()}
              disabled={saveSettings.isPending}
              className="bg-green-600 hover:bg-green-700 text-foreground shrink-0"
            >
              {saveSettings.isPending ? <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" /> : <Save className="h-4 w-4 sm:mr-1.5" />}
              <span className="hidden sm:inline">Save Changes</span>
            </Button>
          )}
        </div>

        {settingsLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-background/5 border border-white/10 p-4">
                <Skeleton className="h-3 w-24 bg-background/10 mb-2" />
                <Skeleton className="h-9 w-full bg-background/10 rounded" />
              </div>
            ))}
          </div>
        ) : !settings.length ? (
          <div className="text-center py-12 text-foreground/40">
            <Settings className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No settings configured</p>
          </div>
        ) : (
          <div className="space-y-3">
            {settings.map((setting) => (
              <div key={setting.id} className="rounded-xl bg-background/5 border border-white/10 p-3 sm:p-4">
                <Label className="text-xs text-foreground/60">{formatLabel(setting.key)}</Label>
                {setting.description && (
                  <p className="text-[10px] sm:text-xs text-foreground/30 mb-1.5">{setting.description}</p>
                )}
                <Input
                  value={values[setting.key] || ''}
                  onChange={(e) => { setValues(prev => ({ ...prev, [setting.key]: e.target.value })); setDirty(true); }}
                  className="bg-background/5 border-white/10 text-foreground placeholder:text-foreground/30"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-white/10" />

      {/* Error Logs Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2 min-w-0">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span className="truncate">Error Logs</span>
            {errors.length > 0 && (
              <Badge className="bg-red-500/20 text-red-400 border-red-500/30 shrink-0">{errors.length}</Badge>
            )}
          </h2>
          <div className="flex gap-1 shrink-0">
            {errors.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => clearLogs.mutate()}
                disabled={clearLogs.isPending}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 w-8"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetchErrors()}
              disabled={fetchingErrors}
              className="text-foreground/60 hover:text-foreground hover:bg-background/10 h-8 w-8"
            >
              <RefreshCw className={`h-4 w-4 ${fetchingErrors ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {errorsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="p-4 rounded-xl bg-background/5 border border-white/10 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-5 w-20 bg-background/10 rounded-full" />
                  <Skeleton className="h-3 w-16 bg-background/10" />
                </div>
                <Skeleton className="h-3 w-full bg-background/10" />
              </div>
            ))}
          </div>
        ) : !errors.length ? (
          <div className="text-center py-8 text-foreground/40">
            <p className="text-sm">No errors logged — looking good! ✅</p>
          </div>
        ) : (
          <div className="space-y-2">
            {errors.map((err) => (
              <div key={err.id} className="p-3 sm:p-4 rounded-xl bg-background/5 border border-white/10 space-y-1 hover:bg-background/[0.07] transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="outline" className="text-[10px] sm:text-xs text-red-400 border-red-500/30 bg-red-500/10">
                    {err.context}
                  </Badge>
                  <span className="text-[10px] sm:text-xs text-foreground/30 shrink-0">{formatTime(err.created_at)}</span>
                </div>
                <p className="text-xs font-mono text-foreground/60 break-all line-clamp-2">{err.error_message}</p>
                {err.metadata && Object.keys(err.metadata).length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    {Object.entries(err.metadata).map(([k, v]) => (
                      <span key={k} className="text-[10px] sm:text-xs text-foreground/30">
                        {k}: <span className="font-mono">{String(v)}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
