import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SellerLayout } from '@/components/seller/SellerLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Palette, Save, Settings2 } from 'lucide-react';
import { toast } from 'sonner';

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
];

export default function SellerSettingsAppearance() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { store, isSeller } = useSellerStatus();

  const [formData, setFormData] = useState({
    theme: 'default',
    accent_color: '#8b5cf6',
  });

  useEffect(() => {
    if (store) {
      setFormData({
        theme: store.theme || 'default',
        accent_color: store.accent_color || '#8b5cf6',
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
          updated_at: new Date().toISOString(),
        })
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
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Store Appearance</h1>
          <p className="text-muted-foreground">
            Customize how your store looks to customers
          </p>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
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

              <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Theme'}
              </Button>
            </CardContent>
          </Card>

          {/* Accent Color */}
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
                    className={`w-12 h-12 rounded-full border-2 transition-all ${
                      formData.accent_color === color.id
                        ? 'border-foreground scale-110 ring-2 ring-offset-2 ring-offset-background'
                        : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color.id }}
                    title={color.name}
                  />
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Selected: <span className="font-medium">{ACCENT_COLORS.find(c => c.id === formData.accent_color)?.name || 'Purple'}</span>
              </p>

              <Button onClick={handleSubmit} disabled={updateStore.isPending}>
                <Save className="h-4 w-4 mr-2" />
                {updateStore.isPending ? 'Saving...' : 'Save Color'}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </SellerLayout>
  );
}
