/**
 * Analytics Type Definitions
 */

export interface OverviewMetrics {
    total_leads: number;
    new_leads: number;
    qualified_leads: number;
    won_leads: number;
    lost_leads: number;
    conversion_rate: number;
    average_deal_size: number;
    total_pipeline_value: number;
}

export interface LeadsByStatus {
    status: string;
    label: string;
    count: number;
    color: string;
}

export interface LeadsBySource {
    source: string;
    count: number;
}

export interface PipelineByStage {
    stage: string;
    count: number;
    value: number;
}

export interface ConversionFunnelStage {
    stage: string;
    count: number;
    percentage: number;
}

export interface LeadsOverTime {
    period: string;
    date: string;
    count: number;
}

export interface ActivityStats {
    total_activities: number;
    completed_activities: number;
    pending_activities: number;
    overdue_activities: number;
    by_type: ActivityByType[];
}

export interface ActivityByType {
    type: string;
    label: string;
    count: number;
}

export interface LeadVelocity {
    average_days: number;
    median_days: number;
    fastest_days: number;
    slowest_days: number;
}

export interface TeamPerformance {
    owner_id: number;
    owner_name: string;
    total_leads: number;
    won_leads: number;
    lost_leads: number;
    conversion_rate: number;
    avg_deal_size: number;
    total_revenue: number;
}

export interface WinLossAnalysis {
    won: {
        count: number;
        percentage: number;
        value: number;
    };
    lost: {
        count: number;
        percentage: number;
        value: number;
    };
    total: {
        count: number;
        value: number;
    };
}

export interface DashboardData {
    overview: OverviewMetrics;
    leads_by_status: LeadsByStatus[];
    leads_by_source: LeadsBySource[];
    pipeline_by_stage: PipelineByStage[];
    conversion_funnel: ConversionFunnelStage[];
    lead_velocity: LeadVelocity;
    win_loss: WinLossAnalysis;
}

export interface AnalyticsFilters {
    date_from?: string;
    date_to?: string;
    owner_id?: number;
    group_by?: 'day' | 'week' | 'month';
}

export type DateRangePreset = 'today' | 'yesterday' | '7days' | '30days' | '90days' | 'ytd' | 'custom';

export const DATE_RANGE_PRESETS: Record<DateRangePreset, { label: string; days?: number }> = {
    today: { label: 'Today', days: 0 },
    yesterday: { label: 'Yesterday', days: 1 },
    '7days': { label: 'Last 7 Days', days: 7 },
    '30days': { label: 'Last 30 Days', days: 30 },
    '90days': { label: 'Last 90 Days', days: 90 },
    ytd: { label: 'Year to Date' },
    custom: { label: 'Custom Range' },
};