

# Native Back Button Implementation Plan

## Overview
Create a reusable, native-app-style back button component that customers can use to navigate to the previous page. The button will use the browser's history API with haptic feedback for a premium, mobile-native feel.

## Design Approach
The back button will:
- Use a clean, minimal design with a left-facing arrow icon
- Include haptic feedback when tapped (like other buttons in the app)
- Support optional text label (e.g., "Back" or custom text)
- Work across all devices with touch-optimized sizing
- Only appear when there's navigation history available

## Component: `BackButton`

### Location
`src/components/ui/BackButton.tsx`

### Features
1. **Browser History Navigation** - Uses `window.history.back()` or React Router's `navigate(-1)`
2. **Haptic Feedback** - Triggers light haptic tap on press
3. **Smart Visibility** - Optionally hide when there's no history to go back to
4. **Customizable Label** - Show/hide text label, or use custom text
5. **Flexible Styling** - Multiple variants (ghost, outline, subtle)
6. **Touch-Optimized** - 44px minimum touch target for mobile accessibility

### Props
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showLabel` | `boolean` | `false` | Show "Back" text next to icon |
| `label` | `string` | `"Back"` | Custom label text |
| `variant` | `"ghost" \| "outline" \| "subtle"` | `"ghost"` | Button style variant |
| `fallbackPath` | `string` | `undefined` | Where to navigate if no history exists |
| `className` | `string` | `undefined` | Additional CSS classes |

### Example Usage
```tsx
import { BackButton } from '@/components/ui/BackButton';

// Simple back button (icon only)
<BackButton />

// With label
<BackButton showLabel />

// Custom label
<BackButton label="Go Back" showLabel />

// With fallback path
<BackButton fallbackPath="/products" />

// Outline style
<BackButton variant="outline" showLabel />
```

## Visual Design

```text
┌─────────────────────────────────────┐
│  ← Back                             │
│  (Ghost variant with label)         │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  ←                                  │
│  (Icon-only, most compact)          │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│  [← Back]                           │
│  (Outline variant, more visible)    │
└─────────────────────────────────────┘
```

## Technical Implementation

### Code Structure
```tsx
// BackButton.tsx
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { hapticTap } from '@/lib/haptics';
import { cn } from '@/lib/utils';

interface BackButtonProps {
  showLabel?: boolean;
  label?: string;
  variant?: 'ghost' | 'outline' | 'subtle';
  fallbackPath?: string;
  className?: string;
}

export function BackButton({
  showLabel = false,
  label = 'Back',
  variant = 'ghost',
  fallbackPath,
  className,
}: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    hapticTap();
    
    // Check if there's history to go back to
    if (window.history.length > 1) {
      navigate(-1);
    } else if (fallbackPath) {
      navigate(fallbackPath);
    } else {
      navigate('/');
    }
  };

  return (
    <Button
      variant={variant === 'subtle' ? 'ghost' : variant}
      size={showLabel ? 'sm' : 'icon'}
      onClick={handleBack}
      className={cn(
        'text-muted-foreground hover:text-foreground',
        variant === 'subtle' && 'hover:bg-transparent',
        className
      )}
    >
      <ArrowLeft className="h-4 w-4" />
      {showLabel && <span className="ml-1">{label}</span>}
    </Button>
  );
}
```

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/ui/BackButton.tsx` | Create | New reusable back button component |

## Integration Examples (Optional Future Use)
Once created, the component can be easily added to pages like:
- Product detail page headers
- Region select page
- Categories page
- Any page that benefits from quick navigation back

