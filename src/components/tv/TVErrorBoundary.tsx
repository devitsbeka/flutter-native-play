import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ChunkyButton } from '@/components/ui/chunky-button';
import { tvLogError } from '@/utils/tvDebug';

interface Props {
  children: ReactNode;
  onRetry?: () => void;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
}

export class TVErrorBoundary extends Component<Props, State> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    tvLogError('TVErrorBoundary', { error: error.message, stack: errorInfo.componentStack });
    
    this.setState({ errorInfo });

    // Auto-retry logic for transient errors (max 3 retries)
    if (this.state.retryCount < 3) {
      this.retryTimeout = setTimeout(() => {
        this.handleRetry();
      }, 2000 * (this.state.retryCount + 1)); // Exponential backoff
    }
  }

  componentWillUnmount() {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = () => {
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
    }));
    this.props.onRetry?.();
  };

  handleManualRetry = () => {
    // Clear auto-retry timeout
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
    this.handleRetry();
  };

  handleRefresh = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      const { fallbackMessage } = this.props;
      const { retryCount } = this.state;
      const isAutoRetrying = retryCount < 3;

      return (
        <div className="min-h-screen bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 flex flex-col items-center justify-center p-6">
          <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-8 max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              {isAutoRetrying ? 'Reconnecting...' : 'Something went wrong'}
            </h2>

            <p className="text-purple-200 mb-6">
              {fallbackMessage || (isAutoRetrying 
                ? `Attempting to reconnect... (${retryCount + 1}/3)`
                : 'An error occurred in the TV game. Please try again.'
              )}
            </p>

            {isAutoRetrying ? (
              <div className="flex items-center justify-center gap-2 text-purple-300">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Auto-retrying...</span>
              </div>
            ) : (
              <div className="space-y-3">
                <ChunkyButton 
                  variant="primary" 
                  className="w-full"
                  onClick={this.handleManualRetry}
                >
                  <RefreshCw className="w-5 h-5 mr-2" />
                  Try Again
                </ChunkyButton>
                
                <ChunkyButton 
                  variant="secondary" 
                  className="w-full"
                  onClick={this.handleRefresh}
                >
                  Refresh Page
                </ChunkyButton>
              </div>
            )}

            {import.meta.env.DEV && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-purple-300 text-sm cursor-pointer hover:text-purple-200">
                  Error Details
                </summary>
                <pre className="mt-2 p-3 bg-black/30 rounded-lg text-xs text-red-300 overflow-auto max-h-40">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
