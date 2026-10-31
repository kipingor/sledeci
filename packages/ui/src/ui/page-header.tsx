import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { ArrowLeft, LucideIcon } from 'lucide-react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { type ReactNode } from 'react';

export interface PageHeaderAction {
    label: string;
    href?: string;
    onClick?: () => void | Promise<void>;
    variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'destructive' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    icon?: LucideIcon;
    disabled?: boolean;
    loading?: boolean;
}

export interface PageHeaderProps {
    title: string;
    description?: string;
    breadcrumbs?: BreadcrumbItem[];
    actions?: PageHeaderAction[] | ReactNode;
    backButton?: {
        label?: string;
        href: string;
    };
    className?: string;
}

export function PageHeader({
    title,
    description,
    breadcrumbs,
    actions,
    backButton,
    className,
}: PageHeaderProps) {
    const renderActions = () => {
        // If actions is a ReactNode, render it directly
        if (actions && !Array.isArray(actions)) {
            return actions;
        }

        // If actions is an array of PageHeaderAction, render them
        if (Array.isArray(actions) && actions.length > 0) {
            return (
                <div className="flex flex-wrap gap-2">
                    {actions.map((action, index) => {
                        const Icon = action.icon;
                        if (action.href) {
                            return (
                                <Button
                                    key={index}
                                    asChild
                                    variant={action.variant || 'default'}
                                    size={action.size || 'default'}
                                    disabled={action.disabled || action.loading}
                                >
                                    <Link href={action.href}>
                                        {Icon && <Icon className="mr-2 h-4 w-4" />}
                                        {action.label}
                                    </Link>
                                </Button>
                            );
                        }

                        return (
                            <Button
                                key={index}
                                onClick={action.onClick}
                                variant={action.variant || 'default'}
                                size={action.size || 'default'}
                                disabled={action.disabled || action.loading}
                            >
                                {Icon && <Icon className="mr-2 h-4 w-4" />}
                                {action.label}
                            </Button>
                        );
                    })}
                </div>
            );
        }

        return null;
    };

    return (
        <div className={cn('space-y-4', className)}>
            {breadcrumbs && breadcrumbs.length > 0 && (
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            )}
            
            {/* Back Button */}
            {backButton && (
                <Button asChild variant="ghost" size="sm" className="-ml-2">
                    <Link href={backButton.href}>
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        {backButton.label || 'Back'}
                    </Link>
                </Button>
            )}

            {/* Header Content */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                {/* Title and Description */}
                <div className="space-y-1 flex-1">
                    <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground sm:text-base">
                            {description}
                        </p>
                    )}
                </div>

                {/* Actions */}
                {renderActions()}
            </div>
        </div>
    );
}

// Compact variant for less important pages or sub-sections
export function PageHeaderCompact({
    title,
    description,
    action,
    className,
}: {
    title: string;
    description?: string;
    action?: PageHeaderAction;
    className?: string;
}) {
    return (
        <div className={cn('flex items-center justify-between', className)}>
            <div className="flex-1 space-y-1">
                <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{title}</h2>
                {description && (
                    <p className="text-sm text-muted-foreground">{description}</p>
                )}
            </div>
            {action && (
                <Button
                    asChild={!!action.href}
                    onClick={action.onClick}
                    variant={action.variant}
                    size={action.size || 'default'}
                    disabled={action.disabled || action.loading}
                >
                    {action.href ? (
                        <Link href={action.href}>
                            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                            {action.label}
                        </Link>
                    ) : (
                        <>
                            {action.icon && <action.icon className="mr-2 h-4 w-4" />}
                            {action.label}
                        </>
                    )}
                </Button>
            )}
        </div>
    );
}

// Minimal variant for simple pages
export function PageHeaderMinimal({
    title,
    description,
    className,
}: {
    title: string;
    description?: string;
    className?: string;
}) {
    return (
        <div className={cn('space-y-1', className)}>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
            {description && (
                <p className="text-sm text-muted-foreground sm:text-base">
                    {description}
                </p>
            )}
        </div>
    );
}