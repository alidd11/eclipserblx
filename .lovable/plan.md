

## Enterprise Sidebar Overhaul

After auditing the 557-line `CustomerSidebar.tsx`, here are the issues and fixes:

---

### Problems Found

1. **Sign-out button is missing** — `SidebarFooter` is imported but never rendered. Users have no way to sign out from the sidebar.
2. **Gaming aesthetics** — Gradient CTA button with glow shadow, premium ring with gradient border, always-on green "online" dot — these feel like a gaming social app, not an enterprise marketplace.
3. **Profile section is heavy** — 11px avatar with gradient fallback, online indicator, wallet balance with "Add" link, premium ring — too much visual noise for a sidebar header.
4. **Too many nav items** — 20+ items across 5 groups creates decision fatigue. Enterprise sidebars are focused.
5. **Collapsed state is fragile** — Collapse preference is not persisted; uses tooltip menus that are awkward on touch devices.

---

### Plan

#### 1. Restore Sign-Out
- Render `<SidebarFooter>` at the bottom of the sidebar (it's already imported but unused).

#### 2. Strip Gaming Visuals
- Replace the gradient CTA ("Seller Dashboard") with a subtle `bg-primary/10 text-primary` outlined button — no glow, no gradient.
- Remove the green online dot from the avatar.
- Remove the premium gradient ring — replace with a small "PRO" badge text if needed.
- Avatar fallback: plain `bg-muted` with initial letter, no gradient.

#### 3. Tighten Profile Section
- Shrink avatar from `h-11 w-11` to `h-9 w-9`.
- Remove the wallet balance row entirely from the sidebar — balance belongs on the Account page, not navigation chrome.
- Keep: username, @handle, and the Seller Dashboard link (as a text link, not a button).

#### 4. Streamline Navigation Groups
- Merge "Quick Access" (Home, Admin) into the top level without a group header — they're already rendered headerless but the code treats them specially.
- Merge "Explore" and "Resources" into one "Browse" group — having separate groups for "All Products" and then individual categories is redundant when the GlobalCategoryBar already handles discovery.
- Keep "My Account" and "Support" as-is — they're well-scoped.
- Result: 3 groups instead of 5, fewer total items.

#### 5. Mobile Drawer Polish
- Add a subtle close affordance: the user's name row should be tappable to close, or add a small `X` icon in the header area.
- Ensure the drawer has proper `overscroll-contain` (already present) and respects safe areas.

#### 6. Collapsed State
- Persist collapsed preference to localStorage (currently group open/close is persisted, but sidebar collapse itself is not — the parent controls it with `useState(false)`).

---

### Files Changed
- **`src/components/layout/CustomerSidebar.tsx`** — Strip gaming visuals, restore SidebarFooter, tighten profile, merge nav groups, remove wallet row
- **`src/components/layout/MainLayout.tsx`** — Persist sidebar collapse state to localStorage

### Technical Details
- Remove gradient classes: `bg-gradient-to-r from-primary to-purple-500`, `shadow-[0_0_16px_...]`
- Replace with: `bg-primary/10 text-primary border border-primary/20 rounded-lg`
- Remove online dot: delete the `<span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ...">` element
- Remove wallet row (lines 497-505): the `<Wallet>` icon, balance display, and "Add" link
- Render `<SidebarFooter isCollapsed={isCollapsed} onSignOut={() => setShowSignOutDialog(true)} />` before the closing `</aside>`
- In MainLayout: `const [collapsed, setCollapsed] = useState(() => safeStorage.getItem('sidebar-collapsed') === 'true')` + persist on toggle

