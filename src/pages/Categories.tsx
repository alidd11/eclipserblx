import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { 
  Car, Shield, ShieldOff, Flame, Ambulance, Plane, Shirt, Swords,
  Map, Package, Bot, Building2, ChevronRight
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { usePageTracking } from '@/hooks/usePageTracking';

// Category images
import civilianVehiclesImg from '@/assets/categories/civilian-vehicles.jpg';
import markedPoliceImg from '@/assets/categories/marked-police.jpg';
import unmarkedPoliceImg from '@/assets/categories/unmarked-police.jpg';
import fireVehiclesImg from '@/assets/categories/fire-vehicles.jpg';
import ambulanceVehiclesImg from '@/assets/categories/ambulance-vehicles.jpg';
import aircraftImg from '@/assets/categories/aircraft.jpg';
import uniformsImg from '@/assets/categories/uniforms.jpg';
import militaryVehiclesImg from '@/assets/categories/military-vehicles.jpg';
import mapsImg from '@/assets/categories/maps.jpg';
import bundleDealsImg from '@/assets/categories/bundle-deals.jpg';
import botsImg from '@/assets/categories/bots.jpg';
import buildingsImg from '@/assets/categories/buildings.jpg';

// Region flag images
import ukFlagImg from '@/assets/regions/uk-flag.jpg';
import usFlagImg from '@/assets/regions/us-flag.jpg';
import euFlagImg from '@/assets/regions/eu-flag.jpg';

const categoryIcons: Record<string, React.ElementType> = {
  'civilian-vehicles': Car,
  'marked-police-vehicles': Shield,
  'unmarked-police-vehicles': ShieldOff,
  'fire-vehicles': Flame,
  'ambulance-vehicles': Ambulance,
  'aircraft': Plane,
  'uniforms': Shirt,
  'military-vehicles': Swords,
  'maps': Map,
  'bundle-deals': Package,
  'bots': Bot,
  'buildings': Building2,
};

const categoryImages: Record<string, string> = {
  'civilian-vehicles': civilianVehiclesImg,
  'marked-police-vehicles': markedPoliceImg,
  'unmarked-police-vehicles': unmarkedPoliceImg,
  'fire-vehicles': fireVehiclesImg,
  'ambulance-vehicles': ambulanceVehiclesImg,
  'aircraft': aircraftImg,
  'uniforms': uniformsImg,
  'military-vehicles': militaryVehiclesImg,
  'maps': mapsImg,
  'bundle-deals': bundleDealsImg,
  'bots': botsImg,
  'buildings': buildingsImg,
};

const REGION_FLAGS: Record<string, { name: string; image: string }> = {
  'uk-': { name: 'United Kingdom', image: ukFlagImg },
  'us-': { name: 'United States', image: usFlagImg },
  'eu-': { name: 'European Union', image: euFlagImg },
};

interface SubCategory {
  id: string;
  name: string;
  slug: string;
  product_count: number;
  regionPrefix: string | null;
  flagImage: string | null;
  regionName: string | null;
}

interface CategoryWithSubs {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  display_order: number | null;
  product_count: number;
  subCategories: SubCategory[];
}

export default function Categories() {
  usePageTracking({ pagePath: '/categories' });
  const [searchParams] = useSearchParams();
  const sourceFilter = searchParams.get('source');
  const isMarketplace = sourceFilter === 'marketplace';
  const sourceParam = isMarketplace ? '&source=marketplace' : '';

  const { data: categories, isLoading } = useQuery({
    queryKey: ['categories-accordion', sourceFilter],
    queryFn: async () => {
      const now = new Date().toISOString();

      // Fetch all categories (parents + children)
      const { data: allCategories, error } = await supabase
        .from('categories')
        .select('id, name, slug, description, display_order, parent_id')
        .order('display_order', { ascending: true });

      if (error) throw error;

      const parents = (allCategories || []).filter(c => !c.parent_id);
      const children = (allCategories || []).filter(c => c.parent_id);

      // Get product counts for all categories in one batch
      const allIds = (allCategories || []).map(c => c.id);
      
      // Build count map
      const countMap: Record<string, number> = {};
      
      // Fetch counts for all categories
      await Promise.all(
        allIds.map(async (id) => {
          let q = supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('category_id', id)
            .eq('is_active', true)
            .or(`release_at.is.null,release_at.lte.${now}`);
          if (isMarketplace) q = q.not('store_id', 'is', null);
          const { count } = await q;
          countMap[id] = count || 0;
        })
      );

      // Group into parent categories with sub-categories
      const result: CategoryWithSubs[] = parents.map(parent => {
        const subs = children
          .filter(c => c.parent_id === parent.id)
          .map(sub => {
            // Detect region prefix
            let regionPrefix: string | null = null;
            let flagImage: string | null = null;
            let regionName: string | null = null;
            for (const [prefix, config] of Object.entries(REGION_FLAGS)) {
              if (sub.slug.startsWith(prefix)) {
                regionPrefix = prefix;
                flagImage = config.image;
                regionName = config.name;
                break;
              }
            }
            return {
              id: sub.id,
              name: sub.name,
              slug: sub.slug,
              product_count: countMap[sub.id] || 0,
              regionPrefix,
              flagImage,
              regionName,
            };
          });

        // Total count = sum of sub-category counts (if any), plus own direct products
        const subTotal = subs.reduce((sum, s) => sum + s.product_count, 0);
        const ownCount = countMap[parent.id] || 0;
        const totalCount = subs.length > 0 ? subTotal + ownCount : ownCount;

        return {
          id: parent.id,
          name: parent.name,
          slug: parent.slug,
          description: parent.description,
          display_order: parent.display_order,
          product_count: totalCount,
          subCategories: subs,
        };
      });

      return result;
    },
  });

  return (
    <MainLayout>
      <div className="container py-6 sm:py-8 max-w-3xl">
        <div className="mb-6 sm:mb-8">
          <h1 className="font-display text-2xl sm:text-3xl font-black uppercase tracking-widest text-center text-foreground">
            Categories
          </h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : (
          <Accordion type="multiple" className="space-y-2">
            {categories?.map((category) => {
              const Icon = categoryIcons[category.slug] || Package;
              const bgImage = categoryImages[category.slug];
              const hasSubs = category.subCategories.length > 0;
              const isEmpty = category.product_count === 0;

              if (!hasSubs) {
                // Direct link row
                return (
                  <Link
                    key={category.id}
                    to={`/products?category=${category.slug}${sourceParam}`}
                    className={`flex items-center gap-3 sm:gap-4 bg-card border border-border rounded-xl px-3 sm:px-4 py-3 hover:border-primary/50 transition-colors ${
                      isEmpty ? 'opacity-50 pointer-events-none' : ''
                    }`}
                  >
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden border border-border shrink-0">
                      {bgImage ? (
                        <img src={bgImage} alt={category.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-muted">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-semibold text-foreground truncate block">{category.name}</span>
                      <span className="text-xs text-muted-foreground">{category.product_count} items</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </Link>
                );
              }

              // Accordion row for categories with sub-categories
              return (
                <AccordionItem key={category.id} value={category.id} className="border border-border rounded-xl overflow-hidden bg-card">
                  <AccordionTrigger className={`px-3 sm:px-4 py-3 hover:no-underline hover:bg-muted/30 ${isEmpty ? 'opacity-50' : ''}`}>
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                      <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-lg overflow-hidden border border-border shrink-0">
                        {bgImage ? (
                          <img src={bgImage} alt={category.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-muted">
                            <Icon className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <span className="text-sm font-semibold text-foreground truncate block">{category.name}</span>
                        <span className="text-xs text-muted-foreground">{category.product_count} items</span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 sm:px-4 pb-3">
                    <div className="grid grid-cols-3 gap-2 sm:gap-3">
                      {category.subCategories.map((sub) => (
                        <Link
                          key={sub.id}
                          to={`/products?category=${sub.slug}${sourceParam}`}
                          className={`group relative flex flex-col items-center gap-2 rounded-lg border border-border p-2 sm:p-3 hover:border-primary/50 transition-colors ${
                            sub.product_count === 0 ? 'opacity-50 pointer-events-none' : ''
                          }`}
                        >
                          {sub.flagImage && (
                            <div className="w-full aspect-[3/2] rounded-md overflow-hidden border border-border">
                              <img
                                src={sub.flagImage}
                                alt={sub.regionName || sub.name}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                              />
                            </div>
                          )}
                          <div className="text-center min-w-0 w-full">
                            <span className="text-[10px] sm:text-xs font-semibold text-foreground block truncate">
                              {sub.regionName || sub.name}
                            </span>
                            <span className="text-[10px] text-muted-foreground">{sub.product_count} items</span>
                          </div>
                        </Link>
                      ))}
                    </div>
                    {/* View All link */}
                    <Link
                      to={`/products?category=${category.slug}${sourceParam}`}
                      className="block text-center text-xs text-muted-foreground hover:text-primary mt-3 transition-colors"
                    >
                      View all {category.name} →
                    </Link>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </div>
    </MainLayout>
  );
}
