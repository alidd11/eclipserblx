import { Link } from 'react-router-dom';
import { useSellerStatus } from '@/hooks/useSellerStatus';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  Circle,
  Scale,
  LayoutGrid,
  Palette,
  Package,
  Image,
  LinkIcon,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CURRENT_TOS_VERSION = '1.0';

interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  icon: React.ElementType;
}

export function StoreSetupChecklist() {
  const { store } = useSellerStatus();

  const { data: setupData, isLoading } = useQuery({
    queryKey: ['store-setup-checklist', store?.id],
    queryFn: async () => {
      if (!store?.id) return null;

      // Check TOS signed
      const { data: tosData } = await supabase
        .from('seller_agreements')
        .select('id')
        .eq('store_id', store.id)
        .eq('agreement_version', CURRENT_TOS_VERSION)
        .maybeSingle();

      // Check categories enabled
      const { count: categoryCount } = await supabase
        .from('store_categories')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id)
        .eq('is_enabled', true);

      // Check products listed
      const { count: productCount } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('store_id', store.id);

      // Check appearance customized (logo or banner set)
      const hasAppearance = !!(store.logo_url || store.banner_url);

      // Check social links (at least one)
      const hasSocials = !!(
        store.discord_url ||
        store.twitter_url ||
        store.youtube_url ||
        store.website_url ||
        store.roblox_url
      );

      return {
        tosSigned: !!tosData,
        categoriesEnabled: (categoryCount || 0) > 0,
        hasProducts: (productCount || 0) > 0,
        hasAppearance,
        hasSocials,
      };
    },
    enabled: !!store?.id,
  });

  if (isLoading || !setupData) return null;

  const items: ChecklistItem[] = [
    {
      id: 'tos',
      label: 'Sign Terms of Service',
      description: 'Required for store visibility',
      completed: setupData.tosSigned,
      href: '/seller/documents/terms',
      icon: Scale,
    },
    {
      id: 'appearance',
      label: 'Customize store appearance',
      description: 'Add a logo and banner',
      completed: setupData.hasAppearance,
      href: '/seller/settings/appearance',
      icon: Palette,
    },
    {
      id: 'categories',
      label: 'Enable categories',
      description: 'Organize your product catalog',
      completed: setupData.categoriesEnabled,
      href: '/seller/categories',
      icon: LayoutGrid,
    },
    {
      id: 'products',
      label: 'List your first product',
      description: 'Start selling to customers',
      completed: setupData.hasProducts,
      href: '/seller/products/new',
      icon: Package,
    },
    {
      id: 'socials',
      label: 'Add social links',
      description: 'Connect your community',
      completed: setupData.hasSocials,
      href: '/seller/settings/profile',
      icon: LinkIcon,
    },
  ];

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;
  const progress = Math.round((completedCount / totalCount) * 100);

  // Don't show if everything is complete
  if (completedCount === totalCount) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">Store Setup</CardTitle>
          <span className="text-xs text-muted-foreground font-medium">
            {completedCount}/{totalCount} complete
          </span>
        </div>
        <Progress value={progress} className="h-1.5 mt-2" />
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.completed ? '#' : item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors group',
              item.completed
                ? 'opacity-60'
                : 'hover:bg-muted/50 cursor-pointer'
            )}
          >
            {item.completed ? (
              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p
                className={cn(
                  'text-sm font-medium truncate',
                  item.completed && 'line-through text-muted-foreground'
                )}
              >
                {item.label}
              </p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            {!item.completed && (
              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 group-hover:text-foreground transition-colors" />
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
