import { useQuery } from '@tanstack/react-query';
import api from '@/lib/axios';

interface DashboardMetrics {
    overview: {
        leads: number;
        opportunities: number;
        open_pipeline: number;
        documents: number;
        active_projects: number;
        completed_tasks: number;
    };
    leads_over_time: Array<{
        date: string;
        leads: number;
        formatted_date: string;
    }>;
    opportunity_pipeline: Array<{
        stage: string;
        count: number;
        value: number;
    }>;
    revenue_over_time: Array<{
        month: string;
        revenue: number;
        formatted_month: string;
    }>;
    task_completion: {
        total: number;
        completed: number;
        in_progress: number;
        pending: number;
        completion_rate: number;
    };
    recent_activity: Array<{
        type: string;
        title: string;
        description: string;
        created_at: string;
        user: string;
    }>;
}

export function useDashboardMetrics(refetchInterval: number = 30000) {
    return useQuery<DashboardMetrics>({
        queryKey: ['dashboard-metrics'],
        queryFn: async () => {
            const { data } = await api.get<DashboardMetrics>('/dashboard/metrics');
            return data;
        },
        refetchInterval,
        staleTime: 10000,
        gcTime: 5 * 60 * 1000,
    });
}
