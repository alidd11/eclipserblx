import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { 
  MessageCircle, 
  Megaphone, 
  Sparkles, 
  Image, 
  HelpCircle, 
  ChevronRight,
  Pin,
  Lock,
  Eye,
  MessageSquare,
  Plus,
  ArrowLeft
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';

// Icon mapping for categories
const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  'megaphone': Megaphone,
  'message-circle': MessageCircle,
  'sparkles': Sparkles,
  'image': Image,
  'help-circle': HelpCircle,
};

// Color mapping for categories
const colorMap: Record<string, string> = {
  'purple': 'from-purple-500 to-purple-700',
  'blue': 'from-blue-500 to-cyan-500',
  'pink': 'from-pink-500 to-rose-500',
  'green': 'from-green-500 to-emerald-500',
  'orange': 'from-orange-500 to-amber-500',
};

const glowMap: Record<string, string> = {
  'purple': 'group-hover:shadow-[0_0_30px_hsl(265_100%_65%/0.3)]',
  'blue': 'group-hover:shadow-[0_0_30px_hsl(200_100%_55%/0.3)]',
  'pink': 'group-hover:shadow-[0_0_30px_hsl(320_100%_60%/0.3)]',
  'green': 'group-hover:shadow-[0_0_30px_hsl(145_100%_50%/0.3)]',
  'orange': 'group-hover:shadow-[0_0_30px_hsl(30_100%_50%/0.3)]',
};

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  display_order: number | null;
}

interface ForumThread {
  id: string;
  category_id: string;
  user_id: string;
  title: string;
  slug: string;
  is_pinned: boolean | null;
  is_locked: boolean | null;
  view_count: number | null;
  created_at: string;
  updated_at: string;
}

export default function Forum() {
  const { categorySlug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Fetch categories
  const { data: categories, isLoading: loadingCategories } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .order('display_order', { ascending: true });
      
      if (error) throw error;
      return data as ForumCategory[];
    },
  });

  // Get current category
  const currentCategory = categorySlug 
    ? categories?.find(c => c.slug === categorySlug) 
    : null;

  // Fetch threads for category
  const { data: threads, isLoading: loadingThreads } = useQuery({
    queryKey: ['forum-threads', currentCategory?.id],
    queryFn: async () => {
      if (!currentCategory) return [];
      
      const { data, error } = await supabase
        .from('forum_threads')
        .select('*')
        .eq('category_id', currentCategory.id)
        .order('is_pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      
      if (error) throw error;
      return data as ForumThread[];
    },
    enabled: !!currentCategory,
  });

  // Fetch thread counts per category
  const { data: threadCounts } = useQuery({
    queryKey: ['forum-thread-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_threads')
        .select('category_id');
      
      if (error) throw error;
      
      const counts: Record<string, number> = {};
      data.forEach(thread => {
        counts[thread.category_id] = (counts[thread.category_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch user profiles for threads
  const { data: profiles } = useQuery({
    queryKey: ['forum-profiles', threads?.map(t => t.user_id)],
    queryFn: async () => {
      if (!threads?.length) return {};
      
      const userIds = [...new Set(threads.map(t => t.user_id))];
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, avatar_url')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const map: Record<string, { display_name: string | null; avatar_url: string | null }> = {};
      data.forEach(p => {
        map[p.user_id] = { display_name: p.display_name, avatar_url: p.avatar_url };
      });
      return map;
    },
    enabled: !!threads?.length,
  });

  // Categories view
  if (!categorySlug) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold gradient-text mb-2">
              Community Forum
            </h1>
            <p className="text-muted-foreground">
              Connect with the Eclipse community, share your creations, and get support
            </p>
          </div>

          {/* Categories Grid */}
          <div className="grid gap-4">
            {loadingCategories ? (
              Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-xl" />
              ))
            ) : (
              categories?.map((category) => {
                const Icon = iconMap[category.icon || 'message-circle'] || MessageCircle;
                const gradient = colorMap[category.color || 'purple'];
                const glow = glowMap[category.color || 'purple'];
                const count = threadCounts?.[category.id] || 0;

                return (
                  <Link
                    key={category.id}
                    to={`/forum/${category.slug}`}
                    className="group"
                  >
                    <Card className={cn(
                      "gaming-card-hover p-4 flex items-center gap-4 transition-all duration-300",
                      glow
                    )}>
                      {/* Icon */}
                      <div className={cn(
                        "h-14 w-14 rounded-xl bg-gradient-to-br flex items-center justify-center shrink-0",
                        gradient
                      )}>
                        <Icon className="h-7 w-7 text-white" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-display font-semibold text-lg text-foreground group-hover:text-primary transition-colors">
                          {category.name}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {category.description}
                        </p>
                      </div>

                      {/* Stats */}
                      <div className="hidden sm:flex items-center gap-6 text-muted-foreground">
                        <div className="text-center">
                          <div className="font-display font-bold text-lg text-foreground">{count}</div>
                          <div className="text-xs">Threads</div>
                        </div>
                        <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </MainLayout>
    );
  }

  // Threads view for a category
  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            className="mb-4 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/forum')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Forum
          </Button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                {currentCategory?.name || 'Loading...'}
              </h1>
              <p className="text-muted-foreground text-sm">
                {currentCategory?.description}
              </p>
            </div>
            
            {user && (
              <Button className="gradient-button">
                <Plus className="h-4 w-4 mr-2" />
                New Thread
              </Button>
            )}
          </div>
        </div>

        {/* Threads List */}
        <div className="space-y-2">
          {loadingThreads ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))
          ) : threads?.length === 0 ? (
            <Card className="gaming-card p-8 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-display font-semibold text-lg mb-2">No threads yet</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Be the first to start a discussion!
              </p>
              {user && (
                <Button className="gradient-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Thread
                </Button>
              )}
            </Card>
          ) : (
            threads?.map((thread) => {
              const profile = profiles?.[thread.user_id];
              const authorName = profile?.display_name || 'Anonymous';

              return (
                <Card
                  key={thread.id}
                  className="gaming-card-hover p-4 cursor-pointer"
                  onClick={() => navigate(`/forum/${categorySlug}/${thread.slug}`)}
                >
                  <div className="flex items-start gap-4">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shrink-0">
                      <span className="text-white font-display font-bold text-sm">
                        {authorName.charAt(0).toUpperCase()}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {thread.is_pinned && (
                          <Badge variant="secondary" className="text-xs bg-primary/20 text-primary border-0">
                            <Pin className="h-3 w-3 mr-1" />
                            Pinned
                          </Badge>
                        )}
                        {thread.is_locked && (
                          <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-0">
                            <Lock className="h-3 w-3 mr-1" />
                            Locked
                          </Badge>
                        )}
                      </div>
                      <h3 className="font-medium text-foreground line-clamp-1 group-hover:text-primary transition-colors">
                        {thread.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>{authorName}</span>
                        <span>•</span>
                        <span>{formatDistanceToNow(new Date(thread.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-4 text-muted-foreground text-sm">
                      <div className="flex items-center gap-1">
                        <Eye className="h-4 w-4" />
                        <span>{thread.view_count || 0}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </MainLayout>
  );
}
