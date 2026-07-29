import type { QueryClient } from '@tanstack/react-query';

/**
 * Invalidate every surface that reflects a product's moderation state.
 *
 * A product create/edit/delete changes data shown not just in the seller's own list
 * (`seller-products`) but also in the moderation queue and the admin dashboard KPIs.
 * Per the CLAUDE.md data-freshness rule, a mutation must invalidate EVERY key that
 * displays the data it changed — otherwise a newly-submitted product keeps showing
 * the stale "pending"/count elsewhere until a manual refetch. Call this from any
 * product mutation's onSuccess.
 */
export function invalidateProductSurfaces(queryClient: QueryClient) {
  for (const key of [
    ['seller-products'],
    ['seller-products-moderation'],
    ['mod-queue-products'],
    ['admin-overview-snapshot'],
    // The onboarding checklist counts "has a product" — keep it fresh for new sellers.
    ['seller-onboarding-data'],
  ]) {
    queryClient.invalidateQueries({ queryKey: key });
  }
}
