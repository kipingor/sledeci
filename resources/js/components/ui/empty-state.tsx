import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        href: string;
    };
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
    className = '',
}: EmptyStateProps) {
    return (
        <div className={`flex flex-col items-center justify-center py-12 ${className}`}>
            {Icon && (
                <div className="rounded-full bg-muted p-3 mb-4">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
            )}
            <h3 className="text-lg font-semibold">{title}</h3>
            {description && (
                <p className="mt-2 text-sm text-muted-foreground text-center max-w-sm">
                    {description}
                </p>
            )}
            {action && (
                <Button asChild className="mt-4">
                    <Link href={action.href}>{action.label}</Link>
                </Button>
            )}
        </div>
    );
}