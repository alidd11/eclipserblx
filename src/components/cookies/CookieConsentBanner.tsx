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
            className="fixed z-[200] left-4 right-4 max-w-3xl mx-auto rounded-xl border border-border/60 bg-card/95 backdrop-blur-md shadow-2xl shadow-black/40 contain-layout"
            style={{ bottom: 'calc(4.5rem + env(safe-area-inset-bottom, 0px))' }}
          >
            <div className="px-4 py-3 sm:px-5 sm:py-4 flex flex-col gap-3">
              <p className="text-[12px] text-foreground/70 leading-relaxed">
                {t('cookies.description')}{' '}
                <Link to="/privacy" className="text-foreground hover:text-primary underline underline-offset-2 transition-colors">
                  {t('auth.privacyPolicy')}
                </Link>
              </p>

              <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
                <button
                  onClick={rejectNonEssential}
                  className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-foreground/60 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {t('cookies.rejectNonEssential')}
                </button>
                <button
                  onClick={openSettings}
                  className="text-[10px] sm:text-[11px] uppercase tracking-wider font-semibold text-foreground/60 hover:text-foreground transition-colors whitespace-nowrap"
                >
                  {t('cookies.customize')}
                </button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  className="h-7 px-3 sm:px-4 text-[10px] sm:text-[11px] uppercase tracking-wider font-bold rounded-md"
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