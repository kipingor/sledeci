import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import type { Lead } from '@/types';

type Props = {
    id: string;
    lead: Lead;
};

export const SortableItem: React.FC<Props> = ({ id, lead }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
        useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
    } as React.CSSProperties;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className="rounded-xl border bg-card p-3 text-left shadow-sm"
        >
            <p className="font-semibold">{lead.title ?? lead.name ?? 'Untitled'}</p>
            {lead.client_name && (
                <p className="text-sm text-muted-foreground">{lead.client_name}</p>
            )}
        </div>
    );
};

export default SortableItem;
