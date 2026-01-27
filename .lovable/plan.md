
# Fix: Exclude Eclipse+ Pricing from Non-Eligible Product Webhooks

## The Problem

Discord webhooks are incorrectly showing Eclipse+ pricing for products that should NOT be eligible (resellable products and Eclipse Savers category items).

## Root Causes Found

### 1. Scheduled Release Function - Wrong Property Names
The `notify-scheduled-release` edge function uses **camelCase** property names, but the webhook function expects **snake_case**:

| What's sent | What's expected |
|-------------|-----------------|
| `productId` | `product_id` |
| `productName` | `product_name` |
| `isResellable` | `is_resellable` |
| `categoryName` | `category_name` |
| `robuxEnabled` | `robux_enabled` |

Because `is_resellable` never arrives correctly, it defaults to `undefined`, and the webhook treats the product as eligible for Eclipse+ discounts.

### 2. Test Webhook - Missing Flag
The "Test Webhook" function in Discord Settings doesn't include the `is_resellable` property at all, so test messages always show Eclipse+ pricing.

## Technical Changes

### File 1: `supabase/functions/notify-scheduled-release/index.ts`
- Fix all property names in the webhook call from camelCase to snake_case
- Change: `productId` → `product_id`, `isResellable` → `is_resellable`, etc.

### File 2: `src/pages/admin/DiscordSettings.tsx`  
- Add `is_resellable: false` to the test webhook payload
- This ensures test messages correctly show Eclipse+ pricing for eligible test scenarios

## Summary

| Location | Issue | Fix |
|----------|-------|-----|
| Scheduled releases | Wrong property names (camelCase vs snake_case) | Convert to snake_case |
| Discord Settings test button | Missing `is_resellable` flag | Add the property |

After these fixes, resellable products and Eclipse Savers items will correctly exclude the Eclipse+ pricing line from their Discord announcements.
