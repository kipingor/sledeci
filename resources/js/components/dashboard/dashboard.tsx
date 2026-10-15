import React, { useState, useEffect } from 'react';
import { MetricCard } from './metric-card';
import {
    BarChartCard,
    LineChartCard,
    PieChartCard,
    FunnelChartCard,
} from './charts';
import { DateRangeFilter } from './date-range-filter';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import {
    TrendingUp,
    Users,
    DollarSign,
    Target,
    Activity,
    Award,
    RefreshCw,
    Download,
} from 'lucide-react';
import { DashboardData, AnalyticsFilters } from '@/types/analytics.types';
import { subDays } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';
import { FinancialPulse } from '@/pages/dashboard/financial-pulse';

export function Dashboard() {
    const [data, setData] = useState<DashboardData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [dateRange, setDateRange] = useState<{from?: Date; to?: Date}>({
        from: subDays(new Date(), 30),
        to: new Date(),
    });

    const fetchDashboardData = async (showRefreshing = false) => {
        if (showRefreshing) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const filters: AnalyticsFilters = {
                date_from: dateRange.from?.toISOString().split('T')[0],
                date_to: dateRange.to?.toISOString().split('T')[0],
            };

            const response = await axios.get('/api/v1/analytics/dashboard', {
                params: filters,
            });

            if (response.data.success) {
                setData(response.data.data);
            }
        } catch (error: any) {
            console.error('Failed to fetch dashboard data:', error);
            toast.error('Failed to load dashboard data');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchDashboardData();
    }, [dateRange]);

    const handleRefresh = () => {
        fetchDashboardData(true);
    };

    const handleExport = () => {
        toast.info('Export feature coming soon');
        // TODO: Implement dashboard export
    };

    if (isLoading && !data) {
        return <LoadingState />;
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center h-96">
                <p className="text-gray-500">No data available</p>
            </div>
        );
    }

    const { overview, leads_by_status, leads_by_source, pipeline_by_stage, conversion_funnel, lead_velocity, win_loss } = data;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                    <p className="text-gray-600 mt-1">
                        Overview of your sales performance and metrics
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <DateRangeFilter value={dateRange} onChange={setDateRange} />
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Total Leads"
                    value={overview.total_leads}
                    icon={Users}
                    iconColor="text-blue-600"
                    changeLabel={`${overview.new_leads} new`}
                />
                <MetricCard
                    title="Conversion Rate"
                    value={overview.conversion_rate}
                    format="percentage"
                    icon={TrendingUp}
                    iconColor="text-green-600"
                />
                <MetricCard
                    title="Pipeline Value"
                    value={overview.total_pipeline_value}
                    format="currency"
                    icon={DollarSign}
                    iconColor="text-purple-600"
                />
                <MetricCard
                    title="Avg Deal Size"
                    value={overview.average_deal_size}
                    format="currency"
                    icon={Target}
                    iconColor="text-orange-600"
                />
            </div>

            {/* Win/Loss Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <MetricCard
                    title="Won Leads"
                    value={win_loss.won.count}
                    icon={Award}
                    iconColor="text-green-600"
                    changeLabel={`${win_loss.won.percentage}% win rate`}
                />
                <MetricCard
                    title="Lost Leads"
                    value={win_loss.lost.count}
                    icon={Activity}
                    iconColor="text-red-600"
                    changeLabel={`${win_loss.lost.percentage}% loss rate`}
                />
                <MetricCard
                    title="Lead Velocity"
                    value={lead_velocity.average_days}
                    suffix=" days"
                    icon={TrendingUp}
                    iconColor="text-blue-600"
                    changeLabel="avg time to close"
                />
            </div>

            {/* Financial Pilse */}
            <FinancialPulse />

            {/* Charts Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PieChartCard
                    title="Leads by Status"
                    data={leads_by_status}
                    nameKey="label"
                    valueKey="count"
                    height={350}
                />
                <BarChartCard
                    title="Leads by Source"
                    data={leads_by_source}
                    dataKey="count"
                    xAxisKey="source"
                    height={350}
                />
            </div>

            {/* Charts Row 2 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <BarChartCard
                    title="Pipeline by Stage"
                    data={pipeline_by_stage}
                    dataKey="count"
                    xAxisKey="stage"
                    barColor="#10b981"
                    height={350}
                />
                <FunnelChartCard
                    title="Conversion Funnel"
                    data={conversion_funnel}
                    nameKey="stage"
                    valueKey="count"
                    height={350}
                />
            </div>

            {/* Additional Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                    title="Qualified Leads"
                    value={overview.qualified_leads}
                    icon={Target}
                    iconColor="text-blue-600"
                />
                <MetricCard
                    title="Won This Period"
                    value={overview.won_leads}
                    icon={Award}
                    iconColor="text-green-600"
                />
                <MetricCard
                    title="Fastest Close"
                    value={lead_velocity.fastest_days}
                    suffix=" days"
                    icon={TrendingUp}
                    iconColor="text-purple-600"
                />
                <MetricCard
                    title="Median Close Time"
                    value={lead_velocity.median_days}
                    suffix=" days"
                    icon={Activity}
                    iconColor="text-orange-600"
                />
            </div>
        </div>
    );
}