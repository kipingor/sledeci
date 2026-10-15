import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { router } from '@inertiajs/react';
import { toast } from 'sonner';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import {
    Activity,
    ActivityType,
    ACTIVITY_TYPE_CONFIGS,
    DURATION_OPTIONS,
    ACTIVITY_OUTCOMES,
} from '@/types/activity.types';

const activitySchema = z.object({
    type: z.nativeEnum(ActivityType),
    subject: z.string().optional(),
    description: z.string().max(5000).optional(),
    scheduled_at: z.string().optional(),
    duration: z.string().optional(),
    outcome: z.string().optional(),
});

type ActivityFormValues = z.infer<typeof activitySchema>;

interface ActivityFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    leadId: number;
    activity?: Activity;
    onSuccess?: () => void;
}

export function ActivityFormModal({
    open,
    onOpenChange,
    leadId,
    activity,
    onSuccess,
}: ActivityFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isEditing = !!activity;

    const form = useForm<ActivityFormValues>({
        resolver: zodResolver(activitySchema),
        defaultValues: {
            type: activity?.type || ActivityType.NOTE,
            subject: activity?.subject || '',
            description: activity?.description || '',
            scheduled_at: activity?.scheduled_at || '',
            duration: activity?.duration || '',
            outcome: activity?.outcome || '',
        },
    });

    const selectedType = form.watch('type');
    const typeConfig = ACTIVITY_TYPE_CONFIGS[selectedType];

    // Reset form when activity changes
    useEffect(() => {
        if (activity) {
            form.reset({
                type: activity.type,
                subject: activity.subject || '',
                description: activity.description || '',
                scheduled_at: activity.scheduled_at || '',
                duration: activity.duration || '',
                outcome: activity.outcome || '',
            });
        } else {
            form.reset({
                type: ActivityType.NOTE,
                subject: '',
                description: '',
                scheduled_at: '',
                duration: '',
                outcome: '',
            });
        }
    }, [activity, form]);

    const onSubmit = (data: ActivityFormValues) => {
        setIsSubmitting(true);

        // Clean up empty strings
        const cleanData = Object.fromEntries(
            Object.entries(data).filter(([_, value]) => value !== '')
        );

        const url = isEditing
            ? `/api/v1/leads/${leadId}/activities/${activity.id}`
            : `/api/v1/leads/${leadId}/activities`;

        const method = isEditing ? 'put' : 'post';

        router[method](url, cleanData, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEditing ? 'Activity updated' : 'Activity created');
                onOpenChange(false);
                form.reset();
                onSuccess?.();
            },
            onError: (errors) => {
                if (errors.errors) {
                    Object.entries(errors.errors).forEach(([field, messages]) => {
                        form.setError(field as any, {
                            message: Array.isArray(messages) ? messages[0] : messages,
                        });
                    });
                } else {
                    toast.error(errors.message || 'Failed to save activity');
                }
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Activity' : 'Add Activity'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update the activity details below.'
                            : 'Record a new activity for this lead.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Activity Type */}
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Activity Type</FormLabel>
                                    <Select
                                        value={field.value}
                                        onValueChange={field.onChange}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {Object.values(ActivityType).map((type) => (
                                                <SelectItem key={type} value={type}>
                                                    {ACTIVITY_TYPE_CONFIGS[type].label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Subject */}
                        <FormField
                            control={form.control}
                            name="subject"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Subject</FormLabel>
                                    <FormControl>
                                        <Input
                                            placeholder={`e.g., Follow-up ${typeConfig.label.toLowerCase()}`}
                                            {...field}
                                        />
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
                                            placeholder="Add notes about this activity..."
                                            rows={4}
                                            {...field}
                                        />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Scheduled At (if required) */}
                        {typeConfig.requiresScheduling && (
                            <FormField
                                control={form.control}
                                name="scheduled_at"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Scheduled For</FormLabel>
                                        <FormControl>
                                            <Input
                                                type="datetime-local"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Duration */}
                        {typeConfig.requiresScheduling && (
                            <FormField
                                control={form.control}
                                name="duration"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Duration</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select duration" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {DURATION_OPTIONS.map((option) => (
                                                    <SelectItem key={option.value} value={option.value}>
                                                        {option.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

                        {/* Outcome (for completed activities) */}
                        {typeConfig.canBeCompleted && isEditing && activity.completed_at && (
                            <FormField
                                control={form.control}
                                name="outcome"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Outcome</FormLabel>
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select outcome" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {ACTIVITY_OUTCOMES.map((outcome) => (
                                                    <SelectItem key={outcome.value} value={outcome.value}>
                                                        {outcome.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        )}

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
                                {isSubmitting && (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                {isEditing ? 'Update' : 'Create'} Activity
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}