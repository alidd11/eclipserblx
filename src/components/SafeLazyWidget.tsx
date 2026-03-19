import { Component, Suspense, ReactNode } from 'react';

/**
 * Wraps a lazy-loaded non-critical widget so that if it fails to load
 * (chunk error, network issue, etc.) it silently renders nothing instead
 * of crashing the entire app shell.
 */
class WidgetErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[SafeLazyWidget] Non-critical widget failed to load:', error.message);
  }

  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function SafeLazyWidget({ children }: { children: ReactNode }) {
  return (
    <WidgetErrorBoundary>
      <Suspense fallback={null}>
        {children}
      </Suspense>
    </WidgetErrorBoundary>
  );
}
