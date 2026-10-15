import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus,
    MoreVertical,
    Edit,
    Trash2,
    Zap,
    ArrowRight,
    PlayCircle,
    Clock,
    CheckCircle,
    XCircle,
    BarChart3,
} from 'lucide-react';
import {
    AutomationRule,
    TRIGGER_TYPE_LABELS,
    ACTION_TYPE_LABELS,
} from '@/types/automation.types';
import axios from 'axios';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';
import { formatDistanceToNow } from 'date-fns';

interface AutomationRulesListProps {
    onEdit?: (rule: AutomationRule) => void;
    onViewLogs?: (rule: AutomationRule) => void;
    onUpdate?: () => void;
}

export function AutomationRulesList({ onEdit, onViewLogs, onUpdate }: AutomationRulesListProps) {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

    const fetchRules = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/v1/automation-rules');
            setRules(response.data.data);
        } catch (error) {
            toast.error('Failed to load automation rules');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchRules();
    }, []);

    const handleDelete = async (rule: AutomationRule) => {
        await confirmDelete({
            itemName: rule.name,
            onConfirm: async () => {
                return new Promise<void>((resolve, reject) => {
                    router.delete(`/api/v1/automation-rules/${rule.id}`, {
                        preserveScroll: true,
                        onSuccess: () => {
                            toast.success('Automation rule deleted');
                            fetchRules();
                            onUpdate?.();
                            resolve();
                        },
                        onError: (errors) => {
                            toast.error(errors.message || 'Failed to delete rule');
                            reject(new Error('Delete failed'));
                        },
                    });
                });
            },
        });
    };

    const handleToggleActive = async (rule: AutomationRule) => {
        try {
            await axios.patch(`/api/v1/automation-rules/${rule.id}`, {
                is_active: !rule.is_active,
            });
            toast.success(rule.is_active ? 'Rule deactivated' : 'Rule activated');
            fetchRules();
            onUpdate?.();
        } catch (error) {
            toast.error('Failed to update rule');
        }
    };

    const handleTest = async (rule: AutomationRule) => {
        try {
            await axios.post(`/api/v1/automation-rules/${rule.id}/test`);
            toast.success('Test execution triggered');
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Test failed');
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (rules.length === 0) {
        return (
            <EmptyState
                icon={Zap}
                title="No automation rules"
                description="Create your first automation rule to automate your workflow"
                action={{
                    label: 'Create Automation Rule',
                    onClick: () => onEdit?.(undefined as any),
                    icon: Plus,
                } as any}
            />
        );
    }

    return (
        <>
            <div className="space-y-4">
                {rules.map((rule) => (
                    <Card key={rule.id} className="p-6 hover:shadow-lg transition-shadow">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <Zap className="h-5 w-5 text-blue-600" />
                                    <h3 className="font-semibold text-lg">{rule.name}</h3>
                                    <Switch
                                        checked={rule.is_active}
                                        onCheckedChange={() => handleToggleActive(rule)}
                                    />
                                </div>
                                {rule.description && (
                                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>
                                )}

                                {/* Trigger → Action Flow */}
                                <div className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-blue-50">
                                            <PlayCircle className="h-3 w-3 mr-1" />
                                            When
                                        </Badge>
                                        <span className="text-sm font-medium">
                                            {TRIGGER_TYPE_LABELS[rule.trigger_type]}
                                        </span>
                                        {rule.trigger_conditions && Object.keys(rule.trigger_conditions).length > 0 && (
                                            <span className="text-xs text-gray-500">
                                                (
                                                {Object.entries(rule.trigger_conditions)
                                                    .map(([key, value]) => `${key} = ${value}`)
                                                    .join(', ')}
                                                )
                                            </span>
                                        )}
                                    </div>

                                    <ArrowRight className="h-4 w-4 text-gray-400" />

                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="bg-green-50">
                                            <Zap className="h-3 w-3 mr-1" />
                                            Then
                                        </Badge>
                                        <span className="text-sm font-medium">
                                            {ACTION_TYPE_LABELS[rule.action_type]}
                                        </span>
                                        {rule.action_config?.template_id && (
                                            <span className="text-xs text-gray-500">
                                                (Template #{rule.action_config.template_id})
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit?.(rule)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleTest(rule)}>
                                        <PlayCircle className="mr-2 h-4 w-4" />
                                        Test Rule
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => onViewLogs?.(rule)}>
                                        <BarChart3 className="mr-2 h-4 w-4" />
                                        View Logs
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleDelete(rule)}
                                        className="text-red-600"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Executed</p>
                                    <p className="font-semibold">{rule.execution_count} times</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-gray-400" />
                                <div>
                                    <p className="text-xs text-gray-500">Last Run</p>
                                    <p className="font-semibold text-sm">
                                        {rule.last_executed_at
                                            ? formatDistanceToNow(new Date(rule.last_executed_at), {
                                                  addSuffix: true,
                                              })
                                            : 'Never'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <Badge
                                    variant={rule.is_active ? 'default' : 'secondary'}
                                    className="ml-auto"
                                >
                                    {rule.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
            <ConfirmDialog />
        </>
    );
}