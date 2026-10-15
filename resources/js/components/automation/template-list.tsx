import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    Copy,
    FileText,
    Clock,
    CheckCircle,
    Star,
} from 'lucide-react';
import { ProjectTemplate } from '@/types/automation.types';
import axios from 'axios';
import { toast } from 'sonner';
import { router } from '@inertiajs/react';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';

interface TemplateListProps {
    onEdit?: (template: ProjectTemplate) => void;
    onUpdate?: () => void;
}

export function TemplateList({ onEdit, onUpdate }: TemplateListProps) {
    const [templates, setTemplates] = useState<ProjectTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const response = await axios.get('/api/v1/project-templates');
            setTemplates(response.data.data);
        } catch (error) {
            toast.error('Failed to load templates');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    const handleDelete = async (template: ProjectTemplate) => {
        await confirmDelete({
            itemName: template.name,
            onConfirm: async () => {
                return new Promise<void>((resolve, reject) => {
                    router.delete(`/api/v1/project-templates/${template.id}`, {
                        preserveScroll: true,
                        onSuccess: () => {
                            toast.success('Template deleted');
                            fetchTemplates();
                            onUpdate?.();
                            resolve();
                        },
                        onError: (errors) => {
                            toast.error(errors.message || 'Failed to delete template');
                            reject(new Error('Delete failed'));
                        },
                    });
                });
            },
        });
    };

    const handleDuplicate = async (template: ProjectTemplate) => {
        try {
            await axios.post(`/api/v1/project-templates/${template.id}/duplicate`);
            toast.success('Template duplicated');
            fetchTemplates();
            onUpdate?.();
        } catch (error) {
            toast.error('Failed to duplicate template');
        }
    };

    const handleToggleActive = async (template: ProjectTemplate) => {
        try {
            await axios.patch(`/api/v1/project-templates/${template.id}`, {
                is_active: !template.is_active,
            });
            toast.success(template.is_active ? 'Template deactivated' : 'Template activated');
            fetchTemplates();
            onUpdate?.();
        } catch (error) {
            toast.error('Failed to update template');
        }
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (templates.length === 0) {
        return (
            <EmptyState
                icon={FileText}
                title="No project templates"
                description="Create your first template to automate project creation"
                action={{
                    label: 'Create Template',
                    onClick: () => onEdit?.(undefined as any),
                    icon: Plus,
                } as any}
            />
        );
    }

    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {templates.map((template) => (
                    <Card key={template.id} className="p-6 hover:shadow-lg transition-shadow">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-lg">{template.name}</h3>
                                    {template.is_default && (
                                        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                                            <Star className="h-3 w-3 mr-1" />
                                            Default
                                        </Badge>
                                    )}
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-2">
                                    {template.description || 'No description'}
                                </p>
                            </div>

                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => onEdit?.(template)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                                        <Copy className="mr-2 h-4 w-4" />
                                        Duplicate
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleActive(template)}>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        {template.is_active ? 'Deactivate' : 'Activate'}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        onClick={() => handleDelete(template)}
                                        className="text-red-600"
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                                <FileText className="h-4 w-4 text-gray-400" />
                                <span className="text-gray-600">
                                    {template.tasks?.length || 0} tasks
                                </span>
                            </div>
                            {template.estimated_duration_days && (
                                <div className="flex items-center gap-2 text-sm">
                                    <Clock className="h-4 w-4 text-gray-400" />
                                    <span className="text-gray-600">
                                        {template.estimated_duration_days} days
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Status */}
                        <div className="flex items-center justify-between pt-4 border-t">
                            <Badge variant={template.is_active ? 'default' : 'secondary'}>
                                {template.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onEdit?.(template)}
                            >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
            <ConfirmDialog />
        </>
    );
}