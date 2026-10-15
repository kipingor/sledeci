import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type BreadcrumbItem } from '@/types';
import {
    Mail, Phone, Building2, MapPin, Edit, Plus, FileText,
    FolderOpen, Bell, TrendingUp, MoreHorizontal, ExternalLink,
    DollarSign, CheckCircle2, AlertCircle, Calendar,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { format } from 'date-fns';

const fmt = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');

const STAGE_PILL: Record<string, string> = {
    qualification: 'bg-sky-50 text-sky-700 ring-sky-200',
    proposal:      'bg-blue-50 text-blue-700 ring-blue-200',
    negotiation:   'bg-amber-50 text-amber-700 ring-amber-200',
    closed_won:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    closed_lost:   'bg-red-50 text-red-600 ring-red-200',
};
const INV_PILL: Record<string, string> = {
    draft:     'bg-slate-50 text-slate-600 ring-slate-200',
    issued:    'bg-blue-50 text-blue-700 ring-blue-200',
    paid:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
    overdue:   'bg-red-50 text-red-700 ring-red-200',
    cancelled: 'bg-zinc-50 text-zinc-500 ring-zinc-200',
};

// Consistent avatar color
function avCls(name: string) {
    const p = ['bg-amber-100 text-amber-800','bg-violet-100 text-violet-800',
                'bg-sky-100 text-sky-800','bg-emerald-100 text-emerald-800'];
    return p[name.charCodeAt(0) % p.length];
}

interface Props {
    client: any; projects: any[]; invoices: any[]; leads: any[];
    opportunities: any[]; followUps: any[];
    financials: { total_billed: number; total_collected: number; total_overdue: number; projects_count: number };
}

// ── Tab bar ───────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }: {
    tabs: { id: string; label: string; count?: number }[];
    active: string;
    onChange: (id: string) => void;
}) {
    return (
        <div className="flex border-b border-border bg-card">
            {tabs.map(tab => (
                <button key={tab.id} onClick={() => onChange(tab.id)}
                    className={cn(
                        'px-5 py-3 text-sm font-medium transition-colors flex items-center gap-2',
                        active === tab.id ? 'sf-tab-active' : 'sf-tab-inactive'
                    )}>
                    {tab.label}
                    {tab.count !== undefined && (
                        <span className={cn('text-[11px] font-semibold px-1.5 py-0.5 rounded-full min-w-[20px] text-center',
                            active === tab.id ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground')}>
                            {tab.count}
                        </span>
                    )}
                </button>
            ))}
        </div>
    );
}

// ── Field row ─────────────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="grid grid-cols-[140px_1fr] items-start py-2.5 border-b border-border/50 last:border-0">
            <dt className="record-field-label pt-0.5">{label}</dt>
            <dd className="record-field-value">{children}</dd>
        </div>
    );
}

export default function ClientShow({ client, projects, invoices, leads, opportunities, followUps, financials }: Props) {
    const [activeTab, setActiveTab] = useState('details');

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clients', href: '/clients' },
        { title: client.name, href: `/clients/${client.id}` },
    ];

    const tabs = [
        { id: 'details',       label: 'Details' },
        { id: 'projects',      label: 'Projects',      count: projects.length },
        { id: 'invoices',      label: 'Invoices',      count: invoices.length },
        { id: 'opportunities', label: 'Opportunities', count: opportunities.length },
        { id: 'followups',     label: 'Follow-ups',    count: followUps.length },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={client.name} />
            <div className="flex flex-col h-full">

                {/* ── Record header ── */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <Avatar className="h-12 w-12 shrink-0">
                                    <AvatarFallback className={cn('text-lg font-bold', avCls(client.name))}>
                                        {client.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <h1 className="text-xl font-bold tracking-tight">{client.name}</h1>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                                        {client.company && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                <Building2 className="h-3 w-3" />{client.company}
                                            </span>
                                        )}
                                        <span className="text-muted-foreground/40 text-xs">·</span>
                                        <span className="text-xs text-muted-foreground">
                                            Client since {client.client_since ? fmtDate(client.client_since) : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/clients/${client.id}/edit`}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                    </Link>
                                </Button>
                                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                    <Link href={`/invoices/create?client_id=${client.id}`}>
                                        <FileText className="h-3.5 w-3.5 mr-1.5" /> New Invoice
                                    </Link>
                                </Button>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline" size="sm" className="px-2">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-48">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/create?client_id=${client.id}`}>
                                                <FolderOpen className="mr-2 h-3.5 w-3.5" /> New Project
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/follow-ups?client_id=${client.id}`}>
                                                <Bell className="mr-2 h-3.5 w-3.5" /> Schedule Follow-up
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/client-reports/create?client_id=${client.id}`}>
                                                <TrendingUp className="mr-2 h-3.5 w-3.5" /> Create Report
                                            </Link>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </div>

                    {/* ── Highlights bar ── */}
                    <div className="flex divide-x divide-border/60 border-t border-border bg-muted/20">
                        {[
                            { label: 'Total Billed',  value: fmt(financials.total_billed),     icon: DollarSign,   color: '' },
                            { label: 'Collected',      value: fmt(financials.total_collected),  icon: CheckCircle2, color: 'text-emerald-700' },
                            { label: 'Overdue',        value: fmt(financials.total_overdue),    icon: AlertCircle,  color: financials.total_overdue > 0 ? 'text-red-600' : '' },
                            { label: 'Active Projects',value: financials.projects_count,        icon: FolderOpen,   color: 'text-primary' },
                            { label: 'Email',          value: client.email,                     icon: Mail,         color: '' },
                        ].map((cell, i) => (
                            <div key={i} className="flex-1 px-4 py-2.5 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5">
                                    <cell.icon className="h-3 w-3 text-muted-foreground shrink-0" />
                                    <span className="record-field-label">{cell.label}</span>
                                </div>
                                <p className={cn('record-field-value truncate', cell.color)}>{cell.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── Body: tabs + sidebar ── */}
                <div className="flex flex-1 min-h-0 overflow-hidden">

                    {/* Left: tabs */}
                    <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
                        <TabBar tabs={tabs} active={activeTab} onChange={setActiveTab} />

                        <div className="flex-1 overflow-y-auto bg-card">

                            {/* Details */}
                            {activeTab === 'details' && (
                                <div className="grid md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border/50">
                                    <div className="p-6">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Information</h3>
                                        <dl>
                                            <FieldRow label="Email">
                                                <a href={`mailto:${client.email}`} className="text-primary hover:underline text-sm">{client.email}</a>
                                            </FieldRow>
                                            {client.phone && (
                                                <FieldRow label="Phone">
                                                    <a href={`tel:${client.phone}`} className="text-sm hover:text-primary">{client.phone}</a>
                                                </FieldRow>
                                            )}
                                            {client.company && <FieldRow label="Company">{client.company}</FieldRow>}
                                            {client.address && <FieldRow label="Address"><span className="text-sm text-muted-foreground">{client.address}</span></FieldRow>}
                                            {client.website && (
                                                <FieldRow label="Website">
                                                    <a href={client.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                                                        {client.website} <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                </FieldRow>
                                            )}
                                        </dl>
                                    </div>
                                    <div className="p-6">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Account Details</h3>
                                        <dl>
                                            <FieldRow label="Client Since">{client.client_since ? fmtDate(client.client_since) : '—'}</FieldRow>
                                            <FieldRow label="Total Projects">{financials.projects_count}</FieldRow>
                                            <FieldRow label="Total Billed"><span className="font-semibold">{fmt(financials.total_billed)}</span></FieldRow>
                                            <FieldRow label="Total Collected"><span className="text-emerald-700 font-semibold">{fmt(financials.total_collected)}</span></FieldRow>
                                            {financials.total_overdue > 0 && (
                                                <FieldRow label="Outstanding"><span className="text-red-600 font-semibold">{fmt(financials.total_overdue)}</span></FieldRow>
                                            )}
                                            {client.notes && <FieldRow label="Notes"><span className="text-sm text-muted-foreground">{client.notes}</span></FieldRow>}
                                        </dl>
                                    </div>
                                </div>
                            )}

                            {/* Projects */}
                            {activeTab === 'projects' && (
                                <div className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Projects ({projects.length})</h3>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={`/projects/create?client_id=${client.id}`}>
                                                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Project
                                            </Link>
                                        </Button>
                                    </div>
                                    {projects.length === 0
                                        ? <p className="text-sm text-muted-foreground text-center py-10">No projects yet</p>
                                        : <div className="grid sm:grid-cols-2 gap-3">
                                            {projects.map((p: any) => (
                                                <Link key={p.id} href={`/projects/${p.id}`}>
                                                    <div className="border border-border rounded-lg p-3.5 hover:border-primary/40 hover:bg-muted/20 transition-all group">
                                                        <div className="flex items-center justify-between">
                                                            <p className="font-medium text-sm group-hover:text-primary transition-colors">{p.name}</p>
                                                            <span className={cn('text-xs px-2 py-0.5 rounded-full ring-1 font-medium capitalize',
                                                                p.status === 'active' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' : 'bg-muted text-muted-foreground ring-border')}>
                                                                {p.status?.replace('_', ' ')}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-muted-foreground mt-1">{p.tasks_count ?? 0} tasks</p>
                                                    </div>
                                                </Link>
                                            ))}
                                        </div>}
                                </div>
                            )}

                            {/* Invoices */}
                            {activeTab === 'invoices' && (
                                <div>
                                    <div className="flex items-center justify-between px-5 py-3 border-b border-border">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Invoices ({invoices.length})</h3>
                                        <Button size="sm" variant="outline" asChild>
                                            <Link href={`/invoices/create?client_id=${client.id}`}>
                                                <Plus className="h-3.5 w-3.5 mr-1.5" /> New Invoice
                                            </Link>
                                        </Button>
                                    </div>
                                    {invoices.length === 0
                                        ? <p className="text-sm text-muted-foreground text-center py-10">No invoices yet</p>
                                        : <table className="w-full text-sm">
                                            <thead><tr className="bg-muted/30 border-b border-border">
                                                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Number</th>
                                                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due</th>
                                                <th className="px-5 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount</th>
                                                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                            </tr></thead>
                                            <tbody className="divide-y divide-border/50">
                                                {invoices.map((inv: any) => (
                                                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors cursor-pointer" onClick={() => router.visit(`/invoices/${inv.id}`)}>
                                                        <td className="px-5 py-2.5 font-mono text-xs font-semibold text-primary">{inv.number}</td>
                                                        <td className="px-5 py-2.5 text-xs text-muted-foreground">{inv.due_date ? fmtDate(inv.due_date) : '—'}</td>
                                                        <td className="px-5 py-2.5 text-right text-xs font-semibold tabular-nums">{fmt(inv.total, inv.currency)}</td>
                                                        <td className="px-5 py-2.5">
                                                            <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', INV_PILL[inv.status] ?? INV_PILL.draft)}>
                                                                {inv.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>}
                                </div>
                            )}

                            {/* Opportunities */}
                            {activeTab === 'opportunities' && (
                                <div className="p-5 space-y-2">
                                    {opportunities.length === 0
                                        ? <p className="text-sm text-muted-foreground text-center py-10">No opportunities linked</p>
                                        : opportunities.map((o: any) => (
                                            <Link key={o.id} href={`/opportunities/${o.id}`}>
                                                <div className="flex items-center justify-between p-3.5 border border-border rounded-lg hover:border-primary/40 hover:bg-muted/20 transition-all group">
                                                    <div>
                                                        <p className="font-medium text-sm group-hover:text-primary transition-colors">{o.title}</p>
                                                        <span className={cn('inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize mt-1', STAGE_PILL[o.stage] ?? STAGE_PILL.qualification)}>
                                                            {o.stage?.replace('_', ' ')}
                                                        </span>
                                                    </div>
                                                    {o.estimated_value && (
                                                        <span className="text-sm font-semibold text-emerald-700">{fmt(o.estimated_value, o.currency)}</span>
                                                    )}
                                                </div>
                                            </Link>
                                        ))}
                                </div>
                            )}

                            {/* Follow-ups */}
                            {activeTab === 'followups' && (
                                <div className="p-5 space-y-2">
                                    {followUps.length === 0
                                        ? (
                                            <div className="text-center py-10">
                                                <p className="text-sm text-muted-foreground mb-3">No pending follow-ups</p>
                                                <Button size="sm" variant="outline" asChild>
                                                    <Link href={`/follow-ups?client_id=${client.id}`}>
                                                        <Bell className="h-3.5 w-3.5 mr-1.5" /> Schedule Follow-up
                                                    </Link>
                                                </Button>
                                            </div>
                                        )
                                        : followUps.map((f: any) => (
                                            <div key={f.id} className="flex items-start gap-3 p-3.5 border border-border rounded-lg">
                                                <div className="h-1.5 w-1.5 rounded-full bg-amber-400 mt-2 shrink-0" />
                                                <div>
                                                    <p className="text-sm font-medium">{f.subject}</p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                                        <Calendar className="h-3 w-3" />
                                                        {f.scheduled_at ? fmtDate(f.scheduled_at) : 'Unscheduled'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right sidebar — quick contact + links */}
                    <div className="w-64 shrink-0 border-l border-border bg-muted/20 p-4 space-y-4 overflow-y-auto">
                        <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Quick Actions</p>
                            <div className="space-y-1.5">
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                                    <Link href={`/invoices/create?client_id=${client.id}`}>
                                        <FileText className="h-3.5 w-3.5 mr-2 text-primary" /> New Invoice
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                                    <Link href={`/projects/create?client_id=${client.id}`}>
                                        <FolderOpen className="h-3.5 w-3.5 mr-2 text-primary" /> New Project
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                                    <Link href={`/follow-ups?client_id=${client.id}`}>
                                        <Bell className="h-3.5 w-3.5 mr-2 text-primary" /> Follow-up
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" className="w-full justify-start text-xs" asChild>
                                    <Link href={`/client-reports/create?client_id=${client.id}`}>
                                        <TrendingUp className="h-3.5 w-3.5 mr-2 text-primary" /> Report
                                    </Link>
                                </Button>
                            </div>
                        </div>

                        {client.email && (
                            <div>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Contact</p>
                                <a href={`mailto:${client.email}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-muted/60 transition-colors">
                                    <Mail className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{client.email}</span>
                                </a>
                                {client.phone && (
                                    <a href={`tel:${client.phone}`} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary p-1.5 rounded hover:bg-muted/60 transition-colors">
                                        <Phone className="h-3.5 w-3.5 shrink-0" />
                                        <span className="truncate">{client.phone}</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}