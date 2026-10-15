import React, { useState, useEffect } from 'react';
import { ActivityStatistics, ACTIVITY_TYPE_CONFIGS } from '@/types/activity.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ActivityTypeIcon } from '@/components/activity/activity-type-icon';
import { LoadingState } from '@/components/ui/loading-state';
import { CheckCircle, Clock, AlertCircle, Calendar } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface ActivityStatsProps {
    leadId: number;
    className?: string;
}

export function ActivityStats({ leadId, className }: ActivityStatsProps) {
    const [stats, setStats] = useState<ActivityStatistics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await axios.get(`/api/v1/leads/${leadId}/activities-stats`);
                if (response.data.success) {
                    setStats(response.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch activity stats:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStats();
    }, [leadId]);

    if (isLoading) {
        return <LoadingState variant="skeleton" className={className} />;
    }

    if (!stats) {
        return null;
    }

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-lg">Activity Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* Overall Stats */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Calendar className="h-4 w-4" />
                            <span>Total Activities</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <CheckCircle className="h-4 w-4" />
                            <span>Completed</span>
                        </div>
                        <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span>Pending</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
                    </div>

                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <AlertCircle className="h-4 w-4" />
                            <span>Overdue</span>
                        </div>
                        <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                    </div>
                </div>

                {/* By Type */}
                <div className="pt-4 border-t">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">By Type</h4>
                    <div className="space-y-2">
                        {Object.entries(stats.by_type).map(([type, data]) => {
                            if (data.count === 0) return null;
                            
                            const config = ACTIVITY_TYPE_CONFIGS[type as keyof typeof ACTIVITY_TYPE_CONFIGS];
                            const completionRate = data.count > 0 
                                ? Math.round((data.completed / data.count) * 100) 
                                : 0;

                            return (
                                <div
                                    key={type}
                                    className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-gray-50"
                                >
                                    <div className="flex items-center gap-3">
                                        <ActivityTypeIcon type={type as any} size="sm" />
                                        <span className="text-sm font-medium text-gray-900">
                                            {config.label}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="font-mono">
                                            {data.completed}/{data.count}
                                        </Badge>
                                        {data.count > 0 && (
                                            <span className={cn(
                                                "text-xs font-medium",
                                                completionRate === 100 ? "text-green-600" :
                                                completionRate > 50 ? "text-blue-600" :
                                                "text-gray-600"
                                            )}>
                                                {completionRate}%
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}