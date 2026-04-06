import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from '@/lib/dateUtils';

export function TwitterHashtagPoolTab() {
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');
  const [newCategory, setNewCategory] = useState('niche');

  const { data: hashtags, isLoading } = useQuery({
    queryKey: ['twitter-hashtags-all'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('twitter_hashtags')
        .select('*')
        .order('category')
        .order('tag');
      if (error) throw error;
      return data;
    },
  });

  const addHashtag = async () => {
    let tag = newTag.trim();
    if (!tag) return;
    if (!tag.startsWith('#')) tag = `#${tag}`;

    const { error } = await supabase.from('twitter_hashtags').insert({
      tag,
      category: newCategory,
    });

    if (error) {
      toast.error(error.message.includes('unique') ? 'Hashtag already exists' : error.message);
      return;
    }

    toast.success(`Added ${tag}`);
    setNewTag('');
    queryClient.invalidateQueries({ queryKey: ['twitter-hashtags-all'] });
    queryClient.invalidateQueries({ queryKey: ['twitter-hashtags-active'] });
  };

  const toggleActive = async (id: string, currentlyActive: boolean) => {
    const { error } = await supabase
      .from('twitter_hashtags')
      .update({ is_active: !currentlyActive })
      .eq('id', id);

    if (error) {
      toast.error('Failed to update');
      return;
    }

    queryClient.invalidateQueries({ queryKey: ['twitter-hashtags-all'] });
    queryClient.invalidateQueries({ queryKey: ['twitter-hashtags-active'] });
  };

  const categoryColor = (cat: string) => {
    switch (cat) {
      case 'niche': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'audience': return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
      case 'content': return 'bg-green-500/10 text-green-500 border-green-500/20';
      default: return '';
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add Hashtag</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end flex-wrap">
            <div className="space-y-1 flex-1 min-w-[180px]">
              <Label>Tag</Label>
              <Input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                placeholder="#RobloxDev"
                onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
              />
            </div>
            <div className="space-y-1 w-[140px]">
              <Label>Category</Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="niche">Niche</SelectItem>
                  <SelectItem value="audience">Audience</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={addHashtag}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Hashtag Pool ({hashtags?.length ?? 0})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tag</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Uses</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : hashtags?.map((h) => (
                <TableRow key={h.id} className={!h.is_active ? 'opacity-50' : ''}>
                  <TableCell className="font-mono text-sm">{h.tag}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={categoryColor(h.category)}>
                      {h.category}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{h.usage_count}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {h.last_used_at
                      ? formatDistanceToNow(new Date(h.last_used_at), { addSuffix: true })
                      : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleActive(h.id, h.is_active)}
                    >
                      {h.is_active
                        ? <ToggleRight className="h-5 w-5 text-green-500" />
                        : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
