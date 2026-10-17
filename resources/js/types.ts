// Shared TypeScript interfaces generated from backend models and used across the frontend.
// These are intentionally conservative — extend fields where your UI requires them.

export type ID = number | string;

export interface User {
    id: ID;
    name?: string;
    email?: string;
    avatar?: string | null;
    // optional runtime fields
    roles?: { id: ID; name: string }[];
    is_admin?: boolean;
    is_client?: boolean;
    two_factor_confirmed_at?: string | null;
    [key: string]: any;
}

export interface BreadcrumbItem {
    title: string;
    href?: any;
}

export interface PipelineStage {    
    id?: ID;
    key: string;
    name: string;
    order?: number;
    color?: string;
}

// legacy alias used across some tests and older code
export type Stage = PipelineStage;

export interface Lead {
    id: ID;
    title?: string;
    description?: string;
    type?: 'document' | 'conversation' | string;
    created_by?: ID;
    owner_id?: ID | null;
    pipeline_stage_id?: ID | null;
    metadata?: Record<string, any>;
    ai_reviewed?: boolean;
    contacted_at?: string | null;
    qualified_at?: string | null;
    converted_to_opportunity_at?: string | null;
    won_at?: string | null;
    lost_at?: string | null;
    archived_at?: string | null;
    // relations commonly hydrated in API responses
    user?: User;
    owner?: User;
    opportunity?: Opportunity;
    pipelineStage?: PipelineStage;
    [key: string]: any;
}

export interface Opportunity {
    id: ID;
    lead_id?: ID;
    title?: string;
    summary?: string;
    estimated_value?: string | number;
    currency?: string;
    stage?: string;
    owner_id?: ID | null;
    expected_close_date?: string | null;
    ai_suggestions?: any[];
    [key: string]: any;
}

export interface Project {
    id: ID;
    opportunity_id?: ID | null;
    name?: string;
    description?: string;
    client_id?: ID | null;
    owner_id?: ID | null;
    status?: string;
    start_date?: string | null;
    end_date?: string | null;
    budget?: string | number;
    currency?: string | null;
    metadata?: Record<string, any>;
    [key: string]: any;
}

export interface Task {
    id?: ID;
    project_id?: ID | null;
    milestone_id?: ID | null;
    title?: string;
    description?: string;
    assigned_to?: ID | null;
    priority?: string;
    status?: string;
    startAt?: string | null;
    endAt?: string | null;
    estimated_hours?: number | null;
    spent_hours?: number | null;
    group?: string | null;
    metadata?: Record<string, any>;
}

export interface ActivityLog {
    id?: ID;
    message?: string;
    created_at?: string | null;
    [key: string]: any;
}

export interface SharedData {
    user?: User | null;
    // Add other shared props (flash messages, feature flags) as needed
    [key: string]: any;
}

import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

export interface NavItem {
    title: string;
    href?: any;
    // Accept either a Lucide React component, a string identifier, or null
    icon?: ComponentType<LucideProps> | string | null;
}

export default {};

// `@/types` resolves to this file (a file wins over the `types/` directory). Re-export the
// starter-kit types (Auth, AppLayoutProps, AppVariant, AuthLayoutProps, FlashToast, NavItem ...)
// so layouts/components that import them from '@/types' type-check. Declarations above take
// precedence over same-named re-exports (User, BreadcrumbItem, ...).
export type * from './types/index';
