import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Megaphone, Loader2, CheckCircle, ExternalLink, Image, Link2, AtSign, Sparkles, AlertCircle } from 'lucide-react';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
};

export default function Advertise() {
  const { user, loading: authLoading } = useAuth();
  const [searchParams] = useSearchParams();
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [discordUsername, setDiscordUsername] = useState('');
  
  const success = searchParams.get('success') === 'true';
  const adId = searchParams.get('ad_id');
  const cancelled = searchParams.get('cancelled') === 'true';

  // Fetch settings
  const { data: settings } = useQuery({
    queryKey: ['advertisement-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('key, value')
        .in('key', ['advertisement_price', 'advertisements_enabled']);

      if (error) throw error;

      let price = 5.00;
      let enabled = true;

      data?.forEach((item) => {
        if (item.key === 'advertisement_price') {
          const val = typeof item.value === 'string' 
            ? parseFloat(item.value.replace(/"/g, ''))
            : parseFloat(String(item.value));
          if (!isNaN(val) && val > 0) price = val;
        } else if (item.key === 'advertisements_enabled') {
          enabled = item.value === true || item.value === 'true' || item.value === '"true"';
        }
      });

      return { price, enabled };
    },
  });

  // Verify payment on success redirect
  const verifyMutation = useMutation({
    mutationFn: async (advertisementId: string) => {
      const { data, error } = await supabase.functions.invoke('verify-advertisement-payment', {
        body: { advertisementId },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      if (data.success) {
        toast.success('Your advertisement has been posted to Discord!');
      }
    },
    onError: (error) => {
      console.error('Verification error:', error);
    },
  });

  useEffect(() => {
    if (success && adId) {
      verifyMutation.mutate(adId);
    }
  }, [success, adId]);

  useEffect(() => {
    if (cancelled) {
      toast.error('Payment was cancelled');
    }
  }, [cancelled]);

  // Submit advertisement
  const submitMutation = useMutation({
    mutationFn: async () => {
      const session = await supabase.auth.getSession();
      if (!session.data.session) {
        throw new Error('Please sign in to create an advertisement');
      }

      const { data, error } = await supabase.functions.invoke('create-advertisement-checkout', {
        body: { 
          title, 
          description, 
          imageUrl: imageUrl || null,
          linkUrl: linkUrl || null,
          discordUsername: discordUsername || null,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create advertisement');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Please sign in to create an advertisement');
      return;
    }

    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!description.trim()) {
      toast.error('Please enter a description');
      return;
    }

    submitMutation.mutate();
  };

  const isDisabled = !settings?.enabled;
  const price = settings?.price ?? 5.00;

  if (success) {
    return (
      <MainLayout>
        <div className="container max-w-2xl py-12">
          <Card className="bg-card border-border">
            <CardContent className="pt-8 text-center space-y-4">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h1 className="text-2xl font-bold">Advertisement Posted!</h1>
              <p className="text-muted-foreground">
                Your advertisement has been successfully posted to our Discord channel.
                Thank you for advertising with Eclipse!
              </p>
              <div className="pt-4">
                <Button asChild>
                  <a href="/advertise">Create Another Ad</a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container max-w-4xl py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
            <Megaphone className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Advertise on Discord</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Promote your server, project, or services to our active Discord community. 
            Your advertisement will be posted as an embedded message in our dedicated ads channel.
          </p>
        </div>

        {isDisabled ? (
          <Card className="bg-yellow-500/10 border-yellow-500/30">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
                <p className="text-yellow-500">
                  Advertisements are currently disabled. Please check back later.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Form */}
            <div className="md:col-span-2">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle>Create Your Advertisement</CardTitle>
                  <CardDescription>
                    Fill out the form below to create your Discord advertisement
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        Title <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        id="title"
                        placeholder="Your catchy headline"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        maxLength={100}
                        disabled={authLoading || !user}
                      />
                      <p className="text-xs text-muted-foreground">{title.length}/100 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">
                        Description <span className="text-destructive">*</span>
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Describe what you're advertising..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        maxLength={500}
                        rows={4}
                        disabled={authLoading || !user}
                      />
                      <p className="text-xs text-muted-foreground">{description.length}/500 characters</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="imageUrl" className="flex items-center gap-2">
                        <Image className="h-4 w-4" />
                        Image URL (optional)
                      </Label>
                      <Input
                        id="imageUrl"
                        type="url"
                        placeholder="https://example.com/image.png"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        disabled={authLoading || !user}
                      />
                      <p className="text-xs text-muted-foreground">
                        Add an image to make your ad more eye-catching
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="linkUrl" className="flex items-center gap-2">
                        <Link2 className="h-4 w-4" />
                        Link URL (optional)
                      </Label>
                      <Input
                        id="linkUrl"
                        type="url"
                        placeholder="https://discord.gg/your-server"
                        value={linkUrl}
                        onChange={(e) => setLinkUrl(e.target.value)}
                        disabled={authLoading || !user}
                      />
                      <p className="text-xs text-muted-foreground">
                        Where should people go when they click your ad?
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="discordUsername" className="flex items-center gap-2">
                        <AtSign className="h-4 w-4" />
                        Discord Username (optional)
                      </Label>
                      <Input
                        id="discordUsername"
                        placeholder="YourName#1234"
                        value={discordUsername}
                        onChange={(e) => setDiscordUsername(e.target.value)}
                        disabled={authLoading || !user}
                      />
                      <p className="text-xs text-muted-foreground">
                        Your Discord username will appear in the ad footer
                      </p>
                    </div>

                    {!user && !authLoading && (
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm text-muted-foreground">
                          Please <a href="/auth" className="text-primary hover:underline">sign in</a> to create an advertisement.
                        </p>
                      </div>
                    )}

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={submitMutation.isPending || authLoading || !user}
                    >
                      {submitMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-2" />
                      )}
                      Pay {formatCurrency(price)} & Post Ad
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Price Card */}
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="pt-6">
                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-3xl font-bold text-primary">{formatCurrency(price)}</p>
                    <p className="text-xs text-muted-foreground">One-time payment</p>
                  </div>
                </CardContent>
              </Card>

              {/* Preview Card */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Preview</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-[#2f3136] rounded-lg p-3 text-white text-sm space-y-2">
                    <div className="border-l-4 border-purple-500 pl-3">
                      <p className="font-semibold">
                        📢 {title || 'Your Title Here'}
                      </p>
                      <p className="text-gray-300 text-xs mt-1">
                        {description || 'Your description will appear here...'}
                      </p>
                      {linkUrl && (
                        <p className="text-blue-400 text-xs mt-2 flex items-center gap-1">
                          <ExternalLink className="h-3 w-3" />
                          Learn More
                        </p>
                      )}
                    </div>
                    <p className="text-gray-500 text-xs">
                      Sponsored • {discordUsername ? `@${discordUsername}` : 'Eclipse Marketplace'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Features */}
              <Card className="bg-card border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">What You Get</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Discord embed in ads channel</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Optional image & link</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Instant posting after payment</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span>Professional formatting</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
