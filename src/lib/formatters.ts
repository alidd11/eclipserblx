/**
 * Format a number as a GBP string: £1,234.56
 * Use for internal/admin/seller financial displays where
 * currency conversion is NOT appropriate (data is always GBP).
 *
 * For customer-facing prices that should respect user currency preference,
 * use `useCurrency().formatPrice(amount)` instead.
 */
export function formatGBP(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}
