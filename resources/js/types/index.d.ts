import { InertiaLinkProps } from '@inertiajs/react';
import { LucideIcon } from 'lucide-react';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: LucideIcon | null;
    isActive?: boolean;
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    sidebarOpen: boolean;
    [key: string]: unknown;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    two_factor_enabled?: boolean;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
}

/** Represents a single sales lead in the pipeline */
export interface Lead {
    id: number | string;
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    status?: string;
    pipeline_stage_key: string; // current stage key
    stage_key?: string;
    owner_id?: number;
    amount?: number;
    updated_at?: string;
    created_at?: string;
    // Flexible shape — backend may add more fields
    [key: string]: any;
}

/** Represents a pipeline stage/column */
export interface Stage {
    key: string;
    name: string;
    description?: string;
    order?: number;
}

export interface Task {
    id: number;
    project_id: number;
    title: string;
    status: string;
    assignee_id?: number;
    endAt?: string;
    created_at?: string;
    updated_at?: string;
}

export interface ActivityLog {
    id: number;
    user_id: number;
    event: string;
    description: string;
    subject_id?: number;
    subject_type?: string;
    changes?: string;
    created_at?: string;
    updated_at?: string;
}

export type ID = number | string;

export interface Lead {
    id: ID;
    title?: string;
    name?: string;
    client_name?: string;
    status?: string;
    pipeline_stage_key?: string;
    [key: string]: any;
}

export interface Stage {
    key: string;
    name: string;
}

export interface BreadcrumbItem {
    title: string;
    href?: string;
}

export interface SharedData {
    user?: User | null;
    [key: string]: any;
}

export interface ActivityLog {
    id: ID;
    description: string;
    created_at: string;
    [key: string]: any;
}

export interface User {
    id: ID;
    name?: string;
    email?: string;
    [key: string]: any;
}

export interface NavItem {
    title: string;
    href?: string;
    icon?: string;
}

export interface PaginatedData<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    [key: string]: any;
}

export interface NavGroup {
    title: string;
    items: NavItem[];
}

export interface Task {
    id: ID;
    title: string;
    status?: string;
    [key: string]: any;
}

export interface LeadFormData {
    name: string;
    company?: string;
    email?: string;
    phone?: string;
    status?: string;
    pipeline_stage_key?: string;
    amount?: number;
    [key: string]: any;
}