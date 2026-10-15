import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
    TrendingUp, 
    TrendingDown, 
    Users, 
    Target, 
    DollarSign,
    Activity,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { useMemo } from 'react';

interface AnalyticsData {
    totalLeads: number;
    newLeadsThisMonth: number;
    conversionRate: number;
    averageLeadValue: number;
    leadsByStatus: Record<string, number>;
    leadsBySource: Record<string, number>;
    trendsData: {
        month: string;
        leads: number;
        conversions: number;
    }[];
}

interface LeadsAnalyticsDashboardProps {
    data: AnalyticsData;
    period?: 'week' | 'month' | 'quarter' | 'year';
}

export function LeadsAnalyticsDashboard({ data, period = 'month' }: LeadsAnalyticsDashboardProps) {
    const metrics = useMemo(() => {
        // Calculate growth percentages
        const currentMonthLeads = data.newLeadsThisMonth;
        const previousMonthLeads = data.trendsData?.[data.trendsData.length - 2]?.leads || 0;
        const growthRate = previousMonthLeads > 0
            ? ((currentMonthLeads - previousMonthLeads) / previousMonthLeads) * 100
            : 0;

        const conversionTrend = data.trendsData?.[data.trendsData.length - 1]?.conversions || 0;
        const prevConversionTrend = data.trendsData?.[data.trendsData.length - 2]?.conversions || 0;
        const conversionGrowth = prevConversionTrend > 0
            ? ((conversionTrend - prevConversionTrend) / prevConversionTrend) * 100
            : 0;

        return {
            growthRate,
            conversionGrowth,
            isGrowthPositive: growthRate >= 0,
            isConversionPositive: conversionGrowth >= 0,
        };
    }, [data]);

    return (
        <div className="space-y-6">
            {/* Key Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Leads */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.totalLeads.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className={metrics.isGrowthPositive ? 'text-green-600' : 'text-red-600'}>
                                {metrics.isGrowthPositive ? (
                                    <ArrowUpRight className="inline h-3 w-3" />
                                ) : (
                                    <ArrowDownRight className="inline h-3 w-3" />
                                )}
                                {Math.abs(metrics.growthRate).toFixed(1)}%
                            </span>{' '}
                            from last {period}
                        </p>
                    </CardContent>
                </Card>

                {/* New Leads */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">New This {period}</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.newLeadsThisMonth.toLocaleString()}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active pipeline opportunities
                        </p>
                    </CardContent>
                </Card>

                {/* Conversion Rate */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.conversionRate.toFixed(1)}%</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className={metrics.isConversionPositive ? 'text-green-600' : 'text-red-600'}>
                                {metrics.isConversionPositive ? (
                                    <ArrowUpRight className="inline h-3 w-3" />
                                ) : (
                                    <ArrowDownRight className="inline h-3 w-3" />
                                )}
                                {Math.abs(metrics.conversionGrowth).toFixed(1)}%
                            </span>{' '}
                            from last {period}
                        </p>
                    </CardContent>
                </Card>

                {/* Average Lead Value */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Avg. Lead Value</CardTitle>
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            ${data.averageLeadValue.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Estimated revenue per lead
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Detailed Breakdowns */}
            <div className="grid gap-4 md:grid-cols-2">
                {/* Leads by Status */}
                <Card>
                    <CardHeader>
                        <CardTitle>Leads by Status</CardTitle>
                        <CardDescription>Distribution across pipeline stages</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(data.leadsByStatus).map(([status, count]) => {
                                const percentage = (count / data.totalLeads) * 100;
                                return (
                                    <div key={status} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="capitalize">{status.replace(/_/g, ' ')}</span>
                                            <span className="font-medium">
                                                {count} ({percentage.toFixed(0)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-primary transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* Leads by Source */}
                <Card>
                    <CardHeader>
                        <CardTitle>Lead Sources</CardTitle>
                        <CardDescription>Where your leads are coming from</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(data.leadsBySource)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5)
                                .map(([source, count]) => {
                                    const percentage = (count / data.totalLeads) * 100;
                                    return (
                                        <div key={source} className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="capitalize">
                                                    {source}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium">{count}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({percentage.toFixed(0)}%)
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Trends Chart (Simplified Visual) */}
            <Card>
                <CardHeader>
                    <CardTitle>Lead Trends</CardTitle>
                    <CardDescription>New leads and conversions over time</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="h-64 flex items-end justify-between gap-2">
                        {data.trendsData?.map((item, index) => {
                            const maxLeads = Math.max(...data.trendsData.map(d => d.leads));
                            const leadHeight = (item.leads / maxLeads) * 100;
                            const conversionHeight = (item.conversions / maxLeads) * 100;

                            return (
                                <div key={index} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full flex gap-1 items-end" style={{ height: '200px' }}>
                                        {/* Leads bar */}
                                        <div
                                            className="flex-1 bg-primary rounded-t"
                                            style={{ height: `${leadHeight}%` }}
                                            title={`${item.leads} leads`}
                                        />
                                        {/* Conversions bar */}
                                        <div
                                            className="flex-1 bg-green-500 rounded-t"
                                            style={{ height: `${conversionHeight}%` }}
                                            title={`${item.conversions} conversions`}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground">
                                        {item.month}
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-center gap-4 mt-4">
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-primary rounded" />
                            <span className="text-xs text-muted-foreground">New Leads</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="h-3 w-3 bg-green-500 rounded" />
                            <span className="text-xs text-muted-foreground">Conversions</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// Hook for fetching analytics data
export function useLeadsAnalytics(period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    // This would typically fetch from your API
    // For now, returning mock structure
    
    const data: AnalyticsData = {
        totalLeads: 0,
        newLeadsThisMonth: 0,
        conversionRate: 0,
        averageLeadValue: 0,
        leadsByStatus: {},
        leadsBySource: {},
        trendsData: [],
    };

    return {
        data,
        isLoading: false,
        error: null,
    };
}