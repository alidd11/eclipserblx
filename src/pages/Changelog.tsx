import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Wrench, Zap } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeader } from '@/components/ui/PageHeader';

const categoryConfig: Record<string, { label: string; icon: typeof Sparkles; className: string }> = {
  feature: { label: 'Feature', icon: Sparkles, className: 'bg-primary/10 text-primary border-primary/20' },
  fix: { label: 'Fix', icon: Wrench, className: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  improvement: { label: 'Improvement', icon: Zap, className: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
};

export default function Changelog() {
  usePageMeta({ title: 'Changelog', description: 'See what\'s new on the platform.' });

  const { data: entries, isLoading } = useQuery({
    queryKey: ['changelog-entries'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('changelog_entries')
        .select('*')
        .not('published_at', 'is', null)
        .lte('published_at', new Date().toISOString())
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Group by month
  const grouped = (entries ?? []).reduce<Record<string, typeof entries>>((acc, entry) => {
    const key = format(new Date(entry.published_at!), 'MMMM yyyy');
    if (!acc[key]) acc[key] = [];
    acc[key]!.push(entry);
    return acc;
  }, {});

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <PageHeader title="Changelog" description="Latest updates, fixes, and improvements to the platform." />

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <p className="text-center text-muted-foreground py-16">No updates yet — check back soon.</p>
        ) : (
          Object.entries(grouped).map(([month, items]) => (
            <section key={month} className="space-y-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{month}</h2>
              <div className="space-y-3">
                {items!.map((entry) => {
                  const cat = categoryConfig[entry.category] ?? categoryConfig.feature;
                  const Icon = cat.icon;
                  return (
                    <div key={entry.id} className="border border-border rounded-xl p-4 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={cat.className}>
                          <Icon className="h-3 w-3 mr-1" />
                          {cat.label}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.published_at!), 'MMM d, yyyy')}
                        </span>
                      </div>
                      <h3 className="font-semibold">{entry.title}</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{entry.description}</p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </MainLayout>
  );
}
