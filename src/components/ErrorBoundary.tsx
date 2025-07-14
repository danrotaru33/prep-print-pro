import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  resetError = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      return <DefaultErrorFallback error={this.state.error!} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

function DefaultErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const isPDFError = error.message.toLowerCase().includes('pdf');
  const isWorkerError = error.message.toLowerCase().includes('worker');
  
  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-destructive" />
          <CardTitle className="text-lg">
            {isPDFError ? 'PDF Processing Error' : 'Something went wrong'}
          </CardTitle>
        </div>
        <CardDescription>
          {isPDFError && isWorkerError
            ? 'There was an issue loading the PDF processing engine.'
            : isPDFError
            ? 'We encountered an issue processing your PDF file.'
            : 'An unexpected error occurred while processing your file.'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {isPDFError && (
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm font-medium mb-2">Recommended solution:</p>
            <p className="text-sm text-muted-foreground">
              Convert your PDF to PNG or JPG format using an online converter, then upload the image file instead.
            </p>
          </div>
        )}
        
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
            Technical details
          </summary>
          <div className="mt-2 p-2 bg-muted rounded text-xs font-mono">
            {error.message}
          </div>
        </details>
        
        <div className="flex gap-2">
          <Button onClick={resetError} size="sm" className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          
          {isPDFError && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://www.pdf24.org/en/pdf-to-jpg', '_blank')}
            >
              Convert PDF Online
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}