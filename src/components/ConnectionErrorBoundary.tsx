import { Component, ReactNode } from 'react';
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  isNetworkError: boolean;
}

/**
 * STRICT chunk/module patterns — excludes generic 'failed to fetch' / 'networkerror'
 * which fire from normal API calls, ad blockers, analytics, etc.
 */
const CHUNK_ERROR_PATTERNS = [
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'chunkloaderror',
  'loading chunk',
  'loading css chunk',
  'dynamically imported module',
  'not a valid javascript mime type',
  'application/octet-stream',
];

function isChunkOrLoadError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((p) => msg.includes(p) || name.includes(p));
}

export class ConnectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, isNetworkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isNetworkError = 
      error.message.includes('fetch') ||
      error.message.includes('network') ||
      error.message.includes('Failed to fetch') ||
      error.message.includes('NetworkError') ||
      error.message.includes('CORS') ||
      error.message.includes('ERR_') ||
      error.name === 'TypeError' && error.message.includes('Failed');
    
    return { 
      hasError: true, 
      error,
      isNetworkError
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[ConnectionErrorBoundary] Caught error:', error, errorInfo);
    captureException(error, { componentStack: errorInfo.componentStack });

    // Only auto-recover for genuine chunk/module errors, NOT generic network failures
    if (isChunkOrLoadError(error)) {
      this.attemptChunkRecovery();
    }
  }

  private attemptChunkRecovery() {
    const RECOVERY_KEY = 'ceb-chunk-recovery';
    const COOLDOWN_MS = 120_000;

    const currentUrl = new URL(window.location.href);
    if (currentUrl.searchParams.has('__chunk')) {
      console.warn('[ConnectionErrorBoundary] Already on cache-busted URL, showing fallback');
      return;
    }

    try {
      const last = sessionStorage.getItem(RECOVERY_KEY);
      if (last && Date.now() - parseInt(last, 10) < COOLDOWN_MS) {
        console.warn('[ConnectionErrorBoundary] Chunk recovery in cooldown, showing fallback');
        return;
      }
      sessionStorage.setItem(RECOVERY_KEY, Date.now().toString());
    } catch {
      // If sessionStorage fails, still try recovery
    }

    console.log('[ConnectionErrorBoundary] Chunk error detected, forcing cache-busted reload');
    currentUrl.searchParams.set('__chunk', Date.now().toString());
    window.location.replace(currentUrl.toString());
  }

  handleRetry = () => {
    if (isChunkOrLoadError(this.state.error)) {
      // For chunk errors, always do a cache-busted hard reload — plain reload serves stale SW cache
      this.attemptChunkRecovery();
      return;
    }
    this.setState({ hasError: false, error: null, isNetworkError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { isNetworkError } = this.state;
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-6 pt-safe pb-safe">
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
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
