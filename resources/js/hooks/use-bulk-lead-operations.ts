import { useState, useCallback } from 'react';
import { router } from '@inertiajs/react';
import { useToast } from '@/hooks/use-toast';
import { route } from 'ziggy-js';

export interface BulkOperationResult {
    success: boolean;
    successCount: number;
    failedCount: number;
    errors?: string[];
}

export interface UseBulkLeadOperationsReturn {
    isProcessing: boolean;
    bulkDelete: (leadIds: number[]) => Promise<BulkOperationResult>;
    bulkExport: (leadIds: number[], format?: 'csv' | 'xlsx') => Promise<void>;
    bulkUpdateStatus: (leadIds: number[], status: string) => Promise<BulkOperationResult>;
    bulkAssign: (leadIds: number[], ownerId: number) => Promise<BulkOperationResult>;
    bulkUpdateStage: (leadIds: number[], stageId: number) => Promise<BulkOperationResult>;
}

export function useBulkLeadOperations(): UseBulkLeadOperationsReturn {
    const [isProcessing, setIsProcessing] = useState(false);
    const { toast } = useToast();

    const bulkDelete = useCallback(async (leadIds: number[]): Promise<BulkOperationResult> => {
        setIsProcessing(true);

        try {
            return await new Promise<BulkOperationResult>((resolve) => {
                router.delete(
                    route('leads.bulk-delete'),
                    {
                        data: { lead_ids: leadIds },
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: (page: any) => {
                            const result = page.props.flash?.bulkResult || {
                                success: true,
                                successCount: leadIds.length,
                                failedCount: 0,
                            };

                            toast({
                                title: 'Leads Deleted',
                                description: `Successfully deleted ${result.successCount} lead(s).`,
                                variant: 'default',
                            });

                            resolve(result);
                        },
                        onError: (errors: any) => {
                            toast({
                                title: 'Delete Failed',
                                description: 'Failed to delete leads. Please try again.',
                                variant: 'destructive',
                            });

                            resolve({
                                success: false,
                                successCount: 0,
                                failedCount: leadIds.length,
                                errors: Object.values(errors),
                            });
                        },
                        onFinish: () => {
                            setIsProcessing(false);
                        },
                    }
                );
            });
        } catch (error) {
            setIsProcessing(false);
            throw error;
        }
    }, [toast]);

    const bulkExport = useCallback(async (
        leadIds: number[], 
        format: 'csv' | 'xlsx' = 'csv'
    ): Promise<void> => {
        setIsProcessing(true);

        try {
            // Create a form and submit it to trigger download
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = route('leads.bulk-export');
            form.style.display = 'none';

            // Add CSRF token
            const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            if (csrfToken) {
                const csrfInput = document.createElement('input');
                csrfInput.type = 'hidden';
                csrfInput.name = '_token';
                csrfInput.value = csrfToken;
                form.appendChild(csrfInput);
            }

            // Add lead IDs
            leadIds.forEach(id => {
                const input = document.createElement('input');
                input.type = 'hidden';
                input.name = 'lead_ids[]';
                input.value = id.toString();
                form.appendChild(input);
            });

            // Add format
            const formatInput = document.createElement('input');
            formatInput.type = 'hidden';
            formatInput.name = 'format';
            formatInput.value = format;
            form.appendChild(formatInput);

            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            toast({
                title: 'Export Started',
                description: `Exporting ${leadIds.length} lead(s) as ${format.toUpperCase()}...`,
                variant: 'default',
            });

            setIsProcessing(false);
        } catch (error) {
            setIsProcessing(false);
            toast({
                title: 'Export Failed',
                description: 'Failed to export leads. Please try again.',
                variant: 'destructive',
            });
            throw error;
        }
    }, [toast]);

    const bulkUpdateStatus = useCallback(async (
        leadIds: number[], 
        status: string
    ): Promise<BulkOperationResult> => {
        setIsProcessing(true);

        try {
            return await new Promise<BulkOperationResult>((resolve) => {
                router.patch(
                    route('leads.bulk-update-status'),
                    {
                        lead_ids: leadIds,
                        status: status,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: (page: any) => {
                            const result = page.props.flash?.bulkResult || {
                                success: true,
                                successCount: leadIds.length,
                                failedCount: 0,
                            };

                            toast({
                                title: 'Status Updated',
                                description: `Successfully updated ${result.successCount} lead(s).`,
                                variant: 'default',
                            });

                            resolve(result);
                        },
                        onError: (errors: any) => {
                            toast({
                                title: 'Update Failed',
                                description: 'Failed to update lead status. Please try again.',
                                variant: 'destructive',
                            });

                            resolve({
                                success: false,
                                successCount: 0,
                                failedCount: leadIds.length,
                                errors: Object.values(errors),
                            });
                        },
                        onFinish: () => {
                            setIsProcessing(false);
                        },
                    }
                );
            });
        } catch (error) {
            setIsProcessing(false);
            throw error;
        }
    }, [toast]);

    const bulkAssign = useCallback(async (
        leadIds: number[], 
        ownerId: number
    ): Promise<BulkOperationResult> => {
        setIsProcessing(true);

        try {
            return await new Promise<BulkOperationResult>((resolve) => {
                router.patch(
                    route('leads.bulk-assign'),
                    {
                        lead_ids: leadIds,
                        owner_id: ownerId,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: (page: any) => {
                            const result = page.props.flash?.bulkResult || {
                                success: true,
                                successCount: leadIds.length,
                                failedCount: 0,
                            };

                            toast({
                                title: 'Leads Assigned',
                                description: `Successfully assigned ${result.successCount} lead(s).`,
                                variant: 'default',
                            });

                            resolve(result);
                        },
                        onError: (errors: any) => {
                            toast({
                                title: 'Assignment Failed',
                                description: 'Failed to assign leads. Please try again.',
                                variant: 'destructive',
                            });

                            resolve({
                                success: false,
                                successCount: 0,
                                failedCount: leadIds.length,
                                errors: Object.values(errors),
                            });
                        },
                        onFinish: () => {
                            setIsProcessing(false);
                        },
                    }
                );
            });
        } catch (error) {
            setIsProcessing(false);
            throw error;
        }
    }, [toast]);

    const bulkUpdateStage = useCallback(async (
        leadIds: number[], 
        stageId: number
    ): Promise<BulkOperationResult> => {
        setIsProcessing(true);

        try {
            return await new Promise<BulkOperationResult>((resolve) => {
                router.patch(
                    route('leads.bulk-update-stage'),
                    {
                        lead_ids: leadIds,
                        pipeline_stage_id: stageId,
                    },
                    {
                        preserveState: true,
                        preserveScroll: true,
                        onSuccess: (page: any) => {
                            const result = page.props.flash?.bulkResult || {
                                success: true,
                                successCount: leadIds.length,
                                failedCount: 0,
                            };

                            toast({
                                title: 'Stage Updated',
                                description: `Successfully updated ${result.successCount} lead(s).`,
                                variant: 'default',
                            });

                            resolve(result);
                        },
                        onError: (errors: any) => {
                            toast({
                                title: 'Update Failed',
                                description: 'Failed to update pipeline stage. Please try again.',
                                variant: 'destructive',
                            });

                            resolve({
                                success: false,
                                successCount: 0,
                                failedCount: leadIds.length,
                                errors: Object.values(errors),
                            });
                        },
                        onFinish: () => {
                            setIsProcessing(false);
                        },
                    }
                );
            });
        } catch (error) {
            setIsProcessing(false);
            throw error;
        }
    }, [toast]);

    return {
        isProcessing,
        bulkDelete,
        bulkExport,
        bulkUpdateStatus,
        bulkAssign,
        bulkUpdateStage,
    };
}