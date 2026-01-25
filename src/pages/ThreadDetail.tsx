import { useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MessageSquare, Eye, Pin, Lock, ImagePlus, X, Loader2, Crown, Shield, Wrench, Briefcase, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { showSuccessNotification, showErrorNotification, showInfoNotification } from '@/lib/nativeNotification';
import { cn } from '@/lib/utils';
import { performSecurityScan } from '@/lib/secureFileUpload';

// Badge configuration for user roles
const roleBadges: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  admin: { 
    label: 'Admin', 
    icon: Crown, 
    className: 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border-amber-500/30' 
  },
  product_manager: { 
    label: 'Staff', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  order_manager: { 
    label: 'Staff', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  support_agent: { 
    label: 'Support', 
    icon: Wrench, 
    className: 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border-green-500/30' 
  },
  analyst: { 
    label: 'Staff', 
    icon: Shield, 
    className: 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-400 border-blue-500/30' 
  },
  recruiter: { 
    label: 'Recruiter', 
    icon: Briefcase, 
    className: 'bg-gradient-to-r from-violet-500/20 to-purple-500/20 text-violet-400 border-violet-500/30' 
  },
};

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

interface ForumPost {
  id: string;
  thread_id: string;
  user_id: string;
  content: string;
  is_solution: boolean | null;
  created_at: string;
  updated_at: string;
}

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
}

export default function ThreadDetail() {
  const { categorySlug, threadSlug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin } = useAdminAuth();
  const queryClient = useQueryClient();
  
  const [replyContent, setReplyContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Check if category supports image uploads
  const showImageUpload = categorySlug === 'showcase' || categorySlug === 'requests';

  // Fetch category
  const { data: category } = useQuery({
    queryKey: ['forum-category', categorySlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_categories')
        .select('*')
        .eq('slug', categorySlug)
        .single();
      
      if (error) throw error;
      return data as ForumCategory;
    },
    enabled: !!categorySlug,
  });

  // Fetch thread
  const { data: thread, isLoading: loadingThread } = useQuery({
    queryKey: ['forum-thread', threadSlug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('forum_threads')
        .select('*')
        .eq('slug', threadSlug)
        .single();
      
      if (error) throw error;
      
      // Increment view count
      await supabase
        .from('forum_threads')
        .update({ view_count: (data.view_count || 0) + 1 })
        .eq('id', data.id);
      
      return data as ForumThread;
    },
    enabled: !!threadSlug,
  });

  // Fetch posts
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['forum-posts', thread?.id],
    queryFn: async () => {
      if (!thread) return [];
      
      const { data, error } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('thread_id', thread.id)
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data as ForumPost[];
    },
    enabled: !!thread?.id,
  });

  // Fetch profiles for posts
  const { data: profiles } = useQuery({
    queryKey: ['forum-post-profiles', posts.map(p => p.user_id)],
    queryFn: async () => {
      if (!posts.length) return {};
      
      const userIds = [...new Set(posts.map(p => p.user_id))];
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
    enabled: posts.length > 0,
  });

  // Fetch user roles
  const { data: userRoles } = useQuery({
    queryKey: ['forum-post-roles', posts.map(p => p.user_id)],
    queryFn: async () => {
      if (!posts.length) return {};
      
      const userIds = [...new Set(posts.map(p => p.user_id))];
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id, role')
        .in('user_id', userIds);
      
      if (error) throw error;
      
      const map: Record<string, string[]> = {};
      data.forEach(r => {
        if (!map[r.user_id]) map[r.user_id] = [];
        map[r.user_id].push(r.role);
      });
      return map;
    },
    enabled: posts.length > 0,
  });

  const getUserBadge = (userId: string) => {
    const roles = userRoles?.[userId] || [];
    if (roles.includes('admin')) return roleBadges.admin;
    if (roles.includes('recruiter')) return roleBadges.recruiter;
    if (roles.includes('support_agent')) return roleBadges.support_agent;
    if (roles.some(r => ['product_manager', 'order_manager', 'analyst'].includes(r))) return roleBadges.product_manager;
    return null;
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !user) return;

    setUploading(true);
    const newImages: string[] = [];

    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          showErrorNotification('Invalid File', `${file.name} is not an image`);
          continue;
        }

        if (file.size > 5 * 1024 * 1024) {
          showErrorNotification('File Too Large', `${file.name} exceeds 5MB limit`);
          continue;
        }

        // Security scan (virus + NSFW)
        showInfoNotification('Scanning', `Checking ${file.name}...`);
        const scanResult = await performSecurityScan(file, { skipLuaAnalysis: true });
        
        if (!scanResult.isAllowed) {
          showErrorNotification('Content Rejected', scanResult.reason || 'Image blocked');
          continue;
        }

        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('forum-images')
          .upload(fileName, file);

        if (uploadError) {
          showErrorNotification('Upload Failed', `Could not upload ${file.name}`);
          continue;
        }

        const { data: { publicUrl } } = supabase.storage
          .from('forum-images')
          .getPublicUrl(fileName);

        newImages.push(publicUrl);
      }

      if (newImages.length > 0) {
        setImages(prev => [...prev, ...newImages]);
        showSuccessNotification('Upload Complete', `${newImages.length} image(s) uploaded`);
      }
    } catch (error) {
      showErrorNotification('Upload Error', 'Failed to upload images');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  // Reply mutation
  const replyMutation = useMutation({
    mutationFn: async () => {
      if (!user || !thread) throw new Error('Must be logged in');
      if (!replyContent.trim()) throw new Error('Reply content required');

      // Build content with images
      let finalContent = replyContent.trim();
      if (images.length > 0) {
        finalContent += '\n\n---\n\n';
        images.forEach(url => {
          finalContent += `![image](${url})\n`;
        });
      }

      const { error } = await supabase
        .from('forum_posts')
        .insert({
          thread_id: thread.id,
          user_id: user.id,
          content: finalContent,
        });

      if (error) throw error;

      // Update thread's updated_at
      await supabase
        .from('forum_threads')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', thread.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forum-posts', thread?.id] });
      showSuccessNotification('Reply Posted!', 'Your response has been added');
      setReplyContent('');
      setImages([]);
    },
    onError: (error) => {
      showErrorNotification('Post Failed', error instanceof Error ? error.message : 'Could not post reply');
    },
  });

  // Render markdown images and links
  const renderContent = (content: string) => {
    // Combined regex for images and links: images first (!), then regular links
    const markdownRegex = /!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)/g;
    const parts: (string | JSX.Element)[] = [];
    let lastIndex = 0;
    let match;
    let keyIndex = 0;

    while ((match = markdownRegex.exec(content)) !== null) {
      // Add text before the match
      if (match.index > lastIndex) {
        parts.push(content.slice(lastIndex, match.index));
      }
      
      if (match[1] !== undefined) {
        // This is an image: ![alt](url)
        parts.push(
          <img 
            key={keyIndex++}
            src={match[2]} 
            alt={match[1]} 
            className="max-w-full h-auto rounded-lg my-2 max-h-96 object-contain"
          />
        );
      } else {
        // This is a link: [text](url)
        parts.push(
          <a
            key={keyIndex++}
            href={match[4]}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {match[3]}
          </a>
        );
      }
      
      lastIndex = match.index + match[0].length;
    }
    
    // Add remaining text
    if (lastIndex < content.length) {
      parts.push(content.slice(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  if (loadingThread) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-4" />
          <Skeleton className="h-32 w-full mb-4" />
          <Skeleton className="h-24 w-full mb-2" />
          <Skeleton className="h-24 w-full mb-2" />
        </div>
      </MainLayout>
    );
  }

  if (!thread) {
    return (
      <MainLayout>
        <div className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Thread not found</h1>
          <Button onClick={() => navigate(`/forum/${categorySlug}`)}>
            Back to Forum
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 text-muted-foreground hover:text-foreground"
          onClick={() => navigate(`/forum/${categorySlug}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {category?.name || 'Forum'}
        </Button>

        {/* Thread Title */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2">
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
          <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
            {thread.title}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
            <div className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              <span>{thread.view_count || 0} views</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-4 w-4" />
              <span>{posts.length} {posts.length === 1 ? 'reply' : 'replies'}</span>
            </div>
          </div>
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {loadingPosts ? (
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))
          ) : (
            posts.map((post, index) => {
              const profile = profiles?.[post.user_id];
              const authorName = profile?.display_name || 'Anonymous';
              const badge = getUserBadge(post.user_id);

              return (
                <Card key={post.id} className="gaming-card p-4">
                  <div className="flex gap-4">
                    {/* Avatar */}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarImage src={profile?.avatar_url || undefined} alt={authorName} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white font-display font-bold text-sm">
                        {authorName.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-foreground">{authorName}</span>
                        {badge && (
                          <Badge 
                            variant="outline" 
                            className={cn("text-[10px] px-1.5 py-0 h-4 font-medium border", badge.className)}
                          >
                            <badge.icon className="h-2.5 w-2.5 mr-0.5" />
                            {badge.label}
                          </Badge>
                        )}
                        {index === 0 && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                            OP
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <div className="text-foreground/90 whitespace-pre-wrap break-words">
                        {renderContent(post.content)}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          )}
        </div>

        {/* Reply Form */}
        {user && !thread.is_locked ? (
          <Card className="gaming-card p-4 mt-6">
            <h3 className="font-display font-semibold mb-3">Post a Reply</h3>
            <Textarea
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write your reply..."
              className="min-h-[120px] resize-none mb-3"
            />

            {/* Image Upload for Showcase/Requests */}
            {showImageUpload && (
              <div className="mb-3">
                {/* Image previews */}
                {images.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {images.map((url, index) => (
                      <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-border">
                        <img 
                          src={url} 
                          alt={`Upload ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-1 right-1 h-5 w-5"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading || images.length >= 4}
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <ImagePlus className="h-4 w-4 mr-2" />
                      Add Images {images.length > 0 && `(${images.length}/4)`}
                    </>
                  )}
                </Button>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                className="gradient-button"
                onClick={() => replyMutation.mutate()}
                disabled={!replyContent.trim() || replyMutation.isPending || uploading}
              >
                {replyMutation.isPending ? 'Posting...' : 'Post Reply'}
              </Button>
            </div>
          </Card>
        ) : thread.is_locked ? (
          <Card className="gaming-card p-4 mt-6 text-center text-muted-foreground">
            <Lock className="h-6 w-6 mx-auto mb-2" />
            This thread is locked and no longer accepts replies.
          </Card>
        ) : (
          <Card className="gaming-card p-4 mt-6 text-center text-muted-foreground">
            <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to reply to this thread.
          </Card>
        )}
      </div>
    </MainLayout>
  );
}
