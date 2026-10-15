import React, { useState } from 'react';
import { Activity, ACTIVITY_TYPE_CONFIGS } from '@/types/activity.types';
import { ActivityTypeIcon } from '@/components/activity/activity-type-icon';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card } from '@/components/ui/card';
import { MoreVertical, Edit, Trash2, Check, Calendar, Clock, AlertCircle } from 'lucide-react';
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';

interface ActivityCardProps {
    activity: Activity;
    onUpdate?: () => void;
    onEdit?: (activity: Activity) => void;
}

export function ActivityCard({ activity, onUpdate, onEdit }: ActivityCardProps) {
    const [isCompleting, setIsCompleting] = useState(false);
    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
    const config = ACTIVITY_TYPE_CONFIGS[activity.type];

    const isCompleted = !!activity.completed_at;
    const isScheduled = !!activity.scheduled_at;
    const isOverdue = isScheduled && !isCompleted && isPast(parseISO(activity.scheduled_at!));

    const handleComplete = () => {
        setIsCompleting(true);
        
        router.post(
            `/api/v1/leads/${activity.lead_id}/activities/${activity.id}/complete`,
            {},
            {
                preserveScroll: true,
                onSuccess: () => {
                    toast.success('Activity marked as completed');
                    onUpdate?.();
                },
                onError: (errors) => {
                    toast.error(errors.message || 'Failed to complete activity');
                },
                onFinish: () => {
                    setIsCompleting(false);
                },
            }
        );
    };

    const handleDelete = async () => {
        await confirmDelete({
            itemName: activity.subject || config.label,
            onConfirm: async () => {
                return new Promise<void>((resolve, reject) => {
                    router.delete(`/api/v1/leads/${activity.lead_id}/activities/${activity.id}`, {
                        preserveScroll: true,
                        onSuccess: () => {
                            toast.success('Activity deleted');
                            onUpdate?.();
                            resolve();
                        },
                        onError: (errors) => {
                            toast.error(errors.message || 'Failed to delete activity');
                            reject(new Error('Delete failed'));
                        },
                    });
                });
            },
        });
    };

    return (
        <>
            <Card
                className={cn(
                    'p-4 hover:shadow-md transition-shadow',
                    isCompleted && 'opacity-75 bg-gray-50',
                    isOverdue && !isCompleted && 'border-red-300 bg-red-50'
                )}
            >
                <div className="flex items-start gap-3">
                    {/* Activity Type Icon */}
                    <ActivityTypeIcon type={activity.type} size="md" />

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h4 className="font-semibold text-gray-900">
                                        {activity.subject || config.label}
                                    </h4>
                                    {isCompleted && (
                                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                            <Check className="h-3 w-3 mr-1" />
                                            Completed
                                        </Badge>
                                    )}
                                    {isOverdue && !isCompleted && (
                                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                            <AlertCircle className="h-3 w-3 mr-1" />
                                            Overdue
                                        </Badge>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Avatar className="h-5 w-5">
                                        <AvatarImage src={activity.user.avatar} />
                                        <AvatarFallback className="text-xs">
                                            {activity.user.name.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span>{activity.user.name}</span>
                                    <span>•</span>
                                    <span>{formatDistanceToNow(parseISO(activity.created_at), { addSuffix: true })}</span>
                                </div>
                            </div>

                            {/* Actions Menu */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {config.canBeCompleted && !isCompleted && (
                                        <>
                                            <DropdownMenuItem onClick={handleComplete} disabled={isCompleting}>
                                                <Check className="mr-2 h-4 w-4" />
                                                Mark as Completed
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                        </>
                                    )}
                                    <DropdownMenuItem onClick={() => onEdit?.(activity)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Description */}
                        {activity.description && (
                            <p className="text-sm text-gray-700 mb-3 whitespace-pre-wrap">
                                {activity.description}
                            </p>
                        )}

                        {/* Metadata */}
                        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                            {isScheduled && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    <span>
                                        {format(parseISO(activity.scheduled_at!), 'MMM d, yyyy h:mm a')}
                                    </span>
                                </div>
                            )}
                            {activity.duration && (
                                <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    <span>{activity.duration}</span>
                                </div>
                            )}
                            {activity.outcome && (
                                <Badge variant="outline">
                                    {activity.outcome.replace('_', ' ')}
                                </Badge>
                            )}
                        </div>

                        {/* Completed At */}
                        {isCompleted && (
                            <div className="mt-2 text-xs text-gray-500">
                                Completed {formatDistanceToNow(parseISO(activity.completed_at!), { addSuffix: true })}
                            </div>
                        )}
                    </div>
                </div>
            </Card>
            <ConfirmDialog />
        </>
    );
}