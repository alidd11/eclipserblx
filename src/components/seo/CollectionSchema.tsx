import { useEffect } from 'react';

interface CollectionSchemaProps {
  name: string;
  description: string;
  url: string;
  itemCount: number;
}

export function CollectionSchema({ name, description, url, itemCount }: CollectionSchemaProps): null {
  useEffect(() => {
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'collection-schema';
    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name,
      description,
      url,
      numberOfItems: itemCount,
      isPartOf: {
        '@type': 'WebSite',
        name: 'Eclipse',
        url: 'https://eclipserblx.com',
      },
    });

    const existing = document.getElementById('collection-schema');
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => { script.remove(); };
  }, [name, description, url, itemCount]);

  return null;
}
