import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Code, RefreshCw, Upload } from 'lucide-react';
import { toast } from 'sonner';

export default function BotCommands() {
  const queryClient = useQueryClient();

  const { data: commands = [], isLoading } = useQuery({
    queryKey: ['bot-command-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_command_settings')
        .select('*')
        .order('command_name');
      if (error) throw error;
      return data;
    },
  });

  const toggleCommand = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      const { error } = await supabase
        .from('bot_command_settings')
        .update({ enabled, updated_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['bot-command-settings'] }),
  });

  const registerCommands = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke('bot-control', {
        body: { action: 'register-commands' },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => toast.success(`Registered ${data?.registered || 0} commands`),
    onError: (e: Error) => toast.error(e.message),
  });

  const enabledCount = commands.filter((c) => c.enabled).length;

  return (
    <BotDashboardLayout>
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Code className="h-5 w-5 text-[hsl(258,90%,66%)]" />
              Commands
              <Badge className="bg-[hsl(258,90%,66%)]/20 text-[hsl(258,90%,76%)] border-[hsl(258,90%,66%)]/30 ml-2">
                {enabledCount}/{commands.length}
              </Badge>
            </h2>
            <p className="text-sm text-white/50 mt-1">Toggle commands on/off and re-register with Discord</p>
          </div>
          <Button
            className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-white"
            size="sm"
            onClick={() => registerCommands.mutate()}
            disabled={registerCommands.isPending}
          >
            {registerCommands.isPending ? (
              <RefreshCw className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 mr-1.5" />
            )}
            Register All
          </Button>
        </div>

        {isLoading ? (
          <p className="text-sm text-white/40">Loading...</p>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <div key={cmd.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/[0.07] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-white">/{cmd.command_name}</p>
                  {cmd.description && (
                    <p className="text-xs text-white/40 mt-0.5 truncate">{cmd.description}</p>
                  )}
                </div>
                <Switch
                  checked={cmd.enabled}
                  onCheckedChange={(checked) => toggleCommand.mutate({ id: cmd.id, enabled: checked })}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </BotDashboardLayout>
  );
}
