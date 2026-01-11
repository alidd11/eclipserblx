import { useState, useEffect } from 'react';
import { X, Download, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile'; import { safeStorage } from '@/lib/safeStorage';

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

export function AdminInstallPrompt() {
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isiOSDevice, setIsiOSDevice] = useState(false);

  useEffect(() => {
    // Only show on mobile
    if (!isMobile) return;

    // Check if already installed
    if (isStandalone()) {
      setIsInstalled(true);
      return;
    }

    setIsiOSDevice(isIOS());

    // Check if dismissed recently (within 3 days for admin)
    const dismissedAt = safeStorage.getItem('admin-pwa-prompt-dismissed');
    if (dismissedAt) {
      const daysSinceDismissed = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 3) {
        return;
      }
    }

    // For iOS, show the prompt after a delay since there's no beforeinstallprompt event
    if (isIOS()) {
      setTimeout(() => setShowPrompt(true), 1500);
      return;
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setTimeout(() => setShowPrompt(true), 1500);
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
  }, [isMobile]);

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
    safeStorage.setItem('admin-pwa-prompt-dismissed', Date.now().toString());
  };

  if (isInstalled || !showPrompt || !isMobile) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="mx-4 mb-4"
      >
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 relative">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>

            <div className="flex-1 min-w-0 pr-4">
              <h3 className="font-display font-semibold text-foreground text-sm">
                Install Admin App
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Get instant notifications, offline access, and a faster experience.
              </p>

              {isiOSDevice ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Share className="h-3 w-3" />
                    Tap <strong>Share</strong> then <strong>"Add to Home Screen"</strong>
                  </p>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="outline"
                    className="text-xs h-7"
                  >
                    Got it
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2 mt-3">
                  <Button
                    onClick={handleInstall}
                    size="sm"
                    className="gradient-button border-0 text-xs h-7"
                    disabled={!deferredPrompt}
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Install
                  </Button>
                  <Button
                    onClick={handleDismiss}
                    size="sm"
                    variant="ghost"
                    className="text-xs h-7"
                  >
                    Later
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
