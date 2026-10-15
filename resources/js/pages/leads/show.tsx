import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, format } from 'date-fns';
import {
    FileText, Clock, CheckCircle2, AlertCircle, Loader2,
    Edit, ArrowLeftRight, Trash2, MoreHorizontal, Download,
    Star, StarOff, Phone, Mail, Plus, ChevronDown,
    User, Calendar, Tag, TrendingUp, Activity, MessageSquare,
    Paperclip, LayoutGrid, AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';

// ── Types ─────────────────────────────────────────────────────────────────────

interface LeadOwner   { id: number; name: string; email?: string; avatar?: string }
interface PipelineStg { id: number; name: string; color?: string }

interface LeadDocument {
    id: number; filename: string; original_name: string;
    status: string; file_url?: string; created_at: string;
    ai_summary?: { summary?: string; key_points?: string[] };
}

interface Opportunity {
    id: number; title: string; stage: string;
    estimated_value?: number; currency?: string;
}

interface Activity {
    id: number; type: string; title?: string; description?: string;
    created_at: string; user?: { name: string; avatar?: string };
}

interface Lead {
    id: number; title: string; description?: string;
    type: string; status: string;
    owner?: LeadOwner; pipeline_stage?: PipelineStg;
    estimated_value?: number | null;
    is_starred: boolean;
    metadata?: Record<string, any>;
    contacted_at?: string; qualified_at?: string;
    proposal_sent_at?: string; won_at?: string; lost_at?: string;
    created_at: string; updated_at: string;
    leadDocuments?: LeadDocument[];
    opportunity?: Opportunity;
    questions?: Array<{ id: number; question: string }>;
    activities?: Activity[];
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; dot: string; pill: string }> = {
    new:           { label: 'New',           dot: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-700 ring-sky-200' },
    contacted:     { label: 'Contacted',     dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
    qualified:     { label: 'Qualified',     dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    proposal_sent: { label: 'Proposal Sent', dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    negotiation:   { label: 'Negotiation',   dot: 'bg-orange-500',  pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
    won:           { label: 'Won',           dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    lost:          { label: 'Lost',          dot: 'bg-red-500',     pill: 'bg-red-50 text-red-700 ring-red-200' },
    archived:      { label: 'Archived',      dot: 'bg-gray-400',    pill: 'bg-gray-50 text-gray-600 ring-gray-200' },
};

const DOC_STATUS: Record<string, { icon: React.ReactNode; color: string }> = {
    pending:    { icon: <Clock className="h-3 w-3" />,                  color: 'text-amber-500' },
    processing: { icon: <Loader2 className="h-3 w-3 animate-spin" />,   color: 'text-blue-500'  },
    succeeded:  { icon: <CheckCircle2 className="h-3 w-3" />,           color: 'text-emerald-500' },
    failed:     { icon: <AlertCircle className="h-3 w-3" />,            color: 'text-red-500'   },
};

const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
    call:    <Phone className="h-3.5 w-3.5" />,
    email:   <Mail className="h-3.5 w-3.5" />,
    meeting: <Calendar className="h-3.5 w-3.5" />,
    note:    <MessageSquare className="h-3.5 w-3.5" />,
    task:    <CheckCircle2 className="h-3.5 w-3.5" />,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n);

const fmtDate = (d?: string | null) =>
    d ? format(new Date(d), 'MMM d, yyyy') : '—';

// ── Sub-components ────────────────────────────────────────────────────────────

/** A single field row in the Salesforce-style dense field grid */
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[160px_1fr] items-start py-2.5 border-b border-border/50 last:border-0">
            <dt className="record-field-label pt-0.5">{label}</dt>
            <dd className="record-field-value">{children}</dd>
        </div>
    );
}

/** Pill-style status badge */
function StatusPill({ status }: { status: string }) {
    const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.new;
    return (
        <span className={cn(
            'inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1',
            cfg.pill
        )}>
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', cfg.dot)} />
            {cfg.label}
        </span>
    );
}

/** Highlights bar — the 5-cell strip just below the record header */
function HighlightsBar({ lead }: { lead: Lead }) {
    const cells = [
        {
            label: 'Estimated Value',
            value: lead.estimated_value
                ? fmt(lead.estimated_value)
                : <span className="text-muted-foreground/60 italic">Not set</span>,
            icon: <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />,
        },
        {
            label: 'Pipeline Stage',
            value: lead.pipeline_stage?.name ?? '—',
            icon: <LayoutGrid className="h-3.5 w-3.5 text-muted-foreground" />,
        },
        {
            label: 'Lead Status',
            value: <StatusPill status={lead.status} />,
            icon: null,
        },
        {
            label: 'Owner',
            value: (
                <div className="flex items-center gap-1.5">
                    <Avatar className="h-5 w-5">
                        <AvatarImage src={lead.owner?.avatar} />
                        <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                            {lead.owner?.name?.charAt(0) ?? '?'}
                        </AvatarFallback>
                    </Avatar>
                    <span>{lead.owner?.name ?? '—'}</span>
                </div>
            ),
            icon: null,
        },
        {
            label: 'Created',
            value: fmtDate(lead.created_at),
            icon: <Calendar className="h-3.5 w-3.5 text-muted-foreground" />,
        },
    ];

    return (
        <div className="flex divide-x divide-border/60 border-b border-border bg-muted/30">
            {cells.map((cell, i) => (
                <div key={i} className="flex-1 px-4 py-2.5 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                        {cell.icon}
                        <span className="record-field-label">{cell.label}</span>
                    </div>
                    <div className="record-field-value truncate">{cell.value}</div>
                </div>
            ))}
        </div>
    );
}

/** Tab bar — Salesforce-style underline tabs */
function TabBar({
    tabs, active, onChange,
}: {
    tabs: { id: string; label: string; count?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex border-b border-border bg-card">
            {tabs.map(tab => (
                <button
                    key={tab.id}
                    onClick={() => onChange(tab.id)}
                    className={cn(
                        'px-5 py-3 text-sm font-medium transition-colors whitespace-nowrap',
                        'flex items-center gap-2',
                        active === tab.id ? 'sf-tab-active' : 'sf-tab-inactive'
                    )}
                >
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={cn(
                            'text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                            active === tab.id
                                ? 'bg-primary/15 text-primary'
                                : 'bg-muted text-muted-foreground'
                        )}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

/** Details tab — dense 2-col field grid */
function DetailsTab({ lead }: { lead: Lead }) {
    return (
        <div className="grid md:grid-cols-2 gap-0 divide-y md:divide-y-0 md:divide-x divide-border/50">
            {/* Left column */}
            <div className="p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Lead Information
                </h3>
                <dl>
                    <FieldRow label="Title">{lead.title}</FieldRow>
                    <FieldRow label="Type">
                        <span className="capitalize">{lead.type}</span>
                    </FieldRow>
                    <FieldRow label="Status"><StatusPill status={lead.status} /></FieldRow>
                    <FieldRow label="Pipeline Stage">{lead.pipeline_stage?.name ?? '—'}</FieldRow>
                    <FieldRow label="Owner">
                        <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                                <AvatarImage src={lead.owner?.avatar} />
                                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                                    {lead.owner?.name?.charAt(0) ?? '?'}
                                </AvatarFallback>
                            </Avatar>
                            <span>{lead.owner?.name ?? '—'}</span>
                        </div>
                    </FieldRow>
                    <FieldRow label="Estimated Value">
                        {lead.estimated_value
                            ? <span className="font-semibold text-emerald-700">{fmt(lead.estimated_value)}</span>
                            : <span className="text-muted-foreground/60 italic text-sm">Not set</span>}
                    </FieldRow>
                    {lead.description && (
                        <FieldRow label="Description">
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                                {lead.description}
                            </p>
                        </FieldRow>
                    )}
                </dl>
            </div>

            {/* Right column */}
            <div className="p-6">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                    Timeline & Metadata
                </h3>
                <dl>
                    <FieldRow label="Created">{fmtDate(lead.created_at)}</FieldRow>
                    <FieldRow label="Last Updated">{fmtDate(lead.updated_at)}</FieldRow>
                    <FieldRow label="Contacted">{fmtDate(lead.contacted_at)}</FieldRow>
                    <FieldRow label="Qualified">{fmtDate(lead.qualified_at)}</FieldRow>
                    <FieldRow label="Proposal Sent">{fmtDate(lead.proposal_sent_at)}</FieldRow>
                    {lead.won_at && (
                        <FieldRow label="Won At">
                            <span className="text-emerald-600 font-medium">{fmtDate(lead.won_at)}</span>
                        </FieldRow>
                    )}
                    {lead.lost_at && (
                        <FieldRow label="Lost At">
                            <span className="text-red-500 font-medium">{fmtDate(lead.lost_at)}</span>
                        </FieldRow>
                    )}
                    {lead.metadata?.source && (
                        <FieldRow label="Source">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted ring-1 ring-border text-foreground">
                                <Tag className="h-3 w-3" />
                                {lead.metadata.source}
                            </span>
                        </FieldRow>
                    )}
                    {lead.metadata?.tags && (
                        <FieldRow label="Tags">
                            <span className="text-muted-foreground">{lead.metadata.tags}</span>
                        </FieldRow>
                    )}
                </dl>
            </div>
        </div>
    );
}

/** Documents tab */
function DocumentsTab({ documents, leadId }: { documents: LeadDocument[]; leadId: number }) {
    if (documents.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <Paperclip className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No documents yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                    Upload a file to start AI analysis
                </p>
                <Button size="sm" variant="outline" className="mt-4" asChild>
                    <Link href={`/leads/${leadId}/edit`}>
                        <Plus className="h-3.5 w-3.5 mr-1.5" /> Upload Document
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="divide-y divide-border/50">
            {documents.map(doc => {
                const s = DOC_STATUS[doc.status] ?? DOC_STATUS.pending;
                return (
                    <div key={doc.id} className="flex items-start gap-4 px-6 py-4 hover:bg-muted/30 transition-colors">
                        <div className={cn(
                            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5',
                            'bg-muted', s.color
                        )}>
                            {s.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {doc.original_name || doc.filename || `Document ${doc.id}`}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {doc.created_at ? format(new Date(doc.created_at), 'MMM d, yyyy h:mm a') : '—'}
                            </p>
                            {doc.ai_summary?.summary && (
                                <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200/60 rounded-md">
                                    <p className="text-xs font-medium text-amber-700 mb-1">AI Summary</p>
                                    <p className="text-xs text-amber-900 leading-relaxed">{doc.ai_summary.summary}</p>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="outline" className="text-xs capitalize">{doc.status}</Badge>
                            {doc.file_url && (
                                <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
                                    <a href={doc.file_url} download target="_blank" rel="noopener noreferrer">
                                        <Download className="h-3.5 w-3.5" />
                                    </a>
                                </Button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/** Opportunity tab */
function OpportunityTab({ opportunity, leadId }: { opportunity?: Opportunity; leadId: number }) {
    if (!opportunity) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No opportunity linked</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                    Convert this lead to create an opportunity
                </p>
                <Button size="sm" className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Convert to Opportunity
                </Button>
            </div>
        );
    }

    return (
        <div className="px-6 py-5">
            <Link href={`/opportunities/${opportunity.id}`}>
                <div className="group flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/40 hover:bg-primary/5 transition-all">
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-amber-100 flex items-center justify-center">
                            <TrendingUp className="h-4 w-4 text-amber-700" />
                        </div>
                        <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                                {opportunity.title}
                            </p>
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                                {opportunity.stage?.replace('_', ' ')}
                            </p>
                        </div>
                    </div>
                    {opportunity.estimated_value && (
                        <span className="text-sm font-semibold text-emerald-700">
                            {fmt(opportunity.estimated_value, opportunity.currency)}
                        </span>
                    )}
                </div>
            </Link>
        </div>
    );
}

/** AI Questions tab */
function QuestionsTab({ questions }: { questions: Array<{ id: number; question: string }> }) {
    if (!questions.length) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-center">
                <MessageSquare className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">No AI questions generated yet</p>
            </div>
        );
    }
    return (
        <div className="px-6 py-5 space-y-2.5">
            {questions.map((q, i) => (
                <div key={q.id} className="flex gap-3 p-3.5 rounded-lg bg-muted/50 border border-border/50">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-[11px] font-bold mt-0.5">
                        {i + 1}
                    </span>
                    <p className="text-sm text-foreground">{q.question}</p>
                </div>
            ))}
        </div>
    );
}

/** Activity timeline (right panel) */
function ActivityTimeline({ activities, leadId }: { activities: Activity[]; leadId: number }) {
    const ICON_COLORS: Record<string, string> = {
        call:    'bg-sky-100 text-sky-700',
        email:   'bg-violet-100 text-violet-700',
        meeting: 'bg-amber-100 text-amber-700',
        note:    'bg-green-100 text-green-700',
        task:    'bg-rose-100 text-rose-700',
    };

    return (
        <div className="flex flex-col h-full">
            {/* Timeline header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Activity
                </h3>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" className="h-7 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90">
                            <Plus className="h-3 w-3" /> Log
                            <ChevronDown className="h-3 w-3 ml-0.5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-40">
                        {['Log a Call', 'Log an Email', 'New Meeting', 'New Note', 'New Task'].map(a => (
                            <DropdownMenuItem key={a} className="text-sm">
                                {a}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Timeline items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-0">
                {activities.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <Activity className="h-8 w-8 text-muted-foreground/30 mb-2" />
                        <p className="text-xs text-muted-foreground">No activity yet</p>
                    </div>
                ) : (
                    activities.map((act, i) => {
                        const iconCls = ICON_COLORS[act.type] ?? 'bg-gray-100 text-gray-600';
                        const icon    = ACTIVITY_ICONS[act.type] ?? <Activity className="h-3.5 w-3.5" />;
                        const isLast  = i === activities.length - 1;
                        return (
                            <div key={act.id} className="relative flex gap-3 pb-4">
                                {/* Vertical line */}
                                {!isLast && (
                                    <div className="absolute left-[15px] top-7 bottom-0 w-px bg-border/60" />
                                )}
                                {/* Icon dot */}
                                <div className={cn(
                                    'relative z-10 shrink-0 h-7 w-7 rounded-full flex items-center justify-center mt-0.5',
                                    iconCls
                                )}>
                                    {icon}
                                </div>
                                {/* Content */}
                                <div className="flex-1 min-w-0 pt-0.5">
                                    <div className="flex items-start justify-between gap-2">
                                        <p className="text-xs font-medium text-foreground leading-snug">
                                            {act.title || `${act.type} logged`}
                                        </p>
                                        <span className="text-[11px] text-muted-foreground/60 shrink-0">
                                            {formatDistanceToNow(new Date(act.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {act.description && (
                                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                            {act.description}
                                        </p>
                                    )}
                                    {act.user && (
                                        <p className="text-[11px] text-muted-foreground/50 mt-1">
                                            by {act.user.name}
                                        </p>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}

// ── Page ───────────────────────────────────────────────────────────────────────

export default function LeadShow() {
    const { props } = usePage<{ lead: Lead }>();
    const lead      = props.lead;

    const [activeTab, setActiveTab]       = useState('details');
    const [documents, setDocuments]       = useState<LeadDocument[]>(lead?.leadDocuments ?? []);
    const [isStarred, setIsStarred]       = useState(lead?.is_starred ?? false);
    const [starLoading, setStarLoading]   = useState(false);

    const activities = lead?.activities ?? [];
    const statusCfg  = STATUS_CONFIG[lead?.status] ?? STATUS_CONFIG.new;

    const tabs = [
        { id: 'details',   label: 'Details' },
        { id: 'documents', label: 'Documents', count: documents.length },
        { id: 'opportunity', label: 'Opportunity' },
        { id: 'questions', label: 'AI Questions', count: lead?.questions?.length ?? 0 },
    ];

    async function toggleStar() {
        setStarLoading(true);
        try {
            // Use axios for API call — avoids Inertia JSON rejection bug
            const api = (await import('@/lib/axios')).default;
            await api.post(`/leads/${lead.id}/toggle-star`);
            setIsStarred(v => !v);
        } finally {
            setStarLoading(false);
        }
    }

    function confirmDelete() {
        if (!confirm(`Delete lead "${lead?.title}"? This cannot be undone.`)) return;
        router.delete(`/leads/${lead.id}`, {
            onSuccess: () => router.visit('/leads'),
        });
    }

    return (
        <AppLayout breadcrumbs={[
            { title: 'Leads', href: '/leads' },
            { title: lead?.title ?? 'Lead', href: `/leads/${lead?.id}` },
        ]}>
            <Head title={lead?.title ?? 'Lead'} />

            {/* ── RECORD HEADER ──────────────────────────────────────────── */}
            <div className="bg-card border-b border-border">
                <div className="px-6 pt-5 pb-0">
                    {/* Title row */}
                    <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-3 min-w-0">
                            {/* Record type icon */}
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <FileText className="h-5 w-5 text-primary" />
                            </div>

                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-xl font-bold text-foreground tracking-tight truncate">
                                        {lead?.title ?? 'Lead'}
                                    </h1>
                                    <StatusPill status={lead?.status} />
                                    {isStarred && (
                                        <Star className="h-4 w-4 text-amber-500 fill-amber-500 shrink-0" />
                                    )}
                                </div>
                                {/* Subtitle metadata strip */}
                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                    <span className="text-xs text-muted-foreground capitalize">
                                        {lead?.type} lead
                                    </span>
                                    {lead?.pipeline_stage && (
                                        <>
                                            <span className="text-muted-foreground/40">·</span>
                                            <span className="text-xs text-muted-foreground">
                                                {lead.pipeline_stage.name}
                                            </span>
                                        </>
                                    )}
                                    {lead?.owner && (
                                        <>
                                            <span className="text-muted-foreground/40">·</span>
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <User className="h-3 w-3" /> {lead.owner.name}
                                            </span>
                                        </>
                                    )}
                                    <span className="text-muted-foreground/40">·</span>
                                    <span className="text-xs text-muted-foreground">
                                        Created {formatDistanceToNow(new Date(lead?.created_at ?? ''), { addSuffix: true })}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Action buttons — Salesforce "detail page buttons" pattern */}
                        <div className="flex items-center gap-2 shrink-0">
                            {/* Star toggle */}
                            <Button
                                variant="ghost" size="icon"
                                className={cn(
                                    'h-8 w-8 text-muted-foreground',
                                    isStarred && 'text-amber-500'
                                )}
                                onClick={toggleStar}
                                disabled={starLoading}
                            >
                                {isStarred
                                    ? <Star className="h-4 w-4 fill-current" />
                                    : <StarOff className="h-4 w-4" />}
                            </Button>

                            <Separator orientation="vertical" className="h-5" />

                            {/* Primary: Edit */}
                            <Button size="sm" variant="outline" asChild>
                                <Link href={`/leads/${lead?.id}/edit`}>
                                    <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                </Link>
                            </Button>

                            {/* Secondary: Convert */}
                            <Button
                                size="sm"
                                className="bg-primary text-primary-foreground hover:bg-primary/90"
                                asChild
                            >
                                <Link href={`/leads/${lead?.id}/convert`}>
                                    <ArrowLeftRight className="h-3.5 w-3.5 mr-1.5" /> Convert
                                </Link>
                            </Button>

                            {/* More actions dropdown */}
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="outline" size="sm" className="px-2">
                                        <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-44">
                                    <DropdownMenuItem asChild>
                                        <Link href={`/leads/${lead?.id}/edit`}>
                                            <Edit className="mr-2 h-3.5 w-3.5" /> Edit Lead
                                        </Link>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={toggleStar} disabled={starLoading}>
                                        {isStarred
                                            ? <><StarOff className="mr-2 h-3.5 w-3.5" /> Remove Star</>
                                            : <><Star className="mr-2 h-3.5 w-3.5" /> Add Star</>}
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="text-destructive focus:text-destructive"
                                        onClick={confirmDelete}
                                    >
                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Lead
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                </div>

                {/* ── HIGHLIGHTS BAR ── */}
                <HighlightsBar lead={lead} />
            </div>

            {/* ── BODY: Tabs (left) + Activity Timeline (right) ──────────── */}
            <div className="flex flex-1 min-h-0 overflow-hidden">

                {/* LEFT — Tabs + content */}
                <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                    <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

                    <div className="flex-1 overflow-y-auto bg-card">
                        {activeTab === 'details'     && <DetailsTab lead={lead} />}
                        {activeTab === 'documents'   && (
                            <DocumentsTab documents={documents} leadId={lead?.id} />
                        )}
                        {activeTab === 'opportunity' && (
                            <OpportunityTab opportunity={lead?.opportunity} leadId={lead?.id} />
                        )}
                        {activeTab === 'questions'   && (
                            <QuestionsTab questions={lead?.questions ?? []} />
                        )}
                    </div>
                </div>

                {/* RIGHT — Activity timeline (fixed width, full height) */}
                <div className="w-72 shrink-0 border-l border-border bg-card overflow-hidden flex flex-col">
                    <ActivityTimeline activities={activities} leadId={lead?.id} />
                </div>
            </div>
        </AppLayout>
    );
}