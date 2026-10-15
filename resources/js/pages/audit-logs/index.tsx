import AppLayout from '@/layouts/app-layout';
import { Head, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Audit Logs', href: '/audit-logs' }];

const EVENT_PILL: Record<string, string> = {
    created: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    updated: 'bg-blue-50 text-blue-700 ring-blue-200',
    deleted: 'bg-red-50 text-red-700 ring-red-200',
    restored:'bg-amber-50 text-amber-700 ring-amber-200',
};

export default function AuditLogsIndex() {
    const { props } = usePage<any>();
    const logs = props.auditLogs?.data ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Audit Logs" />
            <div className="flex flex-col h-full">

                <div className="bg-card border-b border-border">
                    <div className="flex items-center gap-3 px-6 py-3.5">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <ClipboardList className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight">Audit Logs</h1>
                            <p className="text-xs text-muted-foreground">System activity and change history</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background">
                    {logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <ClipboardList className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No audit logs yet</p>
                        </div>
                    )}
                    <div className="divide-y divide-border/50">
                        {logs.map((l: any) => {
                            const pill = EVENT_PILL[l.event] ?? EVENT_PILL.updated;
                            return (
                                <div key={l.id} className="px-6 py-3.5 hover:bg-muted/30 transition-colors">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-center gap-2.5">
                                            <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', pill)}>
                                                {l.event}
                                            </span>
                                            <span className="text-sm font-medium">{l.auditable_type?.split('\\').pop() ?? 'Record'}</span>
                                            {l.user && (
                                                <span className="text-xs text-muted-foreground">by {l.user.name}</span>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {l.created_at ? format(new Date(l.created_at), 'MMM d, yyyy h:mm a') : '—'}
                                        </span>
                                    </div>

                                    {/* Change diff */}
                                    {(l.old_values || l.new_values) && (
                                        <div className="mt-2 grid sm:grid-cols-2 gap-2">
                                            {l.old_values && Object.keys(l.old_values).length > 0 && (
                                                <div className="rounded-md bg-red-50 border border-red-200/60 px-3 py-2">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600 mb-1">Before</p>
                                                    <pre className="text-xs text-red-700 overflow-auto whitespace-pre-wrap break-words">
                                                        {JSON.stringify(l.old_values, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                            {l.new_values && Object.keys(l.new_values).length > 0 && (
                                                <div className="rounded-md bg-emerald-50 border border-emerald-200/60 px-3 py-2">
                                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1">After</p>
                                                    <pre className="text-xs text-emerald-700 overflow-auto whitespace-pre-wrap break-words">
                                                        {JSON.stringify(l.new_values, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}