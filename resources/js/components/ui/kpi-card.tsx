import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { type LucideIcon, TrendingDown, TrendingUp } from 'lucide-react';

interface KPICardProps {
    title: string;
    value: string | number;
    change?: number;
    trend?: 'up' | 'down';
    icon?: LucideIcon;
    className?: string;
}

export function KPICard({
    title,
    value,
    change,
    trend,
    icon: Icon,
    className,
}: KPICardProps) {
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold">{value}</div>
                {change !== undefined && (
                    <div className="flex items-center text-xs text-muted-foreground mt-1">
                        {trend === 'up' ? (
                            <TrendingUp className="mr-1 h-3 w-3 text-emerald-500" />
                        ) : (
                            <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                        )}
                        <span
                            className={cn(
                                trend === 'up' ? 'text-emerald-500' : 'text-red-500',
                            )}
                        >
                            {change > 0 ? '+' : ''}
                            {change}%
                        </span>
                        <span className="ml-1">from last month</span>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}