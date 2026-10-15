/**
 * tenders/show.tsx — with maker-checker approval panel
 * Extends the existing show page; only the new approval section and modified submit logic are new.
 * All original AI/chat/checklist/gap functionality is preserved.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Sparkles, FileText, CheckSquare, AlertCircle, MessageSquare,
    Trophy, Send, CheckCircle2, Circle, ChevronDown, ChevronUp,
    ArrowRight, RefreshCw, Download, TrendingUp, Calendar, Clock,
    Plus, ScrollText, GitBranch, XCircle, Shield, User,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ── Types ──────────────────────────────────────────────────────────────────────
interface ChecklistItem { id: string; category: string; label: string; done: boolean; notes?: string }
interface GapItem       { id: string; category: string; question: string; why_needed: string; answer?: string; resolved: boolean }
interface GeneratedDoc  { type: string; title: string; content: string; created_at: string }
interface ChatMessage   { role: 'user' | 'assistant'; content: string; created_at?: string }

interface Tender {
    id: number; title: string; issuer?: string; reference_number?: string;
    status: string; approval_status: string;
    submission_deadline?: string; submitted_at?: string;
    estimated_value?: number; currency: string; document_name?: string;
    analysis_status?: 'pending' | 'processing' | 'completed' | 'failed' | null;
    extracted_data?: any; ai_analysis?: any;
    checklist?: ChecklistItem[]; information_gaps?: GapItem[];
    generated_documents?: GeneratedDoc[]; agent_conversation?: ChatMessage[];
    lead?: any; opportunity?: any; project?: any;
    submitter?: { id: number; name: string };
    approver?: { id: number; name: string };
    approval_requested_at?: string;
    approved_at?: string;
}

interface ApprovalRequest {
    id: number; status: string; action: string;
    requester_notes: string | null; reviewer_notes: string | null;
    requester: { id: number; name: string; email: string };
    created_at: string;
}

interface Props {
    tender: Tender;
    pendingApproval: ApprovalRequest | null;
    makerCheckerActive: boolean;
    canApprove: boolean;
}

// ── Config ─────────────────────────────────────────────────────────────────────
const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
    reviewing: { label: 'Reviewing',  dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    drafting:  { label: 'Drafting',   dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    submitted: { label: 'Submitted',  dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
    won:       { label: 'Won 🎉',     dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    lost:      { label: 'Lost',       dot: 'bg-red-500',     pill: 'bg-red-50 text-red-600 ring-red-200' },
    withdrawn: { label: 'Withdrawn',  dot: 'bg-zinc-400',    pill: 'bg-zinc-50 text-zinc-500 ring-zinc-200' },
};

const DOC_TYPES = [
    { value: 'cover_letter',         label: 'Cover Letter' },
    { value: 'capability_statement', label: 'Capability Statement' },
    { value: 'executive_summary',    label: 'Executive Summary' },
    { value: 'methodology',          label: 'Proposed Methodology' },
    { value: 'compliance_matrix',    label: 'Compliance Matrix' },
    { value: 'pricing_schedule',     label: 'Pricing Schedule' },
];

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

async function post(url: string, data: Record<string, unknown> = {}) {
    const res = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrfToken(),
        },
        body: JSON.stringify(data),
    });

    if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`Request to ${url} failed (${res.status}): ${text.slice(0, 200)}`);
    }

    return res.json();
}

// ── Approval Panel Component ───────────────────────────────────────────────────
function ApprovalPanel({ tender, pendingApproval, makerCheckerActive, canApprove }: Props) {
    const [notes, setNotes]     = useState('');
    const [reason, setReason]   = useState('');
    const [showReject, setShowReject] = useState(false);
    const [loading, setLoading] = useState('');

    if (! makerCheckerActive) {
        return (
            <div className="p-5 text-center text-sm text-muted-foreground">
                Maker-checker is not configured for Tenders.{' '}
                <Link href="/settings/company" className="text-amber-600 hover:underline">Configure in Company Settings.</Link>
            </div>
        );
    }

    async function handleRequest() {
        setLoading('request');
        await post(`/tenders/${tender.id}/request-approval`, { notes });
        setLoading('');
        router.reload();
    }

    async function handleApprove() {
        setLoading('approve');
        await post(`/tenders/${tender.id}/approve`, { notes });
        setLoading('');
        router.reload();
    }

    async function handleReject() {
        if (!reason.trim()) return;
        setLoading('reject');
        await post(`/tenders/${tender.id}/reject`, { reason });
        setLoading('');
        router.reload();
    }

    return (
        <div className="space-y-4 p-5">
            {/* Approval status timeline */}
            <div className="flex items-center gap-2 text-xs">
                {[
                    { label: 'Draft',    done: true },
                    { label: 'Requested', done: !!tender.approval_requested_at },
                    { label: 'Approved',  done: tender.approval_status === 'approved' },
                    { label: 'Submitted', done: tender.status === 'submitted' },
                ].map((step, i, arr) => (
                    <div key={step.label} className="flex items-center gap-1">
                        <div className={cn(
                            'w-5 h-5 rounded-full flex items-center justify-center border text-[10px] font-bold',
                            step.done
                                ? 'bg-amber-500 border-amber-500 text-white'
                                : 'bg-background border-border text-muted-foreground'
                        )}>
                            {step.done ? '✓' : i + 1}
                        </div>
                        <span className={step.done ? 'font-medium' : 'text-muted-foreground'}>{step.label}</span>
                        {i < arr.length - 1 && <div className={cn('w-8 h-px', step.done ? 'bg-amber-400' : 'bg-border')} />}
                    </div>
                ))}
            </div>

            {/* Current state message */}
            {tender.approval_status === 'not_required' && (
                <div className="p-3 bg-muted/30 rounded-lg text-xs text-muted-foreground">
                    No approval needed — maker-checker was not enabled when this tender was created.
                </div>
            )}

            {tender.approval_status === 'pending' && pendingApproval && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
                    <p className="text-xs font-semibold text-amber-800 dark:text-amber-200 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" /> Approval Pending
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                        Requested by <strong>{pendingApproval.requester.name}</strong> on{' '}
                        {format(new Date(pendingApproval.created_at), 'd MMM yyyy')}.
                    </p>
                    {pendingApproval.requester_notes && (
                        <p className="text-xs italic text-amber-700 dark:text-amber-400 mt-1">
                            "{pendingApproval.requester_notes}"
                        </p>
                    )}
                </div>
            )}

            {tender.approval_status === 'approved' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg dark:bg-emerald-950/20 dark:border-emerald-800">
                    <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approved
                    </p>
                    {tender.approver && (
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-0.5">
                            Approved by <strong>{tender.approver.name}</strong>
                            {tender.approved_at ? ` on ${format(new Date(tender.approved_at), 'd MMM yyyy')}` : ''}
                        </p>
                    )}
                </div>
            )}

            {tender.approval_status === 'rejected' && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-800">
                    <p className="text-xs font-semibold text-red-800 dark:text-red-200 flex items-center gap-1.5">
                        <XCircle className="h-3.5 w-3.5" /> Rejected — revisions required
                    </p>
                    {pendingApproval?.reviewer_notes && (
                        <p className="text-xs italic text-red-700 dark:text-red-400 mt-1">
                            "{pendingApproval.reviewer_notes}"
                        </p>
                    )}
                </div>
            )}

            {/* Maker actions */}
            {['not_required', 'rejected'].includes(tender.approval_status) && tender.status === 'drafting' && (
                <div className="space-y-2">
                    <Textarea placeholder="Notes for approver (optional)…" rows={2}
                        value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" />
                    <Button size="sm" onClick={handleRequest} disabled={!!loading}
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <GitBranch className="h-3.5 w-3.5" />
                        {loading === 'request' ? 'Requesting…' : 'Request Approval to Submit'}
                    </Button>
                </div>
            )}

            {/* Checker actions */}
            {canApprove && pendingApproval?.status === 'pending' && (
                <div className="space-y-2 pt-2 border-t border-border">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Decision</p>
                    <Textarea placeholder="Add a note (optional)…" rows={2}
                        value={notes} onChange={e => setNotes(e.target.value)} className="text-xs" />
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleApprove} disabled={!!loading}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {loading === 'approve' ? 'Approving…' : 'Approve'}
                        </Button>
                        <Button size="sm" variant="outline"
                            onClick={() => setShowReject(v => !v)}
                            className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 gap-1.5">
                            <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                    </div>
                    {showReject && (
                        <div className="space-y-2">
                            <Textarea placeholder="Reason for rejection (required)…" rows={2}
                                value={reason} onChange={e => setReason(e.target.value)}
                                className="text-xs border-red-200 dark:border-red-800" />
                            <Button size="sm" onClick={handleReject}
                                disabled={!reason.trim() || !!loading}
                                className="w-full bg-red-600 hover:bg-red-700 text-white">
                                {loading === 'reject' ? 'Rejecting…' : 'Confirm Rejection'}
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function TenderShow({ tender, pendingApproval, makerCheckerActive, canApprove }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Tenders', href: '/tenders' },
        { title: tender.title, href: `/tenders/${tender.id}` },
    ];

    type Tab = 'analysis' | 'checklist' | 'gaps' | 'documents' | 'chat' | 'approval';

    const [tab, setTab]       = useState<Tab>('analysis');
    const [chat, setChat]     = useState(tender.agent_conversation ?? []);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const [docType, setDocType]   = useState(DOC_TYPES[0].value);
    const [docContext, setDocContext] = useState('');
    const [genLoading, setGenLoading] = useState(false);
    const chatRef = useRef<HTMLDivElement>(null);
    const sc = STATUS[tender.status] ?? STATUS.reviewing;

    useEffect(() => { chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' }); }, [chat]);

    async function sendChat() {
        if (!chatInput.trim()) return;
        const msg = chatInput;
        setChatInput('');
        setChatLoading(true);
        setChat(p => [...p, { role: 'user', content: msg }]);
        const r = await post(`/tenders/${tender.id}/chat`, { message: msg });
        setChat(p => [...p, { role: 'assistant', content: r.response }]);
        setChatLoading(false);
    }

    async function toggleCheck(idx: number, done: boolean) {
        const r = await post(`/tenders/${tender.id}/toggle-checklist`, { item_index: idx, done });
        router.reload({ only: ['tender'] });
    }

    async function generateDoc() {
        setGenLoading(true);
        const r = await post(`/tenders/${tender.id}/generate-document`, { type: docType, additional_context: docContext });
        setGenLoading(false);
        router.reload({ only: ['tender'] });
    }

    async function submitTender() {
        if (makerCheckerActive && tender.approval_status !== 'approved') {
            setTab('approval');
            return;
        }
        await post(`/tenders/${tender.id}/submit`);
        router.reload();
    }

    const checklist  = tender.checklist ?? [];
    const gaps       = tender.information_gaps ?? [];
    const docs       = tender.generated_documents ?? [];
    const progress   = checklist.length ? Math.round(checklist.filter(i => i.done).length / checklist.length * 100) : 0;
    const unresolvedGaps = gaps.filter(g => !g.resolved).length;

    const showApprovalBadge = makerCheckerActive && tender.approval_status === 'pending';
    const blockedByApproval = makerCheckerActive && tender.approval_status !== 'approved' && tender.status === 'drafting';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={tender.title} />
            <div className="space-y-5 p-6">

                {/* Record header */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-6 py-5 flex flex-col md:flex-row md:items-start gap-4">
                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-0.5 rounded-full ring-1', sc.pill)}>
                                    <span className={cn('h-1.5 w-1.5 rounded-full', sc.dot)} />
                                    {sc.label}
                                </span>
                                {showApprovalBadge && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                                        <Clock className="h-3 w-3" /> Pending Approval
                                    </span>
                                )}
                                {makerCheckerActive && tender.approval_status === 'approved' && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
                                        <Shield className="h-3 w-3" /> Approved
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl font-bold">{tender.title}</h1>
                            {tender.issuer && <p className="text-sm text-muted-foreground mt-0.5">{tender.issuer}</p>}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                            {tender.status === 'drafting' && (
                                <Button size="sm" onClick={submitTender}
                                    className={cn('gap-1.5', blockedByApproval
                                        ? 'bg-amber-500 hover:bg-amber-600 text-white'
                                        : 'bg-violet-600 hover:bg-violet-700 text-white')}>
                                    {blockedByApproval ? (
                                        <><GitBranch className="h-3.5 w-3.5" /> Request Approval</>
                                    ) : (
                                        <><Send className="h-3.5 w-3.5" /> Submit Tender</>
                                    )}
                                </Button>
                            )}
                            {tender.status === 'submitted' && (
                                <>
                                    <Button size="sm" onClick={async () => { await post(`/tenders/${tender.id}/won`); router.reload(); }}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                                        <Trophy className="h-3.5 w-3.5" /> Mark Won
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={async () => { await post(`/tenders/${tender.id}/lost`); router.reload(); }}
                                        className="border-red-200 text-red-600 hover:bg-red-50">
                                        Mark Lost
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="px-6 py-3 border-t border-border bg-muted/20 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
                        {tender.submission_deadline && (
                            <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" />
                                Deadline: <strong className="text-foreground">{format(new Date(tender.submission_deadline), 'd MMM yyyy')}</strong>
                            </span>
                        )}
                        {tender.estimated_value && (
                            <span className="flex items-center gap-1.5"><TrendingUp className="h-3.5 w-3.5" />
                                Value: <strong className="text-foreground">{tender.currency} {tender.estimated_value.toLocaleString()}</strong>
                            </span>
                        )}
                        {checklist.length > 0 && (
                            <span className="flex items-center gap-1.5"><CheckSquare className="h-3.5 w-3.5" />
                                Checklist: <strong className="text-foreground">{progress}%</strong>
                            </span>
                        )}
                        {unresolvedGaps > 0 && (
                            <span className="flex items-center gap-1.5 text-amber-600"><AlertCircle className="h-3.5 w-3.5" />
                                <strong>{unresolvedGaps}</strong> unresolved gaps
                            </span>
                        )}
                    </div>
                </div>

                {/* Tab bar */}
                <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border overflow-x-auto">
                    {([
                        { id: 'analysis',  label: 'AI Analysis',  icon: Sparkles     },
                        { id: 'checklist', label: `Checklist (${checklist.filter(i=>i.done).length}/${checklist.length})`, icon: CheckSquare },
                        { id: 'gaps',      label: `Gaps (${unresolvedGaps})`, icon: AlertCircle },
                        { id: 'documents', label: `Documents (${docs.length})`, icon: FileText },
                        { id: 'chat',      label: 'AI Chat',      icon: MessageSquare },
                        { id: 'approval',  label: makerCheckerActive ? `Approval${showApprovalBadge ? ' ●' : ''}` : 'Approval', icon: GitBranch },
                    ] as { id: Tab; label: string; icon: React.ElementType }[]).map(t => (
                        <button key={t.id} onClick={() => setTab(t.id)}
                            className={cn(
                                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                                tab === t.id
                                    ? 'bg-background text-foreground shadow-sm border border-border'
                                    : 'text-muted-foreground hover:text-foreground',
                                t.id === 'approval' && showApprovalBadge ? 'text-amber-600' : ''
                            )}>
                            <t.icon className="h-3.5 w-3.5" />{t.label}
                        </button>
                    ))}
                </div>

                    {/* Tab content */}

                            {/* ── Analysis (default tab) ── */}
                            {tab === 'analysis' && (
                                <>
                                    {tender.ai_analysis && (
                                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                                            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                                                <Sparkles className="h-4 w-4 text-primary" />
                                                <h3 className="text-sm font-semibold">AI Strategic Analysis</h3>
                                            </div>
                                            <div className="p-5 space-y-4">
                                                {tender.ai_analysis.summary && (
                                                    <p className="text-sm text-muted-foreground">{tender.ai_analysis.summary}</p>
                                                )}
                                                <div className="grid sm:grid-cols-2 gap-4">
                                                    {(tender.ai_analysis.strengths ?? []).length > 0 && (
                                                        <div>
                                                            <p className="record-field-label mb-2">Our Strengths</p>
                                                            <ul className="space-y-1">
                                                                {(tender.ai_analysis.strengths ?? []).map((s: string, i: number) => (
                                                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                                                        <span className="text-emerald-500 mt-0.5">✓</span>{s}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                    {(tender.ai_analysis.risks ?? []).length > 0 && (
                                                        <div>
                                                            <p className="record-field-label mb-2">Risks</p>
                                                            <ul className="space-y-1">
                                                                {(tender.ai_analysis.risks ?? []).map((r: string, i: number) => (
                                                                    <li key={i} className="text-sm text-muted-foreground flex gap-2">
                                                                        <span className="text-amber-500 mt-0.5">⚠</span>{r}
                                                                    </li>
                                                                ))}
                                                            </ul>
                                                        </div>
                                                    )}
                                                </div>
                                                {tender.ai_analysis.recommended_approach && (
                                                    <div className="p-3.5 rounded-lg bg-primary/5 border border-primary/20">
                                                        <p className="text-xs font-semibold text-primary mb-1">Recommended Approach</p>
                                                        <p className="text-sm text-foreground">{tender.ai_analysis.recommended_approach}</p>
                                                    </div>
                                                )}
                                                {(tender.ai_analysis.win_themes ?? []).length > 0 && (
                                                    <div>
                                                        <p className="record-field-label mb-2">Win Themes</p>
                                                        <div className="flex gap-2 flex-wrap">
                                                            {(tender.ai_analysis.win_themes ?? []).map((t: string, i: number) => (
                                                                <span key={i} className="text-xs bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">{t}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    {tender.extracted_data && (
                                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                                            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                                                <h3 className="text-sm font-semibold">Extracted Requirements</h3>
                                            </div>
                                            <div className="p-5 space-y-4 text-sm">
                                                {(tender.extracted_data.scope_of_work ?? []).length > 0 && (
                                                    <div>
                                                        <p className="record-field-label mb-2">Scope of Work</p>
                                                        <ul className="space-y-1">
                                                            {tender.extracted_data.scope_of_work.map((s: string, i: number) => (
                                                                <li key={i} className="text-muted-foreground flex gap-2"><span className="text-muted-foreground/40">•</span>{s}</li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                )}
                                                {(tender.extracted_data.evaluation_criteria ?? []).length > 0 && (
                                                    <div>
                                                        <p className="record-field-label mb-2">Evaluation Criteria</p>
                                                        <div className="space-y-1">
                                                            {tender.extracted_data.evaluation_criteria.map((c: any, i: number) => (
                                                                <div key={i} className="flex items-center justify-between bg-muted/40 rounded px-3 py-1.5">
                                                                    <span className="text-muted-foreground">{c.criterion}</span>
                                                                    {c.weight && <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">{c.weight}</span>}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}

                {/* ── Checklist ── */}
                {tab === 'checklist' && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        {checklist.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">Checklist will appear after AI analysis.</p>
                        ) : (
                            <div className="divide-y divide-border">
                                {checklist.map((item, idx) => (
                                    <div key={item.id} className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20">
                                        <button onClick={() => toggleCheck(idx, !item.done)} className="mt-0.5 shrink-0">
                                            {item.done
                                                ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                                : <Circle className="h-4 w-4 text-muted-foreground" />
                                            }
                                        </button>
                                        <div className="flex-1">
                                            <p className={cn('text-sm', item.done && 'line-through text-muted-foreground')}>{item.label}</p>
                                            <p className="text-xs text-muted-foreground mt-0.5">{item.category}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Gaps ── */}
                {tab === 'gaps' && (
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        {gaps.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">No information gaps identified.</p>
                        ) : (
                            <div className="divide-y divide-border">
                                {gaps.map((gap, idx) => (
                                    <div key={gap.id} className={cn('px-4 py-4', gap.resolved ? 'opacity-60' : '')}>
                                        <div className="flex items-start justify-between gap-2">
                                            <div>
                                                <p className="text-sm font-medium">{gap.question}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{gap.why_needed}</p>
                                            </div>
                                            {gap.resolved && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                                        </div>
                                        {gap.answer && <p className="text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 rounded px-2 py-1.5 mt-2">{gap.answer}</p>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Documents ── */}
                {tab === 'documents' && (
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-lg p-5 flex flex-wrap gap-3 items-end">
                            <div className="flex-1 min-w-[160px]">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Document Type</label>
                                <select value={docType} onChange={e => setDocType(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                    {DOC_TYPES.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>
                            <div className="flex-1 min-w-[200px]">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">Additional Context</label>
                                <Input placeholder="Any specific instructions…" value={docContext} onChange={e => setDocContext(e.target.value)} />
                            </div>
                            <Button size="sm" onClick={generateDoc} disabled={genLoading}
                                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                <Sparkles className="h-3.5 w-3.5" />
                                {genLoading ? 'Generating…' : 'Generate'}
                            </Button>
                        </div>
                        {docs.length === 0 ? (
                            <p className="text-center text-sm text-muted-foreground py-8">No documents generated yet.</p>
                        ) : (
                            <div className="space-y-3">
                                {docs.map((doc, i) => (
                                    <div key={i} className="bg-card border border-border rounded-lg overflow-hidden">
                                        <div className="px-4 py-3 border-b border-border bg-muted/30 flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-medium">{doc.title}</p>
                                                <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), 'd MMM yyyy')}</p>
                                            </div>
                                            <Download className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-foreground" />
                                        </div>
                                        <pre className="p-4 text-xs text-muted-foreground whitespace-pre-wrap max-h-60 overflow-y-auto">{doc.content}</pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* ── Chat ── */}
                {tab === 'chat' && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[500px]">
                        <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-3">
                            {chat.length === 0 && (
                                <p className="text-center text-sm text-muted-foreground mt-8">Ask anything about this tender…</p>
                            )}
                            {chat.map((m, i) => (
                                <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                                    <div className={cn(
                                        'max-w-[80%] rounded-2xl px-4 py-2.5 text-sm',
                                        m.role === 'user'
                                            ? 'bg-amber-500 text-white'
                                            : 'bg-muted text-foreground'
                                    )}>
                                        {m.content}
                                    </div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted rounded-2xl px-4 py-2.5 text-sm text-muted-foreground animate-pulse">
                                        Thinking…
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="border-t border-border p-3 flex gap-2">
                            <Input placeholder="Ask about this tender…" value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendChat()} />
                            <Button size="sm" onClick={sendChat} disabled={chatLoading || !chatInput.trim()}
                                className="bg-amber-500 hover:bg-amber-600 text-white">
                                <Send className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}

                {/* ── Approval tab ── */}
                {tab === 'approval' && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-amber-500" />
                            <p className="text-sm font-semibold">Maker-Checker Approval</p>
                        </div>
                        <ApprovalPanel tender={tender} pendingApproval={pendingApproval}
                            makerCheckerActive={makerCheckerActive} canApprove={canApprove} />
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
