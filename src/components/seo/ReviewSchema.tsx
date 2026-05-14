import { useEffect } from 'react';

interface ReviewItem {
  rating: number;
  reviewBody?: string;
  authorName: string;
  datePublished: string;
}

interface ReviewSchemaProps {
  productName: string;
  reviews: ReviewItem[];
}

/**
 * Injects individual Review JSON-LD snippets for a product's reviews.
 * Google can use these to show star ratings in search results.
 */
export function ReviewSchema({ productName, reviews }: ReviewSchemaProps): null {
  useEffect(() => {
    if (!reviews.length) return;

    const schema = {
      '@context': 'https://schema.org',
      '@graph': reviews.slice(0, 10).map((r) => ({
        '@type': 'Review',
        itemReviewed: { '@type': 'Product', name: productName },
        reviewRating: {
          '@type': 'Rating',
          ratingValue: r.rating.toString(),
          bestRating: '5',
          worstRating: '1',
        },
        author: { '@type': 'Person', name: r.authorName },
        datePublished: r.datePublished.split('T')[0],
        ...(r.reviewBody && { reviewBody: r.reviewBody.slice(0, 300) }),
      })),
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'review-schema';
    script.textContent = JSON.stringify(schema);

    const existing = document.getElementById('review-schema');
    if (existing) existing.remove();
    document.head.appendChild(script);

    return () => { script.remove(); };
  }, [productName, reviews]);

  return null;
}
