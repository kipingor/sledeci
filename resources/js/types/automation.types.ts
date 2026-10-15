/**
 * Automation Type Definitions
 */

export interface ProjectTemplate {
    id: number;
    created_by: number;
    name: string;
    description: string | null;
    is_active: boolean;
    is_default: boolean;
    settings: Record<string, any> | null;
    estimated_duration_days: number | null;
    created_at: string;
    updated_at: string;
    
    // Relationships
    creator?: {
        id: number;
        name: string;
        email: string;
    };
    tasks?: ProjectTemplateTask[];
}

export interface ProjectTemplateTask {
    id: number;
    template_id: number;
    title: string;
    description: string | null;
    order: number;
    start_day_offset: number;
    duration_days: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    checklist: string[] | null;
    metadata: Record<string, any> | null;
    created_at: string;
    updated_at: string;
}

export interface ProjectTemplateFormData {
    name: string;
    description?: string;
    is_active: boolean;
    is_default: boolean;
    estimated_duration_days?: number;
    tasks: ProjectTemplateTaskFormData[];
}

export interface ProjectTemplateTaskFormData {
    title: string;
    description?: string;
    order: number;
    start_day_offset: number;
    duration_days: number;
    priority: 'low' | 'medium' | 'high' | 'critical';
    status: string;
    checklist?: string[];
}

export enum AutomationTriggerType {
    LEAD_STATUS_CHANGED = 'lead_status_changed',
    OPPORTUNITY_WON = 'opportunity_won',
    LEAD_CREATED = 'lead_created',
    TASK_COMPLETED = 'task_completed',
}

export enum AutomationActionType {
    CREATE_PROJECT = 'create_project',
    SEND_EMAIL = 'send_email',
    CREATE_TASK = 'create_task',
    SEND_NOTIFICATION = 'send_notification',
}

export interface AutomationRule {
    id: number;
    created_by: number;
    name: string;
    description: string | null;
    trigger_type: AutomationTriggerType;
    trigger_conditions: Record<string, any>;
    action_type: AutomationActionType;
    action_config: Record<string, any>;
    is_active: boolean;
    execution_count: number;
    last_executed_at: string | null;
    created_at: string;
    updated_at: string;
    
    // Relationships
    creator?: {
        id: number;
        name: string;
        email: string;
    };
}

export interface AutomationRuleFormData {
    name: string;
    description?: string;
    trigger_type: AutomationTriggerType;
    trigger_conditions: Record<string, any>;
    action_type: AutomationActionType;
    action_config: Record<string, any>;
    is_active: boolean;
}

export interface AutomationLog {
    id: number;
    automation_rule_id: number;
    triggerable_type: string;
    triggerable_id: number;
    status: 'success' | 'failed' | 'processing';
    payload: Record<string, any> | null;
    result: Record<string, any> | null;
    error_message: string | null;
    executed_at: string;
    created_at: string;
    updated_at: string;
    
    // Relationships
    rule?: AutomationRule;
}

export interface AutomationStatistics {
    total_rules: number;
    active_rules: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    success_rate: number;
    recent_logs: AutomationLog[];
}

// Helper type for trigger conditions by type
export type TriggerConditions = {
    lead_status_changed: {
        status: string;
        old_status?: string;
    };
    opportunity_won: Record<string, never>;
    lead_created: {
        source?: string;
        type?: string;
    };
    task_completed: {
        project_id?: number;
    };
};

// Helper type for action config by type
export type ActionConfig = {
    create_project: {
        template_id: number;
        name_template: string;
        description_template?: string;
        status?: string;
        owner_id?: number;
    };
    send_email: {
        to: string;
        subject: string;
        body: string;
    };
    create_task: {
        title: string;
        description?: string;
        priority?: string;
        assigned_to?: number;
    };
    send_notification: {
        user_id: number;
        message: string;
    };
};

export const PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low', color: 'gray' },
    { value: 'medium', label: 'Medium', color: 'blue' },
    { value: 'high', label: 'High', color: 'orange' },
    { value: 'critical', label: 'Critical', color: 'red' },
] as const;

export const TRIGGER_TYPE_LABELS: Record<AutomationTriggerType, string> = {
    [AutomationTriggerType.LEAD_STATUS_CHANGED]: 'Lead Status Changed',
    [AutomationTriggerType.OPPORTUNITY_WON]: 'Opportunity Won',
    [AutomationTriggerType.LEAD_CREATED]: 'Lead Created',
    [AutomationTriggerType.TASK_COMPLETED]: 'Task Completed',
};

export const ACTION_TYPE_LABELS: Record<AutomationActionType, string> = {
    [AutomationActionType.CREATE_PROJECT]: 'Create Project',
    [AutomationActionType.SEND_EMAIL]: 'Send Email',
    [AutomationActionType.CREATE_TASK]: 'Create Task',
    [AutomationActionType.SEND_NOTIFICATION]: 'Send Notification',
};