import React, { useState } from 'react';
import { router } from '@inertiajs/react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';

// Layout
const AppLayout = ({ children }) => (
    <div className="min-h-screen bg-gray-100 text-gray-900">
        <header className="bg-blue-500 text-white p-4">
            <h1 className="text-lg font-bold">Lead Management System</h1>
        </header>
        <main className="p-4">{children}</main>
    </div>
);

// Pipeline View Component
const PipelineView = ({ leads }) => {
    const stages = [
        'New', 'Contacted', 'Qualified', 'Opportunity', 'Proposal Sent', 'Project Won', 'Project Lost'
    ];

    const initialData = stages.reduce((acc, stage) => {
        acc[stage] = leads.filter((lead) => lead.status === stage);
        return acc;
    }, {});

    const [pipeline, setPipeline] = useState(initialData);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 5,
            },
        })
    );

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const activeStage = Object.keys(pipeline).find(stage => pipeline[stage].some(lead => lead.id.toString() === active.id));
        const overStage = Object.keys(pipeline).find(stage => stage === over.id || pipeline[stage].some(lead => lead.id.toString() === over.id));

        if (!activeStage || !overStage) return;

        const activeLeadIndex = pipeline[activeStage].findIndex(lead => lead.id.toString() === active.id);
        const [movedLead] = pipeline[activeStage].splice(activeLeadIndex, 1);
        movedLead.status = overStage;

        const newOverStageLeads = [...pipeline[overStage], movedLead];

        setPipeline({
            ...pipeline,
            [activeStage]: [...pipeline[activeStage]],
            [overStage]: newOverStageLeads,
        });

        try {
            await router.put(`/leads/${movedLead.id}`, { status: overStage });
        } catch (err) {
            // router.put returns a visit; any errors are surfaced via Inertia flash/errors
            console.error('Failed to update lead status', err);
        }
    };

    return (
        <AppLayout>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <div className="grid grid-cols-7 gap-4">
                    {stages.map((stage) => (
                        <div key={stage} className="bg-gray-200 p-4 rounded-md min-h-[300px]">
                            <h2 className="text-lg font-semibold mb-2">{stage}</h2>
                            <SortableContext items={pipeline[stage].map(l => l.id.toString())} strategy={verticalListSortingStrategy}>
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
