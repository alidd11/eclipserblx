import { AnimatePresence, motion } from 'framer-motion';
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
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 60, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-card"
          >
            <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xl">
                {t('cookies.description')}{' '}
                <Link to="/privacy" className="text-foreground hover:text-primary underline underline-offset-2 transition-colors">
                  {t('auth.privacyPolicy')}
                </Link>.
              </p>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={openSettings}
                  className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('cookies.customize')}
                </button>
                <button
                  onClick={rejectNonEssential}
                  className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('cookies.rejectNonEssential')}
                </button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="h-7 px-3 text-[11px] uppercase tracking-wider font-bold rounded-sm"
                >
                  {t('cookies.acceptAll')}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CookieSettingsDialog />
    </>
  );
}
