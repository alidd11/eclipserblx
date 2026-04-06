import { useEffect } from 'react';

interface OrganizationSchemaProps {
  name?: string;
  url?: string;
  logo?: string;
  description?: string;
}

interface ProductSchemaProps {
  name: string;
  description: string;
  image: string;
  price: number;
  currency?: string;
  availability?: 'InStock' | 'OutOfStock';
  seller?: string;
  sellerUrl?: string;
  rating?: number;
  reviewCount?: number;
  sku?: string;
  slug?: string;
  brand?: string;
  category?: string;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

// Helper to inject/replace a JSON-LD script tag
function injectJsonLd(id: string, data: Record<string, unknown>) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.id = id;
  script.textContent = JSON.stringify(data);

  const existing = document.getElementById(id);
  if (existing) existing.remove();
  document.head.appendChild(script);

  return script;
}

// Organization schema for the main site
export function OrganizationSchema({
  name = 'Eclipse',
  url = 'https://eclipserblx.com',
  logo = 'https://eclipserblx.com/pwa-512x512.png',
  description = 'Premium UK Roleplay Assets marketplace for Roblox. The best alternative platform for buying and selling Roblox scripts, vehicles, maps, and game assets with lower fees and GBP payments.',
}: OrganizationSchemaProps) {
  useEffect(() => {
    const script = injectJsonLd('organization-schema', {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      alternateName: ['Eclipse Marketplace', 'EclipseRblx', 'Eclipse Roblox'],
      url,
      logo: {
        '@type': 'ImageObject',
        url: logo,
        width: 512,
        height: 512,
      },
      description,
      foundingDate: '2024',
      areaServed: {
        '@type': 'Place',
        name: 'Worldwide',
      },
      sameAs: [
        'https://discord.gg/eclipse',
        'https://twitter.com/EclipseRblx',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: 'English',
        email: 'support@eclipserblx.com',
      },
    });

    return () => { script.remove(); };
  }, [name, url, logo, description]);

  return null;
}

// Product schema for individual product pages
export function ProductSchema({
  name,
  description,
  image,
  price,
  currency = 'GBP',
  availability = 'InStock',
  seller = 'Eclipse',
  sellerUrl,
  rating,
  reviewCount,
  sku,
  slug,
  brand,
  category,
}: ProductSchemaProps) {
  useEffect(() => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image,
      ...(sku && { sku }),
      ...(slug && { url: `https://eclipserblx.com/products/${slug}` }),
      ...(brand && { brand: { '@type': 'Brand', name: brand } }),
      ...(category && { category }),
      offers: {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: currency,
        availability: `https://schema.org/${availability}`,
        url: slug ? `https://eclipserblx.com/products/${slug}` : undefined,
        seller: {
          '@type': 'Organization',
          name: seller,
          ...(sellerUrl && { url: sellerUrl }),
        },
        shippingDetails: {
          '@type': 'OfferShippingDetails',
          shippingRate: { '@type': 'MonetaryAmount', value: '0', currency: 'GBP' },
          deliveryTime: {
            '@type': 'ShippingDeliveryTime',
            handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'MIN' },
            transitTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 0, unitCode: 'MIN' },
          },
          shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'EARTH' },
        },
        hasMerchantReturnPolicy: {
          '@type': 'MerchantReturnPolicy',
          applicableCountry: 'GB',
          returnPolicyCategory: 'https://schema.org/MerchantReturnNotPermitted',
          returnPolicyUrl: 'https://eclipserblx.com/refunds',
        },
      },
    };

    if (rating && reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating.toFixed(1),
        reviewCount,
        bestRating: '5',
        worstRating: '1',
      };
    }

    const script = injectJsonLd('product-schema', schema);
    return () => { script.remove(); };
  }, [name, description, image, price, currency, availability, seller, sellerUrl, rating, reviewCount, sku, slug, brand, category]);

  return null;
}

// Breadcrumb schema for navigation
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  useEffect(() => {
    const script = injectJsonLd('breadcrumb-schema', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });

    return () => { script.remove(); };
  }, [items]);

  return null;
}

// Website search schema — tells Google about the search box
export function WebsiteSearchSchema() {
  useEffect(() => {
    const script = injectJsonLd('website-schema', {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Eclipse',
      alternateName: ['Eclipse Marketplace', 'EclipseRblx'],
      url: 'https://eclipserblx.com',
      description: 'Premium Roblox asset marketplace — the best alternative for UK roleplay scripts, vehicles, and game assets',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://eclipserblx.com/search?q={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    });

    return () => { script.remove(); };
  }, []);

  return null;
}

/**
 * SiteNavigationElement schema — encourages Google to show sitelinks
 * by declaring the site's main navigation sections.
 */
export function SiteNavigationSchema() {
  useEffect(() => {
    const navItems = [
      { name: 'Roblox Assets', url: 'https://eclipserblx.com/products' },
      { name: 'Categories', url: 'https://eclipserblx.com/categories' },
      { name: 'Featured Products', url: 'https://eclipserblx.com/featured' },
      { name: 'Stores', url: 'https://eclipserblx.com/stores' },
      { name: 'FAQ', url: 'https://eclipserblx.com/faq' },
      { name: 'Support', url: 'https://eclipserblx.com/support' },
      { name: 'Contact', url: 'https://eclipserblx.com/contact' },
    ];

    const script = injectJsonLd('site-navigation-schema', {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      itemListElement: navItems.map((item, index) => ({
        '@type': 'SiteNavigationElement',
        position: index + 1,
        name: item.name,
        url: item.url,
      })),
    });

    return () => { script.remove(); };
  }, []);

  return null;
}

// FAQ schema for FAQ pages
export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  useEffect(() => {
    const script = injectJsonLd('faq-schema', {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    });

    return () => { script.remove(); };
  }, [faqs]);

  return null;
}

// Store schema for individual store pages
interface StoreSchemaProps {
  name: string;
  description?: string;
  url: string;
  image?: string;
  rating?: number;
  reviewCount?: number;
}

export function StoreSchema({ name, description, url, image, rating, reviewCount }: StoreSchemaProps) {
  useEffect(() => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Store',
      name,
      description: description || `${name} on Eclipse marketplace`,
      url,
      image: image || 'https://eclipserblx.com/pwa-512x512.png',
      parentOrganization: {
        '@type': 'Organization',
        name: 'Eclipse',
        url: 'https://eclipserblx.com',
      },
    };

    if (rating && reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating.toFixed(1),
        reviewCount,
        bestRating: '5',
        worstRating: '1',
      };
    }

    const script = injectJsonLd('store-schema', schema);
    return () => { script.remove(); };
  }, [name, description, url, image, rating, reviewCount]);

  return null;
}