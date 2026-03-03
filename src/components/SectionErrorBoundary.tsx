import { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { captureException } from '@/lib/sentry';

interface Props {
  children: ReactNode;
  /** Section label shown in the fallback UI */
  section?: string;
  /** Compact fallback (inline) vs full-width */
  compact?: boolean;
  /** Custom fallback component */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Granular error boundary for wrapping individual page sections.
 * Prevents a single section crash from taking down the whole page.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary] ${this.props.section || 'Unknown section'} crashed:`, error, info.componentStack);
    captureException(error, { section: this.props.section, componentStack: info.componentStack });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      if (this.props.compact) {
        return (
          <div className="flex items-center gap-2 py-4 px-3 text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
            <span>Failed to load {this.props.section || 'this section'}</span>
            <Button variant="ghost" size="sm" onClick={this.handleRetry} className="ml-auto h-7 text-xs">
              <RefreshCw className="h-3 w-3 mr-1" /> Retry
            </Button>
          </div>
        );
      }

      return (
        <div className="rounded-lg border border-border bg-card p-6 text-center space-y-3">
          <AlertTriangle className="h-8 w-8 text-destructive mx-auto" />
          <p className="text-sm font-medium text-foreground">
            Something went wrong loading {this.props.section || 'this section'}
          </p>
          <Button variant="outline" size="sm" onClick={this.handleRetry}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Try again
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
