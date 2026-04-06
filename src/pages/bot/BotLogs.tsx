import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BotDashboardLayout } from '@/components/bot-dashboard/BotDashboardLayout';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollText, Search, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from '@/lib/dateUtils';

export default function BotLogs() {
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['bot-error-logs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bot_error_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = logs.filter((l: any) =>
    !search ||
    l.context?.toLowerCase().includes(search.toLowerCase()) ||
    l.error_message?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <BotDashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <ScrollText className="h-6 w-6 text-[hsl(258,90%,66%)]" />
            Error Logs
          </h1>
          <p className="text-white/50 text-sm mt-1">Bot error logs and stack traces for debugging.</p>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
          <Input
            placeholder="Search by context or message..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/30"
          />
        </div>

        <div className="border border-white/10 rounded-xl overflow-hidden bg-white/[0.03]">
          <div className="px-6 py-4 bg-white/[0.03] border-b border-white/10">
            <h3 className="text-white text-base font-semibold">Recent Errors</h3>
            <p className="text-white/40 text-sm">{filtered.length} log entries</p>
          </div>
          <div className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-white/40">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-white/40">No errors logged. 🎉</div>
            ) : (
              <div className="divide-y divide-white/5">
                {filtered.map((log: any) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <div key={log.id} className="hover:bg-white/[0.02]">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                        className="w-full px-4 py-3 flex items-start gap-3 text-left"
                      >
                        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-[10px] border-white/20 text-white/50">{log.context}</Badge>
                            <span className="text-[11px] text-white/30">
                              {format(new Date(log.created_at), 'dd MMM HH:mm')}
                            </span>
                          </div>
                          <p className="text-sm text-white/70 mt-1 truncate">{log.error_message}</p>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4 text-white/30 shrink-0" />
                        ) : (
                          <ChevronDown className="h-4 w-4 text-white/30 shrink-0" />
                        )}
                      </button>
                      {isExpanded && log.stack_trace && (
                        <div className="px-4 pb-3">
                          <pre className="text-[11px] text-white/40 bg-black/30 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
                            {log.stack_trace}
                          </pre>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </BotDashboardLayout>
  );
}
