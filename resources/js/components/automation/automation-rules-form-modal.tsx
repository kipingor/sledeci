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
    FormDescription,
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
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowRight, Lightbulb } from 'lucide-react';
import {
    AutomationRule,
    AutomationTriggerType,
    AutomationActionType,
    ProjectTemplate,
    TRIGGER_TYPE_LABELS,
    ACTION_TYPE_LABELS,
} from '@/types/automation.types';
import axios from 'axios';

const ruleSchema = z.object({
    name: z.string().min(1, 'Name is required').max(255),
    description: z.string().optional(),
    trigger_type: z.nativeEnum(AutomationTriggerType),
    trigger_conditions: z.record(z.string(), z.any()).default({}),
    action_type: z.nativeEnum(AutomationActionType),
    action_config: z.record(z.string(), z.any()).default({}),
    is_active: z.boolean().default(true),
});

// Use Zod *input* type here so it aligns with zodResolver + RHF.
// (Defaults make some fields optional at input time.)
type RuleFormValues = z.input<typeof ruleSchema>;

interface AutomationRuleFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    rule?: AutomationRule;
    onSuccess?: () => void;
}

export function AutomationRuleFormModal({
    open,
    onOpenChange,
    rule,
    onSuccess,
}: AutomationRuleFormModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const isEditing = !!rule;

    const form = useForm<RuleFormValues>({
        resolver: zodResolver(ruleSchema),
        defaultValues: {
            name: rule?.name || '',
            description: rule?.description || '',
            trigger_type: rule?.trigger_type || AutomationTriggerType.LEAD_STATUS_CHANGED,
            trigger_conditions: rule?.trigger_conditions || {},
            action_type: rule?.action_type || AutomationActionType.CREATE_PROJECT,
            action_config: rule?.action_config || {},
            is_active: rule?.is_active ?? true,
        },
    });

    const triggerType = form.watch('trigger_type');
    const actionType = form.watch('action_type');

    // Fetch templates for create_project action
    useEffect(() => {
        if (actionType === AutomationActionType.CREATE_PROJECT) {
            axios.get('/api/v1/project-templates').then((response) => {
                setTemplates(response.data.data);
            });
        }
    }, [actionType]);

    const onSubmit = (data: RuleFormValues) => {
        setIsSubmitting(true);

        const url = isEditing
            ? `/api/v1/automation-rules/${rule.id}`
            : `/api/v1/automation-rules`;

        const method = isEditing ? 'put' : 'post';

        router[method](url, data, {
            preserveScroll: true,
            onSuccess: () => {
                toast.success(isEditing ? 'Rule updated' : 'Rule created');
                onOpenChange(false);
                form.reset();
                onSuccess?.();
            },
            onError: (errors) => {
                toast.error(errors.message || 'Failed to save rule');
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isEditing ? 'Edit Automation Rule' : 'Create Automation Rule'}
                    </DialogTitle>
                    <DialogDescription>
                        {isEditing
                            ? 'Update your automation rule configuration.'
                            : 'Create a new automation rule to automate your workflow.'}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Rule Name</FormLabel>
                                        <FormControl>
                                            <Input
                                                placeholder="e.g., Create Project on Lead Win"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description (Optional)</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Describe what this automation does..."
                                                rows={2}
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Trigger Section */}
                        <Card className="p-4 bg-blue-50 border-blue-200">
                            <div className="flex items-center gap-2 mb-4">
                                <Badge className="bg-blue-600">When</Badge>
                                <h3 className="font-semibold">Trigger</h3>
                            </div>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="trigger_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>When this happens</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.values(AutomationTriggerType).map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {TRIGGER_TYPE_LABELS[type]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Trigger Conditions */}
                                {triggerType === AutomationTriggerType.LEAD_STATUS_CHANGED && (
                                    <FormField
                                        control={form.control}
                                        name="trigger_conditions.status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status equals</FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="new">New</SelectItem>
                                                        <SelectItem value="contacted">Contacted</SelectItem>
                                                        <SelectItem value="qualified">Qualified</SelectItem>
                                                        <SelectItem value="proposal">Proposal</SelectItem>
                                                        <SelectItem value="won">Won</SelectItem>
                                                        <SelectItem value="lost">Lost</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormDescription>
                                                    Trigger when lead status changes to this value
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </Card>

                        <div className="flex items-center justify-center">
                            <ArrowRight className="h-6 w-6 text-gray-400" />
                        </div>

                        {/* Action Section */}
                        <Card className="p-4 bg-green-50 border-green-200">
                            <div className="flex items-center gap-2 mb-4">
                                <Badge className="bg-green-600">Then</Badge>
                                <h3 className="font-semibold">Action</h3>
                            </div>

                            <div className="space-y-4">
                                <FormField
                                    control={form.control}
                                    name="action_type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Do this</FormLabel>
                                            <Select value={field.value} onValueChange={field.onChange}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {Object.values(AutomationActionType).map((type) => (
                                                        <SelectItem key={type} value={type}>
                                                            {ACTION_TYPE_LABELS[type]}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                {/* Action Configuration */}
                                {actionType === AutomationActionType.CREATE_PROJECT && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="action_config.template_id"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Project Template</FormLabel>
                                                    <Select
                                                        value={field.value?.toString()}
                                                        onValueChange={(val) => field.onChange(parseInt(val))}
                                                    >
                                                        <FormControl>
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Select template" />
                                                            </SelectTrigger>
                                                        </FormControl>
                                                        <SelectContent>
                                                            {templates.map((template) => (
                                                                <SelectItem
                                                                    key={template.id}
                                                                    value={template.id.toString()}
                                                                >
                                                                    {template.name}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                    <FormDescription>
                                                        Template to use for creating the project
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="action_config.name_template"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Project Name Template</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            placeholder="{lead.title} - Implementation"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormDescription>
                                                        Use variables like {'{lead.title}'} and {'{lead.owner_id}'}
                                                    </FormDescription>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="action_config.description_template"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Project Description Template</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Implementation project for {lead.title}"
                                                            rows={2}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                            <div className="flex items-start gap-2">
                                                <Lightbulb className="h-5 w-5 text-blue-600 mt-0.5" />
                                                <div>
                                                    <p className="text-sm font-medium text-blue-900 mb-1">
                                                        Available Variables
                                                    </p>
                                                    <p className="text-xs text-blue-700">
                                                        <code>{'{lead.title}'}</code>,{' '}
                                                        <code>{'{lead.description}'}</code>,{' '}
                                                        <code>{'{lead.owner_id}'}</code>,{' '}
                                                        <code>{'{lead.estimated_value}'}</code>
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}

                                {actionType === AutomationActionType.SEND_EMAIL && (
                                    <>
                                        <FormField
                                            control={form.control}
                                            name="action_config.to"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>To</FormLabel>
                                                    <FormControl>
                                                        <Input
                                                            type="email"
                                                            placeholder="email@example.com"
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="action_config.subject"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Subject</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Email subject" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="action_config.body"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Body</FormLabel>
                                                    <FormControl>
                                                        <Textarea
                                                            placeholder="Email body..."
                                                            rows={4}
                                                            {...field}
                                                        />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />
                                    </>
                                )}
                            </div>
                        </Card>

                        {/* Active Toggle */}
                        <FormField
                            control={form.control}
                            name="is_active"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                                    <div className="space-y-0.5">
                                        <FormLabel>Active</FormLabel>
                                        <FormDescription>
                                            Enable this automation rule
                                        </FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                            )}
                        />

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
                                {isEditing ? 'Update' : 'Create'} Rule
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}