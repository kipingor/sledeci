/**
 * BUG FIX: opportunities/show.tsx used `route()` from 'ziggy-js' for:
 *   route('web.opportunities.index')     → '/opportunities'
 *   route('web.opportunities.show', id)  → `/opportunities/${id}`
 *   route('web.opportunities.edit', id)  → `/opportunities/${id}/edit`
 *   route('web.opportunities.destroy',id) → DELETE `/opportunities/${id}`
 *   route('web.leads.show', id)          → `/leads/${id}`
 *   route('projects.show', id)           → `/projects/${id}`
 *
 * All replaced with direct URL strings.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type BreadcrumbItem } from '@/types';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';
import {
    Edit, Trash2, ExternalLink, UserPlus, Briefcase, TrendingUp,
    Calendar, DollarSign, User, MoreHorizontal, ArrowLeftRight,
    CheckCircle2, Clock,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';

const fmt = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');

const STAGE: Record<string, { label: string; dot: string; pill: string }> = {
    qualification: { label: 'Qualification', dot: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-700 ring-sky-200' },
    proposal:      { label: 'Proposal',      dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    negotiation:   { label: 'Negotiation',   dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    closed_won:    { label: 'Closed Won',    dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    closed_lost:   { label: 'Closed Lost',   dot: 'bg-red-500',     pill: 'bg-red-50 text-red-600 ring-red-200' },
};

function StagePill({ stage }: { stage: string }) {
    const cfg = STAGE[stage] ?? { label: stage, dot: 'bg-gray-400', pill: 'bg-gray-50 text-gray-600 ring-gray-200' };
    return (
        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1', cfg.pill)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
            {cfg.label}
        </span>
    );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[150px_1fr] items-start py-2.5 border-b border-border/50 last:border-0">
            <dt className="record-field-label pt-0.5">{label}</dt>
            <dd className="record-field-value">{children}</dd>
        </div>
    );
}

interface Opportunity {
    id: number; title: string; summary?: string; description?: string;
    stage: string; estimated_value?: number; currency?: string; probability?: number;
    expected_close_date?: string; created_at: string; updated_at: string;
    contact_name?: string; contact_email?: string; contact_phone?: string;
    client_id?: number | null;
    owner?: { id: number; name: string; avatar?: string };
    lead?: { id: number; title: string };
    project?: { id: number; name: string };
}

interface Props { opportunity: Opportunity }

export default function OpportunityShow({ opportunity }: Props) {
    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();
    const [activeTab, setActiveTab] = useState('details');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Opportunities', href: '/opportunities' },
        { title: opportunity?.title ?? 'Opportunity', href: `/opportunities/${opportunity?.id}` },
    ];

    const handleDelete = () => confirmDelete({
        itemName: opportunity.title,
        onConfirm: async () => {
            router.delete(`/opportunities/${opportunity.id}`, {
                onSuccess: () => router.visit('/opportunities'),
            });
        },
    });

    const stageCfg = STAGE[opportunity?.stage] ?? STAGE.qualification;
    const weightedValue = opportunity?.estimated_value && opportunity?.probability
        ? opportunity.estimated_value * (opportunity.probability / 100)
        : null;

    const tabs = [
        { id: 'details', label: 'Details' },
        { id: 'contacts', label: 'Contact Info' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={opportunity?.title ?? 'Opportunity'} />
            <ConfirmDialog />

            <div className="flex flex-col h-full">

                {/* ── Record header ── */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <Briefcase className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-xl font-bold tracking-tight">{opportunity?.title}</h1>
                                        <StagePill stage={opportunity?.stage} />
                                    </div>
                                    <div className="flex items-center gap-2 mt-0.5">
                                        {opportunity?.owner && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <User className="h-3 w-3" /> {opportunity.owner.name}
                                            </span>
                                        )}
                                        <span className="text-muted-foreground/40 text-xs">·</span>
                                        <span className="text-xs text-muted-foreground">
                                            Created {formatDistanceToNow(new Date(opportunity.created_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/opportunities/${opportunity?.id}/edit`}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                    </Link>
                                </Button>
                                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                    <Link href={opportunity?.client_id
                                        ? `/clients/${opportunity.client_id}`
                                        : `/opportunities/${opportunity?.id}/convert-to-client`}>
                                        <UserPlus className="h-3.5 w-3.5 mr-1.5" />
                                        {opportunity?.client_id ? 'View Client' : 'Convert to Client'}
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="px-2">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/opportunities/${opportunity?.id}/edit`}>
                                                <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                                            </Link>
                                        </DropdownMenuItem>
                                        {opportunity?.lead && (
                                            <DropdownMenuItem asChild>
                                                <Link href={`/leads/${opportunity.lead.id}`}>
                                                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Lead
                                                </Link>
                                            </DropdownMenuItem>
                                        )}
                                        {opportunity?.project && (
                                            <DropdownMenuItem asChild>
                                                <Link href={`/projects/${opportunity.project.id}`}>
                                                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> View Project
                                                </Link>
                                            </DropdownMenuItem>
                                        )}
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                            className="text-destructive focus:text-destructive"
                                            onClick={handleDelete}
                                        >
                                            <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    {/* ── Highlights bar ── */}
                    <div className="flex divide-x divide-border/60 border-t border-border bg-muted/20">
                        {[
                            {
                                label: 'Est. Value',
                                value: opportunity?.estimated_value
                                    ? fmt(opportunity.estimated_value, opportunity.currency)
                                    : '—',
                                icon: DollarSign,
                                color: 'text-emerald-700 font-semibold',
                            },
                            {
                                label: 'Win Probability',
                                value: opportunity?.probability !== undefined ? `${opportunity.probability}%` : '—',
                                icon: TrendingUp,
                                color: '',
                            },
                            {
                                label: 'Weighted Value',
                                value: weightedValue ? fmt(weightedValue, opportunity.currency) : '—',
                                icon: TrendingUp,
                                color: '',
                            },
                            {
                                label: 'Expected Close',
                                value: opportunity?.expected_close_date ? fmtDate(opportunity.expected_close_date) : '—',
                                icon: Calendar,
                                color: '',
                            },
                            {
                                label: 'Stage',
                                value: <StagePill stage={opportunity?.stage} />,
                                icon: null,
                                color: '',
                            },
                        ].map((cell, i) => (
                            <div key={i} className="flex-1 px-4 py-2.5 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                    {cell.icon && <cell.icon className="h-3 w-3 text-muted-foreground" />}
                                    <span className="record-field-label">{cell.label}</span>
                                </div>
                                <div className={cn('record-field-value', cell.color)}>{cell.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Body ── */}
                <div className="flex flex-1 min-h-0 overflow-hidden">

                    {/* Main content */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex border-b border-border bg-card">
                            {tabs.map(tab => (
                                <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                    className={cn('px-5 py-3 text-sm font-medium transition-colors',
                                        activeTab === tab.id ? 'sf-tab-active' : 'sf-tab-inactive')}>
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto bg-card p-6">

                            {activeTab === 'details' && (
                                <div className="max-w-2xl">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Opportunity Details</h3>
                                    <dl>
                                        <FieldRow label="Title">{opportunity.title}</FieldRow>
                                        <FieldRow label="Stage"><StagePill stage={opportunity.stage} /></FieldRow>
                                        <FieldRow label="Owner">
                                            {opportunity.owner
                                                ? <div className="flex items-center gap-2">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                            {opportunity.owner.name.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span>{opportunity.owner.name}</span>
                                                  </div>
                                                : '—'}
                                        </FieldRow>
                                        <FieldRow label="Estimated Value">
                                            {opportunity.estimated_value
                                                ? <span className="font-semibold text-emerald-700">{fmt(opportunity.estimated_value, opportunity.currency)}</span>
                                                : '—'}
                                        </FieldRow>
                                        <FieldRow label="Win Probability">{opportunity.probability !== undefined ? `${opportunity.probability}%` : '—'}</FieldRow>
                                        <FieldRow label="Expected Close">{opportunity.expected_close_date ? fmtDate(opportunity.expected_close_date) : '—'}</FieldRow>
                                        <FieldRow label="Created">{fmtDate(opportunity.created_at)}</FieldRow>
                                        {opportunity.summary && (
                                            <FieldRow label="Summary">
                                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{opportunity.summary}</p>
                                            </FieldRow>
                                        )}
                                        {opportunity.description && (
                                            <FieldRow label="Description">
                                                <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{opportunity.description}</p>
                                            </FieldRow>
                                        )}
                                    </dl>

                                    {/* Linked records */}
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mt-6 mb-3">Linked Records</h3>
                                    <dl>
                                        <FieldRow label="Source Lead">
                                            {opportunity.lead
                                                ? <Link href={`/leads/${opportunity.lead.id}`} className="text-primary hover:underline flex items-center gap-1">
                                                    {opportunity.lead.title} <ExternalLink className="h-3 w-3" />
                                                  </Link>
                                                : <span className="text-muted-foreground/60 italic text-sm">No lead attached</span>}
                                        </FieldRow>
                                        <FieldRow label="Project">
                                            {opportunity.project
                                                ? <Link href={`/projects/${opportunity.project.id}`} className="text-primary hover:underline flex items-center gap-1">
                                                    {opportunity.project.name} <ExternalLink className="h-3 w-3" />
                                                  </Link>
                                                : <span className="text-muted-foreground/60 italic text-sm">No project yet —{' '}
                                                    <Link href={`/projects/create?opportunity_id=${opportunity.id}`} className="text-primary hover:underline">create one</Link>
                                                  </span>}
                                        </FieldRow>
                                    </dl>
                                </div>
                            )}

                            {activeTab === 'contacts' && (
                                <div className="max-w-md">
                                    <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</h3>
                                    <dl>
                                        <FieldRow label="Contact Name">
                                            {opportunity.contact_name ?? <span className="text-muted-foreground/60 italic text-sm">Not set</span>}
                                        </FieldRow>
                                        <FieldRow label="Email">
                                            {opportunity.contact_email
                                                ? <a href={`mailto:${opportunity.contact_email}`} className="text-primary hover:underline text-sm">{opportunity.contact_email}</a>
                                                : <span className="text-muted-foreground/60 italic text-sm">Not set</span>}
                                        </FieldRow>
                                        <FieldRow label="Phone">
                                            {opportunity.contact_phone
                                                ? <a href={`tel:${opportunity.contact_phone}`} className="text-sm hover:text-primary">{opportunity.contact_phone}</a>
                                                : <span className="text-muted-foreground/60 italic text-sm">Not set</span>}
                                        </FieldRow>
                                    </dl>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right sidebar */}
                    <div className="w-60 shrink-0 border-l border-border bg-muted/20 p-4 space-y-4 overflow-y-auto">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Actions</p>
                            <div className="space-y-1.5">
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                                    <Link href={`/opportunities/${opportunity.id}/edit`}>
                                        <Edit className="h-3.5 w-3.5 mr-2 text-primary" /> Edit Opportunity
                                    </Link>
                                </Button>
                                {!opportunity.project && (
                                    <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                                        <Link href={`/projects/create?opportunity_id=${opportunity.id}`}>
                                            <ArrowLeftRight className="h-3.5 w-3.5 mr-2 text-primary" /> Convert to Project
                                        </Link>
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Stage steps */}
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Pipeline</p>
                            <div className="space-y-1">
                                {Object.entries(STAGE).map(([key, cfg]) => {
                                    const isCurrent = key === opportunity.stage;
                                    const stageOrder = Object.keys(STAGE);
                                    const isPast = stageOrder.indexOf(key) < stageOrder.indexOf(opportunity.stage);
                                    return (
                                        <div key={key} className={cn(
                                            'flex items-center gap-2 px-2 py-1.5 rounded text-xs',
                                            isCurrent ? 'bg-primary/10 text-primary font-semibold' : ''
                                        )}>
                                            {isPast
                                                ? <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                                                : isCurrent
                                                    ? <span className="h-3 w-3 rounded-full bg-primary shrink-0" />
                                                    : <span className="h-3 w-3 rounded-full border border-border shrink-0" />}
                                            <span className={cn(!isCurrent && !isPast && 'text-muted-foreground')}>{cfg.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}