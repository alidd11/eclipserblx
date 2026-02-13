import { Component, ReactNode } from 'react';
import { RefreshCw, WifiOff, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

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
    // Check if it's a network-related error
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
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, isNetworkError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { isNetworkError } = this.state;
      
      return (
        <div className="min-h-screen bg-gradient-to-br from-background to-background/80 flex items-center justify-center p-6 pt-safe pb-safe">
          <div className="text-center max-w-md w-full">
            {/* Icon */}
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/20 flex items-center justify-center">
              {isNetworkError ? (
                <WifiOff className="w-10 h-10 text-primary-foreground" />
              ) : (
                <AlertTriangle className="w-10 h-10 text-primary-foreground" />
              )}
            </div>
            
            {/* Title */}
            <h1 className="text-2xl font-bold mb-3 bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              {isNetworkError ? 'Connection Issue' : 'Something Went Wrong'}
            </h1>
            
            {/* Description */}
            <p className="text-muted-foreground mb-6 leading-relaxed">
              {isNetworkError 
                ? "We're having trouble connecting to Eclipse. This might be a temporary network issue."
                : "An unexpected error occurred. Please try refreshing the page."
              }
            </p>
            
            {/* Tips for network errors */}
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
            
            {/* Retry button */}
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
