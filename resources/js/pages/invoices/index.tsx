import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus, Search, FileText, DollarSign, AlertCircle, Clock,
    CheckCircle2, MoreHorizontal, ChevronLeft, ChevronRight, Eye, Edit,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Invoices', href: '/invoices' },
];

const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
    draft:     { label: 'Draft',     dot: 'bg-slate-400',    pill: 'bg-slate-50 text-slate-600 ring-slate-200' },
    issued:    { label: 'Issued',    dot: 'bg-blue-500',     pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    paid:      { label: 'Paid',      dot: 'bg-emerald-500',  pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    overdue:   { label: 'Overdue',   dot: 'bg-red-500',      pill: 'bg-red-50 text-red-700 ring-red-200' },
    cancelled: { label: 'Cancelled', dot: 'bg-zinc-400',     pill: 'bg-zinc-50 text-zinc-500 ring-zinc-200' },
};

const fmt     = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');

interface Props {
    invoices: { data: any[]; current_page: number; last_page: number; total: number };
    summary:  { total_billed: number; total_paid: number; total_overdue: number; draft_count: number };
    clients:  { id: number; name: string }[];
}

export default function InvoicesIndex({ invoices, summary, clients }: Props) {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const [search,       setSearch]       = useState('');
    const [statusFilter, setStatusFilter] = useState(params.get('status') ?? '');
    const [clientFilter, setClientFilter] = useState(params.get('client_id') ?? '');

    function applyFilters(overrides: Record<string, string> = {}) {
        const q: Record<string, string> = {};
        const s = overrides.status    ?? statusFilter;
        const c = overrides.client_id ?? clientFilter;
        if (s) q.status = s;
        if (c) q.client_id = c;
        router.get('/invoices', q, { preserveScroll: true });
    }

    const statStrip = [
        { label: 'Total Billed',  value: fmt(summary.total_billed),  color: 'text-foreground',  icon: FileText,      status: '' },
        { label: 'Collected',     value: fmt(summary.total_paid),    color: 'text-emerald-600', icon: CheckCircle2,  status: 'paid' },
        { label: 'Overdue',       value: fmt(summary.total_overdue), color: 'text-red-600',     icon: AlertCircle,   status: 'overdue' },
        { label: 'Drafts',        value: summary.draft_count,        color: 'text-muted-foreground', icon: Clock,   status: 'draft' },
    ];

    const statusTabs = [
        { key: '',          label: 'All' },
        { key: 'draft',     label: 'Draft' },
        { key: 'issued',    label: 'Issued' },
        { key: 'paid',      label: 'Paid' },
        { key: 'overdue',   label: 'Overdue' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    const filtered = invoices.data.filter(inv =>
        !search ||
        inv.number?.toLowerCase().includes(search.toLowerCase()) ||
        inv.client?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Invoices" />
            <div className="flex flex-col h-full">

                {/* ── Header ── */}
                <div className="bg-card border-b border-border">

                    {/* Title bar */}
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <FileText className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Invoices</h1>
                                <p className="text-xs text-muted-foreground">{invoices.total} total records</p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            asChild
                        >
                            <Link href="/invoices/create">
                                <Plus className="h-3.5 w-3.5" /> New Invoice
                            </Link>
                        </Button>
                    </div>

                    {/* Stats strip */}
                    <div className="flex divide-x divide-border/60 border-b border-border/60">
                        {statStrip.map((s) => (
                            <button
                                key={s.label}
                                onClick={() => s.status && applyFilters({ status: s.status })}
                                className={cn(
                                    'flex-1 px-4 py-2.5 text-left transition-colors',
                                    s.status ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default',
                                    statusFilter === s.status && s.status ? 'bg-primary/5' : ''
                                )}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <s.icon className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                                        {s.label}
                                    </span>
                                </div>
                                <p className={cn('text-lg font-bold tabular-nums leading-none', s.color)}>
                                    {s.value}
                                </p>
                            </button>
                        ))}
                    </div>

                    {/* Status tabs */}
                    <div className="flex items-center px-4 overflow-x-auto border-b border-border/60">
                        {statusTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => {
                                    setStatusFilter(tab.key);
                                    applyFilters({ status: tab.key });
                                }}
                                className={cn(
                                    'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    statusFilter === tab.key ? 'sf-tab-active' : 'sf-tab-inactive'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter bar */}
                    <div className="flex items-center gap-2 px-4 py-2">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search invoice number, client…"
                                className="pl-8 h-7 text-xs"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                        <Select
                            value={clientFilter || 'all'}
                            onValueChange={v => { setClientFilter(v === 'all' ? '' : v); applyFilters({ client_id: v === 'all' ? '' : v }); }}
                        >
                            <SelectTrigger className="h-7 text-xs w-44">
                                <SelectValue placeholder="All Clients" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Clients</SelectItem>
                                {clients.map(c => (
                                    <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['Invoice #', 'Client', 'Project', 'Issued', 'Due', 'Amount', 'Status', ''].map(h => (
                                    <th key={h} className={cn(
                                        'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                                        h === '' && 'w-10',
                                        h === 'Amount' && 'text-right',
                                        h === 'Status' && 'text-center',
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center text-muted-foreground">
                                        <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No invoices found</p>
                                        <p className="text-xs mt-1 opacity-70">
                                            {statusFilter ? `No ${statusFilter} invoices` : 'Create your first invoice'}
                                        </p>
                                    </td>
                                </tr>
                            )}
                            {filtered.map((inv: any) => {
                                const s = STATUS[inv.status] ?? STATUS.draft;
                                const isOverdue = inv.status === 'overdue';
                                return (
                                    <tr
                                        key={inv.id}
                                        className={cn(
                                            'group transition-colors cursor-pointer',
                                            isOverdue ? 'bg-red-50/30 hover:bg-red-50/50' : 'hover:bg-muted/40'
                                        )}
                                        onClick={() => router.visit(`/invoices/${inv.id}`)}
                                    >
                                        {/* Invoice # */}
                                        <td className="px-4 py-2.5">
                                            <span className="font-mono text-xs font-semibold text-primary group-hover:underline">
                                                {inv.number}
                                            </span>
                                        </td>

                                        {/* Client */}
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-muted-foreground">
                                                {inv.client?.name ?? '—'}
                                            </span>
                                        </td>

                                        {/* Project */}
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-muted-foreground">
                                                {inv.project?.name ?? '—'}
                                            </span>
                                        </td>

                                        {/* Issued */}
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-muted-foreground">
                                                {inv.issue_date ? fmtDate(inv.issue_date) : '—'}
                                            </span>
                                        </td>

                                        {/* Due */}
                                        <td className="px-4 py-2.5">
                                            <span className={cn(
                                                'text-xs',
                                                isOverdue ? 'text-red-600 font-medium' : 'text-muted-foreground'
                                            )}>
                                                {inv.due_date ? fmtDate(inv.due_date) : '—'}
                                            </span>
                                        </td>

                                        {/* Amount */}
                                        <td className="px-4 py-2.5 text-right">
                                            <span className={cn(
                                                'text-xs font-semibold tabular-nums',
                                                inv.status === 'paid' ? 'text-emerald-700' : 'text-foreground'
                                            )}>
                                                {fmt(inv.total, inv.currency)}
                                            </span>
                                        </td>

                                        {/* Status */}
                                        <td className="px-4 py-2.5 text-center">
                                            <span className={cn(
                                                'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                                                s.pill
                                            )}>
                                                <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                                                {s.label}
                                            </span>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-36 text-sm">
                                                    <DropdownMenuItem onClick={() => router.visit(`/invoices/${inv.id}`)}>
                                                        <Eye className="mr-2 h-3.5 w-3.5" /> View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.visit(`/invoices/${inv.id}/edit`)}>
                                                        <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {invoices.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                        <span>Page {invoices.current_page} of {invoices.last_page} · {invoices.total} invoices</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={invoices.current_page === 1}
                                onClick={() => router.get('/invoices', { page: invoices.current_page - 1 })}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={invoices.current_page === invoices.last_page}
                                onClick={() => router.get('/invoices', { page: invoices.current_page + 1 })}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}