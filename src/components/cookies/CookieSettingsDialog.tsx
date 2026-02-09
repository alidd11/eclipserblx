import { useState, useEffect } from 'react';
import { Cookie, BarChart3, Megaphone, Lock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { useTranslation } from 'react-i18next';

interface CookieCategory {
  id: 'essential' | 'analytics' | 'marketing';
  titleKey: string;
  descKey: string;
  icon: React.ReactNode;
  required?: boolean;
}

const cookieCategories: CookieCategory[] = [
  {
    id: 'essential',
    titleKey: 'cookies.essential',
    descKey: 'cookies.essentialDesc',
    icon: <Lock className="h-5 w-5" />,
    required: true,
  },
  {
    id: 'analytics',
    titleKey: 'cookies.analytics',
    descKey: 'cookies.analyticsDesc',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    id: 'marketing',
    titleKey: 'cookies.marketing',
    descKey: 'cookies.marketingDesc',
    icon: <Megaphone className="h-5 w-5" />,
  },
];

export function CookieSettingsDialog() {
  const { showSettings, closeSettings, preferences, updatePreferences } = useCookieConsent();
  const { t } = useTranslation();
  
  const [localPrefs, setLocalPrefs] = useState({
    analytics: preferences.analytics,
    marketing: preferences.marketing,
  });

  useEffect(() => {
    if (showSettings) {
      setLocalPrefs({
        analytics: preferences.analytics,
        marketing: preferences.marketing,
      });
    }
  }, [showSettings, preferences]);

  const handleToggle = (id: 'analytics' | 'marketing') => {
    setLocalPrefs(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSave = () => {
    updatePreferences(localPrefs);
  };

  const handleAcceptAll = () => {
    updatePreferences({
      analytics: true,
      marketing: true,
    });
  };

  return (
    <Dialog open={showSettings} onOpenChange={(open) => !open && closeSettings()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Cookie className="h-5 w-5 text-primary" />
            </div>
            <div>
              <DialogTitle>{t('cookies.preferences')}</DialogTitle>
              <DialogDescription>
                {t('cookies.manageSettings')}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {cookieCategories.map((category, index) => (
            <div key={category.id}>
              {index > 0 && <Separator className="mb-4" />}
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  {category.icon}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <Label 
                      htmlFor={category.id} 
                      className="text-sm font-medium text-foreground"
                    >
                      {t(category.titleKey)}
                    </Label>
                    <Switch
                      id={category.id}
                      checked={category.required ? true : localPrefs[category.id as 'analytics' | 'marketing']}
                      onCheckedChange={() => !category.required && handleToggle(category.id as 'analytics' | 'marketing')}
                      disabled={category.required}
                      className={category.required ? 'opacity-50' : ''}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {t(category.descKey)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={closeSettings}>
            {t('common.cancel')}
          </Button>
          <Button variant="outline" onClick={handleAcceptAll}>
            {t('cookies.acceptAll')}
          </Button>
          <Button onClick={handleSave}>
            {t('cookies.savePreferences')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
