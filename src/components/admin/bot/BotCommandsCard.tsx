import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Code, RefreshCw, Upload } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function BotCommandsCard() {
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
 onSuccess: (data) => {
 toast.success(`Registered ${data?.registered || 0} commands with Discord`);
 },
 onError: (e: Error) => toast.error(e.message),
 });

 const enabledCount = commands.filter((c) => c.enabled).length;

 return (
 <div className="border border-border rounded-xl overflow-hidden">
 <div className="px-4 py-3 border-b border-border bg-muted/30 flex flex-row items-center justify-between pb-3">
 <h3 className="font-semibold text-sm text-lg flex items-center gap-2">
 <Code className="h-5 w-5" />
 Commands
 <Badge variant="secondary">{enabledCount}/{commands.length}</Badge>
 </h3>
 <Button
 variant="outline"
 size="sm"
 onClick={() => registerCommands.mutate()}
 disabled={registerCommands.isPending}
 >
 {registerCommands.isPending ? (
 <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
 ) : (
 <Upload className="h-4 w-4 mr-1" />
 )}
 Register
 </Button>
 </div>
 <div className="p-4">
 {isLoading ? (
 <p className="text-sm text-muted-foreground">Loading...</p>
 ) : (
 <div className="space-y-2 max-h-96 overflow-y-auto">
 {commands.map((cmd) => (
 <div key={cmd.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50">
 <div className="flex-1 min-w-0">
 <p className="font-mono text-sm">/{cmd.command_name}</p>
 {cmd.description && (
 <p className="text-xs text-muted-foreground truncate">{cmd.description}</p>
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
 </div>
 );
}
