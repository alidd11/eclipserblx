import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { 
  Palette, 
  Type, 
  ListPlus, 
  Eye, 
  Save, 
  RotateCcw, 
  Loader2,
  Info,
  Plus,
  Trash2,
  GripVertical,
  MessageSquare
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

interface WebhookField {
  id: string;
  name: string;
  value: string;
  inline: boolean;
  enabled: boolean;
}

interface WebhookTemplate {
  title: string;
  titleEmoji: string;
  color: string;
  threadNameFormat: string;
  showTimestamp: boolean;
  showThumbnail: boolean;
  showMainImage: boolean;
  showAdditionalImages: boolean;
  fields: WebhookField[];
}

const PLACEHOLDERS = [
  { key: '{product_name}', desc: 'Product name' },
  { key: '{product_description}', desc: 'Product description (stripped HTML, max 300 chars)' },
  { key: '{product_url}', desc: 'Full product URL' },
  { key: '{category_name}', desc: 'Category name' },
  { key: '{gbp_price}', desc: 'Price in GBP (e.g., £9.99)' },
  { key: '{eclipse_plus_price}', desc: 'Eclipse+ discounted price (30% off)' },
  { key: '{robux_price}', desc: 'Robux price (e.g., R$1,000) - empty if not enabled' },
];

const DEFAULT_TEMPLATE: WebhookTemplate = {
  title: '{titleEmoji} Eclipse - {product_name}',
  titleEmoji: '🏠',
  color: '#9b59b6',
  threadNameFormat: 'Eclipse - {product_name}',
  showTimestamp: true,
  showThumbnail: true,
  showMainImage: true,
  showAdditionalImages: true,
  fields: [
    {
      id: 'product_info',
      name: '📦 Product Information',
      value: 'The following product is made for Roblox.\n\n{product_description}',
      inline: false,
      enabled: true,
    },
    {
      id: 'category_info',
      name: '📋 {category_name} Info',
      value: 'This product is from our {category_name} collection.',
      inline: false,
      enabled: true,
    },
    {
      id: 'purchase_locations',
      name: '🛒 Purchase Locations',
      value: '{robux_line}💷 **{gbp_price}** - Our Store\n🌙 **{eclipse_plus_price}** - Eclipse+ Members (30% off)',
      inline: false,
      enabled: true,
    },
    {
      id: 'support',
      name: '💬 Need Help?',
      value: 'For assistance, contact our support team.',
      inline: false,
      enabled: true,
    },
  ],
};

export function ProductWebhookTemplateEditor() {
  const queryClient = useQueryClient();
  const [template, setTemplate] = useState<WebhookTemplate>(DEFAULT_TEMPLATE);

  // Fetch existing template
  const { data: savedTemplate, isLoading } = useQuery({
    queryKey: ['product-webhook-template'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('value')
        .eq('key', 'product_webhook_template')
        .maybeSingle();

      if (error) throw error;
      
      if (data?.value) {
        try {
          const parsed = typeof data.value === 'string' 
            ? JSON.parse(data.value.replace(/^"|"$/g, ''))
            : data.value;
          return parsed as WebhookTemplate;
        } catch {
          return DEFAULT_TEMPLATE;
        }
      }
      return DEFAULT_TEMPLATE;
    },
  });

  useEffect(() => {
    if (savedTemplate) {
      setTemplate(savedTemplate);
    }
  }, [savedTemplate]);

  // Save template mutation
  const saveMutation = useMutation({
    mutationFn: async (templateData: WebhookTemplate) => {
      const { data: existing } = await supabase
        .from('settings')
        .select('id')
        .eq('key', 'product_webhook_template')
        .maybeSingle();

      const value = JSON.stringify(templateData);

      if (existing) {
        const { error } = await supabase
          .from('settings')
          .update({ value })
          .eq('key', 'product_webhook_template');
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('settings')
          .insert([{ key: 'product_webhook_template', value }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-webhook-template'] });
      toast.success('Webhook template saved');
    },
    onError: (error) => {
      console.error('Failed to save template:', error);
      toast.error('Failed to save template');
    },
  });

  const handleFieldChange = (fieldId: string, key: keyof WebhookField, value: string | boolean) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.map(f => 
        f.id === fieldId ? { ...f, [key]: value } : f
      ),
    }));
  };

  const addField = () => {
    const newField: WebhookField = {
      id: `custom_${Date.now()}`,
      name: 'New Field',
      value: '',
      inline: false,
      enabled: true,
    };
    setTemplate(prev => ({
      ...prev,
      fields: [...prev.fields, newField],
    }));
  };

  const removeField = (fieldId: string) => {
    setTemplate(prev => ({
      ...prev,
      fields: prev.fields.filter(f => f.id !== fieldId),
    }));
  };

  const resetToDefaults = () => {
    setTemplate(DEFAULT_TEMPLATE);
    toast.info('Template reset to defaults');
  };

  // Generate preview embed
  const previewEmbed = {
    title: template.title
      .replace('{titleEmoji}', template.titleEmoji)
      .replace('{product_name}', 'Example Product'),
    color: parseInt(template.color.replace('#', ''), 16),
    fields: template.fields
      .filter(f => f.enabled)
      .map(f => ({
        name: f.name.replace('{category_name}', 'Scripts'),
        value: f.value
          .replace('{product_description}', 'This is an example product description showcasing how your webhook will look...')
          .replace('{category_name}', 'Scripts')
          .replace('{gbp_price}', '£9.99')
          .replace('{eclipse_plus_price}', '£6.99')
          .replace('{robux_price}', 'R$1,000')
          .replace('{robux_line}', '🔵 **R$1,000** - Eclipse Roblox Hub\n'),
        inline: f.inline,
      })),
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-primary/10 border border-primary/30 p-4 rounded-lg">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-primary">Template Placeholders</p>
            <p className="text-sm text-muted-foreground">
              Use placeholders to dynamically insert product data. Available placeholders:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {PLACEHOLDERS.map(p => (
                <Badge key={p.key} variant="secondary" className="font-mono text-xs">
                  {p.key}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor Panel */}
        <div className="space-y-6">
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Type className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Embed Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-[80px_1fr] gap-3">
                <div className="space-y-2">
                  <Label htmlFor="titleEmoji">Emoji</Label>
                  <Input
                    id="titleEmoji"
                    value={template.titleEmoji}
                    onChange={(e) => setTemplate(prev => ({ ...prev, titleEmoji: e.target.value }))}
                    className="bg-background text-center"
                    maxLength={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="title">Title Format</Label>
                  <Input
                    id="title"
                    value={template.title}
                    onChange={(e) => setTemplate(prev => ({ ...prev, title: e.target.value }))}
                    className="bg-background"
                    placeholder="{titleEmoji} Eclipse - {product_name}"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="threadName">Forum Thread Name</Label>
                <Input
                  id="threadName"
                  value={template.threadNameFormat}
                  onChange={(e) => setTemplate(prev => ({ ...prev, threadNameFormat: e.target.value }))}
                  className="bg-background"
                  placeholder="Eclipse - {product_name}"
                />
                <p className="text-xs text-muted-foreground">
                  Name of the Discord forum thread that gets created
                </p>
              </div>

              <div className="flex items-center gap-3">
                <Label htmlFor="color" className="shrink-0">Embed Color</Label>
                <div className="flex items-center gap-2 flex-1">
                  <input
                    type="color"
                    id="color"
                    value={template.color}
                    onChange={(e) => setTemplate(prev => ({ ...prev, color: e.target.value }))}
                    className="w-10 h-10 rounded cursor-pointer border border-border"
                  />
                  <Input
                    value={template.color}
                    onChange={(e) => setTemplate(prev => ({ ...prev, color: e.target.value }))}
                    className="bg-background font-mono w-28"
                    placeholder="#9b59b6"
                  />
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <Label>Display Options</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show timestamp</span>
                    <Switch
                      checked={template.showTimestamp}
                      onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showTimestamp: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show thumbnail (first image)</span>
                    <Switch
                      checked={template.showThumbnail}
                      onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showThumbnail: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show main image</span>
                    <Switch
                      checked={template.showMainImage}
                      onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showMainImage: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Show additional images (up to 4 total)</span>
                    <Switch
                      checked={template.showAdditionalImages}
                      onCheckedChange={(checked) => setTemplate(prev => ({ ...prev, showAdditionalImages: checked }))}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fields Editor */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ListPlus className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Embed Fields</CardTitle>
                </div>
                <Button onClick={addField} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Field
                </Button>
              </div>
              <CardDescription>
                Configure the fields shown in the Discord embed. Drag to reorder.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {template.fields.map((field, index) => (
                  <AccordionItem
                    key={field.id}
                    value={field.id}
                    className="border border-border rounded-lg px-3"
                  >
                    <AccordionTrigger className="hover:no-underline py-3">
                      <div className="flex items-center gap-3 flex-1">
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.enabled}
                            onCheckedChange={(checked) => handleFieldChange(field.id, 'enabled', checked)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <span className={`text-sm ${!field.enabled ? 'text-muted-foreground line-through' : ''}`}>
                            {field.name}
                          </span>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 pb-4 space-y-3">
                      <div className="space-y-2">
                        <Label>Field Name</Label>
                        <Input
                          value={field.name}
                          onChange={(e) => handleFieldChange(field.id, 'name', e.target.value)}
                          className="bg-background"
                          placeholder="Field name (supports placeholders)"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Field Value</Label>
                        <Textarea
                          value={field.value}
                          onChange={(e) => handleFieldChange(field.id, 'value', e.target.value)}
                          className="bg-background min-h-[80px]"
                          placeholder="Field content (supports placeholders and **bold** markdown)"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={field.inline}
                            onCheckedChange={(checked) => handleFieldChange(field.id, 'inline', checked)}
                          />
                          <span className="text-sm text-muted-foreground">Inline</span>
                        </div>
                        <Button
                          onClick={() => removeField(field.id)}
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {template.fields.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <ListPlus className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No fields configured. Add a field to get started.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel */}
        <div className="space-y-4">
          <Card className="bg-card border-border sticky top-4">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Live Preview</CardTitle>
              </div>
              <CardDescription>
                How your webhook will appear in Discord
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Discord-style embed preview */}
              <div className="bg-[#313338] rounded-lg p-4 text-white">
                <div 
                  className="border-l-4 rounded bg-[#2b2d31] p-3"
                  style={{ borderLeftColor: template.color }}
                >
                  {/* Title */}
                  <div className="font-semibold text-[#00a8fc] hover:underline cursor-pointer mb-2">
                    {previewEmbed.title}
                  </div>

                  {/* Fields */}
                  <div className="space-y-3">
                    {previewEmbed.fields.map((field, idx) => (
                      <div key={idx} className={field.inline ? 'inline-block w-1/2 pr-2' : ''}>
                        <div className="text-xs font-semibold text-gray-300 mb-0.5">
                          {field.name}
                        </div>
                        <div className="text-sm text-gray-100 whitespace-pre-wrap">
                          {field.value.split('**').map((part, i) => 
                            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Thumbnail placeholder */}
                  {template.showThumbnail && (
                    <div className="absolute top-3 right-3 w-20 h-20 bg-[#1e1f22] rounded flex items-center justify-center text-xs text-gray-500">
                      Thumbnail
                    </div>
                  )}

                  {/* Timestamp */}
                  {template.showTimestamp && (
                    <div className="text-xs text-gray-400 mt-3">
                      Today at {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {/* Main image placeholder */}
                {template.showMainImage && (
                  <div className="mt-2 bg-[#1e1f22] rounded h-32 flex items-center justify-center text-sm text-gray-500">
                    Product Image
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground mt-3 text-center">
                Note: This is an approximation. Actual Discord rendering may vary slightly.
              </p>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              onClick={resetToDefaults}
              variant="outline"
              className="flex-1"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Defaults
            </Button>
            <Button
              onClick={() => saveMutation.mutate(template)}
              disabled={saveMutation.isPending}
              className="flex-1"
            >
              {saveMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Template
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
