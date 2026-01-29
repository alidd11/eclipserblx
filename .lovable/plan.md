

# Expand Page Tracking Across the Site

## Overview
Add the `usePageTracking` hook to key pages throughout the site to capture visitor analytics. Currently, tracking is only implemented on policy pages (Privacy Policy, Terms of Service, Refund Policy). This plan expands coverage to include high-traffic pages in the customer journey.

## Pages to Add Tracking

### High Priority (Core Customer Journey)
| Page | Path | File |
|------|------|------|
| Homepage | `/` | `src/pages/Index.tsx` |
| Products List | `/products` | `src/pages/Products.tsx` |
| Product Detail | `/products/:slug` | `src/pages/ProductDetail.tsx` |
| Cart | `/cart` | `src/pages/Cart.tsx` |
| Checkout | `/checkout` | `src/pages/Checkout.tsx` |
| Order Success | `/order-success` | `src/pages/OrderSuccess.tsx` |

### Medium Priority (Engagement Pages)
| Page | Path | File |
|------|------|------|
| Categories | `/categories` | `src/pages/Categories.tsx` |
| Store Page | `/store/:storeSlug` | `src/pages/StorePage.tsx` |
| Eclipse+ | `/eclipse-plus` | `src/pages/EclipsePlus.tsx` |
| Forum | `/forum` | `src/pages/Forum.tsx` |
| Account | `/account` | `src/pages/Account.tsx` |
| My Purchases | `/purchases` | `src/pages/MyPurchases.tsx` |

### Lower Priority (Utility Pages)
| Page | Path | File |
|------|------|------|
| Featured | `/featured` | `src/pages/Featured.tsx` |
| Contact | `/contact` | `src/pages/Contact.tsx` |
| FAQ | `/faq` | `src/pages/FAQ.tsx` |
| Auth | `/auth` | `src/pages/Auth.tsx` |

## Implementation Approach

For each page, I will:
1. Import the `usePageTracking` hook
2. Call the hook at the top of the component with the appropriate page path

### Example Implementation
```typescript
import { usePageTracking } from '@/hooks/usePageTracking';

export default function Index() {
  usePageTracking({ pagePath: '/' });
  // ... rest of component
}
```

### Dynamic Pages
For pages with URL parameters (like product detail or store pages), the path will include the dynamic segment:
```typescript
// ProductDetail.tsx
usePageTracking({ pagePath: `/products/${slug}` });

// StorePage.tsx
usePageTracking({ pagePath: `/store/${storeSlug}` });
```

---

## Technical Details

### Files to Modify (16 total)

1. **`src/pages/Index.tsx`** - Add tracking for `/`
2. **`src/pages/Products.tsx`** - Add tracking for `/products` (includes query params context)
3. **`src/pages/ProductDetail.tsx`** - Add tracking for `/products/:slug`
4. **`src/pages/Cart.tsx`** - Add tracking for `/cart`
5. **`src/pages/Checkout.tsx`** - Add tracking for `/checkout`
6. **`src/pages/OrderSuccess.tsx`** - Add tracking for `/order-success`
7. **`src/pages/Categories.tsx`** - Add tracking for `/categories`
8. **`src/pages/StorePage.tsx`** - Add tracking for `/store/:storeSlug`
9. **`src/pages/EclipsePlus.tsx`** - Add tracking for `/eclipse-plus`
10. **`src/pages/Forum.tsx`** - Add tracking for `/forum`
11. **`src/pages/Account.tsx`** - Add tracking for `/account`
12. **`src/pages/MyPurchases.tsx`** - Add tracking for `/purchases`
13. **`src/pages/Featured.tsx`** - Add tracking for `/featured`
14. **`src/pages/Contact.tsx`** - Add tracking for `/contact`
15. **`src/pages/FAQ.tsx`** - Add tracking for `/faq`
16. **`src/pages/Auth.tsx`** - Add tracking for `/auth`

### Privacy Considerations
The existing hook already:
- Checks for analytics cookie consent before tracking
- Only tracks once per page load (prevents duplicates)
- Silently fails if tracking errors occur (doesn't interrupt UX)
- Anonymizes visitors with a random UUID (not tied to user accounts)

### Data Collected
Each page visit records:
- `page_path` - The URL path visited
- `visitor_id` - Anonymous identifier
- `is_new_visitor` - First-time visitor flag
- `user_agent` - Browser/device info
- `referrer` - Source URL
- `device_type` - desktop/mobile/tablet
- `browser` - Chrome/Firefox/Safari/etc.

## Success Criteria
After implementation, the `page_visits` table in your database will capture visits to all major pages, enabling you to:
- See which pages get the most traffic
- Track the customer journey from homepage to checkout
- Identify drop-off points in the conversion funnel
- Analyze device/browser distribution
- Monitor referral sources

