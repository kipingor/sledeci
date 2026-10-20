import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { echo } from '@/lib/echo';

export function useDashboardRealtime() {
    const queryClient = useQueryClient();

    useEffect(() => {
        const echoClient = echo;
        if (!echoClient) {
            return;
        }

        // Listen for dashboard metric updates
        const metricsChannel = echoClient.channel('dashboard-metrics');
        
        metricsChannel.listen('MetricsUpdated', (data: any) => {
            // Invalidate and refetch dashboard metrics
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Listen for lead updates
        const leadsChannel = echoClient.channel('leads');
        leadsChannel.listen('LeadCreated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });
        leadsChannel.listen('LeadUpdated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Listen for opportunity updates
        const opportunitiesChannel = echoClient.channel('opportunities');
        opportunitiesChannel.listen('OpportunityCreated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });
        opportunitiesChannel.listen('OpportunityUpdated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Listen for task updates
        const tasksChannel = echoClient.channel('tasks');
        tasksChannel.listen('TaskUpdated', () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
        });

        // Cleanup function
        return () => {
            echoClient.leaveChannel('dashboard-metrics');
            echoClient.leaveChannel('leads');
            echoClient.leaveChannel('opportunities');
            echoClient.leaveChannel('tasks');
        };
    }, [queryClient]);
}
