/**
 * OpportunityKanbanColumn — Amber Obsidian redesign
 * All handleQuickAdd logic preserved exactly.
 */
import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { OpportunityCardEnhanced } from './opportunity-card';
import { QuickAddCard } from '@/components/ui/quick-add-card';
import type { Opportunity } from '@/types/opportunity.types';
import { OpportunityKanbanColumn as KanbanColumnData, OPPORTUNITY_STAGE_CONFIGS } from '@/types/opportunity.types';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', notation: 'compact', maximumFractionDigits: 0 }).format(n);

// Map the generic config color name → Tailwind classes (amber-obsidian palette)
const COLOR_DOT: Record<string, string> = {
    gray:   'bg-slate-400',
    blue:   'bg-sky-500',
    orange: 'bg-amber-500',
    green:  'bg-emerald-500',
    red:    'bg-red-500',
    purple: 'bg-violet-500',
};
const COLOR_HEADER: Record<string, string> = {
    gray:   'border-slate-200/60',
    blue:   'border-sky-200/60',
    orange: 'border-amber-200/60',
    green:  'border-emerald-200/60',
    red:    'border-red-200/60',
    purple: 'border-violet-200/60',
};

interface OpportunityKanbanColumnProps {
    column: KanbanColumnData;
    onAddOpportunity: () => void;
    onEditOpportunity: (opportunity: Opportunity) => void;
    onUpdate: () => void;
}

function SortableOpportunityCard({ opportunity, onEdit, onUpdate }: {
    opportunity: Opportunity;
    onEdit: (opp: Opportunity) => void;
    onUpdate: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: opportunity.id.toString() });

    return (
        <div ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition }}
            {...attributes} {...listeners}>
            <OpportunityCardEnhanced
                opportunity={opportunity}
                onEdit={onEdit}
                onUpdate={onUpdate}
                isDragging={isDragging}
            />
        </div>
    );
}

export function OpportunityKanbanColumn({ column, onAddOpportunity, onEditOpportunity, onUpdate }: OpportunityKanbanColumnProps) {
    const { setNodeRef, isOver } = useDroppable({ id: column.stage });
    const config = OPPORTUNITY_STAGE_CONFIGS[column.stage];

    const handleQuickAdd = async (title: string) => {
        return new Promise<void>((resolve, reject) => {
            router.post('/api/v1/opportunities', {
                title,
                stage: column.stage,
                amount: 0,
                probability: config.defaultProbability,
                lead_id: 1,
            }, {
                preserveScroll: true,
                onSuccess: () => { toast.success('Opportunity added'); onUpdate(); resolve(); },
                onError: (errors) => { toast.error((errors as any).message || 'Failed to add opportunity'); reject(new Error('Failed to add')); },
            });
        });
    };

    const dotCls    = COLOR_DOT[config.color]    ?? COLOR_DOT.gray;
    const headerCls = COLOR_HEADER[config.color] ?? COLOR_HEADER.gray;

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'shrink-0 w-72 flex flex-col rounded-xl border transition-all',
                isOver
                    ? 'border-primary/50 bg-primary/5 shadow-md'
                    : 'border-border bg-muted/20'
            )}
        >
            {/* Column header */}
            <div className={cn('px-3 py-2.5 border-b rounded-t-xl bg-card', headerCls)}>
                {/* Stage name + count */}
                <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                        <span className={cn('h-2.5 w-2.5 rounded-full shrink-0', dotCls)} />
                        <h3 className="font-semibold text-sm text-foreground">{config.label}</h3>
                        <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground min-w-[20px] text-center">
                            {column.total_count}
                        </span>
                    </div>
                </div>
                {/* Value strip */}
                <div className="flex items-center justify-between text-[11px] text-muted-foreground pl-4">
                    <span>{fmt(column.total_value)}</span>
                    <span className="text-muted-foreground/60">
                        {fmt(column.weighted_value)} weighted
                    </span>
                </div>
            </div>

            {/* Opportunities list */}
            <div className="flex-1 overflow-y-auto p-2.5 space-y-2 max-h-[calc(100vh-280px)]">
                {column.opportunities.length === 0 ? (
                    <div className={cn(
                        'flex items-center justify-center rounded-lg border-2 border-dashed py-8 text-center',
                        isOver ? 'border-primary/40 bg-primary/5' : 'border-border/40'
                    )}>
                        <p className="text-xs text-muted-foreground">
                            {isOver ? 'Drop here' : 'No opportunities'}
                        </p>
                    </div>
                ) : (
                    column.opportunities.map(opportunity => (
                        <SortableOpportunityCard
                            key={opportunity.id}
                            opportunity={opportunity}
                            onEdit={onEditOpportunity}
                            onUpdate={onUpdate}
                        />
                    ))
                )}
            </div>

            {/* Quick add */}
            <div className="p-2.5 border-t border-border/50">
                <QuickAddCard
                    onAdd={handleQuickAdd}
                    placeholder={`Add ${config.label.toLowerCase()}…`}
                    buttonText="Add"
                />
            </div>
        </div>
    );
}