import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    FileText, Search, Upload, AlertTriangle, Clock, CheckCircle2,
    Trophy, XCircle, Calendar, MoreHorizontal, Sparkles, Eye,
    ChevronLeft, ChevronRight, TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Tenders & RFPs', href: '/tenders' }];

const STATUS: Record<string, { label: string; dot: string; pill: string; icon: React.ComponentType<any> }> = {
    reviewing: { label: 'Reviewing',  dot: 'bg-blue-500',     pill: 'bg-blue-50 text-blue-700 ring-blue-200',       icon: FileText      },
    drafting:  { label: 'Drafting',   dot: 'bg-amber-500',    pill: 'bg-amber-50 text-amber-700 ring-amber-200',     icon: FileText      },
    submitted: { label: 'Submitted',  dot: 'bg-violet-500',   pill: 'bg-violet-50 text-violet-700 ring-violet-200',  icon: CheckCircle2  },
    won:       { label: 'Won',        dot: 'bg-emerald-500',  pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: Trophy      },
    lost:      { label: 'Lost',       dot: 'bg-red-500',      pill: 'bg-red-50 text-red-600 ring-red-200',           icon: XCircle       },
    withdrawn: { label: 'Withdrawn',  dot: 'bg-zinc-400',     pill: 'bg-zinc-50 text-zinc-500 ring-zinc-200',        icon: XCircle       },
};

interface Tender {
    id: number; title: string; issuer?: string; reference_number?: string;
    status: string; submission_deadline?: string; estimated_value?: number; currency: string;
    checklist?: any[]; information_gaps?: any[];
    ai_analysis?: { opportunity_score?: number };
    created_at: string;
}

interface Props {
    tenders: { data: Tender[]; meta: any };
    counts: Record<string, number>;
    urgentCount: number;
}

function daysUntil(d?: string) {
    if (!d) return null;
    return Math.max(0, Math.ceil((new Date(d).getTime() - Date.now()) / 86400000));
}

function fmtMoney(v?: number, c?: string) {
    if (!v) return null;
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: c ?? 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(v);
}

export default function TendersIndex({ tenders, counts, urgentCount }: Props) {
    const [search,       setSearch]       = useState('');
    const [activeStatus, setActiveStatus] = useState('');

    function filterStatus(s: string) {
        const next = activeStatus === s ? '' : s;
        setActiveStatus(next);
        router.get('/tenders', { status: next, search }, { preserveState: true, replace: true });
    }

    function onSearch(e: React.FormEvent) {
        e.preventDefault();
        router.get('/tenders', { status: activeStatus, search }, { preserveState: true, replace: true });
    }

    const totalTenders = Object.values(counts).reduce((a, b) => a + b, 0);

    const statStrip = [
        { key: '',          label: 'Total',     value: totalTenders,           color: 'text-foreground',  icon: FileText },
        { key: 'reviewing', label: 'Reviewing', value: counts.reviewing ?? 0,  color: 'text-blue-600',    icon: Clock },
        { key: 'drafting',  label: 'Drafting',  value: counts.drafting  ?? 0,  color: 'text-amber-600',   icon: FileText },
        { key: 'submitted', label: 'Submitted', value: counts.submitted ?? 0,  color: 'text-violet-600',  icon: CheckCircle2 },
        { key: 'won',       label: 'Won',       value: counts.won       ?? 0,  color: 'text-emerald-600', icon: Trophy },
    ];

    const statusTabs = [
        { key: '',          label: 'All' },
        ...Object.entries(STATUS).filter(([k]) => k !== 'withdrawn').map(([k, v]) => ({ key: k, label: v.label })),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Tenders & RFPs" />
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
                                <h1 className="text-base font-bold tracking-tight">Tenders &amp; RFPs</h1>
                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                    <Sparkles className="h-3 w-3 text-primary" />
                                    AI agent guides you through the entire bid process
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {urgentCount > 0 && (
                                <div className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2.5 py-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    {urgentCount} deadline{urgentCount !== 1 ? 's' : ''} within 7 days
                                </div>
                            )}
                            <Button
                                size="sm"
                                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                asChild
                            >
                                <Link href="/tenders/create">
                                    <Upload className="h-3.5 w-3.5" /> Upload Tender
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Stats strip */}
                    <div className="flex divide-x divide-border/60 border-b border-border/60">
                        {statStrip.map(s => (
                            <button
                                key={s.key}
                                onClick={() => s.key && filterStatus(s.key)}
                                className={cn(
                                    'flex-1 px-4 py-2.5 text-left transition-colors',
                                    s.key ? 'hover:bg-muted/40 cursor-pointer' : 'cursor-default',
                                    activeStatus === s.key && s.key ? 'bg-primary/5' : ''
                                )}
                            >
                                <div className="flex items-center gap-1.5 mb-0.5">
                                    <s.icon className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{s.label}</span>
                                </div>
                                <p className={cn('text-xl font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
                            </button>
                        ))}
                    </div>

                    {/* Status tabs */}
                    <div className="flex items-center px-4 overflow-x-auto border-b border-border/60">
                        {statusTabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => filterStatus(tab.key)}
                                className={cn(
                                    'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    activeStatus === tab.key ? 'sf-tab-active' : 'sf-tab-inactive'
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Search bar */}
                    <form onSubmit={onSearch} className="px-4 py-2">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search title, issuer, reference…"
                                className="pl-8 h-7 text-xs"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto bg-background">
                    {tenders.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                            <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/20" />
                            <p className="font-medium text-muted-foreground">No tenders found</p>
                            <p className="text-xs text-muted-foreground/60 mt-1 mb-5">
                                Upload a tender document and let AI analyse it and guide your bid
                            </p>
                            <Button size="sm" asChild>
                                <Link href="/tenders/create">
                                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Upload Tender
                                </Link>
                            </Button>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b border-border sticky top-0">
                                    {['Tender', 'Issuer', 'Status', 'Deadline', 'Value', 'Progress', 'Score', ''].map(h => (
                                        <th key={h} className={cn(
                                            'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                                            h === '' && 'w-10',
                                            h === 'Value' && 'text-right',
                                            h === 'Score' && 'text-center',
                                        )}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {tenders.data.map(tender => {
                                    const cfg   = STATUS[tender.status] ?? STATUS.reviewing;
                                    const days  = daysUntil(tender.submission_deadline);
                                    const urgent = days !== null && days <= 7 && ['reviewing', 'drafting'].includes(tender.status);
                                    const total = tender.checklist?.length ?? 0;
                                    const done  = tender.checklist?.filter((i: any) => i.done).length ?? 0;
                                    const gaps  = tender.information_gaps?.filter((g: any) => !g.resolved).length ?? 0;
                                    const score = tender.ai_analysis?.opportunity_score;

                                    return (
                                        <tr
                                            key={tender.id}
                                            className={cn(
                                                'group transition-colors cursor-pointer',
                                                urgent ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-muted/40'
                                            )}
                                            onClick={() => router.visit(`/tenders/${tender.id}`)}
                                        >
                                            {/* Title */}
                                            <td className="px-4 py-2.5 max-w-xs">
                                                <div className="flex items-center gap-2">
                                                    {urgent && (
                                                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 shrink-0" />
                                                    )}
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm group-hover:text-primary transition-colors truncate">
                                                            {tender.title}
                                                        </p>
                                                        {tender.reference_number && (
                                                            <p className="text-xs font-mono text-muted-foreground">{tender.reference_number}</p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Issuer */}
                                            <td className="px-4 py-2.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {tender.issuer ?? '—'}
                                                </span>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-2.5">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                                                    cfg.pill
                                                )}>
                                                    <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot)} />
                                                    {cfg.label}
                                                </span>
                                            </td>

                                            {/* Deadline */}
                                            <td className="px-4 py-2.5">
                                                {tender.submission_deadline ? (
                                                    <div>
                                                        <p className={cn('text-xs', urgent ? 'text-amber-700 font-semibold' : 'text-muted-foreground')}>
                                                            {format(new Date(tender.submission_deadline), 'MMM d, yyyy')}
                                                        </p>
                                                        {days !== null && (
                                                            <p className={cn('text-[11px]', urgent ? 'text-amber-600' : 'text-muted-foreground/60')}>
                                                                {days === 0 ? 'Due today' : `${days}d remaining`}
                                                            </p>
                                                        )}
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Value */}
                                            <td className="px-4 py-2.5 text-right">
                                                {fmtMoney(tender.estimated_value, tender.currency)
                                                    ? <span className="text-xs font-semibold">{fmtMoney(tender.estimated_value, tender.currency)}</span>
                                                    : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Progress */}
                                            <td className="px-4 py-2.5">
                                                {total > 0 ? (
                                                    <div className="flex items-center gap-2 min-w-[100px]">
                                                        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                                                            <div
                                                                className={cn(
                                                                    'h-full rounded-full transition-all',
                                                                    done === total ? 'bg-emerald-500' : 'bg-primary'
                                                                )}
                                                                style={{ width: `${Math.round(done / total * 100)}%` }}
                                                            />
                                                        </div>
                                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                            {done}/{total}
                                                            {gaps > 0 && <span className="text-amber-500 ml-1">·{gaps}⚠</span>}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* AI Score */}
                                            <td className="px-4 py-2.5 text-center">
                                                {score ? (
                                                    <span className={cn(
                                                        'text-xs font-semibold tabular-nums',
                                                        score >= 70 ? 'text-emerald-600' : score >= 40 ? 'text-amber-600' : 'text-red-500'
                                                    )}>
                                                        {score}/100
                                                    </span>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
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
                                                        <DropdownMenuItem onClick={() => router.visit(`/tenders/${tender.id}`)}>
                                                            <Eye className="mr-2 h-3.5 w-3.5" /> View
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* ── Pagination ── */}
                {tenders.meta?.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                        <span>Page {tenders.meta.current_page} of {tenders.meta.last_page}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={tenders.meta.current_page === 1}
                                onClick={() => router.visit(`/tenders?page=${tenders.meta.current_page - 1}`)}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={tenders.meta.current_page === tenders.meta.last_page}
                                onClick={() => router.visit(`/tenders?page=${tenders.meta.current_page + 1}`)}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}