

## Plan: Move Duty Status & Remove Activity Feed

### Changes to `src/pages/admin/Dashboard.tsx`

**1. Move Duty Status card below the Welcome (Hero) card**
- Cut the entire Duty Status card block (lines 394-496) from its current position
- Paste it immediately after the Hero Banner card (after line 332), before Quick Actions

**2. Remove the Activity Feed**
- Remove the `ActivityFeed` import (line 4)
- In the "Activity Feed + My Duty Logs" grid section (lines 498-547), remove the `<ActivityFeed />` component and unwrap "My Recent Duty Logs" so it stands alone (no longer in a 2-column grid)

### Result
The dashboard order will be:
1. System Alerts
2. Hero Banner (welcome card)
3. Duty Status (moved here)
4. Quick Actions
5. Your Tools (role-based)
6. My Recent Duty Logs (full width, no grid wrapper)
7. All Staff Duty Logs (admin only)

