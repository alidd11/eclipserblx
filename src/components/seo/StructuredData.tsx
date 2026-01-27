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
  rating?: number;
  reviewCount?: number;
}

interface BreadcrumbItem {
  name: string;
  url: string;
}

// Organization schema for the main site
export function OrganizationSchema({
  name = 'Eclipse',
  url = 'https://eclipserblx.com',
  logo = 'https://eclipserblx.com/pwa-512x512.png',
  description = 'Premium UK Roleplay Assets marketplace for Roblox. The best alternative platform for buying and selling Roblox scripts, vehicles, maps, and game assets with lower fees and GBP payments.',
}: OrganizationSchemaProps) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'organization-schema';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name,
      url,
      logo,
      description,
      sameAs: [
        'https://discord.gg/eclipse',
        'https://twitter.com/EclipseRblx',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer service',
        availableLanguage: 'English',
      },
    });

    const existing = document.getElementById('organization-schema');
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
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
  rating,
  reviewCount,
}: ProductSchemaProps) {
  useEffect(() => {
    const schema: Record<string, unknown> = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name,
      description,
      image,
      offers: {
        '@type': 'Offer',
        price: price.toFixed(2),
        priceCurrency: currency,
        availability: `https://schema.org/${availability}`,
        seller: {
          '@type': 'Organization',
          name: seller,
        },
      },
    };

    if (rating && reviewCount) {
      schema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: rating.toFixed(1),
        reviewCount,
      };
    }

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'product-schema';
    script.textContent = JSON.stringify(schema);

    const existing = document.getElementById('product-schema');
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [name, description, image, price, currency, availability, seller, rating, reviewCount]);

  return null;
}

// Breadcrumb schema for navigation
export function BreadcrumbSchema({ items }: { items: BreadcrumbItem[] }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'breadcrumb-schema';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: item.name,
        item: item.url,
      })),
    });

    const existing = document.getElementById('breadcrumb-schema');
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [items]);

  return null;
}

// Website search schema
export function WebsiteSearchSchema() {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'website-schema';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'Eclipse',
      url: 'https://eclipserblx.com',
      description: 'Premium Roblox asset marketplace - the best alternative for UK roleplay scripts, vehicles, and game assets',
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: 'https://eclipserblx.com/products?search={search_term_string}',
        },
        'query-input': 'required name=search_term_string',
      },
    });

    const existing = document.getElementById('website-schema');
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, []);

  return null;
}

// FAQ schema for FAQ pages
export function FAQSchema({ faqs }: { faqs: { question: string; answer: string }[] }) {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-schema';
    script.textContent = JSON.stringify({
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

    const existing = document.getElementById('faq-schema');
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => {
      script.remove();
    };
  }, [faqs]);

  return null;
}
