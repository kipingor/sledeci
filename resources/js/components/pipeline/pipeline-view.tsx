import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    DndContext,
    closestCenter,
    type DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    SortableContext,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import type { Lead } from '@/types';

const AppLayout = ({ children }: React.PropsWithChildren) => (
    <div className="min-h-screen bg-gray-100 text-gray-900">
        <header className="bg-blue-500 text-white p-4">
            <h1 className="text-lg font-bold">Lead Management System</h1>
        </header>
        <main className="p-4">{children}</main>
    </div>
);

// Pipeline View Component
const stages = [
        'New', 'Contacted', 'Qualified', 'Opportunity', 'Proposal Sent', 'Project Won', 'Project Lost'
    ] as const;

type PipelineStage = (typeof stages)[number];

interface PipelineViewProps {
    leads: Lead[];
}

const PipelineView = ({ leads }: PipelineViewProps) => {
    const initialData = stages.reduce<Record<PipelineStage, Lead[]>>((acc, stage) => {
        acc[stage] = leads.filter((lead) => lead.status === stage);
        return acc;
    }, {} as Record<PipelineStage, Lead[]>);

    const [pipeline, setPipeline] = useState<Record<PipelineStage, Lead[]>>(initialData);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeId = String(active.id);
        const overId = String(over.id);
        const activeStage = stages.find((stage) =>
            pipeline[stage].some((lead) => String(lead.id) === activeId),
        );
        const overStage = stages.find(
            (stage) =>
                stage === overId ||
                pipeline[stage].some((lead) => String(lead.id) === overId),
        );

        if (!activeStage || !overStage) return;

        const sourceLeads = pipeline[activeStage];
        const movedLead = sourceLeads.find((lead) => String(lead.id) === activeId);
        if (!movedLead) return;

        const sourceWithoutLead = sourceLeads.filter(
            (lead) => String(lead.id) !== activeId,
        );
        const moved = { ...movedLead, status: overStage };
        const nextPipeline = activeStage === overStage
            ? { ...pipeline, [activeStage]: [...sourceWithoutLead, moved] }
            : {
                ...pipeline,
                [activeStage]: sourceWithoutLead,
                [overStage]: [...pipeline[overStage], moved],
            };

        setPipeline(nextPipeline);
        router.put(`/leads/${movedLead.id}`, { status: overStage }, {
            onError: () => setPipeline(pipeline),
        });
    };

    return (
        <AppLayout>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-7 gap-4">
                    {stages.map((stage) => (
                        <div key={stage} className="bg-gray-200 p-4 rounded-md min-h-[300px]">
                            <h2 className="text-lg font-semibold mb-2">{stage}</h2>
                            <SortableContext items={pipeline[stage].map((lead) => String(lead.id))} strategy={verticalListSortingStrategy}>
                                {pipeline[stage].map((lead) => (
                                    <SortableItem key={lead.id} id={lead.id.toString()} lead={lead} />
                                ))}
                            </SortableContext>
                        </div>
                    ))}
                </div>
            </DndContext>
        </AppLayout>
    );
};

export default PipelineView;
