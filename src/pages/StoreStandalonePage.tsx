import React, { lazy, Suspense, useEffect } from 'react';
import { useStoreDomain } from '@/hooks/useStoreDomain';
import { Skeleton } from '@/components/ui/skeleton';
import { Routes, Route, Navigate } from 'react-router-dom';

const StorePage = lazy(() => import('@/pages/StorePage'));
const ProductDetail = lazy(() => import('@/pages/ProductDetail'));
const Cart = lazy(() => import('@/pages/Cart'));
const Checkout = lazy(() => import('@/pages/Checkout'));
const OrderSuccess = lazy(() => import('@/pages/OrderSuccess'));
const Auth = lazy(() => import('@/pages/Auth'));
const StoreReviewsPage = lazy(() => import('@/pages/StoreReviewsPage'));
const StoreCustomPage = lazy(() => import('@/pages/StoreCustomPage'));
const StoreAbout = lazy(() => import('@/pages/StoreAbout'));

function PageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center safe-area-page">
      <div className="space-y-4 w-full max-w-md px-4">
        <Skeleton className="h-8 w-3/4 mx-auto" />
        <Skeleton className="h-4 w-1/2 mx-auto" />
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function StoreStandalonePage() {
  const { storeDomainData, loading } = useStoreDomain();

  if (loading) return <PageLoader />;
  if (!storeDomainData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center text-foreground safe-area-page">
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-bold">Store Not Found</h1>
          <p className="text-muted-foreground">This domain is not connected to any store.</p>
          <a href="https://eclipserblx.com" className="text-primary hover:underline">
            Visit Eclipse Marketplace
          </a>
        </div>
      </div>
    );
  }

  const storeSlug = storeDomainData.stores.slug;
  const hideBranding = (storeDomainData.stores as any).hide_branding === true;
  const faviconUrl = (storeDomainData.stores as any).favicon_url;

  return (
    <StoreStandaloneContent 
      storeSlug={storeSlug} 
      hideBranding={hideBranding} 
      faviconUrl={faviconUrl} 
    />
  );
}

function StoreStandaloneContent({ 
  storeSlug, 
  hideBranding, 
  faviconUrl 
}: { 
  storeSlug: string; 
  hideBranding: boolean; 
  faviconUrl?: string | null;
}) {
  // Inject favicon
  useEffect(() => {
    if (faviconUrl) {
      let link = document.querySelector("link[rel='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
      }
      link.href = faviconUrl;
    }
  }, [faviconUrl]);

  return (
    <div className="min-h-screen bg-background safe-area-page">
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to={`/store/${storeSlug}`} replace />} />
          <Route path="/store/:storeSlug" element={<StorePage />} />
          <Route path="/store/:storeSlug/reviews" element={<StoreReviewsPage />} />
          <Route path="/store/:storeSlug/about" element={<StoreAbout />} />
          <Route path="/store/:storeSlug/page/:pageSlug" element={<StoreCustomPage />} />
          <Route path="/product/:productNumber" element={<ProductDetail />} />
          <Route path="/products/:productNumber" element={<ProductDetail />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success" element={<OrderSuccess />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="*" element={<Navigate to={`/store/${storeSlug}`} replace />} />
        </Routes>
      </Suspense>
      
      {/* Powered by Eclipse footer badge — hidden if seller has hide_branding enabled */}
      {!hideBranding && (
        <div className="fixed bottom-4 right-4 z-40">
          <a
            href="https://eclipserblx.com"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-sm border border-border text-xs text-muted-foreground hover:text-foreground transition-colors shadow-sm"
          >
            Powered by <span className="font-semibold text-primary">Eclipse</span>
          </a>
        </div>
      )}
    </div>
  );
}
