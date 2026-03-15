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
  'Load failed',
  'Failed to fetch dynamically imported module',
  'Importing a module script failed',
  'ChunkLoadError',
  'Loading chunk',
  'Loading CSS chunk',
  'dynamically imported module',
];

function isChunkError(error: Error | null): boolean {
  if (!error) return false;
  const msg = error.message || '';
  const name = error.name || '';
  return CHUNK_ERROR_PATTERNS.some(p => msg.includes(p) || name.includes(p));
}

/**
 * Route-level error boundary. Catches render errors in a route
 * without crashing the entire app. Users can retry or go home.
 *
 * Improvements for Safari/iOS:
 * - Auto-resets when `resetKey` changes (navigation, resume from background)
 * - Detects chunk/import errors and triggers a hard reload recovery
 * - Retry escalates to hard reload if the same error persists
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

    // If it's a chunk/import error, attempt a one-time hard reload
    if (isChunkError(error)) {
      this.attemptChunkRecovery();
    }
  }

  private attemptChunkRecovery() {
    const RECOVERY_KEY = 'reb-chunk-recovery';
    const COOLDOWN_MS = 120_000; // 2 min cooldown

    try {
      const last = sessionStorage.getItem(RECOVERY_KEY);
      if (last && Date.now() - parseInt(last, 10) < COOLDOWN_MS) {
        // Already tried recently, don't loop
        console.warn('[RouteErrorBoundary] Chunk recovery in cooldown, showing fallback');
        return;
      }
      sessionStorage.setItem(RECOVERY_KEY, Date.now().toString());
      console.log('[RouteErrorBoundary] Chunk error detected, hard reloading');
      window.location.reload();
    } catch {
      // sessionStorage not available, skip
    }
  }

  handleRetry = () => {
    const nextCount = this.state.retryCount + 1;
    if (nextCount >= 2) {
      // After 2 soft retries, do a hard reload
      window.location.reload();
      return;
    }
    this.setState({ hasError: false, error: null, retryCount: nextCount });
  };

  handleGoHome = () => {
    // Always hard-navigate home to fully reset app state
    window.location.href = '/';
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
