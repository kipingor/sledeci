import React, { useState, useEffect } from 'react';
import { Activity, ActivityType } from '@/types/activity.types';
import { ActivityCard } from './activity-card';
import { ActivityFormModal } from './activity-form-modal';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Plus, Filter, Clock, CheckCircle, AlertCircle, CalendarDays } from 'lucide-react';
import { format, parseISO, isToday, isYesterday, isThisWeek, isThisMonth } from 'date-fns';
import axios from 'axios';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ActivityTimelineProps {
    leadId: number;
    className?: string;
}

interface GroupedActivities {
    [key: string]: Activity[];
}

export function ActivityTimeline({ leadId, className }: ActivityTimelineProps) {
    const [activities, setActivities] = useState<Activity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingActivity, setEditingActivity] = useState<Activity | undefined>();
    const [filterType, setFilterType] = useState<string>('all');
    const [filterStatus, setFilterStatus] = useState<string>('all');

    const fetchActivities = async () => {
        setIsLoading(true);
        setError(null);

        try {
            const params: any = {};
            if (filterType !== 'all') params.type = filterType;
            if (filterStatus === 'completed') params.completed = true;
            if (filterStatus === 'pending') params.completed = false;
            if (filterStatus === 'overdue') params.overdue_only = true;

            const response = await axios.get(`/api/v1/leads/${leadId}/activities`, { params });
            
            if (response.data.success) {
                setActivities(response.data.data);
            }
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load activities');
            toast.error('Failed to load activities');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchActivities();
    }, [leadId, filterType, filterStatus]);

    const handleAddActivity = () => {
        setEditingActivity(undefined);
        setIsFormOpen(true);
    };

    const handleEditActivity = (activity: Activity) => {
        setEditingActivity(activity);
        setIsFormOpen(true);
    };

    const handleFormSuccess = () => {
        fetchActivities();
    };

    // Group activities by date
    const groupActivitiesByDate = (activities: Activity[]): GroupedActivities => {
        const grouped: GroupedActivities = {};

        activities.forEach((activity) => {
            const date = parseISO(activity.created_at);
            let groupKey: string;

            if (isToday(date)) {
                groupKey = 'Today';
            } else if (isYesterday(date)) {
                groupKey = 'Yesterday';
            } else if (isThisWeek(date)) {
                groupKey = format(date, 'EEEE'); // Day of week
            } else if (isThisMonth(date)) {
                groupKey = format(date, 'EEEE, MMM d');
            } else {
                groupKey = format(date, 'MMM d, yyyy');
            }

            if (!grouped[groupKey]) {
                grouped[groupKey] = [];
            }
            grouped[groupKey].push(activity);
        });

        return grouped;
    };

    const groupedActivities = groupActivitiesByDate(activities);

    if (isLoading) {
        return <LoadingState variant="skeleton" className={className} />;
    }

    if (error) {
        return (
            <div className={cn('rounded-lg bg-red-50 border border-red-200 p-4', className)}>
                <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <h3 className="text-sm font-medium text-red-900">Error Loading Activities</h3>
                        <p className="text-sm text-red-800 mt-1">{error}</p>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={fetchActivities}
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className={className}>
            {/* Header with Filters */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
                    <div className="flex items-center gap-2">
                        {/* Type Filter */}
                        <Select value={filterType} onValueChange={setFilterType}>
                            <SelectTrigger className="w-[140px]">
                                <Filter className="h-4 w-4 mr-2" />
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="call">Calls</SelectItem>
                                <SelectItem value="email">Emails</SelectItem>
                                <SelectItem value="meeting">Meetings</SelectItem>
                                <SelectItem value="note">Notes</SelectItem>
                                <SelectItem value="task">Tasks</SelectItem>
                            </SelectContent>
                        </Select>

                        {/* Status Filter */}
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Status</SelectItem>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="completed">Completed</SelectItem>
                                <SelectItem value="overdue">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Button onClick={handleAddActivity}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Activity
                </Button>
            </div>

            {/* Activities List */}
            {activities.length === 0 ? (
                <EmptyState
                    icon={CalendarDays}
                    title="No activities yet"
                    description="Start tracking your interactions with this lead"
                    action={{
                        label: 'Add First Activity',
                        href: '#',
                        onClick: handleAddActivity,
                    } as any}
                />
            ) : (
                <div className="space-y-6">
                    {Object.entries(groupedActivities).map(([dateLabel, activities]) => (
                        <div key={dateLabel}>
                            {/* Date Header */}
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-px flex-1 bg-gray-200" />
                                <h3 className="text-sm font-medium text-gray-600">
                                    {dateLabel}
                                </h3>
                                <div className="h-px flex-1 bg-gray-200" />
                            </div>

                            {/* Activities for this date */}
                            <div className="space-y-3 ml-4">
                                {activities.map((activity) => (
                                    <ActivityCard
                                        key={activity.id}
                                        activity={activity}
                                        onUpdate={fetchActivities}
                                        onEdit={handleEditActivity}
                                    />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Activity Form Modal */}
            <ActivityFormModal
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                leadId={leadId}
                activity={editingActivity}
                onSuccess={handleFormSuccess}
            />
        </div>
    );
}