import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';

interface BotSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  updated_at: string;
}

export function BotSettingsCard() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ['bot-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_settings')
        .select('*')
        .order('key');
      if (error) throw error;
      return data as BotSetting[];
    },
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
          supabase
            .from('bot_settings')
            .update({ value: values[s.key], updated_at: new Date().toISOString() })
            .eq('id', s.id)
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

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  };

  const formatLabel = (key: string) =>
    key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Bot Settings
        </CardTitle>
        {dirty && (
          <Button size="sm" onClick={() => saveSettings.mutate()} disabled={saveSettings.isPending}>
            {saveSettings.isPending ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : (
          <div className="space-y-3">
            {settings.map((setting) => (
              <div key={setting.id}>
                <Label className="text-xs">{formatLabel(setting.key)}</Label>
                {setting.description && (
                  <p className="text-xs text-muted-foreground mb-1">{setting.description}</p>
                )}
                <Input
                  value={values[setting.key] || ''}
                  onChange={(e) => handleChange(setting.key, e.target.value)}
                  placeholder={setting.description || ''}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
