import { useQuery } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Wrench, Zap, History } from 'lucide-react';
import { format } from '@/lib/dateUtils';
import { usePageMeta } from '@/hooks/usePageMeta';
import { PageHeader } from '@/components/ui/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const categoryConfig: Record<string, { label: string; icon: typeof Sparkles; className: string }> = {
  feature: { label: 'Feature', icon: Sparkles, className: 'bg-primary/10 text-primary border-primary/20' },
  fix: { label: 'Fix', icon: Wrench, className: 'bg-warning/10 text-warning border-warning/20' },
  improvement: { label: 'Improvement', icon: Zap, className: 'bg-secondary/10 text-secondary border-secondary/20' },
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
          <div className="space-y-8">
            {Array.from({ length: 2 }).map((_, i) => (
              <section key={i} className="space-y-4">
                <Skeleton className="h-4 w-28" />
                <div className="space-y-3">
                  {Array.from({ length: 2 }).map((_, j) => (
                    <div key={j} className="border border-border rounded-xl p-4 space-y-3">
                      <div className="flex items-center gap-2"><Skeleton className="h-5 w-20 rounded-full" /><Skeleton className="h-3 w-24" /></div>
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : Object.keys(grouped).length === 0 ? (
          <div className="border border-dashed border-border rounded-xl p-8 flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
            <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <History className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">No updates yet</p>
              <p className="text-sm text-muted-foreground mt-0.5">We'll post new features, fixes, and improvements here as they ship.</p>
            </div>
          </div>
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
