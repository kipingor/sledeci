import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { AlertCircle } from 'lucide-react';

interface ErrorStateProps {
    title?: string;
    message: string;
    retry?: () => void;
    className?: string;
}

export function ErrorState({
    title = 'Something went wrong',
    message,
    retry,
    className,
}: ErrorStateProps) {
    return (
        <div className={cn('flex min-h-[400px] items-center justify-center', className)}>
            <Alert variant="destructive" className="max-w-md">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription className="mt-2">
                    {message}
                    {retry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={retry}
                            className="mt-4"
                        >
                            Try Again
                        </Button>
                    )}
                </AlertDescription>
            </Alert>
        </div>
    );
}