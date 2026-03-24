

## Improve Admin Discord Settings Page

The current `DiscordSettings.tsx` is a 1080-line monolith using collapsible accordion sections. We'll refactor it to match the tabbed pattern already used in the admin Settings page -- cleaner navigation, better mobile UX, and modular code.

### Current State
- 4 collapsible sections: General, Notifications, Announcements, Configuration
- All in one 1080-line file with inline test functions, webhook handlers, and UI
- Mobile users must scroll and expand/collapse sections manually

### Plan

**1. Extract shared logic into a parent hook/context**

Create `src/hooks/useDiscordSettings.ts` containing:
- The `DiscordSettings` interface and defaults
- The settings query, save mutation, webhook test handler, copy handler
- All test functions (testOrderWebhook, testReviewWebhook, etc.)
- Shared state (testingWebhook, webhookTestResults, formData)

**2. Extract each section into a tab component**

Create 4 files in `src/components/admin/discord-settings/`:
- `GeneralTab.tsx` -- Invite URL, widget server ID
- `NotificationsTab.tsx` -- Orders, reviews, promotions webhooks
- `AnnouncementsTab.tsx` -- Community, product drops, early drops, affiliate, Eclipse+, marketplace
- `ConfigurationTab.tsx` -- Role integration, ads, QOTD, polls, modmail, bot commands, sync all

Each receives shared state/handlers from the hook via props.

**3. Refactor `DiscordSettings.tsx` to tabbed layout**

- Replace collapsible sections with `Tabs` component (same pattern as admin Settings)
- URL-persisted active tab via `useSearchParams` (`?tab=general`)
- Desktop: horizontal `TabsList` with icons
- Mobile: `Select` dropdown fallback
- Keep the header with Save button and Quick Announce dropdown
- Move `WebhookInput`, `TestResultBadge`, `SectionHeader` helper components into a shared file `src/components/admin/discord-settings/WebhookInput.tsx`

**4. Tab definitions**

| Tab | Icon | Content |
|-----|------|---------|
| General | Settings | Invite link, widget |
| Notifications | Bell | Order/review/promo webhooks |
| Announcements | Megaphone | Community, drops, programmes |
| Configuration | Zap | Roles, ads, QOTD, polls, modmail, bot commands |

### Result
- ~1080-line monolith split into 6 focused files
- Consistent UX with admin Settings page
- URL-persisted tabs for deep-linking
- Mobile-friendly Select dropdown

