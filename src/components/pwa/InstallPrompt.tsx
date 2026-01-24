import { useState, useEffect, forwardRef } from 'react';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

// Detect iOS
function isIOS(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
}

// Detect standalone PWA mode
function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || 
         (navigator as any).standalone === true;
}

export const InstallPrompt = forwardRef<HTMLDivElement>(function InstallPrompt(_, ref) {
  const location = useLocation();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isiOSDevice, setIsiOSDevice] = useState(false);

  // Don't show on admin routes (admin has its own install prompt)
  const isAdminRoute = location.pathname.startsWith('/admin');

  useEffect(() => {
    // Don't show on admin routes
    if (isAdminRoute) return;

    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    setIsiOSDevice(isIOS());

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem('pwa-prompt-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // For iOS, show the prompt after a delay since there's no beforeinstallprompt event
    if (isIOS()) {
      setTimeout(() => setShowPrompt(true), 2000);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show prompt after a short delay for better UX
      setTimeout(() => setShowPrompt(true), 2000);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isAdminRoute]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt || isAdminRoute) return null;

  return (
    <AnimatePresence>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-card border border-border rounded-xl p-4 shadow-2xl backdrop-blur-sm">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Smartphone className="h-6 w-6 text-primary" />
            </div>

            <div className="flex-1 min-w-0">
              <h3 className="font-display font-semibold text-foreground">
                Install Eclipse
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add to your home screen for quick access and a better experience.
              </p>

              {isiOSDevice ? (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Share className="h-4 w-4" />
                    Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>
                  </p>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="outline"
                  >
                    Got it
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="gradient-button border-0"
                    disabled={!deferredPrompt}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Install App
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                  >
                    Not now
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
});