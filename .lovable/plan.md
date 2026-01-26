
# Improved Collapsible Sidebar System

## Overview
Enhance the customer sidebar to include a proper collapse/expand toggle button, making it easier for users to maximize their main content viewing area while still having quick access to navigation.

## Current Issues
- Customer sidebar can collapse but lacks a visible toggle button in the sidebar itself
- When collapsed, users must know to look for tooltips on icons
- No visual indicator showing the sidebar can be expanded
- Inconsistent with the Admin and Seller sidebar patterns

## Proposed Solution

### 1. Add Collapse Toggle Button to CustomerSidebar Footer
Add a collapse/expand button at the bottom of the sidebar (matching Admin/Seller pattern):
- When expanded: Shows "Collapse" text with left chevron icon
- When collapsed: Shows only right chevron icon with tooltip
- Persists state to localStorage

### 2. Enhanced Visual Feedback
- Add a subtle "rail" or hover zone on the collapsed sidebar edge
- Smooth width transition animation (already exists: `transition-all duration-300`)
- Tooltip shows on hover for all items when collapsed

### 3. Header Integration
- Add a sidebar toggle button to the Header component for desktop
- This provides an always-visible way to toggle the sidebar
- Uses the PanelLeft icon (standard pattern)

### 4. Keyboard Shortcut
- Add `Ctrl/Cmd + B` shortcut to toggle sidebar (industry standard)
- Display hint in tooltip: "Collapse (⌘B)"

## Technical Implementation

### File Changes

**1. `src/components/layout/CustomerSidebar.tsx`**
- Add footer section with collapse toggle button (lines ~914-920)
- Add ChevronLeft/ChevronRight icons to imports
- Button styled consistently with Admin sidebar pattern

**2. `src/components/layout/Header.tsx`**
- Add optional `onSidebarToggle` prop for desktop sidebar control
- Add PanelLeft icon button (visible on desktop when sidebar exists)
- Position in header actions area

**3. `src/components/layout/MainLayout.tsx`**
- Pass sidebar toggle handler to Header component
- Add keyboard shortcut listener for Ctrl/Cmd + B

### Visual Behavior
```text
┌────────────────────────────────────────────────────┐
│ [☰] Eclipse        [🔍] [🔔] [🛒] [👤]             │  ← Header
├────────────────────────────────────────────────────┤
│┌──────────┐┌──────────────────────────────────────┐│
││ [≡] Logo ││                                      ││
││ ──────── ││                                      ││
││ 🏠 Home  ││     Main Content Area                ││
││ ⭐ Feat  ││     (Full width when collapsed)      ││
││ 📦 Prod  ││                                      ││
││ ...      ││                                      ││
││          ││                                      ││
││ ──────── ││                                      ││
││ [◀ Hide] ││                                      ││  ← New toggle
│└──────────┘└──────────────────────────────────────┘│
└────────────────────────────────────────────────────┘

Collapsed state:
┌────────────────────────────────────────────────────┐
│ [☰] Eclipse        [🔍] [🔔] [🛒] [👤]             │
├────────────────────────────────────────────────────┤
│┌──┐┌──────────────────────────────────────────────┐│
││🔲││                                              ││
││🏠││                                              ││
││⭐││      Main Content Area                       ││
││📦││      (Wider - more visible)                  ││
││..││                                              ││
││  ││                                              ││
││▶ ││                                              ││  ← Expand icon
│└──┘└──────────────────────────────────────────────┘│
└────────────────────────────────────────────────────┘
```

### Code Snippets

**CustomerSidebar.tsx - Footer Section:**
```tsx
{/* Footer - Collapse Toggle */}
<div className="p-2 border-t border-border">
  <Tooltip>
    <TooltipTrigger asChild>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "w-full text-muted-foreground hover:text-foreground hover:bg-muted",
          isCollapsed ? "justify-center px-2" : "justify-start"
        )}
        onClick={() => {
          hapticTap();
          onToggle();
        }}
      >
        {isCollapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <>
            <ChevronLeft className="h-4 w-4 mr-3" />
            Collapse
          </>
        )}
      </Button>
    </TooltipTrigger>
    {isCollapsed && <TooltipContent side="right">Expand sidebar</TooltipContent>}
  </Tooltip>
</div>
```

**Header.tsx - Desktop Toggle Button:**
```tsx
{/* Desktop sidebar toggle - only show when onSidebarToggle provided */}
{onSidebarToggle && (
  <Button
    variant="ghost"
    size="icon"
    className="hidden md:flex h-8 w-8 text-muted-foreground hover:text-foreground"
    onClick={onSidebarToggle}
  >
    <PanelLeft className="h-4 w-4" />
  </Button>
)}
```

## Benefits
- Users have a clear, always-visible way to collapse/expand the sidebar
- More screen real estate for main content when collapsed
- Consistent behavior across Customer, Admin, and Seller layouts
- Keyboard shortcut for power users
- Persisted preference across sessions

## Mobile Behavior
- No changes to mobile behavior (drawer pattern remains)
- Edge swipe and hamburger menu continue to work as before
