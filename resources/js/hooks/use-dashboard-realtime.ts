import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { echo } from '@/lib/echo';

export function useDashboardRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!echo) {
            return;
        }

        // Listen for dashboard metric updates
        const metricsChannel = echo.channel('dashboard-metrics');
        
        metricsChannel.listen('MetricsUpdated', (data: any) => {
            // Invalidate and refetch dashboard metrics
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Listen for lead updates
        const leadsChannel = echo.channel('leads');
        leadsChannel.listen('LeadCreated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });
        leadsChannel.listen('LeadUpdated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Listen for opportunity updates
        const opportunitiesChannel = echo.channel('opportunities');
        opportunitiesChannel.listen('OpportunityCreated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });
        opportunitiesChannel.listen('OpportunityUpdated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Listen for task updates
        const tasksChannel = echo.channel('tasks');
        tasksChannel.listen('TaskUpdated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Cleanup function
        return () => {
            echo.leaveChannel('dashboard-metrics');
            echo.leaveChannel('leads');
            echo.leaveChannel('opportunities');
            echo.leaveChannel('tasks');
        };
    }, [queryClient]);
}
