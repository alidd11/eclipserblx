import { useState } from 'react';
import { Hash, Plus, ToggleLeft, ToggleRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from '@/lib/dateUtils';

interface XTheme {
  text: string;
  textSecondary: string;
  border: string;
  hover: string;
  accent: string;
  inputBg: string;
  [key: string]: string;
}

const categoryColors: Record<string, { bg: string; text: string }> = {
  niche: { bg: 'bg-[#1d9bf0]/10', text: 'text-[#1d9bf0]' },
  audience: { bg: 'bg-[#7856ff]/10', text: 'text-[#7856ff]' },
  content: { bg: 'bg-[#00ba7c]/10', text: 'text-[#00ba7c]' },
};

export function TwitterHashtagPoolTab({ xTheme }: { xTheme: XTheme }) {
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

  return (
    <div>
      {/* Header */}
      <div className={`flex items-center gap-2 px-4 py-3 ${xTheme.border} border-b`}>
        <Hash className={`h-4 w-4 ${xTheme.accent}`} />
        <span className={`text-[15px] font-bold ${xTheme.text}`}>Hashtag Pool</span>
        <span className={`text-[13px] ${xTheme.textSecondary} ml-1`}>{hashtags?.length ?? 0}</span>
      </div>

      {/* Add form */}
      <div className={`px-4 py-3 ${xTheme.border} border-b`}>
        <div className="flex gap-2 items-center">
          <input
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="#RobloxDev"
            onKeyDown={(e) => e.key === 'Enter' && addHashtag()}
            className={`flex-1 min-w-0 ${xTheme.inputBg} rounded-full px-3.5 py-2 text-[14px] ${xTheme.text} outline-none border border-transparent focus:border-[#1d9bf0] transition-colors placeholder:${xTheme.textSecondary} placeholder:opacity-60`}
          />
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className={`${xTheme.inputBg} rounded-full px-3 py-2 text-[13px] ${xTheme.text} outline-none border border-transparent focus:border-[#1d9bf0] transition-colors`}
          >
            <option value="niche">Niche</option>
            <option value="audience">Audience</option>
            <option value="content">Content</option>
          </select>
          <button
            onClick={addHashtag}
            disabled={!newTag.trim()}
            className="bg-[#1d9bf0] hover:bg-[#1a8cd8] disabled:opacity-50 text-white rounded-full p-2 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className={`px-4 py-6 text-center text-[13px] ${xTheme.textSecondary}`}>Loading...</div>
      ) : !hashtags?.length ? (
        <div className={`px-4 py-6 text-center text-[13px] ${xTheme.textSecondary}`}>No hashtags added yet</div>
      ) : (
        <div className={`divide-y ${xTheme.border.replace('border-', 'divide-')}`}>
          {hashtags.map((h) => {
            const catStyle = categoryColors[h.category] ?? categoryColors.niche;
            return (
              <div
                key={h.id}
                className={`flex items-center gap-3 px-4 py-2.5 ${xTheme.hover} transition-colors ${!h.is_active ? 'opacity-40' : ''}`}
              >
                {/* Tag name */}
                <span className={`text-[14px] font-mono ${xTheme.text} flex-1 min-w-0 truncate`}>{h.tag}</span>

                {/* Category badge */}
                <span className={`text-[11px] font-medium uppercase px-2 py-0.5 rounded-full ${catStyle.bg} ${catStyle.text}`}>
                  {h.category}
                </span>

                {/* Usage count */}
                <span className={`text-[12px] tabular-nums ${xTheme.textSecondary} w-8 text-right`}>{h.usage_count}</span>

                {/* Last used */}
                <span className={`text-[11px] ${xTheme.textSecondary} w-20 text-right truncate hidden sm:block`}>
                  {h.last_used_at
                    ? formatDistanceToNow(new Date(h.last_used_at), { addSuffix: false })
                    : 'Never'}
                </span>

                {/* Toggle */}
                <button
                  onClick={() => toggleActive(h.id, h.is_active)}
                  className={`shrink-0 p-1 rounded-full ${xTheme.hover} transition-colors`}
                >
                  {h.is_active ? (
                    <ToggleRight className="h-5 w-5 text-[#00ba7c]" />
                  ) : (
                    <ToggleLeft className="h-5 w-5 text-[#71767b]" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
