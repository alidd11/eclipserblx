import React, { useState, useCallback, useEffect } from 'react';
import { sanitizeSearch } from '@/lib/searchUtils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Package, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { usePromotedProduct } from '@/hooks/usePromotedProduct';
import { PromotedProductCard } from '@/components/marketplace/PromotedProductCard';
import { MainLayout } from '@/components/layout/MainLayout';
import { ProductCard } from '@/components/ui/ProductCard';
import { ProductGridSkeleton } from '@/components/ui/ProductCardSkeleton';
import { CategoryBar } from '@/components/shop/CategoryBar';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { CATEGORIES } from '@/lib/constants';
import { FeaturedProductsCard } from '@/components/home/FeaturedProductsCard';
import { CollectionSchema } from '@/components/seo/CollectionSchema';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { usePageTracking } from '@/hooks/usePageTracking';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useDebounce } from '@/hooks/useDebounce';
import { useTranslation } from 'react-i18next';

type SortOption = 'smart' | 'newest' | 'oldest' | 'price-low' | 'price-high' | 'popularity';

const PRODUCTS_PER_PAGE_DESKTOP = 16;
const PRODUCTS_PER_PAGE_MOBILE = 12;

export default function Products() {
 usePageTracking({ pagePath: '/products' });
 const { t } = useTranslation();
 const queryClient = useQueryClient();
 const [searchParams, setSearchParams] = useSearchParams();
 const navigate = useNavigate();
 const categorySlug = searchParams.get('category');
 const featuredOnly = searchParams.get('featured') === 'true';
 const sourceFilter = searchParams.get('source');
 const pageParam = searchParams.get('page');
 const [search, setSearch] = useState('');
 const debouncedSearch = useDebounce(search, 300);
 const [categoriesOpen, setCategoriesOpen] = useState(false);
 const [sortBy, setSortBy] = useState<SortOption>('smart');
 const currentPage = pageParam ? parseInt(pageParam, 10) : 1;

 const { isStaff, loading: adminLoading } = useAdminAuth();

 useEffect(() => {
 if (featuredOnly) {
 navigate('/featured', { replace: true });
 }
 }, [featuredOnly, navigate]);

 const handleRefresh = useCallback(async () => {
 await queryClient.invalidateQueries({ queryKey: ['products'] });
 await queryClient.invalidateQueries({ queryKey: ['categories'] });
 }, [queryClient]);

 const { data: categories } = useQuery({
 queryKey: ['categories'],
 queryFn: async () => {
 const { data, error } = await supabase
 .from('categories')
 .select('id, name, slug, description, display_order')
 .order('display_order');
 if (error) throw error;
 return data;
 },
 staleTime: 60000,
 });

 // Category-aware SEO titles for better Google ranking on long-tail queries
 const activeCategory = categories?.find((c) => c.slug === categorySlug);
 const seoTitle = activeCategory
 ? `Buy Roblox ${activeCategory.name} | Eclipse Marketplace`
 : 'Browse Roblox Assets & Scripts | Eclipse Marketplace';
 const seoDescription = activeCategory
 ? `Shop premium Roblox ${activeCategory.name.toLowerCase()} on Eclipse. Instant delivery, lower fees, verified sellers. Browse ${activeCategory.name.toLowerCase()} now.`
 : 'Browse premium Roblox scripts, vehicles, maps and game assets on Eclipse marketplace. Instant delivery, lower fees.';
 
 usePageMeta({
 title: activeCategory ? `${activeCategory.name} - Roblox Assets` : 'Browse Products',
 description: seoDescription,
 canonicalPath: categorySlug ? `/products?category=${categorySlug}` : '/products',
 });


 const isMobile = useIsMobile();
 const productsPerPage = isMobile ? PRODUCTS_PER_PAGE_MOBILE : PRODUCTS_PER_PAGE_DESKTOP;

 const { data: productsData, isLoading } = useQuery({
 queryKey: ['products', categorySlug, debouncedSearch, featuredOnly, sortBy, sourceFilter, isStaff, currentPage, productsPerPage],
 queryFn: async () => {
 let query = supabase
 .from('products')
 .select(`
 id, name, slug, product_number, price, images, is_active, is_featured,
 category_id, store_id, created_at, is_resellable, download_count,
 categories (name, slug),
 stores (name, slug, logo_url, is_verified, is_active, eclipse_plus_discount_enabled)
 `, { count: 'exact' });

 if (!isStaff) {
 query = query
 .eq('is_active', true)
 .eq('moderation_status', 'approved')
 .or('release_at.is.null,release_at.lte.' + new Date().toISOString());
 }

 if (categorySlug) {
 const category = categories?.find(c => c.slug === categorySlug);
 if (category) {
 query = query.eq('category_id', category.id);
 }
 }

 if (featuredOnly) {
 query = query.eq('is_featured', true);
 }

 if (sourceFilter === 'marketplace') {
 query = query.not('store_id', 'is', null);
 }

 if (debouncedSearch) {
 query = query.or(`name.ilike.%${sanitizeSearch(debouncedSearch)}%,description.ilike.%${sanitizeSearch(debouncedSearch)}%`);
 }

 // Server-side sorting
 switch (sortBy) {
 case 'newest':
 query = query.order('created_at', { ascending: false });
 break;
 case 'oldest':
 query = query.order('created_at', { ascending: true });
 break;
 case 'price-low':
 query = query.order('price', { ascending: true });
 break;
 case 'price-high':
 query = query.order('price', { ascending: false });
 break;
 case 'popularity':
 query = query.order('download_count', { ascending: false, nullsFirst: false });
 break;
 case 'smart':
 default:
 query = query
 .order('is_featured', { ascending: false })
 .order('created_at', { ascending: false });
 break;
 }

 // Server-side pagination
 const from = (currentPage - 1) * productsPerPage;
 const to = from + productsPerPage - 1;
 query = query.range(from, to);

 const { data, error, count } = await query;
 if (error) throw error;
 
 // Filter out products from inactive stores (can't do this in query easily)
 const filtered = (data || []).filter(p => p.stores?.is_active === true);
 
 return { products: filtered, totalCount: count || 0 };
 },
 enabled: !adminLoading && (categories !== undefined || !categorySlug),
 staleTime: 1000 * 60, // 1 minute
 });

 const sortOptions = [
 { value: 'smart', label: t('products.smartSort') },
 { value: 'popularity', label: t('products.mostPopular') },
 { value: 'newest', label: t('products.newestFirst') },
 { value: 'oldest', label: t('products.oldestFirst') },
 { value: 'price-low', label: t('products.priceLowHigh') },
 { value: 'price-high', label: t('products.priceHighLow') },
 ];

 // activeCategory already defined above for SEO

 return (
 <MainLayout>
 
 <CollectionSchema
 name={activeCategory ? activeCategory.name : 'All Products'}
 description={activeCategory?.description || 'Browse premium Roblox scripts, vehicles, maps and game assets on Eclipse marketplace.'}
 url={`https://eclipserblx.com/products${categorySlug ? `?category=${categorySlug}` : ''}`}
 itemCount={productsData?.totalCount ?? 0}
 />
 <CategoryBar />
 <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
 <div className="space-y-4">
 <div className="space-y-3">
 <h1 className="text-xl font-display font-bold text-foreground uppercase tracking-wide">
 {featuredOnly ? t('products.featuredProducts') : activeCategory ? activeCategory.name : t('products.allProducts')}
 </h1>
 <div className="flex items-center gap-2">
 <div className="relative flex-1">
 <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/70" />
 <Input
 placeholder={t('products.searchProducts')}
 value={search}
 onChange={(e) => setSearch(e.target.value)}
 className="pl-9 h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50 w-full rounded-lg"
 />
 </div>
 <Select value={sortBy} onValueChange={(value) => setSortBy(value as SortOption)}>
 <SelectTrigger className="w-auto h-9 text-sm bg-muted/30 border-border/50 gap-1.5 px-2.5 rounded-lg">
 <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
 <span className="hidden sm:inline"><SelectValue /></span>
 </SelectTrigger>
 <SelectContent>
 {sortOptions.map((option) => (
 <SelectItem key={option.value} value={option.value}>
 {option.label}
 </SelectItem>
 ))}
 </SelectContent>
 </Select>
 </div>
 </div>

 <ProductsGrid 
 products={productsData?.products}
 totalCount={productsData?.totalCount ?? 0}
 isLoading={isLoading}
 currentPage={currentPage}
 search={search}
 setSearch={setSearch}
 searchParams={searchParams}
 setSearchParams={setSearchParams}
 categorySlug={categorySlug}
 featuredOnly={featuredOnly}
 productsPerPage={productsPerPage}
 />

 <FeaturedProductsCard />
 </div>
 </div>
 
 </MainLayout>
 );
}



interface ProductsGridProps {
 products: any[] | undefined;
 totalCount: number;
 isLoading: boolean;
 currentPage: number;
 search: string;
 setSearch: (value: string) => void;
 searchParams: URLSearchParams;
 setSearchParams: (params: URLSearchParams | Record<string, string>, options?: { replace?: boolean }) => void;
 categorySlug: string | null;
 featuredOnly: boolean;
 productsPerPage: number;
}

function ProductsGrid({ 
 products, 
 totalCount,
 isLoading, 
 currentPage, 
 search, 
 setSearch, 
 searchParams, 
 setSearchParams,
 categorySlug,
 featuredOnly,
 productsPerPage
}: ProductsGridProps) {
 const { t } = useTranslation();
 const { promotedProduct, trackClick } = usePromotedProduct(
 categorySlug ? 'category' : 'products_listing',
 categorySlug ? undefined : undefined
 );
 const totalProducts = totalCount;
 const totalPages = Math.ceil(totalProducts / productsPerPage);

 const goToPage = (page: number) => {
 const newParams = new URLSearchParams(searchParams);
 if (page === 1) {
 newParams.delete('page');
 } else {
 newParams.set('page', page.toString());
 }
 setSearchParams(newParams, { replace: true });
 window.scrollTo({ top: 0, behavior: 'smooth' });
 };

 if (isLoading) {
 return <ProductGridSkeleton count={productsPerPage} />;
 }

 if (products?.length === 0) {
 return (
 <div className="text-center py-16 space-y-4">
 <p className="text-xl text-muted-foreground">{t('products.noProductsFound')}</p>
 <Button variant="outline" onClick={() => {
 setSearch('');
 const newParams = new URLSearchParams();
 setSearchParams(newParams);
 }}>
 {t('common.clearFilters')}
 </Button>
 </div>
 );
 }

 return (
 <div className="space-y-6">
 <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
 {(products || []).map((product, index) => (
 <React.Fragment key={product.id}>
 {/* Inject promoted product at position 3 on first page */}
 {index === 2 && currentPage === 1 && promotedProduct?.product && (
 <PromotedProductCard
 key="promoted"
 product={promotedProduct.product}
 onClickTracked={trackClick}
 />
 )}
 <ProductCard
 key={product.id}
 id={product.id}
 name={product.name}
 slug={String((product as any).product_number)}
 price={product.price}
 image={product.images?.[0]}
 images={product.images}
 category={product.categories?.name}
 categorySlug={product.categories?.slug}
 categoryId={product.category_id}
 isFeatured={product.is_featured}
 createdAt={product.created_at}
 isResellable={product.is_resellable}
 storeName={product.stores?.name}
 storeSlug={product.stores?.slug}
 storeLogo={product.stores?.logo_url}
 isVerified={product.stores?.is_verified}
 storeEclipseEnabled={product.stores?.eclipse_plus_discount_enabled}
 />
 </React.Fragment>
 ))}
 </div>

 {totalPages > 1 && (
 <div className="flex items-center justify-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => goToPage(currentPage - 1)}
 disabled={currentPage === 1}
 className="gap-1"
 >
 <ChevronLeft className="h-4 w-4" />
 <span className="hidden sm:inline">{t('common.previous')}</span>
 </Button>

 <div className="flex items-center gap-1">
 {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
 const showPage = 
 page === 1 || 
 page === totalPages || 
 Math.abs(page - currentPage) <= 1;
 
 const showEllipsis = 
 (page === 2 && currentPage > 3) ||
 (page === totalPages - 1 && currentPage < totalPages - 2);

 if (showEllipsis && !showPage) {
 return (
 <span key={page} className="px-2 text-muted-foreground">
 ...
 </span>
 );
 }

 if (!showPage) return null;

 return (
 <Button
 key={page}
 variant={currentPage === page ? "default" : "outline"}
 size="sm"
 onClick={() => goToPage(page)}
 className="min-w-[36px]"
 >
 {page}
 </Button>
 );
 })}
 </div>

 <Button
 variant="outline"
 size="sm"
 onClick={() => goToPage(currentPage + 1)}
 disabled={currentPage === totalPages}
 className="gap-1"
 >
 <span className="hidden sm:inline">{t('common.next')}</span>
 <ChevronRight className="h-4 w-4" />
 </Button>
 </div>
 )}

 {totalPages > 1 && (
 <p className="text-center text-sm text-muted-foreground">
 {t('products.showingRange', { start: (currentPage - 1) * productsPerPage + 1, end: Math.min(currentPage * productsPerPage, totalProducts), total: totalProducts })}
 </p>
 )}
 </div>
 );
}
