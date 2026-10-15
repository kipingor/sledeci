import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '@/lib/axios';
import { toast } from 'sonner';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter,
    DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form, FormControl, FormField, FormItem, FormLabel,
    FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Loader2 } from 'lucide-react';
import type { Opportunity } from '@/types/opportunity.types';
import { OpportunityStage, OPPORTUNITY_STAGE_CONFIGS } from '@/types/opportunity.types';

const opportunitySchema = z.object({
    lead_id: z.number().min(1).optional(),

    title: z.string().min(1, 'Title is required').max(255),
    description: z.string().max(5000).optional(),

    estimated_value: z.number().min(0, 'Amount must be positive'),
    probability: z.number().min(0).max(100).nullish(),
    stage: z.nativeEnum(OpportunityStage),
    expected_close_date: z.string().optional(),
    contact_name: z.string().max(255).optional(),
    contact_email: z.string().email('Must be a valid email').optional().or(z.literal('')),
    contact_phone: z.string().max(50).optional(),
});

type OpportunityFormValues = z.infer<typeof opportunitySchema>;

interface OpportunityFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    opportunity?: Opportunity;
    leadId?: number;
    onSuccess?: () => void;
}

export function OpportunityFormModal({
    open,
    onOpenChange,
    opportunity,
    leadId,
    onSuccess,
}: OpportunityFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!opportunity;

    const form = useForm<OpportunityFormValues>({
        resolver: zodResolver(opportunitySchema),
        defaultValues: {
            lead_id:             opportunity?.lead_id ?? leadId ?? undefined,
            title:               opportunity?.title ?? '',
            description:         opportunity?.description ?? '',
            estimated_value:     opportunity?.estimated_value ?? opportunity?.amount ?? 0,
            probability:         opportunity?.probability ?? 30,
            stage:               opportunity?.stage ?? OpportunityStage.QUALIFICATION,
            expected_close_date: opportunity?.expected_close_date ?? '',
            contact_name:        opportunity?.contact_name ?? '',
            contact_email:       opportunity?.contact_email ?? '',
            contact_phone:       opportunity?.contact_phone ?? '',
        },
    });

    const selectedStage  = form.watch('stage');
    const probability    = form.watch('probability') ?? 0;
    const estimatedValue = form.watch('estimated_value') ?? 0;

    useEffect(() => {
        if (selectedStage && !isEditing) {
            const defaultProb = OPPORTUNITY_STAGE_CONFIGS[selectedStage].defaultProbability;
            form.setValue('probability', defaultProb);
        }
    }, [selectedStage, isEditing, form.setValue]);

    useEffect(() => {
        if (opportunity) {
            form.reset({
                lead_id:             opportunity.lead_id,
                title:               opportunity.title,
                description:         opportunity.description ?? '',
                estimated_value:     opportunity.estimated_value ?? opportunity.amount ?? 0,
                probability:         opportunity.probability ?? 0,
                stage:               opportunity.stage,
                expected_close_date: opportunity.expected_close_date ?? '',
                contact_name:        opportunity.contact_name ?? '',
                contact_email:       opportunity.contact_email ?? '',
                contact_phone:       opportunity.contact_phone ?? '',
            });
        } else if (leadId) {
            form.reset({
                lead_id:             leadId,
                title:               '',
                description:         '',
                estimated_value:     0,
                probability:         30,
                stage:               OpportunityStage.QUALIFICATION,
                expected_close_date: '',
                contact_name:        '',
                contact_email:       '',
                contact_phone:       '',
            });
        }
    }, [opportunity, leadId]);

    const onSubmit = async (data: OpportunityFormValues) => {
        setIsSubmitting(true);

        const payload = {
            ...data,
            // Strip empty strings for nullable fields — backend rejects '' for email
            contact_email:       data.contact_email       || undefined,
            contact_name:        data.contact_name        || undefined,
            contact_phone:       data.contact_phone       || undefined,
            description:         data.description         || undefined,
            expected_close_date: data.expected_close_date || undefined,
            // Omit lead_id entirely if not set — backend accepts nullable
            lead_id:             data.lead_id             || undefined,
        };

        try {
            if (isEditing) {
                await api.put(`/opportunities/${opportunity!.id}`, payload);
            } else {
                await api.post('/opportunities', payload);
            }

            toast.success(isEditing ? 'Opportunity updated' : 'Opportunity created');
            onOpenChange(false);
            form.reset();
            onSuccess?.();
        } catch (err: any) {
            const responseData = err?.response?.data;
            if (responseData?.errors && typeof responseData.errors === 'object') {
                Object.entries(responseData.errors as Record<string, string | string[]>).forEach(
                    ([field, messages]) => {
                        form.setError(field as keyof OpportunityFormValues, {
                            message: Array.isArray(messages) ? messages[0] : messages,
                        });
                    }
                );
            } else {
                toast.error(responseData?.message || err?.message || 'Failed to save opportunity');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Opportunity' : 'Create Opportunity'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the opportunity details below.'
                            : 'Create a new opportunity to track this deal.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        {/* Title */}
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Title</FormLabel>
                                    <FormControl>
                                        <Input placeholder="e.g., Enterprise License Deal" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Description */}
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Description</FormLabel>
                                    <FormControl>
                                        <Textarea
                                            placeholder="Add details about this opportunity..."
                                            rows={3}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Deal Value and Stage */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="estimated_value"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Deal Value</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                placeholder="0.00"
                                                value={field.value ?? ''}
                                                onChange={(e) => {
                                                    const raw = e.target.value;
                                                    if (raw === '' || raw === '.') {
                                                        field.onChange(0);
                                                    } else {
                                                        const n = parseFloat(raw);
                                                        if (!isNaN(n)) field.onChange(n);
                                                    }
                                                }}
                                                onBlur={field.onBlur}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="stage"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Stage</FormLabel>
                                        <Select value={field.value} onValueChange={field.onChange}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {Object.values(OpportunityStage).map((stage) => (
                                                    <SelectItem key={stage} value={stage}>
                                                        {OPPORTUNITY_STAGE_CONFIGS[stage].label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Probability Slider */}
                        <FormField
                            control={form.control}
                            name="probability"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Win Probability: {probability}%</FormLabel>
                                    <FormControl>
                                        <Slider
                                            min={0} max={100} step={5}
                                            value={[field.value ?? 0]}
                                            onValueChange={(vals) => field.onChange(vals[0])}
                                        />
                                    </FormControl>
                                    <FormDescription>
                                        Weighted value: $
                                        {(estimatedValue * (probability / 100)).toLocaleString(
                                            undefined,
                                            { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                                        )}
                                    </FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Expected Close Date */}
                        <FormField
                            control={form.control}
                            name="expected_close_date"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Expected Close Date</FormLabel>
                                    <FormControl>
                                        <Input type="date" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Contact Information */}
                        <div className="space-y-3">
                            <h4 className="text-sm font-medium text-muted-foreground">
                                Contact Information (Optional)
                            </h4>

                            <FormField
                                control={form.control}
                                name="contact_name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Contact Name</FormLabel>
                                        <FormControl>
                                            <Input placeholder="John Doe" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="contact_email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input type="email" placeholder="john@example.com" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="contact_phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Phone</FormLabel>
                                            <FormControl>
                                                <Input placeholder="+1 (555) 000-0000" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isSubmitting}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                {isEditing ? 'Update' : 'Create'} Opportunity
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}