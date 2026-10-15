/**
 * leads/pipeline.tsx — Amber Obsidian Pipeline Board
 *
 * Preserves ALL drag-and-drop logic from the original:
 * - dnd-kit DndContext + SortableContext + useDroppable
 * - Stage key (string) used as droppable id to avoid collision with numeric lead ids
 * - Optimistic column update + rollback on API error
 * - LoadingOverlay during move API call
 *
 * Style changes:
 * - Header: SF record-header pattern (icon + title + stats strip)
 * - Columns: obsidian column header, amber active-drop highlight
 * - Cards: white with amber hover border, avatar, owner strip
 * - Error banner: amber/destructive SF-style
 */

import { Head, router } from '@inertiajs/react';
import api from '@/lib/axios';
import { useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import {
    DndContext, DragOverlay, PointerSensor, TouchSensor, closestCorners,
    useSensor, useSensors, useDroppable,
    type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Plus, AlertCircle, Columns, TrendingUp, LayoutGrid, X } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingOverlay } from '@/components/ui/loading-state';
import { cn } from '@/lib/utils';
import { type BreadcrumbItem } from '@/types';
import { format } from 'date-fns';

interface Lead {
    id: number; title: string; status: string;
    pipeline_stage_id: number; created_at: string;
    estimated_value?: number | null;
    owner: { id?: number; name: string; avatar?: string };
}

interface PipelineStage {
    id: number; name: string; key: string; color: string; order: number; leads: Lead[];
}

interface PipelineProps {
    stages: PipelineStage[];
    metrics: { totalLeads: number; totalValue: number; conversionRate: number };
}

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Pipeline', href: '/pipelines' }];

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', notation: 'compact', maximumFractionDigits: 0 }).format(n);

// ── Sortable lead card ────────────────────────────────────────────────────────

function SortableLeadCard({ lead }: { lead: Lead }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id: lead.id, data: { type: 'lead' } });

    return (
        <div
            ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
            {...attributes}
            {...listeners}
        >
            <div className={cn(
                'bg-card border border-border rounded-lg p-3 cursor-grab active:cursor-grabbing',
                'hover:border-primary/40 hover:shadow-sm transition-all group'
            )}>
                <p className="font-medium text-sm text-foreground truncate mb-2 group-hover:text-primary transition-colors">
                    {lead.title}
                </p>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={lead.owner?.avatar} />
                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                {lead.owner?.name?.charAt(0) ?? '?'}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate max-w-[90px]">
                            {lead.owner?.name ?? 'Unassigned'}
                        </span>
                    </div>
                    {lead.estimated_value != null && lead.estimated_value > 0 && (
                        <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                            {fmt(lead.estimated_value)}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Pipeline column ───────────────────────────────────────────────────────────

function PipelineColumn({ stage }: { stage: PipelineStage }) {
    // BUG FIX: use stage.key (string) as droppable id — numeric stage.id collides with lead ids
    const { setNodeRef, isOver } = useDroppable({ id: stage.key });
    const leadCount = stage.leads?.length ?? 0;
    const colValue = (stage.leads ?? []).reduce((s, l) => s + (l.estimated_value ?? 0), 0);

    return (
        <div className="shrink-0 w-64">
            <div className={cn(
                'rounded-xl border h-full flex flex-col transition-colors',
                isOver
                    ? 'border-primary/60 bg-primary/5 shadow-md'
                    : 'border-border bg-muted/30'
            )}>
                {/* Column header */}
                <div className="px-3 py-2.5 border-b border-border rounded-t-xl bg-card">
                    <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                            <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: stage.color || '#94a3b8' }}
                            />
                            <h2 className="font-semibold text-sm text-foreground">{stage.name}</h2>
                            <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground min-w-[20px] text-center">
                                {leadCount}
                            </span>
                        </div>
                        <button
                            className="h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                            onClick={() => router.visit(`/leads/create?stage=${stage.id}`)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                        </button>
                    </div>
                    {colValue > 0 && (
                        <p className="text-[11px] text-muted-foreground pl-4">{fmt(colValue)}</p>
                    )}
                </div>

                {/* BUG FIX: SortableContext id matches useDroppable id so containerId propagates */}
                <div ref={setNodeRef} className="flex-1 p-2.5 overflow-y-auto min-h-[120px]">
                    <SortableContext
                        id={stage.key}
                        items={(stage.leads ?? []).map(l => l.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="space-y-2">
                            {(stage.leads ?? []).map(lead => (
                                <SortableLeadCard key={lead.id} lead={lead} />
                            ))}
                            {leadCount === 0 && (
                                <div className={cn(
                                    'py-8 text-center text-xs text-muted-foreground rounded-lg border-2 border-dashed',
                                    isOver ? 'border-primary/40 bg-primary/5' : 'border-border/50'
                                )}>
                                    {isOver ? 'Drop here' : 'No leads'}
                                </div>
                            )}
                        </div>
                    </SortableContext>
                </div>
            </div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function PipelineView({ stages, metrics }: PipelineProps) {
    const [activeId, setActiveId]   = useState<number | null>(null);
    const [columns,  setColumns]    = useState(stages);
    const [isMoving, setIsMoving]   = useState(false);
    const [error,    setError]      = useState<string | null>(null);

    useEffect(() => { setColumns(stages); }, [stages]);

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor,   { activationConstraint: { delay: 200, tolerance: 8 } }),
    );

    const handleDragStart = ({ active }: DragStartEvent) => setActiveId(active.id as number);

    const handleDragEnd = ({ active, over }: DragEndEvent) => {
        setActiveId(null);
        if (!over) return;

        // BUG FIX: over.id is stage key when dropped on empty zone,
        // or a lead id when dropped on a card — containerId gives the stage key.
        const targetKey: string =
            (over.data.current?.sortable?.containerId as string | undefined) ??
            (typeof over.id === 'string' ? over.id : null) ??
            columns.find(c => c.id === over.id)?.key ?? '';

        const sourceCol = columns.find(c => (c.leads ?? []).some(l => l.id === active.id));
        const targetCol = columns.find(c => c.key === targetKey);
        if (!sourceCol || !targetCol || sourceCol.key === targetCol.key) return;

        const snapshot = columns.map(c => ({ ...c, leads: [...(c.leads ?? [])] }));
        const lead = (sourceCol.leads ?? []).find(l => l.id === active.id)!;

        setColumns(prev => prev.map(col => {
            if (col.key === sourceCol.key) return { ...col, leads: col.leads.filter(l => l.id !== active.id) };
            if (col.key === targetCol.key) return { ...col, leads: [...col.leads, { ...lead, pipeline_stage_id: targetCol.id }] };
            return col;
        }));

        setIsMoving(true);
        api.put(`/leads/${active.id}/move`, { stage_id: targetCol.id })
            .then(() => toast.success('Lead moved'))
            .catch(err => {
                setColumns(snapshot);
                const msg = err?.response?.data?.message || 'Failed to move lead';
                setError(msg);
                toast.error(msg);
            })
            .finally(() => setIsMoving(false));
    };

    const activeLead = activeId
        ? columns.flatMap(c => c.leads ?? []).find(l => l.id === activeId)
        : null;

    const totalLeads = columns.reduce((n, c) => n + (c.leads?.length ?? 0), 0);

    return (
        <>
            <Head title="Pipeline" />
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="flex flex-col h-full">

                    {/* ── SF record header ── */}
                    <div className="bg-card border-b border-border shrink-0">
                        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                    <Columns className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-base font-bold tracking-tight">Pipeline</h1>
                                    <p className="text-xs text-muted-foreground">
                                        {columns.length} stages · {totalLeads} leads
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Live indicator */}
                                <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2.5 py-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    Live
                                </div>
                                <Button
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => router.visit('/leads/create')}
                                >
                                    <Plus className="h-3.5 w-3.5" /> New Lead
                                </Button>
                            </div>
                        </div>

                        {/* Stats strip */}
                        <div className="flex divide-x divide-border/60">
                            {[
                                { label: 'Total Leads',      value: metrics.totalLeads,      icon: LayoutGrid,  color: 'text-foreground' },
                                { label: 'Pipeline Value',   value: fmt(metrics.totalValue), icon: TrendingUp,  color: 'text-emerald-700' },
                                { label: 'Conversion Rate',  value: `${metrics.conversionRate}%`, icon: TrendingUp, color: 'text-primary' },
                            ].map(s => (
                                <div key={s.label} className="flex-1 px-5 py-2.5 flex items-center gap-2.5">
                                    <s.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                    <div>
                                        <p className={cn('text-lg font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Error banner */}
                    {error && (
                        <div className="flex items-start gap-3 px-6 py-3 bg-destructive/5 border-b border-destructive/20 shrink-0">
                            <AlertCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-sm font-medium text-destructive">Move failed</p>
                                <p className="text-xs text-muted-foreground mt-0.5">{error}</p>
                            </div>
                            <button onClick={() => setError(null)} className="text-muted-foreground hover:text-foreground">
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    )}

                    {/* ── Kanban board ── */}
                    <LoadingOverlay isLoading={isMoving} message="Moving lead…">
                        <div className="flex-1 overflow-auto p-5 bg-background">
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCorners}
                                onDragStart={handleDragStart}
                                onDragEnd={handleDragEnd}
                            >
                                <div className="flex gap-4 h-full items-start">
                                    {columns.map(stage => (
                                        <PipelineColumn key={stage.id} stage={stage} />
                                    ))}
                                </div>
                                <DragOverlay>
                                    {activeLead && (
                                        <div className="bg-card border border-primary/40 rounded-lg p-3 w-64 shadow-2xl rotate-1 opacity-90">
                                            <p className="font-medium text-sm text-foreground truncate">{activeLead.title}</p>
                                        </div>
                                    )}
                                </DragOverlay>
                            </DndContext>
                        </div>
                    </LoadingOverlay>
                </div>
            </AppLayout>
        </>
    );
}