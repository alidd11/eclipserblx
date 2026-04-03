
# Seller Sidebar Reorganisation

## Current Problems
1. **Too many groups (6)** — Catalog, Marketing, Inbox, Finance, Integrations, Settings creates choice overload
2. **Scattered items** — "Customer Insights" is under Inbox (should be Analytics), "Store Builder" is under Catalog (it's a top-level action)
3. **Redundancy** — "Notifications" appears in both Inbox and Settings groups
4. **Weak top-level** — Dashboard, Orders, Analytics, Goals are ungrouped but Goals feels buried
5. **Finance group only has 2 items** — not worth a collapsible group

## New Structure

### Top-Level (always visible, no group header)
- Dashboard
- Orders
- Analytics
- Store Builder ← promoted from Catalog (it's the main builder tool)

### Products & Content
- Products
- Categories
- Store Sections
- Custom Sections
- Pages
- Import

### Marketing & Sales
- Ad Manager
- Discount Codes
- Flash Sales
- Campaigns
- Bundle Deals
- Announcements

### Customers & Inbox
- Messages
- Reviews
- Disputes
- Customer Insights ← moved from Inbox
- Notifications ← single location (removed from Settings)

### Finance
- Finance
- Documents
- Goals ← moved from top-level (fits better here)

### Integrations
- Discord
- Discord Bots
- Roblox

### Settings
- Store Profile
- Appearance
- Custom Domain
- Payments
- Team

## What Changes
- Store Builder promoted to top-level
- Goals moved to Finance
- Customer Insights moved to Customers & Inbox
- Duplicate Notifications removed from Settings
- "Catalog" renamed to "Products & Content"
- "Inbox" renamed to "Customers & Inbox"

## File Modified
- `src/components/seller/SellerSidebar.tsx` — restructure nav groups and top-level items
