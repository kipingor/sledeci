import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
    variant?: 'spinner' | 'skeleton' | 'card' | 'table' | 'inline' | 'overlay';
    text?: string;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({ 
    variant = 'spinner', 
    text = 'Loading...', 
    className = '',
    size = 'md'
}: LoadingStateProps) {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-8 w-8',
        lg: 'h-12 w-12',
    };

    if (variant === 'spinner') {
        return (
            <div className={cn('flex flex-col items-center justify-center py-12', className)}>
                <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
                {text && <p className="mt-2 text-sm text-muted-foreground">{text}</p>}
            </div>
        );
    }

    if (variant === 'inline') {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
                {text && <span className="text-sm text-muted-foreground">{text}</span>}
            </div>
        );
    }

    if (variant === 'overlay') {
        return (
            <div className={cn(
                'absolute inset-0 z-50 flex items-center justify-center',
                'bg-background/80 backdrop-blur-sm',
                className
            )}>
                <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-6 shadow-lg border">
                    <Loader2 className={cn('animate-spin text-primary', sizeClasses[size])} />
                    {text && <p className="text-sm font-medium">{text}</p>}
                </div>
            </div>
        );
    }

    if (variant === 'skeleton') {
        return (
            <div className={cn('space-y-4', className)}>
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        );
    }

    if (variant === 'card') {
        return (
            <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-3', className)}>
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2 mt-2" />
                        </CardHeader>
                        <CardContent>
                            <Skeleton className="h-24 w-full" />
                        </CardContent>
                    </Card>
                ))}
            </div>
        );
    }

    if (variant === 'table') {
        return (
            <div className={cn('space-y-2', className)}>
                <Skeleton className="h-10 w-full" />
                {[1, 2, 3, 4, 5].map((i) => (
                    <Skeleton key={i} className="h-16 w-full" />
                ))}
            </div>
        );
    }

    return null;
}

// Specific skeleton components for leads
export function LeadCardSkeleton() {
    return (
        <Card className="animate-pulse">
            <div className="p-6">
                <div className="flex items-start gap-3 mb-4">
                    <Skeleton className="h-12 w-12 rounded-full" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                    </div>
                </div>
                <Skeleton className="h-16 w-full mb-4" />
                <div className="flex gap-2 mb-4">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-24" />
                </div>
                <div className="flex justify-between items-center pt-4 border-t">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-8" />
                </div>
            </div>
        </Card>
    );
}

export function PipelineColumnSkeleton() {
    return (
        <div className="w-80 shrink-0">
            <div className="bg-card rounded-xl border p-4 space-y-3">
                <div className="flex items-center justify-between mb-3">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-6 w-8" />
                </div>
                {[1, 2, 3].map((i) => (
                    <Card key={i} className="animate-pulse">
                        <div className="p-4 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <div className="flex justify-between pt-2">
                                <Skeleton className="h-6 w-6 rounded-full" />
                                <Skeleton className="h-4 w-20" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}

// Loading overlay for entire page sections
interface LoadingOverlayProps {
    isLoading: boolean;
    message?: string;
    children: React.ReactNode;
    blur?: boolean;
}

export function LoadingOverlay({ 
    isLoading, 
    message = 'Loading...', 
    children, 
    blur = true 
}: LoadingOverlayProps) {
    return (
        <div className="relative">
            {isLoading && (
                <div className={cn(
                    'absolute inset-0 z-50 flex items-center justify-center',
                    blur && 'bg-background/50 backdrop-blur-sm'
                )}>
                    <div className="flex flex-col items-center gap-3 rounded-lg bg-card p-6 shadow-lg border">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm font-medium">{message}</p>
                    </div>
                </div>
            )}
            <div className={cn(isLoading && 'pointer-events-none opacity-50')}>
                {children}
            </div>
        </div>
    );
}