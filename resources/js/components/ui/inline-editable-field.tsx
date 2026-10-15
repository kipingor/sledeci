import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Check, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'date';

interface InlineEditableFieldProps {
    value: string | number;
    onSave: (value: string | number) => Promise<void>;
    type?: FieldType;
    options?: Array<{ value: string | number; label: string }>;
    placeholder?: string;
    className?: string;
    displayClassName?: string;
    multiline?: boolean;
    prefix?: string;
    suffix?: string;
    formatDisplay?: (value: string | number) => string;
}

export function InlineEditableField({
    value,
    onSave,
    type = 'text',
    options = [],
    placeholder = 'Click to edit',
    className,
    displayClassName,
    multiline = false,
    prefix = '',
    suffix = '',
    formatDisplay,
}: InlineEditableFieldProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editValue, setEditValue] = useState(value);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            if (type === 'text' || type === 'textarea') {
                inputRef.current.select();
            }
        }
    }, [isEditing, type]);

    useEffect(() => {
        setEditValue(value);
    }, [value]);

    const handleSave = async () => {
        if (editValue === value) {
            setIsEditing(false);
            return;
        }

        setIsSaving(true);
        setError(null);

        try {
            await onSave(editValue);
            setIsEditing(false);
        } catch (err: any) {
            setError(err.message || 'Failed to save');
            // Revert to original value on error
            setEditValue(value);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditValue(value);
        setIsEditing(false);
        setError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey && type !== 'textarea') {
            e.preventDefault();
            handleSave();
        } else if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
    };

    const displayValue = formatDisplay
        ? formatDisplay(value)
        : `${prefix}${value}${suffix}`;

    if (!isEditing) {
        return (
            <div
                className={cn(
                    'cursor-pointer hover:bg-gray-100 rounded px-2 py-1 transition-colors',
                    displayClassName
                )}
                onClick={() => setIsEditing(true)}
                title="Double-click to edit"
            >
                {displayValue || (
                    <span className="text-gray-400 italic">{placeholder}</span>
                )}
            </div>
        );
    }

    return (
        <div className={cn('relative', className)}>
            {type === 'select' ? (
                <Select
                    value={String(editValue)}
                    onValueChange={(val) => {
                        setEditValue(val);
                        // Auto-save on select change
                        setTimeout(() => {
                            onSave(val).then(() => setIsEditing(false));
                        }, 100);
                    }}
                >
                    <SelectTrigger className="h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {options.map((option) => (
                            <SelectItem key={option.value} value={String(option.value)}>
                                {option.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            ) : multiline || type === 'textarea' ? (
                <Textarea
                    ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                    value={String(editValue)}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[60px]"
                    disabled={isSaving}
                />
            ) : (
                <Input
                    ref={inputRef as React.RefObject<HTMLInputElement>}
                    type={type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
                    value={String(editValue)}
                    onChange={(e) =>
                        setEditValue(type === 'number' ? Number(e.target.value) : e.target.value)
                    }
                    onKeyDown={handleKeyDown}
                    className="h-8"
                    disabled={isSaving}
                />
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-1 mt-1">
                <Button
                    size="sm"
                    variant="default"
                    className="h-7 px-2"
                    onClick={handleSave}
                    disabled={isSaving}
                >
                    {isSaving ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                        <Check className="h-3 w-3" />
                    )}
                </Button>
                <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2"
                    onClick={handleCancel}
                    disabled={isSaving}
                >
                    <X className="h-3 w-3" />
                </Button>
                {error && (
                    <span className="text-xs text-red-600 ml-2">{error}</span>
                )}
            </div>

            {/* Hint */}
            {!isSaving && (
                <p className="text-xs text-gray-500 mt-1">
                    Press Enter to save, Esc to cancel
                </p>
            )}
        </div>
    );
}