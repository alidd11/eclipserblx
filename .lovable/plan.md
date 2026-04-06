

# Remove Redundant Back Buttons

## Rationale
Native apps and enterprise websites rely on built-in browser/OS navigation (swipe-back on iOS, browser back button on desktop, system back on Android). A custom "Back" button in the header is redundant and undermines the native feel.

## What to remove

### 1. `BackButton` component from Header
- Remove `<BackButton>` from `src/components/layout/Header.tsx` (line 180)
- Remove the import

### 2. `BackButton` component file
- Delete `src/components/ui/BackButton.tsx` — it's only imported in the Header

### 3. Auth layout "Back to store" link
- Remove the `ArrowLeft` back link from `src/components/auth/AuthLayout.tsx` (lines 27-34) — users can use browser back or tap the logo

### 4. SellerDocumentPage back button
- Remove the `ArrowLeft` back button from `src/components/seller/documents/SellerDocumentPage.tsx` — users navigate via sidebar or browser back

## What stays (contextual, not browser-back)
- **Seller messages** mobile back arrow (returns from conversation to list — in-page state, not navigation)
- **Chat history** selection clear buttons (in-page state toggle)
- **Admin detail pages** back to list (explicit parent route navigation in dashboards is standard)
- **Compare page** back to products (explicit parent navigation)
- **SellerTermsOfService / SellerGuide** back to documents list — these live inside the seller dashboard, but we should remove these too since the sidebar already provides navigation
- **StoreProductGrid** "View All Products" button — this is a filter reset, not a back button

### 5. SellerTermsOfService & SellerGuide back buttons
- Remove the ArrowLeft back buttons that link to `/seller/documents` — the seller sidebar already handles this navigation

## Summary
Remove 5 back-button instances across Header, AuthLayout, SellerDocumentPage, SellerTermsOfService, and SellerGuide. Delete the `BackButton.tsx` component file entirely.

