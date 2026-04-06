import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import type { StoreSection } from './SectionList';

interface SectionSettingsProps {
  section: StoreSection;
  onUpdateConfig: (sectionId: string, config: Record<string, any>) => void;
}

export function SectionSettings({ section, onUpdateConfig }: SectionSettingsProps) {
  const config = section.config || {};

  const updateField = (key: string, value: unknown) => {
    onUpdateConfig(section.id, { ...config, [key]: value });
  };

  switch (section.type) {
    case 'best_sellers':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Best Sellers Settings</h4>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Products to show</Label>
            <Slider
              value={[config.limit ?? 4]}
              onValueChange={([v]) => updateField('limit', v)}
              min={2}
              max={8}
              step={1}
            />
            <span className="text-xs text-muted-foreground">{config.limit ?? 4} products</span>
          </div>
        </div>
      );

    case 'banner':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Banner Settings</h4>
          <p className="text-xs text-muted-foreground">
            Upload your banner image in Store Profile settings. Toggle visibility here.
          </p>
        </div>
      );

    case 'announcement':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Announcement Settings</h4>
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Announcement Text</Label>
            <Input
              value={config.text ?? ''}
              onChange={(e) => updateField('text', e.target.value)}
              placeholder="e.g. 🔥 Flash sale this weekend!"
              className="text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={config.active ?? false}
              onCheckedChange={(v) => updateField('active', v)}
            />
            <Label className="text-xs">Show announcement bar</Label>
          </div>
        </div>
      );

    case 'products':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Products Grid Settings</h4>
          <p className="text-xs text-muted-foreground">
            Displays all your products with pagination. The grid layout adjusts automatically based on screen size.
          </p>
        </div>
      );

    case 'trust_signals':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Trust Signals</h4>
          <p className="text-xs text-muted-foreground">
            Shows verification status, secure checkout badge, and trust indicators. Automatically populated based on your store status.
          </p>
        </div>
      );

    case 'reviews':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Reviews Section</h4>
          <p className="text-xs text-muted-foreground">
            Displays customer reviews and ratings for your store. Reviews are collected automatically after purchases.
          </p>
        </div>
      );

    case 'custom_sections':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Custom Sections</h4>
          <p className="text-xs text-muted-foreground">
            Manage your custom content sections (FAQ, About, etc.) from the Custom Sections page. This toggle controls their visibility on your storefront.
          </p>
        </div>
      );

    case 'recommendations':
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Recommendations</h4>
          <p className="text-xs text-muted-foreground">
            Shows related products from other stores based on your product categories. Helps cross-promote within the marketplace.
          </p>
        </div>
      );

    default:
      return (
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">{section.label}</h4>
          <p className="text-xs text-muted-foreground">No additional settings for this section.</p>
        </div>
      );
  }
}
