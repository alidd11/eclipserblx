

# Store Builder — Remove Subscription Gate

## Summary

The Store Builder is already built and functional. The only change needed is to ensure there's **no subscription gate** on the builder page. Since the current `SellerStoreBuilder.tsx` doesn't have any subscription check (it was only proposed, never implemented), the builder is already free for all sellers.

**No code changes needed.** The builder at `/seller/store-builder` is already accessible to all sellers without any paywall or subscription check.

## Clarification Noted

Eclipse+ is a **customer-facing** subscription (30% discounts, free monthly product claim). It is not relevant to seller features like the Store Builder, Custom Domains, or any seller dashboard tooling.

