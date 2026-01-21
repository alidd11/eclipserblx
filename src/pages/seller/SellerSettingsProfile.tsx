import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { BrandingImageUpload } from '@/components/seller/BrandingImageUpload';
import { 
  Store, 
  Image as ImageIcon,
  CheckCircle,
  Save,
  Link as LinkIcon,
  Globe,
  MessageCircle,
  Info,
  Gamepad2
} from 'lucide-react';
import { toast } from 'sonner';

export default function SellerSettingsProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    logo_url: '',
    banner_url: '',
    bio: '',
    about_content: '',
    discord_url: '',
    twitter_url: '',
    youtube_url: '',
    tiktok_url: '',
    website_url: '',
    roblox_url: '',
  });

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
        bio: store.bio || '',
        about_content: (store as any).about_content || '',
        discord_url: store.discord_url || '',
        twitter_url: store.twitter_url || '',
        youtube_url: store.youtube_url || '',
        tiktok_url: store.tiktok_url || '',
        website_url: store.website_url || '',
        roblox_url: (store as any).roblox_url || '',
      });
    }
  }, [store]);

  const updateStore = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) throw new Error('No store found');
      
      const { error } = await supabase
        .from('stores')
        .update({
          name: data.name,
          description: data.description,
          logo_url: data.logo_url || null,
          banner_url: data.banner_url || null,
          bio: data.bio || null,
          about_content: data.about_content || null,
          discord_url: data.discord_url || null,
          twitter_url: data.twitter_url || null,
          youtube_url: data.youtube_url || null,
          tiktok_url: data.tiktok_url || null,
          website_url: data.website_url || null,
          roblox_url: data.roblox_url || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Profile updated successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => {
      toast.error('Failed to update profile: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateStore.mutate(formData);
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Store Profile</h1>
          <p className="text-muted-foreground">
            Manage your store's basic information and branding
          </p>
        </div>

        <div className="flex items-center gap-2 mb-6">
          {store?.is_verified && (
            <Badge variant="default" className="gap-1">
              <CheckCircle className="h-3 w-3" />
              Verified
            </Badge>
          )}
          <Badge variant="outline">
            Store ID: {store?.store_id}
          </Badge>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Your store's public name and description
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Store Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Your Store Name"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tell customers about your store..."
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="bio">Store Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="A short bio about you or your store..."
                  rows={3}
                />
              </div>

              <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* About Us Content */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                About Us Page
              </CardTitle>
              <CardDescription>
                Rich content for your store's dedicated About page. Customers can access this from your store navigation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>About Content</Label>
                <RichTextEditor
                  content={formData.about_content}
                  onChange={(content) => setFormData({ ...formData, about_content: content })}
                  placeholder="Tell customers about yourself, your story, your mission..."
                />
              </div>

              <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Branding */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Branding
              </CardTitle>
              <CardDescription>
                Upload your store's logo and banner images
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {user && (
                <>
                  <BrandingImageUpload
                    userId={user.id}
                    type="logo"
                    currentUrl={formData.logo_url}
                    onUpload={(url) => setFormData({ ...formData, logo_url: url })}
                  />

                  <BrandingImageUpload
                    userId={user.id}
                    type="banner"
                    currentUrl={formData.banner_url}
                    onUpload={(url) => setFormData({ ...formData, banner_url: url })}
                  />
                </>
              )}

              <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>

          {/* Social Links */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Social Links
              </CardTitle>
              <CardDescription>
                Connect your social media accounts to display on your store
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="discord_url" className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    Discord Server
                  </Label>
                  <Input
                    id="discord_url"
                    value={formData.discord_url}
                    onChange={(e) => setFormData({ ...formData, discord_url: e.target.value })}
                    placeholder="https://discord.gg/your-server"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="twitter_url" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                    X (Twitter)
                  </Label>
                  <Input
                    id="twitter_url"
                    value={formData.twitter_url}
                    onChange={(e) => setFormData({ ...formData, twitter_url: e.target.value })}
                    placeholder="https://twitter.com/username"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="youtube_url" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                    </svg>
                    YouTube
                  </Label>
                  <Input
                    id="youtube_url"
                    value={formData.youtube_url}
                    onChange={(e) => setFormData({ ...formData, youtube_url: e.target.value })}
                    placeholder="https://youtube.com/@channel"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tiktok_url" className="flex items-center gap-2">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/>
                    </svg>
                    TikTok
                  </Label>
                  <Input
                    id="tiktok_url"
                    value={formData.tiktok_url}
                    onChange={(e) => setFormData({ ...formData, tiktok_url: e.target.value })}
                    placeholder="https://tiktok.com/@username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url" className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Website
                </Label>
                <Input
                  id="website_url"
                  value={formData.website_url}
                  onChange={(e) => setFormData({ ...formData, website_url: e.target.value })}
                  placeholder="https://yourwebsite.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="roblox_url" className="flex items-center gap-2">
                  <Gamepad2 className="h-4 w-4" />
                  Roblox Game/Group
                </Label>
                <Input
                  id="roblox_url"
                  value={formData.roblox_url}
                  onChange={(e) => setFormData({ ...formData, roblox_url: e.target.value })}
                  placeholder="https://www.roblox.com/games/... or https://www.roblox.com/groups/..."
                />
                <p className="text-xs text-muted-foreground">
                  Link to your Roblox game or group page
                </p>
              </div>

              <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SellerLayout>
  );
}
