import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
// Card imports removed — using enterprise flat sections
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RichTextEditor } from '@/components/ui/RichTextEditor';
import { BrandingImageUpload } from '@/components/seller/BrandingImageUpload';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { toast } from 'sonner';
import { useFormPersistence } from '@/hooks/useFormPersistence';

const INITIAL_FORM_DATA = {
  name: '',
  description: '',
  logo_url: '',
  banner_url: '',
  bio: '',
  about_content: '',
  twitter_url: '',
  youtube_url: '',
  tiktok_url: '',
  pwyw_enabled: false,
};

// Generate clean slug from name
const generateSlug = (name: string) => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
};

export default function SellerSettingsProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  const [formData, setFormData, clearFormData] = useFormPersistence(
    'seller-settings-profile',
    INITIAL_FORM_DATA
  );

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        description: store.description || '',
        logo_url: store.logo_url || '',
        banner_url: store.banner_url || '',
        bio: store.bio || '',
        about_content: store.about_content || '',
        twitter_url: store.twitter_url || '',
        youtube_url: store.youtube_url || '',
        tiktok_url: store.tiktok_url || '',
        pwyw_enabled: store.pwyw_enabled ?? false,
      });
    }
  }, [store]);

  const updateStore = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) throw new Error('No store found');

      // Check if name changed → regenerate slug
      let newSlug: string | undefined;
      if (data.name.trim() !== (store.name || '').trim()) {
        const baseSlug = generateSlug(data.name);
        if (baseSlug) {
          // Check for collision
          const { data: existing } = await supabase
            .from('stores')
            .select('id')
            .eq('slug', baseSlug)
            .neq('id', store.id)
            .maybeSingle();

          newSlug = existing ? `${baseSlug}-${Math.random().toString(36).substring(2, 6)}` : baseSlug;
        }
      }

      const updatePayload: Record<string, unknown> = {
        name: data.name,
        description: data.description,
        logo_url: data.logo_url || null,
        banner_url: data.banner_url || null,
        bio: data.bio || null,
        about_content: data.about_content || null,
        twitter_url: data.twitter_url || null,
        youtube_url: data.youtube_url || null,
        tiktok_url: data.tiktok_url || null,
        pwyw_enabled: data.pwyw_enabled,
        updated_at: new Date().toISOString(),
      };

      if (newSlug) {
        updatePayload.slug = newSlug;
      }
      
      const { error } = await supabase
        .from('stores')
        .update(updatePayload)
        .eq('id', store.id);

      if (error) throw error;

      if (newSlug) {
        toast.info(`Store URL updated to: /store/${newSlug}`);
      }
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

    // Input validation
    const name = formData.name.trim();
    if (!name || name.length < 2) {
      toast.error('Store name must be at least 2 characters');
      return;
    }
    if (name.length > 100) {
      toast.error('Store name must be under 100 characters');
      return;
    }
    if (formData.description && formData.description.length > 2000) {
      toast.error('Description must be under 2,000 characters');
      return;
    }
    if (formData.bio && formData.bio.length > 500) {
      toast.error('Bio must be under 500 characters');
      return;
    }
    if (formData.about_content && formData.about_content.length > 10000) {
      toast.error('About content must be under 10,000 characters');
      return;
    }

    // Validate social URLs
    const urlPattern = /^https?:\/\/.+/;
    const socialFields = [
      { value: formData.twitter_url, label: 'Twitter/X URL' },
      { value: formData.youtube_url, label: 'YouTube URL' },
      { value: formData.tiktok_url, label: 'TikTok URL' },
    ];
    for (const field of socialFields) {
      if (field.value && !urlPattern.test(field.value.trim())) {
        toast.error(`${field.label} must be a valid URL starting with http:// or https://`);
        return;
      }
      if (field.value && field.value.length > 500) {
        toast.error(`${field.label} must be under 500 characters`);
        return;
      }
    }

    updateStore.mutate(formData);
  };

  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-display font-bold">Store Profile</h1>
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
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">Basic Information</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Your store's public name and description</p>
            </div>
            <div className="p-4 space-y-4">
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
            </div>
          </div>

          {/* About Us Content */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <h3 className="font-semibold text-sm">About Us Page</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Rich content for your store's dedicated About page</p>
            </div>
            <div className="p-4 space-y-4">
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

          {/* Pay What You Want */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-emerald-500" />
                Pay What You Want
              </CardTitle>
              <CardDescription>
                Allow products in your store to use flexible "Pay What You Want" pricing, where buyers choose their own price
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enable PWYW Pricing</Label>
                  <p className="text-sm text-muted-foreground">
                    When enabled, you can set individual products to "Pay What You Want" in the product editor
                  </p>
                </div>
                <Switch
                  checked={formData.pwyw_enabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, pwyw_enabled: checked })}
                />
              </div>

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
