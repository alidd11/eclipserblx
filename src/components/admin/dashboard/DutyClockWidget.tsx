import { useState, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Clock, Play, Square, Timer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, differenceInMinutes } from '@/lib/dateUtils';

export function DutyClockWidget() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [clockOutNotes, setClockOutNotes] = useState('');
  const [elapsedTime, setElapsedTime] = useState('00:00:00');
  const [showClockOutConfirm, setShowClockOutConfirm] = useState(false);

  const { data: activeSession } = useQuery({
    queryKey: ['active-duty-session', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('staff_duty_logs')
        .select('*')
        .eq('user_id', user.id)
        .is('clock_out', null)
        .order('clock_in', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  useEffect(() => {
    if (!activeSession?.clock_in) {
      setElapsedTime('00:00:00');
      return;
    }
    const updateElapsed = () => {
      const diffMs = Date.now() - new Date(activeSession.clock_in).getTime();
      const h = Math.floor(diffMs / 3600000);
      const m = Math.floor((diffMs % 3600000) / 60000);
      const s = Math.floor((diffMs % 60000) / 1000);
      setElapsedTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
    };
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [activeSession?.clock_in]);

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['active-duty-session'] });
    queryClient.invalidateQueries({ queryKey: ['my-duty-logs'] });
    queryClient.invalidateQueries({ queryKey: ['all-duty-logs'] });
  };

  const clockInMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error('Not authenticated');
      const { error } = await supabase.from('staff_duty_logs').insert({ user_id: user.id });
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); toast.success('Clocked in successfully'); },
    onError: (error) => { toast.error('Failed to clock in: ' + error.message); },
  });

  const clockOutMutation = useMutation({
    mutationFn: async () => {
      if (!activeSession?.id) throw new Error('No active session');
      const clockOut = new Date();
      const durationMinutes = differenceInMinutes(clockOut, new Date(activeSession.clock_in));
      const { error } = await supabase
        .from('staff_duty_logs')
        .update({ clock_out: clockOut.toISOString(), duration_minutes: durationMinutes, notes: clockOutNotes || null })
        .eq('id', activeSession.id);
      if (error) throw error;
    },
    onSuccess: () => { invalidateAll(); setClockOutNotes(''); toast.success('Clocked out successfully'); },
    onError: (error) => { toast.error('Failed to clock out: ' + error.message); },
  });

  return (
    <div className="border border-border rounded-xl overflow-hidden max-w-md">
      <div className="px-4 py-3 border-b border-border bg-muted/30 flex items-center gap-2">
        <Clock className="h-4 w-4 text-muted-foreground" />
        <h3 className="font-semibold text-sm">Duty Status</h3>
      </div>
      <div className="p-4 space-y-3">
        {activeSession ? (
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 space-y-1">
              <div className="flex items-center gap-2">
                <Timer className="h-4 w-4 text-green-500 shrink-0" />
                <span className="font-medium text-green-500 text-sm">Currently On Duty</span>
              </div>
              <p className="text-xs text-muted-foreground whitespace-nowrap">
                Clocked in at {format(new Date(activeSession.clock_in), 'h:mm a')}
              </p>
              <p className="text-xl font-mono font-bold text-green-500">{elapsedTime}</p>
            </div>
            <Textarea
              placeholder="Add notes for this session (optional)..."
              value={clockOutNotes}
              onChange={(e) => setClockOutNotes(e.target.value)}
              rows={2}
              className="text-sm"
            />
            <Dialog open={showClockOutConfirm} onOpenChange={setShowClockOutConfirm}>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full" size="sm">
                  <Square className="h-3.5 w-3.5 mr-1.5" />
                  Clock Out
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Confirm Clock Out</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-muted-foreground">
                    You've been on duty for <span className="font-mono font-bold text-foreground">{elapsedTime}</span>. Are you sure you want to clock out?
                  </p>
                  <div className="flex gap-3">
                    <Button variant="outline" className="flex-1" onClick={() => setShowClockOutConfirm(false)}>Cancel</Button>
                    <Button
                      variant="destructive"
                      className="flex-1"
                      disabled={clockOutMutation.isPending}
                      onClick={() => { clockOutMutation.mutate(); setShowClockOutConfirm(false); }}
                    >
                      {clockOutMutation.isPending ? 'Clocking Out...' : 'Clock Out'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <p className="text-sm font-medium">Not On Duty</p>
                <p className="text-xs text-muted-foreground whitespace-nowrap">Clock in to start logging hours</p>
              </div>
            </div>
            <Button onClick={() => clockInMutation.mutate()} disabled={clockInMutation.isPending} className="w-full" size="sm">
              <Play className="h-3.5 w-3.5 mr-1.5" />
              {clockInMutation.isPending ? 'Clocking In...' : 'Clock In'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
