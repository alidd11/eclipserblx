import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { LiveThemePreview } from '@/components/seller/LiveThemePreview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { 
  Palette, 
  Save, 
  Settings2, 
  Type, 
  Layout, 
  Megaphone,
  Star,
  Eye,
  Code,
  CalendarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { useFormPersistence } from '@/hooks/useFormPersistence';

const STORE_THEMES = [
  { id: 'default', name: 'Default', description: 'Clean and modern' },
  { id: 'minimal', name: 'Minimal', description: 'Simple and elegant' },
  { id: 'bold', name: 'Bold', description: 'Strong colors and contrast' },
  { id: 'gradient', name: 'Gradient', description: 'Smooth color transitions' },
  { id: 'dark', name: 'Dark Mode', description: 'Dark themed storefront' },
];

const ACCENT_COLORS = [
  { id: '#8b5cf6', name: 'Purple' },
  { id: '#3b82f6', name: 'Blue' },
  { id: '#10b981', name: 'Green' },
  { id: '#f59e0b', name: 'Amber' },
  { id: '#ef4444', name: 'Red' },
  { id: '#ec4899', name: 'Pink' },
  { id: '#06b6d4', name: 'Cyan' },
  { id: '#6366f1', name: 'Indigo' },
  { id: '#14b8a6', name: 'Teal' },
  { id: '#f97316', name: 'Orange' },
];

const FONT_OPTIONS = [
  { id: 'inter', name: 'Inter', description: 'Clean and modern' },
  { id: 'roboto', name: 'Roboto', description: 'Friendly and readable' },
  { id: 'poppins', name: 'Poppins', description: 'Geometric and bold' },
  { id: 'montserrat', name: 'Montserrat', description: 'Elegant and stylish' },
  { id: 'playfair', name: 'Playfair Display', description: 'Sophisticated serif' },
  { id: 'space-grotesk', name: 'Space Grotesk', description: 'Futuristic tech' },
  { id: 'dm-sans', name: 'DM Sans', description: 'Minimal and clean' },
];

const LAYOUT_OPTIONS = [
  { id: 'grid', name: 'Grid', description: 'Standard product grid' },
  { id: 'masonry', name: 'Masonry', description: 'Pinterest-style layout' },
  { id: 'list', name: 'List', description: 'Detailed list view' },
];

const INITIAL_FORM_DATA = {
  theme: 'default',
  accent_color: '#8b5cf6',
  font_heading: 'inter',
  font_body: 'inter',
  layout_style: 'grid',
  hero_title: '',
  hero_subtitle: '',
  hero_cta_text: 'Browse Products',
  hero_cta_link: '',
  announcement_text: '',
  announcement_active: false,
  show_reviews: true,
  show_social_proof: true,
  custom_css: '',
  banner_start_at: null as string | null,
  banner_end_at: null as string | null,
};

export default function SellerSettingsAppearance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();
  const [activeTab, setActiveTab] = useState('theme');

  const [formData, setFormData, clearFormData] = useFormPersistence(
    'seller-settings-appearance',
    INITIAL_FORM_DATA
  );

  useEffect(() => {
    if (store) {
      setFormData({
        theme: store.theme || 'default',
        accent_color: store.accent_color || '#8b5cf6',
        font_heading: store.font_heading || 'inter',
        font_body: store.font_body || 'inter',
        layout_style: store.layout_style || 'grid',
        hero_title: store.hero_title || '',
        hero_subtitle: store.hero_subtitle || '',
        hero_cta_text: store.hero_cta_text || 'Browse Products',
        hero_cta_link: store.hero_cta_link || '',
        announcement_text: store.announcement_text || '',
        announcement_active: store.announcement_active || false,
        show_reviews: store.show_reviews !== false,
        show_social_proof: store.show_social_proof !== false,
        custom_css: store.custom_css || '',
        banner_start_at: (store as any).banner_start_at || null,
        banner_end_at: (store as any).banner_end_at || null,
      });
    }
  }, [store]);

  const updateStore = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!store?.id) throw new Error('No store found');
      
      const { error } = await supabase
        .from('stores')
        .update({
          theme: data.theme,
          accent_color: data.accent_color,
          font_heading: data.font_heading,
          font_body: data.font_body,
          layout_style: data.layout_style,
          hero_title: data.hero_title || null,
          hero_subtitle: data.hero_subtitle || null,
          hero_cta_text: data.hero_cta_text || 'Browse Products',
          hero_cta_link: data.hero_cta_link || null,
          announcement_text: data.announcement_text || null,
          announcement_active: data.announcement_active,
          show_reviews: data.show_reviews,
          show_social_proof: data.show_social_proof,
          custom_css: data.custom_css || null,
          banner_start_at: data.banner_start_at || null,
          banner_end_at: data.banner_end_at || null,
          updated_at: new Date().toISOString(),
        } as any)
        .eq('id', store.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Appearance updated successfully');
      queryClient.invalidateQueries({ queryKey: ['seller-store'] });
    },
    onError: (error) => {
      toast.error('Failed to update appearance: ' + error.message);
    },
  });

  const handleSubmit = () => {
    updateStore.mutate(formData);
  };

  return (
    <SellerLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Store Appearance</h1>
          <p className="text-muted-foreground">
            Customize every aspect of your store's look and feel
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        <div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Dropdown for all devices */}
          <Select value={activeTab} onValueChange={setActiveTab}>
            <SelectTrigger className="w-full max-w-md bg-card">
              <SelectValue placeholder="Select section" />
            </SelectTrigger>
            <SelectContent className="bg-card border-border z-[100]">
              <SelectItem value="theme">
                <div className="flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Theme
                </div>
              </SelectItem>
              <SelectItem value="hero">
                <div className="flex items-center gap-2">
                  <Layout className="h-4 w-4" />
                  Hero
                </div>
              </SelectItem>
              <SelectItem value="typography">
                <div className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Typography
                </div>
              </SelectItem>
              <SelectItem value="features">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Features
                </div>
              </SelectItem>
              <SelectItem value="advanced">
                <div className="flex items-center gap-2">
                  <Code className="h-4 w-4" />
                  Advanced
                </div>
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Theme Tab */}
          <TabsContent value="theme" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Palette className="h-5 w-5" />
                  Store Theme
                </CardTitle>
                <CardDescription>
                  Choose a visual style for your storefront
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {STORE_THEMES.map((theme) => (
                    <div
                      key={theme.id}
                      onClick={() => setFormData({ ...formData, theme: theme.id })}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                        formData.theme === theme.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium text-sm">{theme.name}</p>
                      <p className="text-xs text-muted-foreground">{theme.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5" />
                  Accent Color
                </CardTitle>
                <CardDescription>
                  Choose your store's primary accent color
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, accent_color: color.id })}
                      className={`w-10 h-10 rounded-full border-2 transition-all ${
                        formData.accent_color === color.id
                          ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background'
                          : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color.id }}
                      title={color.name}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <Label htmlFor="custom-color" className="text-sm">Custom:</Label>
                  <Input
                    id="custom-color"
                    type="color"
                    value={formData.accent_color}
                    onChange={(e) => setFormData({ ...formData, accent_color: e.target.value })}
                    className="w-16 h-8 p-1 cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground font-mono">{formData.accent_color}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layout className="h-5 w-5" />
                  Product Layout
                </CardTitle>
                <CardDescription>
                  Choose how products are displayed on your store
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3">
                  {LAYOUT_OPTIONS.map((layout) => (
                    <div
                      key={layout.id}
                      onClick={() => setFormData({ ...formData, layout_style: layout.id })}
                      className={`p-3 rounded-lg border-2 cursor-pointer transition-all text-center ${
                        formData.layout_style === layout.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <p className="font-medium text-sm">{layout.name}</p>
                      <p className="text-xs text-muted-foreground">{layout.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Hero Tab */}
          <TabsContent value="hero" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5" />
                  Hero Section
                </CardTitle>
                <CardDescription>
                  Customize the main banner area of your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="hero-title">Hero Title</Label>
                  <Input
                    id="hero-title"
                    placeholder="Welcome to My Store"
                    value={formData.hero_title}
                    onChange={(e) => setFormData({ ...formData, hero_title: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">Leave empty to use your store name</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero-subtitle">Hero Subtitle</Label>
                  <Textarea
                    id="hero-subtitle"
                    placeholder="Discover amazing products..."
                    value={formData.hero_subtitle}
                    onChange={(e) => setFormData({ ...formData, hero_subtitle: e.target.value })}
                    rows={2}
                  />
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cta-text">CTA Button Text</Label>
                    <Input
                      id="cta-text"
                      placeholder="Browse Products"
                      value={formData.hero_cta_text}
                      onChange={(e) => setFormData({ ...formData, hero_cta_text: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cta-link">CTA Button Link (optional)</Label>
                    <Input
                      id="cta-link"
                      placeholder="#products"
                      value={formData.hero_cta_link}
                      onChange={(e) => setFormData({ ...formData, hero_cta_link: e.target.value })}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5" />
                  Store Announcement
                </CardTitle>
                <CardDescription>
                  Display a banner message to all visitors
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="announcement-active">Show Announcement</Label>
                  <Switch
                    id="announcement-active"
                    checked={formData.announcement_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, announcement_active: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="announcement-text">Announcement Message</Label>
                  <Input
                    id="announcement-text"
                    placeholder="🎉 Free shipping on orders over $50!"
                    value={formData.announcement_text}
                    onChange={(e) => setFormData({ ...formData, announcement_text: e.target.value })}
                    disabled={!formData.announcement_active}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Banner Scheduling */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Banner Scheduling
                </CardTitle>
                <CardDescription>
                  Schedule when your store banner is visible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Start Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.banner_start_at && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.banner_start_at
                            ? format(new Date(formData.banner_start_at), 'PPP')
                            : 'No start date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.banner_start_at ? new Date(formData.banner_start_at) : undefined}
                          onSelect={(date) => setFormData({ ...formData, banner_start_at: date?.toISOString() || null })}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {formData.banner_start_at && (
                      <Button
                        variant="ghost" size="sm" className="text-xs"
                        onClick={() => setFormData({ ...formData, banner_start_at: null })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !formData.banner_end_at && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.banner_end_at
                            ? format(new Date(formData.banner_end_at), 'PPP')
                            : 'No end date'}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={formData.banner_end_at ? new Date(formData.banner_end_at) : undefined}
                          onSelect={(date) => setFormData({ ...formData, banner_end_at: date?.toISOString() || null })}
                          className={cn("p-3 pointer-events-auto")}
                        />
                      </PopoverContent>
                    </Popover>
                    {formData.banner_end_at && (
                      <Button
                        variant="ghost" size="sm" className="text-xs"
                        onClick={() => setFormData({ ...formData, banner_end_at: null })}
                      >
                        Clear
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Leave both empty to always show the banner. Set dates to control visibility.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Typography Tab */}
          <TabsContent value="typography" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Type className="h-5 w-5" />
                  Typography
                </CardTitle>
                <CardDescription>
                  Choose fonts for your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label>Heading Font</Label>
                  <Select
                    value={formData.font_heading}
                    onValueChange={(value) => setFormData({ ...formData, font_heading: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.id} value={font.id}>
                          <span className="font-medium">{font.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{font.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Body Font</Label>
                  <Select
                    value={formData.font_body}
                    onValueChange={(value) => setFormData({ ...formData, font_body: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.id} value={font.id}>
                          <span className="font-medium">{font.name}</span>
                          <span className="text-muted-foreground ml-2 text-xs">{font.description}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                  <h3 className="text-xl font-bold mb-1" style={{ fontFamily: formData.font_heading }}>
                    Heading Preview
                  </h3>
                  <p style={{ fontFamily: formData.font_body }}>
                    This is how your body text will look on your store page.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features Tab */}
          <TabsContent value="features" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  Display Options
                </CardTitle>
                <CardDescription>
                  Control what elements appear on your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-reviews">Show Reviews</Label>
                    <p className="text-xs text-muted-foreground">Display customer reviews on product pages</p>
                  </div>
                  <Switch
                    id="show-reviews"
                    checked={formData.show_reviews}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_reviews: checked })}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="show-social">Show Social Proof</Label>
                    <p className="text-xs text-muted-foreground">Display purchase counts and popularity indicators</p>
                  </div>
                  <Switch
                    id="show-social"
                    checked={formData.show_social_proof}
                    onCheckedChange={(checked) => setFormData({ ...formData, show_social_proof: checked })}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advanced Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Code className="h-5 w-5" />
                  Custom CSS
                </CardTitle>
                <CardDescription>
                  Add custom styles to your store (advanced users only)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder={`/* Custom CSS */\n.store-header {\n  /* your styles */\n}`}
                  value={formData.custom_css}
                  onChange={(e) => setFormData({ ...formData, custom_css: e.target.value })}
                  className="font-mono text-sm h-48"
                />
                <p className="text-xs text-muted-foreground">
                  ⚠️ Custom CSS is applied to your store page. Be careful not to break the layout.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Save Button */}
        <div className="mt-6 flex justify-end">
          <Button onClick={handleSubmit} disabled={updateStore.isPending} size="lg">
            <Save className="h-4 w-4 mr-2" />
            {updateStore.isPending ? 'Saving...' : 'Save All Changes'}
          </Button>
        </div>
        </div>

        {/* Live Preview Sidebar */}
        <div className="hidden lg:block sticky top-4 self-start">
          <LiveThemePreview
            theme={formData.theme}
            accentColor={formData.accent_color}
            fontHeading={formData.font_heading}
            fontBody={formData.font_body}
            layoutStyle={formData.layout_style}
            heroTitle={formData.hero_title}
            heroSubtitle={formData.hero_subtitle}
            heroCta={formData.hero_cta_text}
            announcementText={formData.announcement_text}
            announcementActive={formData.announcement_active}
            bannerUrl={store?.banner_url || undefined}
          />
        </div>
        </div>
      </div>
    </SellerLayout>
  );
}
