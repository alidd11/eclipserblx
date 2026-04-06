// Legacy subscription stub — kept to prevent import errors from remaining references.
// All values indicate "not subscribed / no discount".

export const BOT_CATEGORY_ID = "";
export const ECLIPSE_SAVERS_CATEGORY_ID = "";
export const ECLIPSE_PLUS_DISCOUNT = 0;
export const ECLIPSE_PLUS_BOT_DISCOUNT = 0;

export function useSubscription() {
  return {
    isSubscribed: false,
    subscriptionEnd: null,
    subscriptionId: null,
    freeProductsClaimed: 0,
    canClaimFree: false,
    claimedThisMonth: false,
    claimedProductId: null,
    isLoading: false,
    error: null,
    tier: null,
    billingPeriod: null,
    discountPercent: 0,
    freeProductsPerMonth: 0,
    checkSubscription: async () => {},
    subscribe: async () => {},
    openCustomerPortal: async () => {},
    claimFreeProduct: async (_productId: string) => {},
    getMemberPrice: (originalPrice: number, _categoryId?: string | null, _isResellable?: boolean): number => originalPrice,
    getDiscountPercent: (_categoryId?: string | null, _isResellable?: boolean): number => 0,
    isEligibleForDiscount: (_categoryId?: string | null, _isResellable?: boolean, _storeEclipseEnabled?: boolean): boolean => false,
    isEligibleForFreeClaim: (_categoryId?: string | null, _isResellable?: boolean, _eclipseFreeEligible?: boolean): boolean => false,
  };
}
