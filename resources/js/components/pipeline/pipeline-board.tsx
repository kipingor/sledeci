import { useCallback } from "react";
import {
    DndContext,
    PointerSensor,
    closestCenter,
    type DragEndEvent,
    useSensor,
    useSensors,
} from "@dnd-kit/core";
import {
    SortableContext,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable";

import { type Lead, type PipelineStage } from "@/types";
import { usePipeline } from "@/hooks/use-pipeline";
import SortableLeadCard from "./sortable-lead-card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

type PipelineBoardProps = {
    stages?: PipelineStage[];
    leadsByStage?: Record<string, Lead[]>;
};

export default function PipelineBoard({
    stages: initialStages = [],
    leadsByStage = {},
}: PipelineBoardProps) {
    const { stages, itemsByStage, loading, error, moveLead, refresh } = usePipeline({
        stages: initialStages as any, // TEMP: until id types are fixed between PipelineStage and Stage
        leadsByStage,
    });

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 6 },
        })
    );

    const handleDragEnd = useCallback(
        async (event: DragEndEvent) => {
            const { active, over } = event;
            if (!over) return;

            const destination =
                over.data.current?.sortable?.containerId ??
                over.data.current?.containerId;
            const origin =
                active.data.current?.sortable?.containerId ??
                active.data.current?.containerId;

            if (!destination || destination === origin) return;

            await moveLead({
                leadId: active.id as string | number,
                toStageKey: destination,
            });
        },
        [moveLead]
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="flex flex-col items-center gap-4">
                    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                    <p className="text-sm text-muted-foreground">Loading pipeline...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive" className="m-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Pipeline Error</AlertTitle>
                <AlertDescription className="mt-2">
                    {error}
                </AlertDescription>
                <div className="mt-4">
                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={refresh}
                    >
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </div>
            </Alert>
        );
    }

    if (!stages.length) {
        return (
            <div className="p-6 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <AlertCircle className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold">No Pipeline Stages</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                    Configure pipeline stages to start organizing your leads.
                </p>
            </div>
        );
    }

    return (
        <div className="flex gap-4 overflow-x-auto p-4 pb-6">
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
            >
                {stages.map((stage) => {
                    const leads = itemsByStage[stage.key] ?? [];
                    const sortableItems = leads.map((lead) => lead.id);

                    return (
                        <SortableContext
                            key={stage.key}
                            id={stage.key}
                            items={sortableItems}
                            strategy={verticalListSortingStrategy}
                        >
                            <PipelineColumn stage={stage} leads={leads} />
                        </SortableContext>
                    );
                })}
            </DndContext>
        </div>
    );
}

type PipelineColumnProps = {
    stage: PipelineStage;
    leads: Lead[];
};

function PipelineColumn({ stage, leads }: PipelineColumnProps) {
    return (
        <div className="flex w-80 shrink-0 flex-col rounded-xl border bg-background shadow-sm">
            {/* Column Header */}
            <div className="flex items-center justify-between border-b px-4 py-3">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-sm">{stage.name}</h3>
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                        {leads.length}
                    </span>
                </div>
            </div>

            {/* Column Content */}
            <div className="flex-1 overflow-y-auto p-3">
                <div className="flex flex-col gap-3 min-h-[200px]">
                    {leads.length ? (
                        leads.map((lead) => (
                            <SortableLeadCard
                                key={lead.id}
                                lead={lead}
                                stageKey={stage.key}
                            />
                        ))
                    ) : (
                        <div className="flex flex-1 items-center justify-center rounded-lg border-2 border-dashed border-muted p-8 text-center">
                            <p className="text-xs text-muted-foreground">
                                No leads in this stage
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}