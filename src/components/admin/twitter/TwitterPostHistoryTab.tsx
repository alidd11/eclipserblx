import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { format } from '@/lib/dateUtils';
import { ExternalLink } from 'lucide-react';

export function TwitterPostHistoryTab() {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['twitter-posts-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twitter_posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case 'sent': return <Badge className="bg-green-500/10 text-green-500 border-green-500/20">Sent</Badge>;
      case 'queued': return <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">Queued</Badge>;
      case 'draft': return <Badge variant="secondary">Draft</Badge>;
      case 'failed': return <Badge variant="destructive">Failed</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const typeBadge = (type: string) => {
    const labels: Record<string, string> = {
      product_drop: 'Product Drop',
      store_showcase: 'Store Showcase',
      announcement: 'Announcement',
      scheduled: 'Scheduled',
    };
    return <Badge variant="outline">{labels[type] || type}</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Post History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Content</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Hashtags</TableHead>
              <TableHead>Status</TableHead>
                <TableHead>When</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">Loading...</TableCell>
              </TableRow>
            ) : !posts?.length ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">No posts yet</TableCell>
              </TableRow>
            ) : posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="max-w-[300px] truncate text-sm">{post.content}</TableCell>
                <TableCell>{typeBadge(post.post_type)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 max-w-[200px]">
                    {(post.hashtags_used as string[])?.map((tag, i) => (
                      <Badge key={i} variant="outline" className="text-xs font-mono">{tag}</Badge>
                    ))}
                  </div>
                </TableCell>
                <TableCell>{statusBadge(post.status)}</TableCell>
                <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                  {post.posted_at
                    ? format(new Date(post.posted_at), 'dd MMM yyyy HH:mm')
                    : post.scheduled_for
                      ? `Scheduled ${format(new Date(post.scheduled_for), 'dd MMM yyyy HH:mm')}`
                      : format(new Date(post.created_at), 'dd MMM yyyy HH:mm')}
                </TableCell>
                <TableCell>
                  {post.tweet_id && (
                    <a
                      href={`https://x.com/i/web/status/${post.tweet_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
