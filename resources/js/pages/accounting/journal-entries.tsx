import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Zap, BookOpen, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Journal Entries', href: '/accounting/journal' },
];

const STATUS_PILL: Record<string, string> = {
    draft:  'bg-amber-50 text-amber-700 ring-amber-200',
    posted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    voided: 'bg-zinc-50 text-zinc-400 ring-zinc-200',
};
const TYPE_PILL: Record<string, string> = {
    invoice:          'bg-blue-50 text-blue-700 ring-blue-200',
    payment:          'bg-emerald-50 text-emerald-700 ring-emerald-200',
    expense:          'bg-orange-50 text-orange-700 ring-orange-200',
    manual:           'bg-violet-50 text-violet-700 ring-violet-200',
    reversal:         'bg-red-50 text-red-700 ring-red-200',
    accrual:          'bg-cyan-50 text-cyan-700 ring-cyan-200',
    depreciation:     'bg-slate-50 text-slate-600 ring-slate-200',
    fx_revaluation:   'bg-teal-50 text-teal-700 ring-teal-200',
};

const TYPES = ['invoice','payment','expense','manual','reversal','accrual','depreciation','fx_revaluation'];

interface JERow {
    id: number; reference: string; entry_date: string; type: string;
    memo: string; status: string;
    period: { name: string } | null;
    created_by: { name: string } | null;
}
interface Props {
    entries: { data: JERow[]; current_page: number; last_page: number };
    filters: Record<string, string>;
    periods: { id: number; name: string; status: string }[];
}

export default function JournalEntries({ entries, filters, periods }: Props) {
    const [f, setF] = useState(filters);

    function applyFilters() {
        router.get('/accounting/journal', f, { preserveScroll: true });
    }

    function postPending() {
        if (!confirm('Post all unposted invoices, payments, and expenses to the ledger?')) return;
        router.post('/accounting/journal/post-pending', {}, { onSuccess: () => router.reload() });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Journal Entries" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Journal Entries</h1>
                                <p className="text-xs text-muted-foreground">General ledger · double-entry bookkeeping</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={postPending}>
                                <Zap className="h-3.5 w-3.5" /> Post Pending
                            </Button>
                            <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                <Link href="/accounting/journal/create">
                                    <Plus className="h-3.5 w-3.5" /> Manual Entry
                                </Link>
                            </Button>
                        </div>
                    </div>

                    {/* Filters bar */}
                    <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
                        <select className="h-7 rounded-md border border-input bg-background px-2 text-xs min-w-[120px]"
                            value={f.type ?? ''} onChange={e => setF({ ...f, type: e.target.value })}>
                            <option value="">All types</option>
                            {TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                        </select>
                        <select className="h-7 rounded-md border border-input bg-background px-2 text-xs min-w-[100px]"
                            value={f.status ?? ''} onChange={e => setF({ ...f, status: e.target.value })}>
                            <option value="">All statuses</option>
                            <option value="draft">Draft</option>
                            <option value="posted">Posted</option>
                            <option value="voided">Voided</option>
                        </select>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">From</span>
                            <Input type="date" className="h-7 text-xs w-36" value={f.from ?? ''} onChange={e => setF({ ...f, from: e.target.value })} />
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">To</span>
                            <Input type="date" className="h-7 text-xs w-36" value={f.to ?? ''} onChange={e => setF({ ...f, to: e.target.value })} />
                        </div>
                        <Button size="sm" className="h-7 text-xs" onClick={applyFilters}>Apply</Button>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setF({}); router.get('/accounting/journal'); }}>Clear</Button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['Reference','Date','Type','Memo','Period','Status','By'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {entries.data.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No journal entries yet.{' '}
                                    <button onClick={postPending} className="text-primary hover:underline">Post pending documents</button>
                                    {' '}or{' '}
                                    <Link href="/accounting/journal/create" className="text-primary hover:underline">create a manual entry</Link>.
                                </td></tr>
                            )}
                            {entries.data.map(je => (
                                <tr key={je.id} className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => router.visit(`/accounting/journal/${je.id}`)}>
                                    <td className="px-4 py-2.5 font-mono text-xs font-semibold text-primary">{je.reference}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                        {je.entry_date ? format(new Date(je.entry_date), 'MMM d, yyyy') : '—'}
                                    </td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                            TYPE_PILL[je.type] ?? 'bg-muted text-muted-foreground ring-border')}>
                                            {je.type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 max-w-xs truncate text-sm">{je.memo}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{je.period?.name ?? '—'}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                            STATUS_PILL[je.status] ?? STATUS_PILL.draft)}>
                                            {je.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{je.created_by?.name ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {entries.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                        <span>Page {entries.current_page} of {entries.last_page}</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={entries.current_page === 1}
                                onClick={() => router.get('/accounting/journal', { ...f, page: entries.current_page - 1 })}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={entries.current_page === entries.last_page}
                                onClick={() => router.get('/accounting/journal', { ...f, page: entries.current_page + 1 })}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}