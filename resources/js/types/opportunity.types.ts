// ── Stage enum (must mirror app/Enums/OpportunityStage.php) ──────────────────
export enum OpportunityStage {
    QUALIFICATION = 'qualification',
    PROPOSAL = 'proposal',
    NEGOTIATION = 'negotiation',
    CLOSED_WON = 'closed_won',
    CLOSED_LOST = 'closed_lost',
}

// ── Stage configs ─────────────────────────────────────────────────────────────
// - Ensures parity with the backend enum.
// - `isClosed` boolean enables logical evaluation in component logic.
// - `color` is a CSS color name for safe use with utility classes.
export const OPPORTUNITY_STAGE_CONFIGS: Record<
    OpportunityStage,
    {
        label: string;
        /** Bare color name for dynamic Tailwind classnames. */
        color: 'gray' | 'blue' | 'orange' | 'green' | 'red';
        bgClass: string;
        defaultProbability: number;
        isClosed: boolean;
    }
> = {
    [OpportunityStage.QUALIFICATION]: {
        label: 'Qualification',
        color: 'gray',
        bgClass: 'bg-gray-100',
        defaultProbability: 10,
        isClosed: false,
    },
    [OpportunityStage.PROPOSAL]: {
        label: 'Proposal',
        color: 'blue',
        bgClass: 'bg-blue-100',
        defaultProbability: 30,
        isClosed: false,
    },
    [OpportunityStage.NEGOTIATION]: {
        label: 'Negotiation',
        color: 'orange',
        bgClass: 'bg-orange-100',
        defaultProbability: 60,
        isClosed: false,
    },
    [OpportunityStage.CLOSED_WON]: {
        label: 'Closed Won',
        color: 'green',
        bgClass: 'bg-green-100',
        defaultProbability: 100,
        isClosed: true,
    },
    [OpportunityStage.CLOSED_LOST]: {
        label: 'Closed Lost',
        color: 'red',
        bgClass: 'bg-red-100',
        defaultProbability: 0,
        isClosed: true,
    },
};

// ── Gantt chart types and utils ───────────────────────────────────────────────
import { addDays } from 'date-fns';

export interface GanttStatus {
    id: string;
    name: string;
    color: string;
}

/**
 * Task type for Gantt chart rows.
 * Accepts legacy "title", modern "name",
 * and arbitrary extra properties for flexibility.
 */
export type Task = {
    id: number | string;
    name?: string;
    title?: string;
    startAt?: string | Date;
    endAt?: string | Date;
    status?: GanttStatus | string;
    [key: string]: any;
}

// ── Opportunity model ─────────────────────────────────────────────────────────
/**
 * Base Opportunity interface matching backend model closely.
 * - Unified probability/value types, including both "amount" (API) and "estimated_value" (SQL)
 * - Includes extra fields accessed from the opportunity card/components.
 * - Supports optional eager-loaded relationships.
 */
export interface Opportunity {
    id: number;
    lead_id: number;
    title: string;
    description?: string | null;

    /** API/DB value: see migration in backend for unification */
    amount?: number;
    estimated_value?: number;

    probability: number;
    weighted_value?: number;

    stage: OpportunityStage;
    expected_close_date?: string | null;
    /** Set by backend when closed (won/lost) */
    closed_at?: string | null;

    contact_name?: string | null;
    contact_email?: string | null;
    contact_phone?: string | null;

    created_at: string;
    updated_at: string;

    // ── Eager-loaded relationships (nullable: may not always be present) ──────
    lead?: {
        id: number;
        title: string;
        [key: string]: unknown;
    } | null;
    owner?: {
        id: number;
        name: string;
        email?: string;
        avatar?: string | null;
    } | null;
}

/**
 * Kanban board column type based on opportunity stages, holding a list of opportunities.
 */
export type OpportunityKanbanColumn = {
    stage: OpportunityStage;
    opportunities: Opportunity[];
    total_count: number;
    total_value: number;
    weighted_value: number;
};