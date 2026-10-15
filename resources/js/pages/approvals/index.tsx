/**
 * approvals/index.tsx — Approvals inbox for checkers
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, Clock, GitBranch, FileText, User } from 'lucide-react';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Approvals', href: '/approvals' },
];

interface ApprovalRequest {
    id: number;
    status: string;
    action: string;
    requester_notes: string | null;
    requester: { id: number; name: string; email: string };
    approvable_type: string;
    approvable: { id: number; title?: string; number?: string; type?: string } | null;
    created_at: string;
    expires_at: string | null;
    can_approve: boolean;
}

interface Props {
    pending: {
        data: ApprovalRequest[];
        current_page: number;
        last_page: number;
        total: number;
    };
}

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

function modelLabel(type: string): string {
    const map: Record<string, string> = {
        'App\\Models\\Tender': 'Tender',
        'App\\Models\\Rfp':    'RFP/RFQ',
        'App\\Models\\Invoice': 'Invoice',
        'App\\Models\\PurchaseOrder': 'Purchase Order',
    };
    return map[type] ?? type.split('\\').pop() ?? type;
}

function ActionBadge({ action }: { action: string }) {
    const map: Record<string, string> = {
        submit:  'bg-blue-50 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300',
        publish: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300',
        send:    'bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300',
    };
    return (
        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full capitalize', map[action] ?? 'bg-muted text-muted-foreground')}>
            {action}
        </span>
    );
}

export default function ApprovalsIndex({ pending }: Props) {
    const [notes, setNotes]       = useState<Record<number, string>>({});
    const [reasons, setReasons]   = useState<Record<number, string>>({});
    const [showReject, setShowReject] = useState<Record<number, boolean>>({});
    const [loading, setLoading]   = useState<Record<number, string>>({});

    async function post(url: string, data: Record<string, unknown> = {}) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify(data),
        });
    }

    async function handleApprove(req: ApprovalRequest) {
        setLoading(p => ({ ...p, [req.id]: 'approve' }));
        await post(`/approvals/${req.id}/approve`, { notes: notes[req.id] ?? '' });
        setLoading(p => ({ ...p, [req.id]: '' }));
        router.reload();
    }

    async function handleReject(req: ApprovalRequest) {
        const reason = reasons[req.id] ?? '';
        if (!reason.trim()) return;
        setLoading(p => ({ ...p, [req.id]: 'reject' }));
        await post(`/approvals/${req.id}/reject`, { reason });
        setLoading(p => ({ ...p, [req.id]: '' }));
        router.reload();
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Approvals Inbox" />
            <div className="space-y-5 p-6">

                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-border">
                    <div>
                        <h1 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-amber-500" />
                            Approvals Inbox
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Review and act on pending maker-checker requests
                        </p>
                    </div>
                    <span className="text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 px-2.5 py-1 rounded-full">
                        {pending.total} pending
                    </span>
                </div>

                {/* Empty state */}
                {pending.data.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                        <div className="p-4 bg-muted/40 rounded-full mb-4">
                            <CheckCircle2 className="h-8 w-8 text-muted-foreground/40" />
                        </div>
                        <p className="text-sm font-medium text-muted-foreground">No pending approvals</p>
                        <p className="text-xs text-muted-foreground mt-1">All caught up! Check back later.</p>
                    </div>
                )}

                {/* Approval cards */}
                <div className="space-y-3">
                    {pending.data.map(req => (
                        <div key={req.id} className={cn(
                            'bg-card border rounded-xl overflow-hidden transition-all',
                            req.can_approve ? 'border-amber-200 dark:border-amber-800' : 'border-border'
                        )}>
                            <div className="p-5 flex flex-col md:flex-row md:items-start gap-4">
                                {/* Left: info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                                        <span className="text-xs font-semibold bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                            {modelLabel(req.approvable_type)}
                                        </span>
                                        <ActionBadge action={req.action} />
                                        {req.expires_at && new Date(req.expires_at) < new Date() && (
                                            <span className="text-xs text-red-600 font-medium">⏱ Expired</span>
                                        )}
                                    </div>

                                    <p className="font-semibold truncate">
                                        {req.approvable?.title ?? req.approvable?.number ?? `#${req.approvable?.id}`}
                                    </p>

                                    <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <User className="h-3 w-3" />
                                            Requested by <strong className="text-foreground ml-0.5">{req.requester.name}</strong>
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <Clock className="h-3 w-3" />
                                            {format(new Date(req.created_at), 'd MMM yyyy, HH:mm')}
                                        </span>
                                        {req.expires_at && (
                                            <span className="flex items-center gap-1">
                                                Expires: {format(new Date(req.expires_at), 'd MMM yyyy')}
                                            </span>
                                        )}
                                    </div>

                                    {req.requester_notes && (
                                        <p className="text-xs text-muted-foreground mt-2 italic bg-muted/40 rounded px-2 py-1.5">
                                            "{req.requester_notes}"
                                        </p>
                                    )}
                                </div>

                                {/* Right: actions */}
                                {req.can_approve ? (
                                    <div className="space-y-2 shrink-0 md:min-w-[240px]">
                                        <Textarea placeholder="Note for requester (optional)…" rows={2}
                                            value={notes[req.id] ?? ''}
                                            onChange={e => setNotes(p => ({ ...p, [req.id]: e.target.value }))}
                                            className="text-xs" />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleApprove(req)}
                                                disabled={!!loading[req.id]}
                                                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {loading[req.id] === 'approve' ? 'Approving…' : 'Approve'}
                                            </Button>
                                            <Button size="sm" variant="outline"
                                                onClick={() => setShowReject(p => ({ ...p, [req.id]: !p[req.id] }))}
                                                className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 gap-1.5">
                                                <XCircle className="h-3.5 w-3.5" />
                                                Reject
                                            </Button>
                                        </div>
                                        {showReject[req.id] && (
                                            <div className="space-y-2">
                                                <Textarea placeholder="Reason for rejection (required)…" rows={2}
                                                    value={reasons[req.id] ?? ''}
                                                    onChange={e => setReasons(p => ({ ...p, [req.id]: e.target.value }))}
                                                    className="text-xs border-red-200 dark:border-red-800" />
                                                <Button size="sm"
                                                    onClick={() => handleReject(req)}
                                                    disabled={!reasons[req.id]?.trim() || !!loading[req.id]}
                                                    className="w-full bg-red-600 hover:bg-red-700 text-white">
                                                    {loading[req.id] === 'reject' ? 'Rejecting…' : 'Confirm Rejection'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="shrink-0 p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground text-center">
                                        <p className="font-medium">Not your approval</p>
                                        <p className="mt-0.5">You don't have permission to review this request.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Pagination */}
                {pending.last_page > 1 && (
                    <div className="flex justify-center gap-2 pt-2">
                        {pending.current_page > 1 && (
                            <Button variant="outline" size="sm"
                                onClick={() => router.get('/approvals', { page: pending.current_page - 1 }, { preserveState: true })}>
                                Previous
                            </Button>
                        )}
                        <span className="text-xs text-muted-foreground self-center">
                            Page {pending.current_page} of {pending.last_page}
                        </span>
                        {pending.current_page < pending.last_page && (
                            <Button variant="outline" size="sm"
                                onClick={() => router.get('/approvals', { page: pending.current_page + 1 }, { preserveState: true })}>
                                Next
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
