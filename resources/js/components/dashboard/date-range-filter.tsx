import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CalendarIcon } from 'lucide-react';
import { format, subDays, startOfYear } from 'date-fns';
import { DateRangePreset, DATE_RANGE_PRESETS } from '@/types/analytics.types';
import { cn } from '@/lib/utils';

interface DateRangeFilterProps {
    value: {
        from?: Date;
        to?: Date;
    };
    onChange: (range: { from?: Date; to?: Date }) => void;
    className?: string;
}

export function DateRangeFilter({ value, onChange, className }: DateRangeFilterProps) {
    const [preset, setPreset] = useState<DateRangePreset>('30days');
    const [isCustomOpen, setIsCustomOpen] = useState(false);

    const handlePresetChange = (newPreset: DateRangePreset) => {
        setPreset(newPreset);

        const today = new Date();
        const to = today;
        let from: Date | undefined;

        switch (newPreset) {
            case 'today':
                from = today;
                break;
            case 'yesterday':
                from = subDays(today, 1);
                break;
            case '7days':
                from = subDays(today, 7);
                break;
            case '30days':
                from = subDays(today, 30);
                break;
            case '90days':
                from = subDays(today, 90);
                break;
            case 'ytd':
                from = startOfYear(today);
                break;
            case 'custom':
                setIsCustomOpen(true);
                return;
        }

        onChange({ from, to });
    };

    const formatDateRange = () => {
        if (!value.from) return 'Select date range';
        if (!value.to) return format(value.from, 'MMM d, yyyy');
        return `${format(value.from, 'MMM d')} - ${format(value.to, 'MMM d, yyyy')}`;
    };

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {/* Preset Selector */}
            <Select value={preset} onValueChange={(v) => handlePresetChange(v as DateRangePreset)}>
                <SelectTrigger className="w-[180px]">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {Object.entries(DATE_RANGE_PRESETS).map(([key, { label }]) => (
                        <SelectItem key={key} value={key}>
                            {label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            {/* Custom Date Picker */}
            {preset === 'custom' && (
                <Popover open={isCustomOpen} onOpenChange={setIsCustomOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            className={cn(
                                'justify-start text-left font-normal',
                                !value.from && 'text-muted-foreground'
                            )}
                        >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formatDateRange()}
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={value.from}
                            selected={{ from: value.from, to: value.to }}
                            onSelect={(range) => {
                                onChange({
                                    from: range?.from,
                                    to: range?.to,
                                });
                                if (range?.from && range?.to) {
                                    setIsCustomOpen(false);
                                }
                            }}
                            numberOfMonths={2}
                        />
                    </PopoverContent>
                </Popover>
            )}

            {/* Display selected range for non-custom */}
            {preset !== 'custom' && value.from && (
                <div className="text-sm text-gray-600">
                    {formatDateRange()}
                </div>
            )}
        </div>
    );
}