import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
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
      <div className="space-y-5 max-w-4xl mx-auto">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-foreground flex items-center gap-2">
              <Code className="h-5 w-5 text-[hsl(258,90%,66%)] shrink-0" />
              <span className="truncate">Commands</span>
              {!isLoading && (
                <Badge className="bg-[hsl(258,90%,66%)]/20 text-[hsl(258,90%,76%)] border-[hsl(258,90%,66%)]/30 shrink-0">
                  {enabledCount}/{commands.length}
                </Badge>
              )}
            </h2>
            <p className="text-xs sm:text-sm text-foreground/50 mt-1">Toggle commands on/off and re-register with Discord</p>
          </div>
          <Button
            className="bg-[hsl(258,90%,66%)] hover:bg-[hsl(258,90%,60%)] text-foreground shrink-0"
            size="sm"
            onClick={() => registerCommands.mutate()}
            disabled={registerCommands.isPending}
          >
            {registerCommands.isPending ? (
              <RefreshCw className="h-4 w-4 sm:mr-1.5 animate-spin" />
            ) : (
              <Upload className="h-4 w-4 sm:mr-1.5" />
            )}
            <span className="hidden sm:inline">Register All</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-background/5 border border-white/10">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-28 bg-background/10" />
                  <Skeleton className="h-3 w-48 bg-background/10" />
                </div>
                <Skeleton className="h-5 w-9 rounded-full bg-background/10" />
              </div>
            ))}
          </div>
        ) : !commands.length ? (
          <div className="text-center py-16">
            <Code className="h-10 w-10 mx-auto mb-3 text-foreground/20" />
            <p className="text-sm text-foreground/40">No commands configured</p>
          </div>
        ) : (
          <div className="space-y-2">
            {commands.map((cmd) => (
              <div key={cmd.id} className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-background/5 border border-white/10 hover:bg-background/[0.07] transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm text-foreground truncate">/{cmd.command_name}</p>
                  {cmd.description && (
                    <p className="text-xs text-foreground/40 mt-0.5 truncate">{cmd.description}</p>
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
