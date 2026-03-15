import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  fallbackMessage?: string;
  /** Change this key to force-reset the boundary (e.g. on navigation or resume) */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

const CHUNK_ERROR_PATTERNS = [
  'load failed',
  'failed to fetch dynamically imported module',
  'importing a module script failed',
  'chunkloaderror',
  'loading chunk',
  'loading css chunk',
  'dynamically imported module',
  'not a valid javascript mime type',
  'application/octet-stream',
];

function isChunkError(error: Error | null): boolean {
  if (!error) return false;
  const msg = (error.message || '').toLowerCase();
  const name = (error.name || '').toLowerCase();
  return CHUNK_ERROR_PATTERNS.some((pattern) => msg.includes(pattern) || name.includes(pattern));
}

/**
 * Route-level error boundary. Catches render errors in a route
 * without crashing the entire app. Users can retry or go home.
 *
 * Improvements for Safari/iOS:
 * - Auto-resets when `resetKey` changes (navigation, resume from background)
 * - Detects chunk/import errors and triggers a cache-busted hard reload recovery
 * - Retry escalates to hard recovery if the same error persists
 */
export class RouteErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props) {
    // Auto-reset when the route key changes (navigation or resume)
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, retryCount: 0 });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, errorInfo);
    captureException(error, { componentStack: errorInfo.componentStack });

    if (isChunkError(error)) {
      this.attemptChunkRecovery();
    }
  }

  private buildCacheBustedUrl(base: string = window.location.href): string {
    const url = new URL(base, window.location.origin);
    url.searchParams.set('__chunk', Date.now().toString());
    return url.toString();
  }

  private performHardRecovery(targetUrl: string = window.location.href) {
    window.location.replace(this.buildCacheBustedUrl(targetUrl));
  }

  private attemptChunkRecovery() {
    const RECOVERY_KEY = 'reb-chunk-recovery';
    const COOLDOWN_MS = 120_000; // 2 min cooldown

    try {
      const last = sessionStorage.getItem(RECOVERY_KEY);
      if (last && Date.now() - parseInt(last, 10) < COOLDOWN_MS) {
        console.warn('[RouteErrorBoundary] Chunk recovery in cooldown, showing fallback');
        return;
      }
      sessionStorage.setItem(RECOVERY_KEY, Date.now().toString());
      console.log('[RouteErrorBoundary] Chunk error detected, forcing hard recovery');
      this.performHardRecovery();
    } catch {
      this.performHardRecovery();
    }
  }

  handleRetry = () => {
    const nextCount = this.state.retryCount + 1;

    if (isChunkError(this.state.error)) {
      // First retry is a local remount (no full-page reload). Second escalates.
      if (nextCount >= 2) {
        this.attemptChunkRecovery();
        return;
      }

      this.setState({ hasError: false, error: null, retryCount: nextCount });
      return;
    }

    if (nextCount >= 2) {
      this.performHardRecovery();
      return;
    }

    this.setState({ hasError: false, error: null, retryCount: nextCount });
  };

  handleGoHome = () => {
    this.performHardRecovery(`${window.location.origin}/`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="w-7 h-7 text-destructive" />
            </div>
            <h2 className="text-lg font-bold mb-2 text-foreground">
              {this.props.fallbackMessage || 'This page encountered an error'}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Don't worry — the rest of the app still works.
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" size="sm" onClick={this.handleGoHome}>
                <Home className="w-4 h-4 mr-1.5" />
                Home
              </Button>
              <Button size="sm" onClick={this.handleRetry}>
                <RefreshCw className="w-4 h-4 mr-1.5" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
