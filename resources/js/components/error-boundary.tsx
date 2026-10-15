import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Log error to console in development
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        // Update state with error details
        this.setState({
            error,
            errorInfo,
        });

        // In production, you might want to log to an error reporting service
        // Example: Sentry.captureException(error, { extra: errorInfo });
    }

    handleReset = () => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    handleReload = () => {
        window.location.reload();
    };

    handleGoHome = () => {
        window.location.href = '/dashboard';
    };

    render() {
        if (this.state.hasError) {
            // Custom fallback UI
            if (this.props.fallback) {
                return this.props.fallback;
            }

            // Default error UI
            return (
                <div className="min-h-screen flex items-center justify-center p-4 bg-muted/10">
                    <Card className="max-w-2xl w-full">
                        <CardHeader>
                            <div className="flex items-center gap-3">
                                <div className="rounded-full bg-destructive/10 p-3">
                                    <AlertTriangle className="h-6 w-6 text-destructive" />
                                </div>
                                <div>
                                    <CardTitle className="text-2xl">Something went wrong</CardTitle>
                                    <CardDescription>
                                        An unexpected error occurred. We're sorry for the inconvenience.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Error details (only in development) */}
                            {process.env.NODE_ENV === 'development' && this.state.error && (
                                <div className="rounded-lg border bg-muted p-4">
                                    <h3 className="font-semibold mb-2">Error Details:</h3>
                                    <pre className="text-xs overflow-auto max-h-40 mb-2">
                                        {this.state.error.toString()}
                                    </pre>
                                    {this.state.errorInfo && (
                                        <>
                                            <h3 className="font-semibold mb-2 mt-4">Component Stack:</h3>
                                            <pre className="text-xs overflow-auto max-h-40">
                                                {this.state.errorInfo.componentStack}
                                            </pre>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* User-friendly message */}
                            <div className="bg-muted/50 rounded-lg p-4">
                                <p className="text-sm text-muted-foreground">
                                    This error has been logged and will be investigated. You can try:
                                </p>
                                <ul className="list-disc list-inside text-sm text-muted-foreground mt-2 space-y-1">
                                    <li>Refreshing the page</li>
                                    <li>Going back to the dashboard</li>
                                    <li>Clearing your browser cache</li>
                                    <li>Contacting support if the problem persists</li>
                                </ul>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-3">
                                <Button onClick={this.handleReset} variant="default">
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Try Again
                                </Button>
                                <Button onClick={this.handleReload} variant="outline">
                                    Reload Page
                                </Button>
                                <Button onClick={this.handleGoHome} variant="outline">
                                    <Home className="mr-2 h-4 w-4" />
                                    Go to Dashboard
                                </Button>
                            </div>

                            {/* Support info */}
                            <div className="text-xs text-muted-foreground pt-4 border-t">
                                <p>
                                    If you continue experiencing issues, please contact support with error code:{' '}
                                    <code className="bg-muted px-1 py-0.5 rounded">
                                        ERR-{Date.now().toString(36).toUpperCase()}
                                    </code>
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            );
        }

        return this.props.children;
    }
}

// Functional wrapper for easier usage
export function withErrorBoundary<P extends object>(
    Component: React.ComponentType<P>,
    fallback?: React.ReactNode
) {
    return function WithErrorBoundaryWrapper(props: P) {
        return (
            <ErrorBoundary fallback={fallback}>
                <Component {...props} />
            </ErrorBoundary>
        );
    };
}