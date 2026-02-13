import { motion, AnimatePresence } from 'framer-motion';
import { Cookie, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { CookieSettingsDialog } from './CookieSettingsDialog';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function CookieConsentBanner() {
  const { showBanner, showSettings, acceptAll, rejectNonEssential, openSettings } = useCookieConsent();
  const { t } = useTranslation();

  return (
    <>
      <AnimatePresence>
        {showBanner && !showSettings && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <div className="mx-auto max-w-4xl">
              <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-lg">
                {/* Top accent line */}
                <div className="absolute inset-x-0 top-0 h-0.5 bg-border" />
                
                <div className="p-4 md:p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-6">
                    {/* Icon */}
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted">
                      <Cookie className="h-6 w-6 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {t('cookies.title')}
                        </h3>
                        <Shield className="h-4 w-4 text-muted-foreground" />
                      </div>
                      
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {t('cookies.description')}{' '}
                        <Link 
                          to="/privacy" 
                          className="text-primary hover:underline underline-offset-2"
                        >
                          {t('auth.privacyPolicy')}
                        </Link>.
                      </p>

                      {/* Buttons */}
                      <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:flex-wrap">
                        <Button
                          onClick={acceptAll}
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium"
                        >
                          {t('cookies.acceptAll')}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={rejectNonEssential}
                          className="border-border hover:bg-muted"
                        >
                          {t('cookies.rejectNonEssential')}
                        </Button>
                        <Button
                          variant="ghost"
                          onClick={openSettings}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {t('cookies.customize')}
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CookieSettingsDialog />
    </>
  );
}
