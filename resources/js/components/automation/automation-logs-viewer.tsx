import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoadingState } from '@/components/ui/loading-state';
import { EmptyState } from '@/components/ui/empty-state';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    BarChart3,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw,
    AlertCircle,
    ExternalLink,
} from 'lucide-react';
import { AutomationLog } from '@/types/automation.types';
import axios from 'axios';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface AutomationLogsViewerProps {
    ruleId?: number;
    limit?: number;
}

export function AutomationLogsViewer({ ruleId, limit = 50 }: AutomationLogsViewerProps) {
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>('all');

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const params: any = { limit };
            if (ruleId) params.rule_id = ruleId;
            if (statusFilter !== 'all') params.status = statusFilter;

            const response = await axios.get('/api/v1/automation-logs', { params });
            setLogs(response.data.data);
        } catch (error) {
            toast.error('Failed to load automation logs');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, [ruleId, statusFilter]);

    const handleRetry = async (log: AutomationLog) => {
        try {
            await axios.post(`/api/v1/automation-logs/${log.id}/retry`);
            toast.success('Retry triggered');
            fetchLogs();
        } catch (error) {
            toast.error('Failed to retry automation');
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'failed':
                return <XCircle className="h-5 w-5 text-red-600" />;
            case 'processing':
                return <Clock className="h-5 w-5 text-blue-600 animate-pulse" />;
            default:
                return <AlertCircle className="h-5 w-5 text-gray-600" />;
        }
    };

    const getStatusBadge = (status: string) => {
        const variants = {
            success: 'default',
            failed: 'destructive',
            processing: 'secondary',
        } as const;

        return (
            <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
                {status}
            </Badge>
        );
    };

    if (isLoading) {
        return <LoadingState />;
    }

    if (logs.length === 0) {
        return (
            <EmptyState
                icon={BarChart3}
                title="No automation logs"
                description="Automation executions will appear here"
                action={{
                    label: 'Refresh',
                    onClick: fetchLogs,
                    icon: RefreshCw,
                } as any}
            />
        );
    }

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Automation Logs</h3>
                <div className="flex items-center gap-3">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="success">Success</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="processing">Processing</SelectItem>
                        </SelectContent>
                    </Select>

                    <Button onClick={fetchLogs} variant="outline" size="sm">
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Logs List */}
            <div className="space-y-3">
                {logs.map((log) => (
                    <Card key={log.id} className="p-4">
                        <div className="flex items-start gap-4">
                            {/* Status Icon */}
                            <div className="shrink-0 pt-1">
                                {getStatusIcon(log.status)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 mb-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h4 className="font-medium text-sm">
                                                {log.rule?.name || `Rule #${log.automation_rule_id}`}
                                            </h4>
                                            {getStatusBadge(log.status)}
                                        </div>
                                        <p className="text-xs text-gray-500">
                                            {format(new Date(log.executed_at), 'PPpp')}
                                        </p>
                                    </div>
                                </div>

                                {/* Triggerable Info */}
                                <div className="text-xs text-gray-600 mb-2">
                                    Triggered by:{' '}
                                    <span className="font-medium">
                                        {log.triggerable_type?.split('\\').pop()} #{log.triggerable_id}
                                    </span>
                                </div>

                                {/* Result or Error */}
                                {log.status === 'success' && log.result && (
                                    <div className="bg-green-50 border border-green-200 rounded p-3 mt-2">
                                        <p className="text-xs font-medium text-green-900 mb-1">
                                            Success Result
                                        </p>
                                        {log.result.project_id && (
                                            <div className="flex items-center gap-2 text-xs text-green-800">
                                                <ExternalLink className="h-3 w-3" />
                                                <a
                                                    href={`/projects/${log.result.project_id}`}
                                                    className="hover:underline"
                                                >
                                                    Project #{log.result.project_id} created
                                                </a>
                                            </div>
                                        )}
                                        {log.result.tasks_created && (
                                            <p className="text-xs text-green-800 mt-1">
                                                {log.result.tasks_created} tasks created
                                            </p>
                                        )}
                                    </div>
                                )}

                                {log.status === 'failed' && log.error_message && (
                                    <div className="bg-red-50 border border-red-200 rounded p-3 mt-2">
                                        <p className="text-xs font-medium text-red-900 mb-1">
                                            Error
                                        </p>
                                        <p className="text-xs text-red-800">{log.error_message}</p>
                                        <Button
                                            onClick={() => handleRetry(log)}
                                            size="sm"
                                            variant="outline"
                                            className="mt-2 h-7 text-xs"
                                        >
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            Retry
                                        </Button>
                                    </div>
                                )}

                                {log.status === 'processing' && (
                                    <div className="bg-blue-50 border border-blue-200 rounded p-3 mt-2">
                                        <p className="text-xs text-blue-800">
                                            Automation is currently running...
                                        </p>
                                    </div>
                                )}

                                {/* Payload Details (Collapsed) */}
                                {log.payload && (
                                    <details className="mt-2">
                                        <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                            View payload details
                                        </summary>
                                        <pre className="mt-2 text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                                            {JSON.stringify(log.payload, null, 2)}
                                        </pre>
                                    </details>
                                )}
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}