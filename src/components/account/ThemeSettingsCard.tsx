import { useTheme } from 'next-themes';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';

const themes = [
  { value: 'light', label: 'Light', icon: Sun, description: 'Bright and clean' },
  { value: 'dark', label: 'Dark', icon: Moon, description: 'Easy on the eyes' },
  { value: 'system', label: 'System', icon: Monitor, description: 'Match device' },
] as const;

export function ThemeSettingsCard() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Appearance</CardTitle>
          <CardDescription>Choose your preferred theme</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-24 animate-pulse bg-muted rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Appearance</CardTitle>
        <CardDescription>
          Choose your preferred theme
          {theme === 'system' && (
            <span className="ml-1 text-xs">
              (Currently: {resolvedTheme === 'dark' ? 'Dark' : 'Light'})
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <RadioGroup
          value={theme}
          onValueChange={setTheme}
          className="grid grid-cols-3 gap-3"
        >
          {themes.map(({ value, label, icon: Icon, description }) => (
            <div key={value}>
              <RadioGroupItem
                value={value}
                id={`theme-${value}`}
                className="peer sr-only"
              />
              <Label
                htmlFor={`theme-${value}`}
                className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-border bg-card p-4 cursor-pointer transition-all hover:bg-muted/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
              >
                <Icon className="h-5 w-5 text-muted-foreground peer-data-[state=checked]:text-primary" />
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {description}
                </span>
              </Label>
            </div>
          ))}
        </RadioGroup>
      </CardContent>
    </Card>
  );
}
