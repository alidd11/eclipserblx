import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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

export default function BotSettings() {
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
    <BotDashboardLayout>
      <div className="space-y-8 max-w-4xl">
        {/* Settings Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Settings className="h-5 w-5 text-[hsl(258,90%,66%)]" />
                Bot Settings
              </h2>
              <p className="text-sm text-white/50 mt-1">Configure bot environment values</p>
            </div>
            {dirty && (
              <Button
                size="sm"
                onClick={() => saveSettings.mutate()}
                disabled={saveSettings.isPending}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {saveSettings.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Changes
              </Button>
            )}
          </div>

          {settingsLoading ? (
            <p className="text-sm text-white/40">Loading...</p>
          ) : (
            <div className="space-y-3">
              {settings.map((setting) => (
                <div key={setting.id} className="rounded-xl bg-white/5 border border-white/10 p-4">
                  <Label className="text-xs text-white/60">{formatLabel(setting.key)}</Label>
                  {setting.description && (
                    <p className="text-xs text-white/30 mb-1.5">{setting.description}</p>
                  )}
                  <Input
                    value={values[setting.key] || ''}
                    onChange={(e) => { setValues(prev => ({ ...prev, [setting.key]: e.target.value })); setDirty(true); }}
                    className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Error Logs Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Error Logs
              {errors.length > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 ml-2">{errors.length}</Badge>
              )}
            </h2>
            <div className="flex gap-2">
              {errors.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => clearLogs.mutate()}
                  disabled={clearLogs.isPending}
                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetchErrors()}
                disabled={fetchingErrors}
                className="text-white/60 hover:text-white hover:bg-white/10"
              >
                <RefreshCw className={`h-4 w-4 ${fetchingErrors ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          {errorsLoading ? (
            <p className="text-sm text-white/40">Loading...</p>
          ) : !errors.length ? (
            <div className="text-center py-8 text-white/40">
              <p>No errors logged — looking good! ✅</p>
            </div>
          ) : (
            <div className="space-y-2">
              {errors.map((err) => (
                <div key={err.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="outline" className="text-xs text-red-400 border-red-500/30 bg-red-500/10">
                      {err.context}
                    </Badge>
                    <span className="text-xs text-white/30 shrink-0">{formatTime(err.created_at)}</span>
                  </div>
                  <p className="text-xs font-mono text-white/60 break-all">{err.error_message}</p>
                  {err.metadata && Object.keys(err.metadata).length > 0 && (
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(err.metadata).map(([k, v]) => (
                        <span key={k} className="text-xs text-white/30">
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
    </BotDashboardLayout>
  );
}
