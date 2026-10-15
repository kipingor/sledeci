/**
 * OpportunityCard — merged from opportunity-card.tsx + opportunity-card-enhanced.tsx
 *
 * Changes:
 * - Single export: OpportunityCard (OpportunityCardEnhanced deleted)
 * - Inline editing via InlineEditableField (from enhanced version)
 * - All mutations use axios (not Inertia router.post/delete — fixes FIX 5 & 9)
 * - Uses closed_at for overdue check (not just !config.isClosed — more accurate)
 * - opportunity-kanban.tsx and opportunity-kanban-column.tsx both import from here
 */

import React, { useState } from 'react';
import { Opportunity, OPPORTUNITY_STAGE_CONFIGS, OpportunityStage } from '@/types/opportunity.types';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { InlineEditableField } from '@/components/ui/inline-editable-field';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    MoreVertical, Edit, Trash2, DollarSign, Calendar,
    User, TrendingUp, Award, XCircle,
} from 'lucide-react';
import { format, isPast, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';
import api from '@/lib/axios';

interface OpportunityCardProps {
    opportunity: Opportunity;
    onEdit?: (opportunity: Opportunity) => void;
    onUpdate?: () => void;
    isDragging?: boolean;
    /** Whether to show inline-editable fields. Default: true */
    inlineEdit?: boolean;
}

const stageOptions = Object.keys(OPPORTUNITY_STAGE_CONFIGS).map((key) => ({
    label: OPPORTUNITY_STAGE_CONFIGS[key as OpportunityStage].label,
    value: key,
}));

export function OpportunityCard({
    opportunity,
    onEdit,
    onUpdate,
    isDragging,
    inlineEdit = true,
}: OpportunityCardProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

    const config    = OPPORTUNITY_STAGE_CONFIGS[opportunity.stage];
    const isOverdue = opportunity.expected_close_date
        && !opportunity.closed_at
        && isPast(parseISO(opportunity.expected_close_date));

    // All mutations go through axios so React Query / optimistic state works correctly
    const handleFieldUpdate = async (field: string, value: string | number): Promise<void> => {
        try {
            await api.put(`/opportunities/${opportunity.id}`, { [field]: value });
            toast.success('Updated');
            onUpdate?.();
        } catch {
            toast.error('Update failed');
        }
    };

    const handleDelete = async () => {
        await confirmDelete({
            itemName: opportunity.title,
            onConfirm: async () => {
                setIsDeleting(true);
                try {
                    await api.delete(`/opportunities/${opportunity.id}`);
                    toast.success('Opportunity deleted');
                    onUpdate?.();
                } finally {
                    setIsDeleting(false);
                }
            },
        });
    };

    const handleMarkAsWon = async () => {
        try {
            await api.post(`/opportunities/${opportunity.id}/mark-won`);
            toast.success('Marked as won 🎉');
            onUpdate?.();
        } catch {
            toast.error('Failed to mark as won');
        }
    };

    const handleMarkAsLost = async () => {
        try {
            await api.post(`/opportunities/${opportunity.id}/mark-lost`);
            toast.info('Marked as lost');
            onUpdate?.();
        } catch {
            toast.error('Failed to mark as lost');
        }
    };

    return (
        <>
            <Card
                className={cn(
                    'p-4 cursor-move hover:shadow-lg transition-all',
                    isDragging && 'opacity-50 rotate-1 scale-105',
                    isOverdue && 'border-red-300 bg-red-50 dark:bg-red-950/20',
                    config.isClosed && 'opacity-75',
                )}
            >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <div
                                className={cn(
                                    'w-2 h-2 rounded-full shrink-0',
                                    config.color === 'gray'   && 'bg-gray-400',
                                    config.color === 'blue'   && 'bg-blue-500',
                                    config.color === 'orange' && 'bg-orange-500',
                                    config.color === 'green'  && 'bg-green-500',
                                    config.color === 'red'    && 'bg-red-500',
                                )}
                            />
                            {inlineEdit ? (
                                <InlineEditableField
                                    value={opportunity.title}
                                    onSave={(v) => handleFieldUpdate('title', v)}
                                    placeholder="Opportunity title"
                                    displayClassName="font-semibold text-sm truncate"
                                />
                            ) : (
                                <h4 className="font-semibold text-sm truncate">{opportunity.title}</h4>
                            )}
                        </div>
                        {opportunity.lead && (
                            <p className="text-xs text-muted-foreground truncate">
                                {opportunity.lead.title}
                            </p>
                        )}
                    </div>

                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                                <MoreVertical className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onEdit?.(opportunity)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                            </DropdownMenuItem>
                            {!config.isClosed && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={handleMarkAsWon}>
                                        <Award className="mr-2 h-4 w-4 text-green-600" />
                                        Mark as Won
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={handleMarkAsLost}>
                                        <XCircle className="mr-2 h-4 w-4 text-red-600" />
                                        Mark as Lost
                                    </DropdownMenuItem>
                                </>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                                onClick={handleDelete}
                                className="text-red-600"
                                disabled={isDeleting}
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Stage (inline editable) */}
                <div className="mb-3">
                    {inlineEdit ? (
                        <InlineEditableField
                            value={opportunity.stage}
                            onSave={(v) => handleFieldUpdate('stage', v)}
                            type="select"
                            options={stageOptions}
                        />
                    ) : (
                        <Badge variant="outline">{config.label}</Badge>
                    )}
                </div>

                {/* Amount & Probability */}
                <div className="space-y-2 mb-3">
                    <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1 text-foreground">
                            <DollarSign className="h-4 w-4" />
                            {inlineEdit ? (
                                <InlineEditableField
                                    value={opportunity.estimated_value ?? opportunity.amount ?? 0}
                                    onSave={(v) => handleFieldUpdate('estimated_value', v)}
                                    type="number"
                                    formatDisplay={(val) => `$${Number(val).toLocaleString()}`}
                                    displayClassName="font-semibold"
                                />
                            ) : (
                                <span className="font-semibold">
                                    ${(opportunity.estimated_value ?? opportunity.amount ?? 0).toLocaleString()}
                                </span>
                            )}
                        </div>
                        <Badge variant="outline" className="font-mono">
                            {opportunity.probability}%
                        </Badge>
                    </div>
                    <Progress value={opportunity.probability} className="h-2" />
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        <span>
                            Weighted: ${(opportunity.weighted_value ?? 0).toLocaleString()}
                        </span>
                    </div>
                </div>

                {/* Expected Close Date */}
                <div className="mb-2">
                    {inlineEdit ? (
                        <InlineEditableField
                            value={opportunity.expected_close_date ?? ''}
                            onSave={(v) => handleFieldUpdate('expected_close_date', v)}
                            type="date"
                            formatDisplay={(val) => val ? `${format(parseISO(String(val)), 'MMM d, yyyy')}${isOverdue ? ' (Overdue)' : ''}` : ''}
                            displayClassName={cn(
                                'flex items-center gap-1 text-xs',
                                isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                            )}
                        />
                    ) : opportunity.expected_close_date ? (
                        <div className={cn(
                            'flex items-center gap-1 text-xs',
                            isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                        )}>
                            <Calendar className="h-3 w-3" />
                            {format(parseISO(opportunity.expected_close_date), 'MMM d, yyyy')}
                            {isOverdue && ' (Overdue)'}
                        </div>
                    ) : null}
                </div>

                {/* Contact */}
                <div className="mb-3">
                    {inlineEdit ? (
                        <InlineEditableField
                            value={opportunity.contact_name ?? ''}
                            onSave={(v) => handleFieldUpdate('contact_name', v)}
                            placeholder="Add contact"
                            displayClassName="flex items-center gap-1 text-xs text-muted-foreground"
                        />
                    ) : opportunity.contact_name ? (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <User className="h-3 w-3" />
                            {opportunity.contact_name}
                        </div>
                    ) : null}
                </div>

                {/* Owner */}
                {opportunity.owner && (
                    <div className="flex items-center gap-2 pt-3 border-t">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={opportunity.owner.avatar} />
                            <AvatarFallback className="text-xs">
                                {opportunity.owner.name.charAt(0)}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-muted-foreground truncate">
                            {opportunity.owner.name}
                        </span>
                    </div>
                )}
            </Card>
            <ConfirmDialog />
        </>
    );
}

// Keep named export alias so existing imports of OpportunityCardEnhanced don't break
// while the codebase is updated. Remove after updating opportunity-kanban-column.tsx.
export { OpportunityCard as OpportunityCardEnhanced };