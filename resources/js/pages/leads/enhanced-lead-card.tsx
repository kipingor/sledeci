import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { InlineEditableField } from '@/components/ui/inline-editable-field';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash2, DollarSign, User } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';
import type { Lead } from '@/types';
// FIX: was router from @inertiajs/react — use axios for API mutations
import api from '@/lib/axios';

interface EnhancedLeadCardProps {
    lead: Lead;
    stageKey?: string;
    onEdit?: (lead: Lead) => void;
    onUpdate?: () => void;
    isDragging?: boolean;
}

export function EnhancedLeadCard({
    lead,
    stageKey,
    onEdit,
    onUpdate,
    isDragging: isDraggingProp,
}: EnhancedLeadCardProps) {
    const containerKey = stageKey ?? (lead as any).pipeline_stage_key ?? 'unknown-stage';
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: lead.id,
        data: { containerId: containerKey },
    });
    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    // FIX: was router.put('/api/v1/leads/...') — Inertia router is for page navigation
    const handleFieldUpdate = async (field: string, value: string | number): Promise<void> => {
        await api.put(`/leads/${lead.id}`, { [field]: value });
        toast.success('Lead updated');
        onUpdate?.();
    };

    // FIX: was router.delete + native confirm() — use axios + ConfirmDialog
    const handleDelete = async () => {
        await confirmDelete({
            itemName: (lead as any).title || (lead as any).name || 'this lead',
            onConfirm: async () => {
                await api.delete(`/leads/${lead.id}`);
                toast.success('Lead deleted');
                onUpdate?.();
            },
        });
    };

    return (
        <>
            <div ref={setNodeRef} style={style}>
                <Card
                    className={cn(
                        'p-3 cursor-move hover:shadow-md transition-shadow',
                        isDragging && 'opacity-50'
                    )}
                >
                    {/* Header with drag handle */}
                    <div {...attributes} {...listeners} className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                            <InlineEditableField
                                value={(lead as any).title || (lead as any).name || 'Untitled'}
                                onSave={(value) => handleFieldUpdate('title', value)}
                                placeholder="Lead title"
                                displayClassName="font-semibold text-sm truncate"
                            />
                            {(lead as any).client_name && (
                                <p className="text-xs text-muted-foreground truncate mt-1">
                                    {(lead as any).client_name}
                                </p>
                            )}
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MoreVertical className="h-3 w-3" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => onEdit?.(lead)}>
                                    <Edit className="mr-2 h-3 w-3" />
                                    Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                                    <Trash2 className="mr-2 h-3 w-3" />
                                    Delete
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Value */}
                    {(lead as any).estimated_value && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                            <DollarSign className="h-3 w-3" />
                            <InlineEditableField
                                value={(lead as any).estimated_value}
                                onSave={(value) => handleFieldUpdate('estimated_value', value)}
                                type="number"
                                prefix="$"
                                formatDisplay={(val) => `$${Number(val).toLocaleString()}`}
                                displayClassName="font-medium"
                            />
                        </div>
                    )}

                    {/* Owner */}
                    {(lead as any).owner && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            <span className="truncate">{(lead as any).owner.name}</span>
                        </div>
                    )}
                </Card>
            </div>
            <ConfirmDialog />
        </>
    );
}

export default EnhancedLeadCard;