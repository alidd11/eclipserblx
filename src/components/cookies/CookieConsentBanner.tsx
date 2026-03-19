import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { useCookieConsent } from '@/hooks/useCookieConsent';
import { CookieSettingsDialog } from './CookieSettingsDialog';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStoreDomain } from '@/hooks/useStoreDomain';

export function CookieConsentBanner() {
  const { showBanner, showSettings, acceptAll, rejectNonEssential, openSettings } = useCookieConsent();
  const { t } = useTranslation();
  const { isCustomStoreDomain } = useStoreDomain();

  if (isCustomStoreDomain) return null;

  return (
    <>
      <AnimatePresence>
        {showBanner && !showSettings && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed bottom-0 left-0 right-0 z-[200] border-t border-border bg-card/95 backdrop-blur-sm"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            <div className="px-4 py-3 space-y-2.5 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
              <p className="text-[11px] text-foreground/70 leading-relaxed sm:flex-1 sm:min-w-0">
                {t('cookies.description')}{' '}
                <Link to="/privacy" className="text-foreground hover:text-primary underline underline-offset-2 transition-colors">
                  {t('auth.privacyPolicy')}
                </Link>
              </p>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={rejectNonEssential}
                  className="text-[10px] uppercase tracking-wider font-bold text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {t('cookies.rejectNonEssential')}
                </button>
                <button
                  onClick={openSettings}
                  className="text-[10px] uppercase tracking-wider font-bold text-foreground/70 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {t('cookies.customize')}
                </button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="h-6 px-3 text-[10px] uppercase tracking-wider font-bold rounded-sm ml-auto"
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
});
