/**
 * rfps/show.tsx — RFP/RFQ detail view with maker-checker approval workflow
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import {
    FileText, Clock, CheckCircle2, XCircle, Globe, Award,
    GitBranch, User, Calendar, DollarSign, ChevronDown, ChevronUp,
    Send, AlertTriangle, Edit2, Trash2,
} from 'lucide-react';
import { format } from 'date-fns';

interface Rfp {
    id: number; type: 'rfp' | 'rfq'; title: string; reference_number: string | null;
    description: string | null; scope_of_work: string | null;
    requirements: Array<{ id: string; category: string; description: string; mandatory: boolean }> | null;
    evaluation_criteria: Array<{ id: string; criterion: string; weight_pct: number; description: string }> | null;
    status: string; approval_status: string;
    issue_date: string | null; submission_deadline: string | null; award_date: string | null;
    budget: string | null; currency: string; notes: string | null;
    submitter?: { id: number; name: string }; approver?: { id: number; name: string };
    approval_requested_at: string | null; approved_at: string | null;
}

interface ApprovalRequest {
    id: number; status: string; action: string;
    requester_notes: string | null; reviewer_notes: string | null;
    requester: { id: number; name: string; email: string };
    created_at: string;
}

interface Props {
    rfp: Rfp;
    pendingApproval: ApprovalRequest | null;
    makerCheckerActive: boolean;
    canApprove: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
    draft:     { label: 'Draft',      dot: 'bg-zinc-400',    pill: 'bg-zinc-100 text-zinc-600 ring-zinc-200 dark:bg-zinc-800 dark:text-zinc-300' },
    review:    { label: 'In Review',  dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-950/30 dark:text-blue-300' },
    published: { label: 'Published',  dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300' },
    closed:    { label: 'Closed',     dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300' },
    awarded:   { label: 'Awarded',    dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/30 dark:text-violet-300' },
    cancelled: { label: 'Cancelled',  dot: 'bg-red-500',     pill: 'bg-red-50 text-red-600 ring-red-200 dark:bg-red-950/30 dark:text-red-300' },
};

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

type Tab = 'overview' | 'requirements' | 'criteria' | 'approval';

export default function RfpShow({ rfp, pendingApproval, makerCheckerActive, canApprove }: Props) {
    const [tab, setTab]                     = useState<Tab>('overview');
    const [approvalNotes, setApprovalNotes] = useState('');
    const [rejectReason, setRejectReason]   = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    const [loading, setLoading]             = useState('');

    const sc = STATUS_CONFIG[rfp.status] ?? STATUS_CONFIG.draft;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Procurement', href: '#' },
        { title: 'RFPs & RFQs', href: '/rfps' },
        { title: rfp.title, href: `/rfps/${rfp.id}` },
    ];

    function post(url: string, data: Record<string, unknown> = {}) {
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
            body: JSON.stringify(data),
        });
    }

    async function handleRequestApproval() {
        setLoading('request');
        await post(`/rfps/${rfp.id}/request-approval`, { notes: approvalNotes });
        setLoading('');
        router.reload();
    }

    async function handleApprove() {
        setLoading('approve');
        await post(`/rfps/${rfp.id}/approve`, { notes: approvalNotes });
        setLoading('');
        router.reload();
    }

    async function handleReject() {
        if (!rejectReason.trim()) return;
        setLoading('reject');
        await post(`/rfps/${rfp.id}/reject`, { reason: rejectReason });
        setLoading('');
        router.reload();
    }

    async function handlePublish() {
        setLoading('publish');
        await post(`/rfps/${rfp.id}/publish`);
        setLoading('');
        router.reload();
    }

    async function handleClose() {
        setLoading('close');
        await post(`/rfps/${rfp.id}/close`);
        setLoading('');
        router.reload();
    }

    async function handleAward() {
        setLoading('award');
        await post(`/rfps/${rfp.id}/award`);
        setLoading('');
        router.reload();
    }

    const canPublish = ['draft', 'review'].includes(rfp.status) &&
        (!makerCheckerActive || rfp.approval_status === 'approved');

    const needsApproval = makerCheckerActive &&
        rfp.approval_status !== 'approved' &&
        ['draft', 'review'].includes(rfp.status);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={rfp.title} />
            <div className="space-y-5 p-6">

                {/* Record header */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-6 py-5 flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <span className="text-xs font-mono font-semibold uppercase bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                    {rfp.type}
                                </span>
                                <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ring-1', sc.pill)}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                                    {sc.label}
                                </span>
                                {rfp.approval_status === 'pending' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                                        <Clock className="h-3 w-3" /> Pending Approval
                                    </span>
                                )}
                                {rfp.approval_status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
                                        <CheckCircle2 className="h-3 w-3" /> Approved
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl font-bold truncate">{rfp.title}</h1>
                            {rfp.reference_number && (
                                <p className="text-xs font-mono text-muted-foreground mt-0.5">{rfp.reference_number}</p>
                            )}
                        </div>

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 shrink-0">
                            {needsApproval && rfp.approval_status !== 'pending' && (
                                <Button size="sm" onClick={handleRequestApproval} disabled={loading === 'request'}
                                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                    <GitBranch className="h-3.5 w-3.5" />
                                    {loading === 'request' ? 'Requesting…' : 'Request Approval'}
                                </Button>
                            )}
                            {canPublish && (
                                <Button size="sm" onClick={handlePublish} disabled={loading === 'publish'}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                                    <Globe className="h-3.5 w-3.5" />
                                    {loading === 'publish' ? 'Publishing…' : 'Publish'}
                                </Button>
                            )}
                            {rfp.status === 'published' && (
                                <Button size="sm" variant="outline" onClick={handleClose} disabled={loading === 'close'}>
                                    {loading === 'close' ? 'Closing…' : 'Close'}
                                </Button>
                            )}
                            {rfp.status === 'closed' && (
                                <Button size="sm" onClick={handleAward} disabled={loading === 'award'}
                                    className="bg-violet-600 hover:bg-violet-700 text-white gap-1.5">
                                    <Award className="h-3.5 w-3.5" />
                                    {loading === 'award' ? 'Marking…' : 'Mark Awarded'}
                                </Button>
                            )}
                            <Link href={`/rfps/${rfp.id}/edit`}>
                                <Button size="sm" variant="outline" className="gap-1.5">
                                    <Edit2 className="h-3.5 w-3.5" /> Edit
                                </Button>
                            </Link>
                        </div>
                    </div>

                    {/* Highlights bar */}
                    <div className="px-6 py-3 border-t border-border bg-muted/20 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                        {rfp.submission_deadline && (
                            <span className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5" />
                                Deadline: <strong className="text-foreground">{format(new Date(rfp.submission_deadline), 'd MMM yyyy')}</strong>
                            </span>
                        )}
                        {rfp.budget && (
                            <span className="flex items-center gap-1.5">
                                <DollarSign className="h-3.5 w-3.5" />
                                Budget: <strong className="text-foreground">{rfp.currency} {parseFloat(rfp.budget).toLocaleString()}</strong>
                            </span>
                        )}
                        {rfp.submitter && (
                            <span className="flex items-center gap-1.5">
                                <User className="h-3.5 w-3.5" />
                                Owner: <strong className="text-foreground">{rfp.submitter.name}</strong>
                            </span>
                        )}
                    </div>
                </div>

                {/* ── Maker-Checker approval banner ── */}
                {pendingApproval && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 dark:bg-amber-950/20 dark:border-amber-800">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-amber-100 rounded-lg shrink-0 dark:bg-amber-900/40">
                                <GitBranch className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                                    Approval Requested
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                    <strong>{pendingApproval.requester.name}</strong> requested approval to publish this {rfp.type.toUpperCase()}{' '}
                                    on {format(new Date(pendingApproval.created_at), 'd MMM yyyy')}.
                                </p>
                                {pendingApproval.requester_notes && (
                                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 italic">
                                        "{pendingApproval.requester_notes}"
                                    </p>
                                )}

                                {canApprove && (
                                    <div className="mt-3 space-y-2">
                                        <Textarea placeholder="Add a note (optional)…" rows={2} value={approvalNotes}
                                            onChange={e => setApprovalNotes(e.target.value)}
                                            className="text-xs bg-white dark:bg-background" />
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={handleApprove} disabled={!!loading}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                                                <CheckCircle2 className="h-3.5 w-3.5" />
                                                {loading === 'approve' ? 'Approving…' : 'Approve'}
                                            </Button>
                                            <Button size="sm" variant="outline" onClick={() => setShowRejectForm(v => !v)}
                                                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400">
                                                <XCircle className="h-3.5 w-3.5" />
                                                Reject
                                            </Button>
                                        </div>
                                        {showRejectForm && (
                                            <div className="space-y-2">
                                                <Textarea placeholder="Reason for rejection (required)…" rows={2}
                                                    value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                                                    className="text-xs bg-white dark:bg-background border-red-200 dark:border-red-800" />
                                                <Button size="sm" onClick={handleReject} disabled={!rejectReason.trim() || !!loading}
                                                    className="bg-red-600 hover:bg-red-700 text-white">
                                                    {loading === 'reject' ? 'Rejecting…' : 'Confirm Rejection'}
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {!canApprove && (
                                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-2 italic">
                                        Waiting for an authorised approver to review this request.
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── Blocked publish notice ── */}
                {needsApproval && rfp.approval_status !== 'pending' && rfp.approval_status !== 'approved' && (
                    <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-800 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300">
                        <AlertTriangle className="h-4 w-4 shrink-0 text-blue-500" />
                        <span>Maker-checker is enabled for RFPs. This {rfp.type.toUpperCase()} must be approved before it can be published. Use the <strong>Request Approval</strong> button above.</span>
                    </div>
                )}

                {/* Tabs */}
                <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border">
                    {([
                        { id: 'overview',     label: 'Overview' },
                        { id: 'requirements', label: `Requirements (${rfp.requirements?.length ?? 0})` },
                        { id: 'criteria',     label: `Evaluation Criteria (${rfp.evaluation_criteria?.length ?? 0})` },
                        { id: 'approval',     label: 'Approval Trail' },
                    ] as { id: Tab; label: string }[]).map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={cn(
                                'px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                                tab === t.id
                                    ? 'bg-background text-foreground shadow-sm border border-border'
                                    : 'text-muted-foreground hover:text-foreground'
                            )}>
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* ── Overview ── */}
                {tab === 'overview' && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-2 space-y-4">
                            {rfp.description && (
                                <div className="bg-card border border-border rounded-lg p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Description</p>
                                    <p className="text-sm whitespace-pre-line">{rfp.description}</p>
                                </div>
                            )}
                            {rfp.scope_of_work && (
                                <div className="bg-card border border-border rounded-lg p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Scope of Work</p>
                                    <p className="text-sm whitespace-pre-line">{rfp.scope_of_work}</p>
                                </div>
                            )}
                            {rfp.notes && (
                                <div className="bg-card border border-border rounded-lg p-5">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Notes</p>
                                    <p className="text-sm whitespace-pre-line text-muted-foreground">{rfp.notes}</p>
                                </div>
                            )}
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: 'Type', value: rfp.type.toUpperCase() },
                                { label: 'Status', value: STATUS_CONFIG[rfp.status]?.label },
                                { label: 'Issue Date', value: rfp.issue_date ? format(new Date(rfp.issue_date), 'd MMM yyyy') : '—' },
                                { label: 'Deadline', value: rfp.submission_deadline ? format(new Date(rfp.submission_deadline), 'd MMM yyyy') : '—' },
                                { label: 'Budget', value: rfp.budget ? `${rfp.currency} ${parseFloat(rfp.budget).toLocaleString()}` : '—' },
                                { label: 'Award Date', value: rfp.award_date ? format(new Date(rfp.award_date), 'd MMM yyyy') : '—' },
                            ].map(({ label, value }) => (
                                <div key={label} className="bg-card border border-border rounded-lg px-4 py-3 flex justify-between items-center">
                                    <span className="text-xs text-muted-foreground">{label}</span>
                                    <span className="text-xs font-semibold">{value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── Requirements ── */}
                {tab === 'requirements' && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        {!rfp.requirements?.length ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">No requirements defined.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-border bg-muted/30">
                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Category</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                                        <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {rfp.requirements.map(req => (
                                        <tr key={req.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3 text-xs font-medium text-muted-foreground">{req.category || '—'}</td>
                                            <td className="px-4 py-3 text-sm">{req.description}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn(
                                                    'text-xs font-medium px-2 py-0.5 rounded-full',
                                                    req.mandatory
                                                        ? 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                                                        : 'bg-muted text-muted-foreground'
                                                )}>
                                                    {req.mandatory ? 'Mandatory' : 'Optional'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}

                {/* ── Evaluation Criteria ── */}
                {tab === 'criteria' && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        {!rfp.evaluation_criteria?.length ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">No evaluation criteria defined.</p>
                        ) : (
                            <>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border bg-muted/30">
                                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Criterion</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Weight</th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {rfp.evaluation_criteria.map(ec => (
                                            <tr key={ec.id} className="hover:bg-muted/20">
                                                <td className="px-4 py-3 font-medium">{ec.criterion}</td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-1.5 bg-muted rounded-full w-16 overflow-hidden">
                                                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${ec.weight_pct}%` }} />
                                                        </div>
                                                        <span className="text-xs font-semibold">{ec.weight_pct}%</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-muted-foreground">{ec.description || '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="px-4 py-3 border-t border-border bg-muted/20 text-xs text-muted-foreground flex justify-end">
                                    Total weight: <strong className={cn('ml-1', rfp.evaluation_criteria.reduce((s, c) => s + c.weight_pct, 0) === 100 ? 'text-emerald-600' : 'text-amber-600')}>
                                        {rfp.evaluation_criteria.reduce((s, c) => s + c.weight_pct, 0)}%
                                    </strong>
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* ── Approval Trail ── */}
                {tab === 'approval' && (
                    <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                        {!makerCheckerActive ? (
                            <p className="text-sm text-muted-foreground">
                                Maker-checker is not enabled for RFPs. Enable it in{' '}
                                <Link href="/settings/company" className="text-amber-600 hover:underline">Company Settings</Link>.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Approval History</p>
                                {rfp.approval_status === 'not_required' && (
                                    <p className="text-sm text-muted-foreground">No approval required for this {rfp.type.toUpperCase()}.</p>
                                )}
                                {rfp.approval_requested_at && (
                                    <div className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg">
                                        <Clock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium">Approval Requested</p>
                                            <p className="text-xs text-muted-foreground">{format(new Date(rfp.approval_requested_at), 'd MMM yyyy, HH:mm')}</p>
                                        </div>
                                    </div>
                                )}
                                {rfp.approved_at && rfp.approver && (
                                    <div className="flex items-start gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/20 dark:border-emerald-800">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Approved by {rfp.approver.name}</p>
                                            <p className="text-xs text-emerald-700 dark:text-emerald-400">{format(new Date(rfp.approved_at), 'd MMM yyyy, HH:mm')}</p>
                                        </div>
                                    </div>
                                )}
                                {rfp.approval_status === 'rejected' && (
                                    <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-800">
                                        <XCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-xs font-medium text-red-800 dark:text-red-300">Rejected — revisions required</p>
                                            {pendingApproval?.reviewer_notes && (
                                                <p className="text-xs text-red-700 dark:text-red-400 mt-0.5 italic">"{pendingApproval.reviewer_notes}"</p>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
