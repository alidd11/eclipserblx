import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';
import { isChunkError, attemptAutoRecovery, forceUserRecovery } from '@/lib/chunkRecovery';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  children: ReactNode;
  /** Change this to force-reset (e.g. on route change) */
  resetKey?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

/**
 * Admin-scoped error boundary. Sits inside <AdminLayout> so that a render
 * error in any dashboard widget shows an actionable fallback INSIDE the
 * admin shell instead of unmounting the whole admin tree (which previously
 * caused a momentary white screen during chunk-retry).
 */
export class AdminErrorBoundary extends Component<Props, State> {
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
    console.error('[AdminErrorBoundary]', error, errorInfo);
    captureException(error, {
      componentStack: errorInfo.componentStack,
      scope: 'admin',
      pathname: typeof window !== 'undefined' ? window.location.pathname : undefined,
    });

    if (isChunkError(error)) {
      if (this.state.retryCount === 0) {
        this.setState({ hasError: false, error: null, retryCount: 1 });
        return;
      }
      attemptAutoRecovery('AdminErrorBoundary', 'componentDidCatch', error);
    }
  }

  handleRetry = () => {
    if (isChunkError(this.state.error)) {
      forceUserRecovery();
      return;
    }
    const next = this.state.retryCount + 1;
    if (next >= 2) {
      forceUserRecovery();
      return;
    }
    this.setState({ hasError: false, error: null, retryCount: next });
  };

  handleHome = () => {
    forceUserRecovery(`${window.location.origin}/admin`);
  };

  handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      forceUserRecovery(`${window.location.origin}/admin/login`);
    }
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-destructive" />
          </div>
          <h2 className="text-lg font-bold mb-2 text-foreground">
            This admin page hit an error
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            The rest of the admin tools still work. Try again, return to the dashboard,
            or sign out and back in.
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            <Button variant="outline" size="sm" onClick={this.handleHome}>
              <Home className="w-4 h-4 mr-1.5" />
              Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={this.handleSignOut}>
              <LogOut className="w-4 h-4 mr-1.5" />
              Sign out
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
}
