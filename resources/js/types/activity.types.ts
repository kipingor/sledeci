/**
 * Activity Type Definitions
 */

export enum ActivityType {
    CALL = 'call',
    EMAIL = 'email',
    MEETING = 'meeting',
    NOTE = 'note',
    TASK = 'task',
}

export interface Activity {
    id: number;
    lead_id: number;
    user_id: number;
    type: ActivityType;
    subject: string | null;
    description: string | null;
    scheduled_at: string | null;
    completed_at: string | null;
    duration: string | null;
    outcome: string | null;
    metadata: Record<string, any> | null;
    created_at: string;
    updated_at: string;
    user: {
        id: number;
        name: string;
        email: string;
        avatar?: string;
    };
}

export interface ActivityFormData {
    type: ActivityType;
    subject?: string;
    description?: string;
    scheduled_at?: string;
    duration?: string;
    outcome?: string;
    metadata?: Record<string, any>;
}

export interface ActivityStatistics {
    total: number;
    completed: number;
    pending: number;
    overdue: number;
    by_type: {
        [key in ActivityType]: {
            label: string;
            count: number;
            completed: number;
        };
    };
}

export interface ActivityTypeConfig {
    value: ActivityType;
    label: string;
    icon: string;
    color: string;
    requiresScheduling: boolean;
    canBeCompleted: boolean;
}

export const ACTIVITY_TYPE_CONFIGS: Record<ActivityType, ActivityTypeConfig> = {
    [ActivityType.CALL]: {
        value: ActivityType.CALL,
        label: 'Phone Call',
        icon: 'phone',
        color: 'blue',
        requiresScheduling: true,
        canBeCompleted: true,
    },
    [ActivityType.EMAIL]: {
        value: ActivityType.EMAIL,
        label: 'Email',
        icon: 'mail',
        color: 'purple',
        requiresScheduling: false,
        canBeCompleted: false,
    },
    [ActivityType.MEETING]: {
        value: ActivityType.MEETING,
        label: 'Meeting',
        icon: 'calendar',
        color: 'green',
        requiresScheduling: true,
        canBeCompleted: true,
    },
    [ActivityType.NOTE]: {
        value: ActivityType.NOTE,
        label: 'Note',
        icon: 'file-text',
        color: 'gray',
        requiresScheduling: false,
        canBeCompleted: false,
    },
    [ActivityType.TASK]: {
        value: ActivityType.TASK,
        label: 'Task',
        icon: 'check-square',
        color: 'orange',
        requiresScheduling: true,
        canBeCompleted: true,
    },
};

export const ACTIVITY_OUTCOMES = [
    { value: 'interested', label: 'Interested' },
    { value: 'not_interested', label: 'Not Interested' },
    { value: 'callback', label: 'Callback Requested' },
    { value: 'voicemail', label: 'Left Voicemail' },
    { value: 'no_answer', label: 'No Answer' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' },
    { value: 'rescheduled', label: 'Rescheduled' },
];

export const DURATION_OPTIONS = [
    { value: '15 minutes', label: '15 minutes' },
    { value: '30 minutes', label: '30 minutes' },
    { value: '45 minutes', label: '45 minutes' },
    { value: '1 hour', label: '1 hour' },
    { value: '1.5 hours', label: '1.5 hours' },
    { value: '2 hours', label: '2 hours' },
    { value: '3 hours', label: '3 hours' },
    { value: 'All day', label: 'All day' },
];