import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ExternalLink, Youtube, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { formatDistanceToNow } from '@/lib/dateUtils';

export function YouTubePodcastHistoryTab() {
  const { data: podcasts, isLoading, refetch } = useQuery({
    queryKey: ['youtube-podcasts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('youtube_podcasts')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const retryUpload = async (id: string) => {
    toast.info('Retrying upload...');
    const { error } = await supabase.functions.invoke('upload-youtube-podcast', {
      body: { podcastId: id },
    });
    if (error) toast.error('Retry failed: ' + error.message);
    else { toast.success('Upload retried'); refetch(); }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'published': return 'default';
      case 'uploading': return 'secondary';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload History</CardTitle>
        <CardDescription>All podcast episodes and their YouTube status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : !podcasts?.length ? (
          <p className="text-muted-foreground text-center py-8">No podcasts uploaded yet</p>
        ) : (
          <div className="space-y-3">
            {podcasts.map(p => (
              <div key={p.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium truncate">{p.title}</h4>
                    <Badge variant={statusColor(p.status)}>{p.status}</Badge>
                    <Badge variant="outline">{p.privacy_status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                    {p.category && ` \u00B7 ${p.category}`}
                  </p>
                  {p.error_message && (
                    <p className="text-xs text-destructive mt-1 truncate">{p.error_message}</p>
                  )}
                </div>
                <div className="flex gap-2 ml-2">
                  {p.status === 'failed' && (
                    <Button size="sm" variant="outline" onClick={() => retryUpload(p.id)}>Retry</Button>
                  )}
                  {p.status === 'draft' && (
                    <Button size="sm" variant="outline" onClick={() => retryUpload(p.id)}>
                      <Youtube className="h-3 w-3 mr-1" /> Upload
                    </Button>
                  )}
                  {p.youtube_url && (
                    <Button size="sm" variant="ghost" asChild>
                      <a href={p.youtube_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
