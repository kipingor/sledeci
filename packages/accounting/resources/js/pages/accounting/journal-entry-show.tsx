/**
 * accounting/journal-entry-show.tsx — Amber Obsidian redesign
 * All router.post(), useForm, confirm(), and reverseForm logic preserved exactly.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { CheckCircle2, RotateCcw, AlertTriangle, ArrowLeft, BookOpen } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const STATUS_PILL: Record<string, string> = {
    draft:  'bg-amber-50 text-amber-700 ring-amber-200',
    posted: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    voided: 'bg-zinc-50 text-zinc-400 ring-zinc-200',
};

const fmt  = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(n);
const fmtD = (d: string) => format(new Date(d), 'MMMM d, yyyy');

interface Line {
    id: number; type: 'debit' | 'credit'; amount: number;
    foreign_currency: string | null; foreign_amount: number | null; exchange_rate: number | null;
    description: string | null; line_order: number;
    account: { code: string; name: string; type: string };
    project: { name: string } | null;
}
interface JournalEntryDetail {
    id: number; reference: string; entry_date: string; posting_date: string | null;
    type: string; memo: string; notes: string | null;
    functional_currency: string; status: string;
    is_reversal: boolean; is_reversed: boolean;
    posted_at: string | null;
    lines: Line[];
    period: { name: string; status: string } | null;
    created_by: { name: string } | null;
    posted_by: { name: string } | null;
}

export default function JournalEntryShow({ entry }: { entry: JournalEntryDetail }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Accounting',      href: '/accounting' },
        { title: 'Journal Entries', href: '/accounting/journal' },
        { title: entry.reference,   href: `/accounting/journal/${entry.id}` },
    ];

    const [showReverse, setShowReverse] = useState(false);
    const reverseForm = useForm({
        memo:          `Reversal of ${entry.reference}`,
        reversal_date: new Date().toISOString().slice(0, 10),
    });

    const totalDebits  = entry.lines.filter(l => l.type === 'debit').reduce((s, l)  => s + l.amount, 0);
    const totalCredits = entry.lines.filter(l => l.type === 'credit').reduce((s, l) => s + l.amount, 0);
    const isBalanced   = Math.abs(totalDebits - totalCredits) < 0.005;

    function post() {
        if (!confirm('Post this entry? It will become immutable.')) return;
        router.post(`/accounting/journal/${entry.id}/post`, {}, { preserveScroll: true });
    }

    function submitReversal(e: React.FormEvent) {
        e.preventDefault();
        reverseForm.post(`/accounting/journal/${entry.id}/reverse`, {
            onSuccess: () => setShowReverse(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={entry.reference} />
            <div className="flex flex-col h-full">

                {/* SF record header */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-4">
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <Link href="/accounting/journal"
                                    className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground shrink-0">
                                    <ArrowLeft className="h-4 w-4" />
                                </Link>
                                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <BookOpen className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-xl font-bold font-mono tracking-tight">{entry.reference}</h1>
                                        <span className={cn('inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ring-1 capitalize',
                                            STATUS_PILL[entry.status] ?? STATUS_PILL.draft)}>
                                            {entry.status}
                                        </span>
                                        {entry.is_reversal && (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">
                                                Reversal
                                            </span>
                                        )}
                                        {entry.is_reversed && (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200">
                                                Reversed
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-0.5">{entry.memo}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                {entry.status === 'draft' && (
                                    <Button size="sm" className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" onClick={post}>
                                        <CheckCircle2 className="h-3.5 w-3.5" /> Post to Ledger
                                    </Button>
                                )}
                                {entry.status === 'posted' && !entry.is_reversed && (
                                    <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowReverse(!showReverse)}>
                                        <RotateCcw className="h-3.5 w-3.5" /> Reverse
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Reversal form */}
                {showReverse && (
                    <div className="bg-amber-50/80 border-b border-amber-200 px-6 py-4 shrink-0">
                        <h3 className="text-sm font-semibold text-amber-800 mb-3">Create Reversal Entry</h3>
                        <form onSubmit={submitReversal} className="flex gap-3 items-end flex-wrap">
                            <div className="space-y-1 flex-1 min-w-48">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reversal Memo *</label>
                                <input className="w-full h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={reverseForm.data.memo} onChange={e => reverseForm.setData('memo', e.target.value)} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reversal Date *</label>
                                <input type="date" className="h-8 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={reverseForm.data.reversal_date} onChange={e => reverseForm.setData('reversal_date', e.target.value)} />
                            </div>
                            <Button type="submit" variant="destructive" size="sm" disabled={reverseForm.processing}>Reverse</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setShowReverse(false)}>Cancel</Button>
                        </form>
                    </div>
                )}

                {/* Body */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid lg:grid-cols-3 gap-5">

                            {/* Lines table */}
                            <div className="lg:col-span-2">
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="bg-muted/30 border-b border-border text-left">
                                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account</th>
                                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Description</th>
                                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Debit</th>
                                                <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">Credit</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border/50">
                                            {entry.lines.map(line => (
                                                <tr key={line.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <p className="font-medium text-sm">{line.account.code} — {line.account.name}</p>
                                                        {line.project && (
                                                            <p className="text-xs text-muted-foreground mt-0.5">📁 {line.project.name}</p>
                                                        )}
                                                        {line.foreign_currency && (
                                                            <p className="text-xs text-primary mt-0.5">
                                                                {line.foreign_currency} {fmt(line.foreign_amount!)} @ {line.exchange_rate}
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 text-xs text-muted-foreground">{line.description}</td>
                                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-primary">
                                                        {line.type === 'debit' ? fmt(line.amount) : ''}
                                                    </td>
                                                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-emerald-700">
                                                        {line.type === 'credit' ? fmt(line.amount) : ''}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-muted/30 border-t border-border font-semibold">
                                                <td colSpan={2} className="px-4 py-3">
                                                    {isBalanced ? (
                                                        <span className="flex items-center gap-1.5 text-emerald-600 text-xs">
                                                            <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1.5 text-red-600 text-xs">
                                                            <AlertTriangle className="h-3.5 w-3.5" /> Not balanced!
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right tabular-nums text-sm">{fmt(totalDebits)}</td>
                                                <td className="px-4 py-3 text-right tabular-nums text-sm">{fmt(totalCredits)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            {/* Sidebar */}
                            <div className="space-y-4">
                                {/* Details */}
                                <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-sm">
                                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Details</h3>
                                    {[
                                        { label: 'Entry Date',  value: fmtD(entry.entry_date) },
                                        { label: 'Period',      value: entry.period?.name ?? '—' },
                                        { label: 'Type',        value: entry.type.replace(/_/g, ' '), capitalize: true },
                                        { label: 'Currency',    value: entry.functional_currency },
                                    ].map(d => (
                                        <div key={d.label}>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{d.label}</p>
                                            <p className={cn('font-medium text-sm mt-0.5', d.capitalize && 'capitalize')}>{d.value}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Audit */}
                                <div className="bg-card border border-border rounded-lg p-4 space-y-3 text-sm">
                                    <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground">Audit</h3>
                                    <div>
                                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Created By</p>
                                        <p className="font-medium text-sm mt-0.5">{entry.created_by?.name ?? '—'}</p>
                                    </div>
                                    {entry.posted_by && (
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Posted By</p>
                                            <p className="font-medium text-sm mt-0.5">{entry.posted_by.name}</p>
                                        </div>
                                    )}
                                    {entry.posted_at && (
                                        <div>
                                            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Posted At</p>
                                            <p className="font-medium text-sm mt-0.5">{fmtD(entry.posted_at)}</p>
                                        </div>
                                    )}
                                </div>

                                {/* Notes */}
                                {entry.notes && (
                                    <div className="bg-card border border-border rounded-lg p-4 text-sm">
                                        <h3 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-2">Notes</h3>
                                        <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">{entry.notes}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}