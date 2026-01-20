import { useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaffTheme, StaffTheme } from '@/hooks/useStaffTheme';
import { Moon, Eclipse, Circle, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeOption {
  id: StaffTheme;
  name: string;
  description: string;
  icon: typeof Moon;
  colors: {
    background: string;
    card: string;
    accent: string;
  };
}

const themeOptions: ThemeOption[] = [
  {
    id: 'dark',
    name: 'Dark',
    description: 'Default dark theme',
    icon: Moon,
    colors: {
      background: 'hsl(220 20% 4%)',
      card: 'hsl(220 20% 7%)',
      accent: 'hsl(265 100% 65%)',
    },
  },
  {
    id: 'slate',
    name: 'Slate',
    description: 'Softer blue-grey tones',
    icon: Eclipse,
    colors: {
      background: 'hsl(220 25% 10%)',
      card: 'hsl(220 22% 14%)',
      accent: 'hsl(265 90% 60%)',
    },
  },
  {
    id: 'oled',
    name: 'OLED Black',
    description: 'True black for OLED',
    icon: Circle,
    colors: {
      background: 'hsl(0 0% 0%)',
      card: 'hsl(220 15% 5%)',
      accent: 'hsl(265 100% 65%)',
    },
  },
];

export function StaffThemeCard() {
  const { activeTheme, isPreviewActive, previewTheme, setTheme, startPreview, endPreview } = useStaffTheme();
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isLongPressing = useRef(false);

  const handleMouseEnter = useCallback((theme: StaffTheme) => {
    startPreview(theme);
  }, [startPreview]);

  const handleMouseLeave = useCallback(() => {
    endPreview();
  }, [endPreview]);

  const handleTouchStart = useCallback((theme: StaffTheme) => {
    isLongPressing.current = false;
    longPressTimer.current = setTimeout(() => {
      isLongPressing.current = true;
      startPreview(theme);
    }, 300);
  }, [startPreview]);

  const handleTouchEnd = useCallback((theme: StaffTheme) => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    
    if (isLongPressing.current) {
      // Was a long press - end preview
      endPreview();
      isLongPressing.current = false;
    } else {
      // Was a tap - apply theme
      setTheme(theme);
    }
  }, [endPreview, setTheme]);

  const handleClick = useCallback((theme: StaffTheme) => {
    // Desktop click - apply theme
    setTheme(theme);
  }, [setTheme]);

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            <CardTitle>Dashboard Theme</CardTitle>
          </div>
          <AnimatePresence>
            {isPreviewActive && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
              >
                <Badge variant="secondary" className="gap-1">
                  <Eye className="h-3 w-3" />
                  Previewing
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <CardDescription>
          Choose your preferred admin dashboard appearance. Hover to preview.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map((option) => {
            const Icon = option.icon;
            const isActive = activeTheme === option.id;
            const isPreviewing = previewTheme === option.id;
            
            return (
              <button
                key={option.id}
                onClick={() => handleClick(option.id)}
                onMouseEnter={() => handleMouseEnter(option.id)}
                onMouseLeave={handleMouseLeave}
                onTouchStart={() => handleTouchStart(option.id)}
                onTouchEnd={() => handleTouchEnd(option.id)}
                onTouchCancel={() => {
                  if (longPressTimer.current) {
                    clearTimeout(longPressTimer.current);
                    longPressTimer.current = null;
                  }
                  endPreview();
                  isLongPressing.current = false;
                }}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all duration-200',
                  'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-muted/50',
                  isPreviewing && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                )}
              >
                {/* Color preview */}
                <div className="flex gap-1 mb-1">
                  <div
                    className="w-4 h-4 rounded-full border border-white/10"
                    style={{ backgroundColor: option.colors.background }}
                    title="Background"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/10"
                    style={{ backgroundColor: option.colors.card }}
                    title="Card"
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/10"
                    style={{ backgroundColor: option.colors.accent }}
                    title="Accent"
                  />
                </div>
                
                <Icon className={cn(
                  'h-6 w-6 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground'
                )} />
                
                <div className="text-center">
                  <p className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-primary' : 'text-foreground'
                  )}>
                    {option.name}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {option.description}
                  </p>
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="activeThemeIndicator"
                    className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-background"
                    initial={false}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
        
        <p className="text-xs text-muted-foreground mt-4 text-center">
          Long-press on mobile to preview • Click to apply
        </p>
      </CardContent>
    </Card>
  );
}
