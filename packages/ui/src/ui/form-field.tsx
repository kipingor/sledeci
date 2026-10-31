import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { AlertCircle, Info } from 'lucide-react';
import { type ComponentProps, type ReactNode } from 'react';

interface FormFieldProps {
    label: string;
    error?: string;
    hint?: string;
    required?: boolean;
    children?: ReactNode;
    className?: string;
}

export function FormField({
    label,
    error,
    hint,
    required,
    children,
    className,
}: FormFieldProps) {
    return (
        <div className={cn('space-y-2', className)}>
            <Label className="flex items-center gap-1">
                {label}
                {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            {hint && !error && (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Info className="h-3 w-3" />
                    {hint}
                </p>
            )}
            {error && (
                <p className="flex items-center gap-1 text-xs text-destructive">
                    <AlertCircle className="h-3 w-3" />
                    {error}
                </p>
            )}
        </div>
    );
}

// Enhanced Input with character count
interface InputWithCountProps extends ComponentProps<typeof Input> {
    maxLength?: number;
    value: string;
}

export function InputWithCount({
    maxLength,
    value,
    className,
    ...props
}: InputWithCountProps) {
    return (
        <div className="space-y-1">
            <Input value={value} maxLength={maxLength} className={className} {...props} />
            {maxLength && (
                <p className="text-xs text-muted-foreground text-right">
                    {value.length} / {maxLength}
                </p>
            )}
        </div>
    );
}

// Enhanced Textarea with character count
interface TextareaWithCountProps extends ComponentProps<typeof Textarea> {
    maxLength?: number;
    value: string;
}

export function TextareaWithCount({
    maxLength,
    value,
    className,
    ...props
}: TextareaWithCountProps) {
    return (
        <div className="space-y-1">
            <Textarea
                value={value}
                maxLength={maxLength}
                className={className}
                {...props}
            />
            {maxLength && (
                <p className="text-xs text-muted-foreground text-right">
                    {value.length} / {maxLength}
                </p>
            )}
        </div>
    );
}