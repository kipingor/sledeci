import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import type { Lead } from "@/types";

type SortableLeadCardProps = {
    lead: Lead;
    stageKey?: string;
};

export default function SortableLeadCard({
    lead,
    stageKey,
}: SortableLeadCardProps) {
    const containerKey = stageKey ?? lead.pipeline_stage_key ?? "unknown-stage";
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({
            id: lead.id,
            data: { containerId: containerKey },
        });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="rounded-xl border bg-card p-3 text-left shadow-sm"
        >
            <p className="font-semibold text-xs">{lead.title ?? lead.name ?? "Untitled lead"}</p>
            {lead.client_name && (
                <p className="text-xs text-muted-foreground">{lead.client_name}</p>
            )}
        </div>
    );
}
