

# Updated Sidebar Plan — Custom Domains Placement

The Custom Domains page already exists at `/seller/settings/domain` but is **missing from the sidebar entirely**. In the overhaul, it should be added under **Settings**:

```text
SETTINGS
  Store Profile
  Appearance
  Custom Domain       ← new entry
  Payments
  Team
```

This is a natural fit — domain configuration is a store-level setting. It sits after Appearance (both are about store identity/branding) and before Payments.

### Implementation Detail
Add one entry to the Settings group in `navGroups`:

```ts
{ title: 'Custom Domain', icon: Globe, href: '/seller/settings/domain' }
```

Import `Globe` from `lucide-react`.

This will be included as part of the full sidebar overhaul implementation.

