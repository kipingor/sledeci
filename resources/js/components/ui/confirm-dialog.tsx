import { useState, useCallback } from 'react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle, Info, CheckCircle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';


type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success' | 'question';

interface ConfirmDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    onConfirm: () => void | Promise<void>;
    onCancel?: () => void;
    loading?: boolean;
    disabled?: boolean;
    showCancel?: boolean;
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
    icon: typeof AlertTriangle;
    iconColor: string;
    iconBgColor: string;
    actionVariant: 'default' | 'destructive';
}> = {
    danger: {
        icon: XCircle,
        iconColor: 'text-destructive',
        iconBgColor: 'bg-destructive/10',
        actionVariant: 'destructive',
    },
    warning: {
        icon: AlertTriangle,
        iconColor: 'text-orange-500 dark:text-orange-400',
        iconBgColor: 'bg-orange-500/10',
        actionVariant: 'default',
    },
    info: {
        icon: Info,
        iconColor: 'text-blue-500 dark:text-blue-400',
        iconBgColor: 'bg-blue-500/10',
        actionVariant: 'default',
    },
    success: {
        icon: CheckCircle,
        iconColor: 'text-green-500 dark:text-green-400',
        iconBgColor: 'bg-green-500/10',
        actionVariant: 'default',
    },
    question: {
        icon: HelpCircle,
        iconColor: 'text-primary',
        iconBgColor: 'bg-primary/10',
        actionVariant: 'default',
    },
};

export function ConfirmDialog({
    open,
    onOpenChange,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'danger',
    onConfirm,
    onCancel,
    loading = false,
    disabled = false,
    showCancel = true,
}: ConfirmDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const config = VARIANT_CONFIG[variant];
    const Icon = config.icon;

    const handleConfirm = async (e: React.MouseEvent) => {
        e.preventDefault();
        
        if (isLoading || disabled) return;

        try {
            setIsLoading(true);
            await onConfirm();
            onOpenChange(false);
        } catch (error) {
            console.error('Confirmation error:', error);
            // Don't close the dialog on error
        } finally {
            setIsLoading(false);
        }
    };

    const handleCancel = () => {
        if (isLoading) return;
        onCancel?.();
        onOpenChange(false);
    };

    const isDisabled = loading || isLoading || disabled;

    return (
        <AlertDialog open={open} onOpenChange={isDisabled ? undefined : onOpenChange}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <div className="flex items-start gap-3">
                        <div className={cn('rounded-full p-2', config.iconBgColor)}>
                            <Icon className={cn('h-5 w-5', config.iconColor)} />
                        </div>
                        <div className="flex-1 space-y-1">
                            <AlertDialogTitle>{title}</AlertDialogTitle>
                            {description && (
                                <AlertDialogDescription>
                                    {description}
                                </AlertDialogDescription>
                            )}
                        </div>
                    </div>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-2 sm:gap-0">
                    {showCancel && (
                        <AlertDialogCancel disabled={isDisabled} onClick={handleCancel}>
                            {cancelLabel}
                        </AlertDialogCancel>
                    )}
                    <AlertDialogAction
                        onClick={handleConfirm}
                        disabled={isDisabled}
                        className={cn(
                            config.actionVariant === 'destructive' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
                        )}
                    >
                        {isDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {confirmLabel}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// Hook for easier usage with better state management
export function useConfirmDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState<Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'loading'>>({
        title: '',
        description: '',
        onConfirm: async () => {},
    });

    const confirm = useCallback((options: Omit<ConfirmDialogProps, 'open' | 'onOpenChange' | 'loading'>) => {
        return new Promise<boolean>((resolve) => {
            setConfig({
                ...options,
                onConfirm: async () => {
                    try {
                        setLoading(true);
                        await options.onConfirm();
                        setOpen(false);
                        resolve(true);
                    } catch (error) {
                        console.error('Confirmation error:', error);
                        resolve(false);
                    } finally {
                        setLoading(false);
                    }
                },
                onCancel: () => {
                    options.onCancel?.();
                    setOpen(false);
                    resolve(false);
                },
            });
            setOpen(true);
        });
    }, []);

    const ConfirmDialogComponent = useCallback(() => (
        <ConfirmDialog
            open={open}
            onOpenChange={(value) => {
                if (!loading) {
                    setOpen(value);
                    if (!value && config.onCancel) {
                        config.onCancel();
                    }
                }
            }}
            loading={loading}
            {...config}
        />
    ), [open, loading, config]);

    return {
        confirm,
        ConfirmDialog: ConfirmDialogComponent,
        isOpen: open,
        isLoading: loading,
    };
}

// Quick confirmation functions for common use cases
export function useDeleteConfirmation() {
    const { confirm, ConfirmDialog, isOpen, isLoading } = useConfirmDialog();

    const confirmDelete = useCallback((options: {
        itemName?: string;
        onConfirm: () => void | Promise<void>;
        customDescription?: string;
    }) => {
        return confirm({
            title: 'Delete Confirmation',
            description: options.customDescription || (options.itemName
                ? `Are you sure you want to delete "${options.itemName}"? This action cannot be undone.`
                : 'Are you sure you want to delete this item? This action cannot be undone.'),
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'danger',
            onConfirm: options.onConfirm,
        });
    }, [confirm]);

    return { confirmDelete, ConfirmDialog, isOpen, isLoading };
}

export function useDiscardConfirmation() {
    const { confirm, ConfirmDialog, isOpen, isLoading } = useConfirmDialog();

    const confirmDiscard = useCallback((options: {
        onConfirm: () => void | Promise<void>;
        customDescription?: string;
    }) => {
        return confirm({
            title: 'Discard Changes?',
            description: options.customDescription || 'You have unsaved changes. Are you sure you want to discard them?',
            confirmLabel: 'Discard',
            cancelLabel: 'Keep Editing',
            variant: 'warning',
            onConfirm: options.onConfirm,
        });
    }, [confirm]);

    return { confirmDiscard, ConfirmDialog, isOpen, isLoading };
}