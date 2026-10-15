import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LeadStatus } from '@/types/models';
import {
    Circle,
    Phone,
    CheckCircle,
    FileText,
    Handshake,
    Trophy,
    XCircle,
    Archive,
    Clock,
    AlertCircle,
    PlayCircle,
    PauseCircle,
    LucideIcon
} from 'lucide-react';

// Status configuration type
export interface StatusConfig {
    label: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
    icon: LucideIcon;
    className: string;
}

// Props interface
interface StatusBadgeProps {
    status: string;
    showIcon?: boolean;
    className?: string;
    config?: Record<string, StatusConfig>;
    size?: 'sm' | 'md' | 'lg';
}

// Lead Status Configuration
export const LEAD_STATUS_CONFIG: Record<LeadStatus, StatusConfig> = {
    new: {
        label: 'New',
        variant: 'default',
        icon: Circle,
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    contacted: {
        label: 'Contacted',
        variant: 'secondary',
        icon: Phone,
        className: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    },
    qualified: {
        label: 'Qualified',
        variant: 'secondary',
        icon: CheckCircle,
        className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    },
    proposal_sent: {
        label: 'Proposal Sent',
        variant: 'secondary',
        icon: FileText,
        className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    },
    negotiation: {
        label: 'Negotiation',
        variant: 'secondary',
        icon: Handshake,
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    won: {
        label: 'Won',
        variant: 'default',
        icon: Trophy,
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    lost: {
        label: 'Lost',
        variant: 'destructive',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
    archived: {
        label: 'Archived',
        variant: 'outline',
        icon: Archive,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    },
};

// Project Status Configuration
export const PROJECT_STATUS_CONFIG: Record<string, StatusConfig> = {
    planning: {
        label: 'Planning',
        variant: 'secondary',
        icon: Clock,
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    active: {
        label: 'Active',
        variant: 'success',
        icon: PlayCircle,
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    on_hold: {
        label: 'On Hold',
        variant: 'warning',
        icon: PauseCircle,
        className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    },
    completed: {
        label: 'Completed',
        variant: 'success',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    cancelled: {
        label: 'Cancelled',
        variant: 'destructive',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
};

// Task Status Configuration
export const TASK_STATUS_CONFIG: Record<string, StatusConfig> = {
    todo: {
        label: 'To Do',
        variant: 'outline',
        icon: Circle,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    },
    in_progress: {
        label: 'In Progress',
        variant: 'info',
        icon: PlayCircle,
        className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    },
    review: {
        label: 'Review',
        variant: 'warning',
        icon: AlertCircle,
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    done: {
        label: 'Done',
        variant: 'success',
        icon: CheckCircle,
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
};

// Opportunity Status Configuration
export const OPPORTUNITY_STATUS_CONFIG: Record<string, StatusConfig> = {
    qualification: {
        label: 'Qualification',
        variant: 'info',
        icon: CheckCircle,
        className: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
    },
    proposal: {
        label: 'Proposal',
        variant: 'secondary',
        icon: FileText,
        className: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
    },
    negotiation: {
        label: 'Negotiation',
        variant: 'warning',
        icon: Handshake,
        className: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    },
    closed_won: {
        label: 'Closed Won',
        variant: 'success',
        icon: Trophy,
        className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    },
    closed_lost: {
        label: 'Closed Lost',
        variant: 'destructive',
        icon: XCircle,
        className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    },
};

// Size configurations
const SIZE_CONFIG = {
    sm: {
        badge: 'text-xs px-2 py-0.5',
        icon: 'h-2.5 w-2.5',
    },
    md: {
        badge: 'text-sm px-2.5 py-0.5',
        icon: 'h-3 w-3',
    },
    lg: {
        badge: 'text-sm px-3 py-1',
        icon: 'h-3.5 w-3.5',
    },
};

export function StatusBadge({
    status,
    showIcon = true,
    className,
    config = LEAD_STATUS_CONFIG,
    size = 'md',
}: StatusBadgeProps) {
    // Get configuration for the status, fallback to default if not found
    const statusConfig = config[status] || {
        label: status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        variant: 'outline' as const,
        icon: Circle,
        className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    };

    const Icon = statusConfig.icon;
    const sizeConfig = SIZE_CONFIG[size];

    return (
        <Badge
            // Only allow allowable variants: "default" | "destructive" | "outline" | "secondary"
            variant={
                (['default', 'destructive', 'outline', 'secondary'] as const).includes(
                    statusConfig.variant as typeof statusConfig.variant & (
                        'default' | 'destructive' | 'outline' | 'secondary'
                    )
                )
                    ? (statusConfig.variant as 'default' | 'destructive' | 'outline' | 'secondary')
                    : 'default'
            }
            className={cn(statusConfig.className, sizeConfig.badge, className)}
        >
            {showIcon && <Icon className={cn('mr-1', sizeConfig.icon)} />}
            {statusConfig.label}
        </Badge>
    );
}

// Specialized status badge components for different entity types
export function LeadStatusBadge(props: Omit<StatusBadgeProps, 'config'>) {
    return <StatusBadge {...props} config={LEAD_STATUS_CONFIG} />;
}

export function ProjectStatusBadge(props: Omit<StatusBadgeProps, 'config'>) {
    return <StatusBadge {...props} config={PROJECT_STATUS_CONFIG} />;
}

export function TaskStatusBadge(props: Omit<StatusBadgeProps, 'config'>) {
    return <StatusBadge {...props} config={TASK_STATUS_CONFIG} />;
}

export function OpportunityStatusBadge(props: Omit<StatusBadgeProps, 'config'>) {
    return <StatusBadge {...props} config={OPPORTUNITY_STATUS_CONFIG} />;
}