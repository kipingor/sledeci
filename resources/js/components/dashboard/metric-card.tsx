import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
    title: string;
    value: string | number;
    icon?: LucideIcon;
    iconColor?: string;
    change?: number;
    changeLabel?: string;
    format?: 'number' | 'currency' | 'percentage';
    prefix?: string;
    suffix?: string;
    loading?: boolean;
}

export function MetricCard({
    title,
    value,
    icon: Icon,
    iconColor = 'text-blue-600',
    change,
    changeLabel,
    format = 'number',
    prefix = '',
    suffix = '',
    loading = false,
}: MetricCardProps) {
    const formatValue = (val: string | number): string => {
        if (typeof val === 'string') return val;

        switch (format) {
            case 'currency':
                return new Intl.NumberFormat('en-KE', {
                    style: 'currency',
                    currency: 'KES',
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                }).format(val);
            case 'percentage':
                return `${val.toFixed(1)}%`;
            default:
                return typeof val === "number" ? val.toLocaleString() : '';
        }
    };

    const getChangeIcon = () => {
        if (change === undefined || change === 0) return Minus;
        return change > 0 ? ArrowUp : ArrowDown;
    };

    const getChangeColor = () => {
        if (change === undefined || change === 0) return 'text-gray-500';
        return change > 0 ? 'text-green-600' : 'text-red-600';
    };

    const ChangeIcon = getChangeIcon();

    if (loading) {
        return (
            <Card>
                <CardContent className="p-6">
                    <div className="animate-pulse space-y-3">
                        <div className="h-4 bg-gray-200 rounded w-24"></div>
                        <div className="h-8 bg-gray-200 rounded w-32"></div>
                        <div className="h-3 bg-gray-200 rounded w-20"></div>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-2">
                            {prefix}
                            {formatValue(value)}
                            {suffix}
                        </p>
                        {(change !== undefined || changeLabel) && (
                            <div className="flex items-center gap-1 mt-2">
                                {change !== undefined && (
                                    <div className={cn('flex items-center gap-0.5', getChangeColor())}>
                                        <ChangeIcon className="h-3 w-3" />
                                        <span className="text-sm font-medium">
                                            {Math.abs(change).toFixed(1)}%
                                        </span>
                                    </div>
                                )}
                                {changeLabel && (
                                    <span className="text-xs text-gray-500">
                                        {changeLabel}
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    {Icon && (
                        <div className={cn('rounded-lg p-3 bg-opacity-10', iconColor)}>
                            <Icon className={cn('h-6 w-6', iconColor)} />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}