import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuickAddCardProps {
    onAdd: (title: string) => Promise<void>;
    placeholder?: string;
    buttonText?: string;
    className?: string;
    autoFocus?: boolean;
}

export function QuickAddCard({
    onAdd,
    placeholder = 'Add new item...',
    buttonText = 'Add',
    className,
    autoFocus = false,
}: QuickAddCardProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [title, setTitle] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isAdding && inputRef.current) {
            inputRef.current.focus();
        }
    }, [isAdding]);

    useEffect(() => {
        if (autoFocus) {
            setIsAdding(true);
        }
    }, [autoFocus]);

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();

        if (!title.trim()) {
            return;
        }

        setIsSubmitting(true);

        try {
            await onAdd(title.trim());
            setTitle('');
            setIsAdding(false);
        } catch (error) {
            console.error('Failed to add:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        setTitle('');
        setIsAdding(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isAdding) {
        return (
            <Button
                variant="ghost"
                className={cn('w-full justify-start text-gray-600 hover:text-gray-900', className)}
                onClick={() => setIsAdding(true)}
            >
                <Plus className="h-4 w-4 mr-2" />
                {buttonText}
            </Button>
        );
    }

    return (
        <Card className={cn('p-3', className)}>
            <form onSubmit={handleSubmit} className="space-y-2">
                <Input
                    ref={inputRef}
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={placeholder}
                    disabled={isSubmitting}
                    className="h-9"
                />
                <div className="flex items-center gap-2">
                    <Button
                        type="submit"
                        size="sm"
                        disabled={!title.trim() || isSubmitting}
                        className="flex-1"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                Adding...
                            </>
                        ) : (
                            <>
                                <Plus className="h-3 w-3 mr-2" />
                                Add
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSubmitting}
                    >
                        <X className="h-3 w-3" />
                    </Button>
                </div>
                <p className="text-xs text-gray-500">
                    Press Enter to add, Esc to cancel
                </p>
            </form>
        </Card>
    );
}