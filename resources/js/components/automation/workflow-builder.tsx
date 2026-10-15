import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { 
    Zap, 
    Mail, 
    UserPlus, 
    Calendar,
    Tag,
    Play,
    Pause,
    Settings,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { router } from '@inertiajs/react';
import { route } from 'ziggy-js';

export interface WorkflowAction {
    type: 'send_email' | 'assign_owner' | 'change_status' | 'add_tag' | 'schedule_task';
    config: Record<string, any>;
}

export interface WorkflowTrigger {
    type: 'status_change' | 'new_lead' | 'no_activity' | 'scheduled';
    conditions: Record<string, any>;
}

export interface Workflow {
    id?: number;
    name: string;
    description?: string;
    enabled: boolean;
    trigger: WorkflowTrigger;
    actions: WorkflowAction[];
    created_at?: string;
    last_run?: string;
    run_count?: number;
}

interface WorkflowBuilderProps {
    workflow?: Workflow;
    onSave?: (workflow: Workflow) => void;
    onCancel?: () => void;
}

export function WorkflowBuilder({ workflow, onSave, onCancel }: WorkflowBuilderProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [name, setName] = useState(workflow?.name || '');
    const [description, setDescription] = useState(workflow?.description || '');
    const [enabled, setEnabled] = useState(workflow?.enabled ?? true);
    const [triggerType, setTriggerType] = useState(workflow?.trigger.type || 'status_change');
    const [actions, setActions] = useState<WorkflowAction[]>(workflow?.actions || []);
    const { toast } = useToast();

    const handleAddAction = useCallback((type: WorkflowAction['type']) => {
        const newAction: WorkflowAction = {
            type,
            config: {},
        };
        setActions([...actions, newAction]);
    }, [actions]);

    const handleRemoveAction = useCallback((index: number) => {
        setActions(actions.filter((_, i) => i !== index));
    }, [actions]);

    const handleUpdateAction = useCallback((index: number, config: Record<string, any>) => {
        const newActions = [...actions];
        newActions[index].config = { ...newActions[index].config, ...config };
        setActions(newActions);
    }, [actions]);

    const handleSave = useCallback(async () => {
        if (!name.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Workflow name is required.',
                variant: 'destructive',
            });
            return;
        }

        if (actions.length === 0) {
            toast({
                title: 'Validation Error',
                description: 'At least one action is required.',
                variant: 'destructive',
            });
            return;
        }

        const workflowData: Workflow = {
            id: workflow?.id,
            name,
            description,
            enabled,
            trigger: {
                type: triggerType as any,
                conditions: {}, // Configure based on trigger type
            },
            actions,
        };

        try {
            if (workflow?.id) {
                // Update existing workflow
                router.put(
                    route('workflows.update', workflow.id),
                    { 
                        ...workflowData, 
                        trigger: JSON.stringify(workflowData.trigger), // Serialize trigger property
                        actions: JSON.stringify(workflowData.actions), // Serialize actions property
                    }, // convert problematic properties to string for backend
                    {
                        onSuccess: () => {
                            toast({
                                title: 'Workflow Updated',
                                description: 'Your automation workflow has been updated.',
                        });
                        setIsOpen(false);
                        if (onSave) onSave(workflowData);
                    },
                });
            } else {
                // Create new workflow
                router.post(
                    route('workflows.store'),
                    { 
                        ...workflowData, 
                        trigger: JSON.stringify(workflowData.trigger), // Serialize trigger property
                        actions: JSON.stringify(workflowData.actions), // Serialize actions property
                    }, // convert problematic properties to string for backend
                    {
                        onSuccess: () => {
                            toast({
                                title: 'Workflow Created',
                                description: 'Your automation workflow has been created.',
                        });
                        setIsOpen(false);
                        if (onSave) onSave(workflowData);
                    },
                });
            }
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to save workflow. Please try again.',
                variant: 'destructive',
            });
        }
    }, [name, description, enabled, triggerType, actions, workflow, toast, onSave]);

    return (
        <>
            <Button onClick={() => setIsOpen(true)} variant="outline">
                <Zap className="h-4 w-4 mr-2" />
                {workflow ? 'Edit Workflow' : 'Create Workflow'}
            </Button>

            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>
                            {workflow ? 'Edit Workflow' : 'Create Automation Workflow'}
                        </DialogTitle>
                        <DialogDescription>
                            Automate repetitive tasks and streamline your lead management process.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Basic Info */}
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="workflow-name">Workflow Name</Label>
                                <Input
                                    id="workflow-name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g., Auto-assign new leads"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="workflow-description">Description (Optional)</Label>
                                <Textarea
                                    id="workflow-description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this workflow does..."
                                    rows={2}
                                />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="space-y-0.5">
                                    <Label>Enable Workflow</Label>
                                    <p className="text-sm text-muted-foreground">
                                        Workflow will run automatically when triggered
                                    </p>
                                </div>
                                <Switch checked={enabled} onCheckedChange={setEnabled} />
                            </div>
                        </div>

                        {/* Trigger Configuration */}
                        <div className="space-y-4 border-t pt-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">When to Run</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Choose what triggers this workflow
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label>Trigger Type</Label>
                                <Select
                                    value={triggerType}
                                    onValueChange={(value) =>
                                        setTriggerType(value as typeof triggerType)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new_lead">When a new lead is created</SelectItem>
                                        <SelectItem value="status_change">When lead status changes</SelectItem>
                                        <SelectItem value="no_activity">When there's no activity for X days</SelectItem>
                                        <SelectItem value="scheduled">On a schedule (daily/weekly)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Trigger-specific configuration would go here */}
                        </div>

                        {/* Actions */}
                        <div className="space-y-4 border-t pt-4">
                            <div>
                                <h3 className="text-lg font-semibold mb-2">What to Do</h3>
                                <p className="text-sm text-muted-foreground mb-4">
                                    Define the actions to perform
                                </p>
                            </div>

                            {/* Action List */}
                            <div className="space-y-3">
                                {actions.map((action, index) => (
                                    <ActionCard
                                        key={index}
                                        action={action}
                                        index={index}
                                        onUpdate={(config) => handleUpdateAction(index, config)}
                                        onRemove={() => handleRemoveAction(index)}
                                    />
                                ))}

                                {actions.length === 0 && (
                                    <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                        <p className="text-sm text-muted-foreground">
                                            No actions yet. Add actions below.
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Add Action Buttons */}
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddAction('send_email')}
                                >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Send Email
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddAction('assign_owner')}
                                >
                                    <UserPlus className="h-4 w-4 mr-2" />
                                    Assign Owner
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddAction('change_status')}
                                >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Change Status
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddAction('add_tag')}
                                >
                                    <Tag className="h-4 w-4 mr-2" />
                                    Add Tag
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAddAction('schedule_task')}
                                >
                                    <Calendar className="h-4 w-4 mr-2" />
                                    Schedule Task
                                </Button>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSave}>
                            {workflow ? 'Update Workflow' : 'Create Workflow'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}

// Action Card Component
function ActionCard({ 
    action, 
    index, 
    onUpdate, 
    onRemove 
}: { 
    action: WorkflowAction; 
    index: number;
    onUpdate: (config: Record<string, any>) => void;
    onRemove: () => void;
}) {
    const getActionIcon = () => {
        switch (action.type) {
            case 'send_email': return <Mail className="h-4 w-4" />;
            case 'assign_owner': return <UserPlus className="h-4 w-4" />;
            case 'change_status': return <Settings className="h-4 w-4" />;
            case 'add_tag': return <Tag className="h-4 w-4" />;
            case 'schedule_task': return <Calendar className="h-4 w-4" />;
        }
    };

    const getActionLabel = () => {
        switch (action.type) {
            case 'send_email': return 'Send Email';
            case 'assign_owner': return 'Assign Owner';
            case 'change_status': return 'Change Status';
            case 'add_tag': return 'Add Tag';
            case 'schedule_task': return 'Schedule Task';
        }
    };

    return (
        <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {getActionIcon()}
                    <span className="font-medium">
                        {index + 1}. {getActionLabel()}
                    </span>
                </div>
                <Button variant="ghost" size="sm" onClick={onRemove}>
                    Remove
                </Button>
            </div>

            {/* Action-specific configuration */}
            <div className="space-y-2">
                {action.type === 'send_email' && (
                    <>
                        <Input
                            placeholder="Email subject..."
                            value={action.config.subject || ''}
                            onChange={(e) => onUpdate({ subject: e.target.value })}
                        />
                        <Textarea
                            placeholder="Email body..."
                            value={action.config.body || ''}
                            onChange={(e) => onUpdate({ body: e.target.value })}
                            rows={3}
                        />
                    </>
                )}

                {action.type === 'assign_owner' && (
                    <Select
                        value={action.config.owner_id?.toString()}
                        onValueChange={(value) => onUpdate({ owner_id: parseInt(value) })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select owner..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">John Doe</SelectItem>
                            <SelectItem value="2">Jane Smith</SelectItem>
                            {/* Load from users prop */}
                        </SelectContent>
                    </Select>
                )}

                {action.type === 'change_status' && (
                    <Select
                        value={action.config.status}
                        onValueChange={(value) => onUpdate({ status: value })}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="new">New</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="qualified">Qualified</SelectItem>
                            <SelectItem value="won">Won</SelectItem>
                        </SelectContent>
                    </Select>
                )}

                {action.type === 'add_tag' && (
                    <Input
                        placeholder="Tag name..."
                        value={action.config.tag || ''}
                        onChange={(e) => onUpdate({ tag: e.target.value })}
                    />
                )}

                {action.type === 'schedule_task' && (
                    <>
                        <Input
                            placeholder="Task title..."
                            value={action.config.title || ''}
                            onChange={(e) => onUpdate({ title: e.target.value })}
                        />
                        <Input
                            type="date"
                            value={action.config.due_date || ''}
                            onChange={(e) => onUpdate({ due_date: e.target.value })}
                        />
                    </>
                )}
            </div>
        </div>
    );
}

// Workflow List Component
export function WorkflowList({ workflows }: { workflows: Workflow[] }) {
    const { toast } = useToast();

    const handleToggle = useCallback((workflow: Workflow) => {
        router.patch(route('workflows.toggle', workflow.id), {
            enabled: !workflow.enabled,
        }, {
            onSuccess: () => {
                toast({
                    title: workflow.enabled ? 'Workflow Disabled' : 'Workflow Enabled',
                    description: `${workflow.name} has been ${workflow.enabled ? 'disabled' : 'enabled'}.`,
                });
            },
        });
    }, [toast]);

    return (
        <div className="space-y-3">
            {workflows.map((workflow) => (
                <div
                    key={workflow.id}
                    className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                    <div className="flex-1">
                        <div className="flex items-center gap-3">
                            <h3 className="font-medium">{workflow.name}</h3>
                            {workflow.enabled ? (
                                <Badge variant="default">
                                    <Play className="h-3 w-3 mr-1" />
                                    Active
                                </Badge>
                            ) : (
                                <Badge variant="secondary">
                                    <Pause className="h-3 w-3 mr-1" />
                                    Paused
                                </Badge>
                            )}
                        </div>
                        {workflow.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                                {workflow.description}
                            </p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>Runs: {workflow.run_count || 0}</span>
                            {workflow.last_run && (
                                <span>Last run: {new Date(workflow.last_run).toLocaleDateString()}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Switch
                            checked={workflow.enabled}
                            onCheckedChange={() => handleToggle(workflow)}
                        />
                        <WorkflowBuilder workflow={workflow} />
                    </div>
                </div>
            ))}
        </div>
    );
}