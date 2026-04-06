import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';
import { isChunkError, attemptAutoRecovery, forceUserRecovery } from '@/lib/chunkRecovery';

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

/**
 * Route-level error boundary. Catches render errors in a route
 * without crashing the entire app. Users can retry or go home.
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
    if (this.state.hasError && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false, error: null, retryCount: 0 });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[RouteErrorBoundary]', error, errorInfo);
    captureException(error, { componentStack: errorInfo.componentStack });

    if (isChunkError(error)) {
      // For chunk errors, auto-reset the boundary once to let lazyWithRetry handle it
      // If we've already retried, escalate to auto-recovery (hard reload)
      if (this.state.retryCount === 0) {
        // Chunk error detected — auto-resetting boundary
        this.setState({ hasError: false, error: null, retryCount: 1 });
        return;
      }
      attemptAutoRecovery('RouteErrorBoundary', 'componentDidCatch', error);
    }
  }

  handleRetry = () => {
    if (isChunkError(this.state.error)) {
      // User-initiated: always force a fresh cache-busted reload
      forceUserRecovery();
      return;
    }

    const nextCount = this.state.retryCount + 1;
    if (nextCount >= 2) {
      forceUserRecovery();
      return;
    }

    this.setState({ hasError: false, error: null, retryCount: nextCount });
  };

  handleGoHome = () => {
    forceUserRecovery(`${window.location.origin}/`);
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
