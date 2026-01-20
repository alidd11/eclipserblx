import { useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useStaffTheme, StaffTheme } from '@/hooks/useStaffTheme';
import { Sparkles, Waves, Flame, TreePine, Circle, Eye, Palette } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ThemeOption {
  id: StaffTheme;
  name: string;
  description: string;
  icon: typeof Sparkles;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const themeOptions: ThemeOption[] = [
  {
    id: 'purple',
    name: 'Purple',
    description: 'Gaming neon',
    icon: Sparkles,
    colors: {
      primary: 'hsl(265 100% 65%)',
      secondary: 'hsl(200 100% 50%)',
      accent: 'hsl(320 100% 60%)',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    description: 'Cool & calm',
    icon: Waves,
    colors: {
      primary: 'hsl(185 100% 50%)',
      secondary: 'hsl(210 100% 55%)',
      accent: 'hsl(195 100% 45%)',
    },
  },
  {
    id: 'ember',
    name: 'Ember',
    description: 'Warm & energetic',
    icon: Flame,
    colors: {
      primary: 'hsl(25 100% 55%)',
      secondary: 'hsl(45 100% 50%)',
      accent: 'hsl(10 100% 55%)',
    },
  },
  {
    id: 'forest',
    name: 'Forest',
    description: 'Nature-inspired',
    icon: TreePine,
    colors: {
      primary: 'hsl(145 85% 45%)',
      secondary: 'hsl(160 80% 42%)',
      accent: 'hsl(120 75% 48%)',
    },
  },
  {
    id: 'mono',
    name: 'Mono',
    description: 'Clean & minimal',
    icon: Circle,
    colors: {
      primary: 'hsl(0 0% 85%)',
      secondary: 'hsl(0 0% 70%)',
      accent: 'hsl(0 0% 75%)',
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
            <Palette className="h-5 w-5 text-primary" />
            <CardTitle>Color Theme</CardTitle>
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
          Choose your color palette. Hover to preview, click to apply.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
                  'relative flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg border-2 transition-all duration-200',
                  'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/50',
                  isActive
                    ? 'border-primary bg-primary/10'
                    : 'border-border bg-card hover:bg-muted/50',
                  isPreviewing && 'ring-2 ring-primary/50 ring-offset-2 ring-offset-background'
                )}
              >
                {/* Color swatches */}
                <div className="flex gap-1">
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-lg"
                    style={{ 
                      backgroundColor: option.colors.primary,
                      boxShadow: `0 0 8px ${option.colors.primary}`
                    }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-lg"
                    style={{ 
                      backgroundColor: option.colors.secondary,
                      boxShadow: `0 0 8px ${option.colors.secondary}`
                    }}
                  />
                  <div
                    className="w-4 h-4 rounded-full border border-white/20 shadow-lg"
                    style={{ 
                      backgroundColor: option.colors.accent,
                      boxShadow: `0 0 8px ${option.colors.accent}`
                    }}
                  />
                </div>
                
                <Icon 
                  className={cn(
                    'h-5 w-5 sm:h-6 sm:w-6 transition-colors',
                    isActive ? 'text-primary' : 'text-muted-foreground'
                  )}
                  style={isActive ? { color: option.colors.primary } : undefined}
                />
                
                <div className="text-center">
                  <p className={cn(
                    'text-xs sm:text-sm font-medium',
                    isActive ? 'text-primary' : 'text-foreground'
                  )}>
                    {option.name}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground hidden sm:block">
                    {option.description}
                  </p>
                </div>
                
                {isActive && (
                  <motion.div
                    layoutId="activeThemeIndicator"
                    className="absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-background"
                    style={{ backgroundColor: option.colors.primary }}
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
