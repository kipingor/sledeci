import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { LeadStatusBadge } from '@/components/ui/status-badge';
import { Textarea } from '@/components/ui/textarea';
import { LeadStatus } from '@/types/models';
import { Lead } from '@/types/models.types';
import { router } from '@inertiajs/react';
import { ChevronDown, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import axios from 'axios';

interface LeadStatusTransitionProps {
    lead: Lead;
    onUpdate?: () => void;
}

interface StatusTransitionOption {
    value: LeadStatus;
    label: string;
    color: string;
    timestamp_field: string | null;
}

export function LeadStatusTransition({ lead, onUpdate }: LeadStatusTransitionProps) {
    const [open, setOpen] = useState(false);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<LeadStatus | null>(null);
    const [reason, setReason] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [validTransitions, setValidTransitions] = useState<StatusTransitionOption[]>([]);
    const [isLoadingTransitions, setIsLoadingTransitions] = useState(true);

    // Fetch valid transitions from API
    useEffect(() => {
        const fetchTransitions = async () => {
            setIsLoadingTransitions(true);
            try {
                const response = await axios.get(
                    `/api/v1/leads/${lead.id}/available-transitions`
                );
                setValidTransitions(response.data.data);
            } catch (error) {
                console.error('Failed to fetch transitions:', error);
                toast.error('Failed to load available status transitions');
            } finally {
                setIsLoadingTransitions(false);
            }
        };

        fetchTransitions();
    }, [lead.id, lead.status]);

    const handleStatusSelect = (status: LeadStatus) => {
        if (status === LeadStatus.LOST) {
            // Show reason dialog for LOST status
            setSelectedStatus(status);
            setIsDialogOpen(true);
            setOpen(false);
        } else {
            handleTransition(status);
        }
    };

    const handleTransition = async (status: LeadStatus, lostReason?: string) => {
        setIsSubmitting(true);

        try {
            router.post(
                `/api/v1/leads/${lead.id}/transition`,
                {
                    status,
                    reason: lostReason,
                },
                {
                    onSuccess: (response) => {
                        const message = String(response.props?.message || `Lead status updated to ${status}`);
                        toast.success(message);
                        setIsDialogOpen(false);
                        setReason('');
                        onUpdate?.();
                    },
                    onError: (errors: any) => {
                        // Check for validation error with details
                        if (errors.details?.allowed_transitions) {
                            const allowedLabels = errors.details.allowed_transitions
                                .map((t: any) => t.label)
                                .join(', ');
                            
                            toast.error(
                                `Invalid transition. Allowed transitions: ${allowedLabels}`,
                                { duration: 6000 }
                            );
                        } else if (errors.errors?.status) {
                            // Validation error
                            toast.error(errors.errors.status[0] || 'Invalid status transition');
                        } else {
                            // Generic error
                            toast.error(
                                errors.message || 'Failed to update lead status',
                            );
                        }
                    },
                    onFinish: () => {
                        setIsSubmitting(false);
                    },
                },
            );
        } catch (error) {
            console.error('Transition error:', error);
            toast.error('Failed to update lead status');
            setIsSubmitting(false);
        }
    };

    const handleLostSubmit = () => {
        if (!reason.trim()) {
            toast.error('Please provide a reason for marking this lead as lost');
            return;
        }
        handleTransition(LeadStatus.LOST, reason);
    };

    if (isLoadingTransitions) {
        return (
            <Button variant="outline" disabled className="gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <LeadStatusBadge status={lead.status} showIcon={false} />
            </Button>
        );
    }

    if (validTransitions.length === 0) {
        return <LeadStatusBadge status={lead.status} />;
    }

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="gap-2">
                        <LeadStatusBadge status={lead.status} showIcon={false} />
                        <ChevronDown className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>Change Status</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {validTransitions.map((transition) => (
                        <DropdownMenuItem
                            key={transition.value}
                            onClick={() => handleStatusSelect(transition.value)}
                            disabled={isSubmitting}
                        >
                            <LeadStatusBadge status={transition.value} />
                        </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Lost Reason Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Mark Lead as Lost</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for marking this lead as lost.
                            This helps improve future lead qualification.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Reason</Label>
                            <Textarea
                                id="reason"
                                placeholder="e.g., Budget constraints, competitor chosen, no longer interested..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDialogOpen(false);
                                setReason('');
                            }}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleLostSubmit}
                            disabled={isSubmitting || !reason.trim()}
                        >
                            {isSubmitting && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Mark as Lost
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}