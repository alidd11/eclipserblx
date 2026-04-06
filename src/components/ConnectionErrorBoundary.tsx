import { Component, ReactNode } from 'react';
import { RefreshCw, WifiOff, AlertTriangle, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';
import { isChunkError, attemptAutoRecovery, forceUserRecovery } from '@/lib/chunkRecovery';

/** Detect in-app browsers (Twitter, Instagram, Facebook, LinkedIn, etc.) */
function isInAppBrowser(): boolean {
  const ua = navigator.userAgent || '';
  return /FBAN|FBAV|Instagram|Twitter|LinkedInApp|Line\/|Snapchat|TikTok/i.test(ua);
}

/** Open the current URL in the device's default browser */
function openInExternalBrowser() {
  const url = window.location.href;
  // iOS: window.open with _blank often opens in Safari from in-app browsers
  window.open(url, '_blank');
}

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;
}

export class ConnectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isNetworkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const msg = (error.message || '').toLowerCase();
    const isNetworkError =
      msg.includes('fetch') ||
      msg.includes('network') ||
      msg.includes('failed to fetch') ||
      msg.includes('networkerror') ||
      msg.includes('cors') ||
      msg.includes('err_') ||
      (error.name === 'TypeError' && msg.includes('failed'));

    return { hasError: true, error, isNetworkError };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ConnectionErrorBoundary] Caught error:', error, errorInfo);
    captureException(error, { componentStack: errorInfo.componentStack });

    // Only auto-recover for genuine chunk/module errors
    if (isChunkError(error)) {
      attemptAutoRecovery('ConnectionErrorBoundary', 'componentDidCatch', error);
    }
  }

  handleRetry = () => {
    if (isChunkError(this.state.error)) {
      // User-initiated: always force a fresh cache-busted reload
      forceUserRecovery();
      return;
    }
    this.setState({ hasError: false, error: null, isNetworkError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { isNetworkError } = this.state;

      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-6 safe-area-page">
          <div className="text-center max-w-md w-full">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
              {isNetworkError ? (
                <WifiOff className="w-10 h-10 text-primary-foreground" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            <h1 className="text-2xl font-bold mb-3 text-foreground">
              {isNetworkError ? 'Connection Issue' : 'Something Went Wrong'}
            </h1>
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {isNetworkError
                ? "We're having trouble connecting to Eclipse. This might be a temporary network issue."
                : "An unexpected error occurred. Please try refreshing the page."
              }
            </p>
            {isNetworkError && (
              <div className="bg-card/50 border border-border rounded-xl p-4 mb-6 text-left">
                <p className="text-sm font-medium text-primary mb-2 uppercase tracking-wide">
                  Try these steps
                </p>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    Switch between Wi-Fi and mobile data
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    Try opening in Private/Incognito mode
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary">→</span>
                    Clear your browser cache
                  </li>
                </ul>
              </div>
            )}
            <Button
              onClick={this.handleRetry}
              size="lg"
              className="w-full max-w-xs"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
            {isInAppBrowser() && (
              <Button
                onClick={openInExternalBrowser}
                variant="outline"
                size="lg"
                className="w-full max-w-xs mt-3"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Open in Browser
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
