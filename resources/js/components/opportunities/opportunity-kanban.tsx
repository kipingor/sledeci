/**
 * OpportunityKanban — Amber Obsidian redesign
 *
 * All data-fetching, DnD, optimistic update, and form modal logic is
 * preserved exactly. Only the header / search bar JSX is restyled.
 */
import React, { useState, useEffect } from 'react';
import {
    DndContext, DragEndEvent, DragStartEvent, DragOverlay,
    PointerSensor, useSensor, useSensors, closestCorners,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { OpportunityCard } from './opportunity-card';
import { OpportunityFormModal } from './opportunity-form-modal';
import { OpportunityKanbanColumn } from './opportunity-kanban-column';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import { Plus, Search, RefreshCw, Target, TrendingUp, DollarSign } from 'lucide-react';
import { Opportunity, OpportunityStage, OpportunityKanbanColumn as KanbanColumnData } from '@/types/opportunity.types';
import axios from 'axios';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import { cn } from '@/lib/utils';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', notation: 'compact', maximumFractionDigits: 0 }).format(n);

interface OpportunityKanbanProps { className?: string }

export function OpportunityKanban({ className }: OpportunityKanbanProps) {
    const [kanbanData,          setKanbanData]          = useState<Record<string, KanbanColumnData>>({});
    const [isLoading,           setIsLoading]           = useState(true);
    const [isRefreshing,        setIsRefreshing]        = useState(false);
    const [error,               setError]               = useState<string | null>(null);
    const [searchQuery,         setSearchQuery]         = useState('');
    const [activeId,            setActiveId]            = useState<string | null>(null);
    const [isFormOpen,          setIsFormOpen]          = useState(false);
    const [editingOpportunity,  setEditingOpportunity]  = useState<Opportunity | undefined>();
    const [newOpportunityStage, setNewOpportunityStage] = useState<OpportunityStage | undefined>();

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
    );

    const fetchKanbanData = async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        else setIsLoading(true);
        setError(null);
        try {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            const response = await axios.get('/api/v1/opportunities/kanban', { params });
            if (response.data.success) setKanbanData(response.data.data);
        } catch (err: any) {
            setError(err.response?.data?.message || 'Failed to load opportunities');
            toast.error('Failed to load opportunities');
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => { fetchKanbanData(); }, [searchQuery]);

    const handleDragStart = (event: DragStartEvent) => setActiveId(event.active.id as string);

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveId(null);
        if (!over) return;

        const opportunityId = active.id;
        const newStage = over.id as OpportunityStage;

        let opportunity: Opportunity | undefined;
        for (const column of Object.values(kanbanData)) {
            opportunity = column.opportunities.find(opp => opp.id.toString() === opportunityId);
            if (opportunity) break;
        }
        if (!opportunity || opportunity.stage === newStage) return;

        const updatedData = { ...kanbanData };
        const oldColumn = updatedData[opportunity.stage];
        oldColumn.opportunities = oldColumn.opportunities.filter(opp => opp.id.toString() !== opportunityId);
        oldColumn.total_count--;
        const amount = opportunity.amount ?? 0;
        oldColumn.total_value -= amount;
        oldColumn.weighted_value -= opportunity.weighted_value || 0;
        const newColumn = updatedData[newStage];
        const updatedOpportunity = { ...opportunity, stage: newStage };
        newColumn.opportunities.push(updatedOpportunity);
        newColumn.total_count++;
        newColumn.total_value += amount;
        newColumn.weighted_value += opportunity.weighted_value || 0;
        setKanbanData(updatedData);

        router.post(`/api/v1/opportunities/${opportunityId}/move-stage`, { stage: newStage }, {
            preserveScroll: true,
            onSuccess: () => { toast.success('Opportunity moved'); fetchKanbanData(true); },
            onError: (errors) => {
                toast.error((errors as any).message || 'Failed to move opportunity');
                fetchKanbanData(true);
            },
        });
    };

    const handleAddOpportunity   = (stage?: OpportunityStage) => { setNewOpportunityStage(stage); setEditingOpportunity(undefined); setIsFormOpen(true); };
    const handleEditOpportunity  = (opportunity: Opportunity)  => { setEditingOpportunity(opportunity); setNewOpportunityStage(undefined); setIsFormOpen(true); };
    const handleFormSuccess      = ()                           => fetchKanbanData(true);

    const activeOpportunity = activeId
        ? Object.values(kanbanData).flatMap(col => col.opportunities).find(opp => opp.id.toString() === activeId)
        : null;

    if (isLoading && Object.keys(kanbanData).length === 0) return <LoadingState />;

    if (error && Object.keys(kanbanData).length === 0) {
        return (
            <EmptyState 
                icon={Target} 
                title="Failed to load opportunities" 
                description={error}
                action={{
                    label: 'Try Again',
                    onClick: () => fetchKanbanData(true),
                } as any} />
        );
    }

    const totalOpportunities = Object.values(kanbanData).reduce((s, col) => s + col.total_count, 0);
    const totalValue         = Object.values(kanbanData).reduce((s, col) => s + col.total_value, 0);
    const totalWeighted      = Object.values(kanbanData).reduce((s, col) => s + col.weighted_value, 0);

    return (
        <div className={cn('flex flex-col h-full', className)}>

            {/* ── SF sub-header (inside the page header already set by opportunities/index) ── */}
            <div className="bg-card border-b border-border shrink-0">
                {/* Stats strip */}
                <div className="flex divide-x divide-border/60 border-b border-border/60">
                    {[
                        { label: 'Opportunities',   value: totalOpportunities,  icon: Target,     color: 'text-foreground' },
                        { label: 'Pipeline Value',  value: fmt(totalValue),     icon: DollarSign, color: 'text-emerald-700' },
                        { label: 'Weighted Value',  value: fmt(totalWeighted),  icon: TrendingUp, color: 'text-primary' },
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

                {/* Search + actions bar */}
                <div className="flex items-center gap-2 px-4 py-2">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Search opportunities…"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-8 h-7 text-xs"
                        />
                    </div>
                    <Button
                        variant="ghost" size="sm"
                        className="h-7 text-xs gap-1.5 text-muted-foreground"
                        onClick={() => fetchKanbanData(true)}
                        disabled={isRefreshing}
                    >
                        <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                    </Button>
                    <Button
                        size="sm"
                        className="h-7 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => handleAddOpportunity()}
                    >
                        <Plus className="h-3.5 w-3.5" /> Add
                    </Button>
                </div>
            </div>

            {/* ── Kanban board ── */}
            <div className="flex-1 overflow-auto bg-background p-4">
                <DndContext sensors={sensors} collisionDetection={closestCorners}
                    onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                    <div className="flex gap-4 h-full items-start">
                        {Object.values(OpportunityStage).map(stage => {
                            const column = kanbanData[stage] || {
                                stage, label: stage, color: 'gray',
                                opportunities: [], total_count: 0, total_value: 0, weighted_value: 0,
                            };
                            return (
                                <SortableContext key={stage}
                                    items={column.opportunities.map(opp => opp.id.toString())}
                                    strategy={verticalListSortingStrategy}>
                                    <OpportunityKanbanColumn
                                        column={column}
                                        onAddOpportunity={() => handleAddOpportunity(stage)}
                                        onEditOpportunity={handleEditOpportunity}
                                        onUpdate={handleFormSuccess}
                                    />
                                </SortableContext>
                            );
                        })}
                    </div>
                    <DragOverlay>
                        {activeOpportunity && <OpportunityCard opportunity={activeOpportunity} isDragging />}
                    </DragOverlay>
                </DndContext>
            </div>

            <OpportunityFormModal
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                opportunity={editingOpportunity || (newOpportunityStage ? ({ stage: newOpportunityStage } as any) : undefined)}
                onSuccess={handleFormSuccess}
            />
        </div>
    );
}