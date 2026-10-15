import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


export default function PipelineColumn({ stage, items }: any) {
    return (
        <div className="rounded-lg border bg-white/60 dark:bg-black/40 p-3">
            <h4 className="font-semibold">{stage.name}</h4>
            <div className="mt-2 flex flex-col gap-2">
                {items.map((item: any) => (
                    <PipelineCard key={item.id} item={item} />
                ))}
            </div>
        </div>
    );
}

function PipelineCard({ item }: any) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: item.id, data: { stageKey: item.stage_key } });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };


    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners} className="rounded border p-3 bg-white">
            <div className="font-semibold">{item.title}</div>
            <div className="text-xs text-muted-foreground">{item.summary}</div>
        </div>
    );
}