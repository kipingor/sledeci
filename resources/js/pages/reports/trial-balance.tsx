import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, AlertTriangle, Printer, Scale } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Trial Balance', href: '/accounting/reports/trial-balance' },
];

const TYPE_PILL: Record<string, string> = {
    asset:         'bg-sky-50 text-sky-700 ring-sky-200',
    liability:     'bg-orange-50 text-orange-700 ring-orange-200',
    equity:        'bg-violet-50 text-violet-700 ring-violet-200',
    revenue:       'bg-emerald-50 text-emerald-700 ring-emerald-200',
    expense:       'bg-red-50 text-red-700 ring-red-200',
    cogs:          'bg-amber-50 text-amber-700 ring-amber-200',
    other_income:  'bg-teal-50 text-teal-700 ring-teal-200',
    other_expense: 'bg-pink-50 text-pink-700 ring-pink-200',
};

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface TBAccount {
    code: string; name: string; type: string;
    debit: number; credit: number; balance: number;
    normal_balance: string;
}
interface TBData {
    accounts: TBAccount[];
    total_debits: number; total_credits: number;
    is_balanced: boolean; as_of: string;
}

export default function TrialBalance({ data, as_of }: { data: TBData; as_of: string }) {
    const [date, setDate] = useState(as_of);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Trial Balance" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Scale className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Trial Balance</h1>
                                <p className="text-xs text-muted-foreground">
                                    As at {format(new Date(data.as_of), 'MMMM d, yyyy')}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {data.is_balanced
                                ? <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                                    <CheckCircle2 className="h-3 w-3" /> Balanced
                                  </span>
                                : <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium bg-red-50 border border-red-200 px-2.5 py-1 rounded-full">
                                    <AlertTriangle className="h-3 w-3" /> Out of balance!
                                  </span>
                            }
                            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => window.print()}>
                                <Printer className="h-3.5 w-3.5" /> Print
                            </Button>
                        </div>
                    </div>

                    {/* Date filter */}
                    <div className="flex items-center gap-2 px-4 py-2">
                        <span className="text-xs text-muted-foreground">As at</span>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-7 text-xs w-40" />
                        <Button size="sm" className="h-7 text-xs" onClick={() => router.get('/accounting/reports/trial-balance', { as_of: date })}>
                            Apply
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                <th className="px-5 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-24">Code</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Account Name</th>
                                <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground w-28">Type</th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Debit</th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Credit</th>
                                <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground w-36">Balance</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {data.accounts.map(acct => (
                                <tr key={acct.code} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground">{acct.code}</td>
                                    <td className="px-4 py-2.5 text-sm">{acct.name}</td>
                                    <td className="px-4 py-2.5">
                                        <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded ring-1 capitalize',
                                            TYPE_PILL[acct.type] ?? 'bg-muted text-muted-foreground ring-border')}>
                                            {acct.type.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                                        {acct.debit > 0 ? fmt(acct.debit) : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-right tabular-nums text-xs text-muted-foreground">
                                        {acct.credit > 0 ? fmt(acct.credit) : '—'}
                                    </td>
                                    <td className={cn('px-4 py-2.5 text-right tabular-nums text-sm font-medium',
                                        acct.balance < 0 ? 'text-red-600' : 'text-foreground')}>
                                        {fmt(Math.abs(acct.balance))}{acct.balance < 0 ? ' Cr' : ''}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-muted/40 border-t-2 border-border font-bold">
                                <td colSpan={3} className="px-5 py-3 text-sm">TOTALS</td>
                                <td className="px-4 py-3 text-right tabular-nums text-sm">{fmt(data.total_debits)}</td>
                                <td className="px-4 py-3 text-right tabular-nums text-sm">{fmt(data.total_credits)}</td>
                                <td className={cn('px-4 py-3 text-right tabular-nums text-sm',
                                    data.is_balanced ? 'text-emerald-600' : 'text-red-600')}>
                                    {fmt(Math.abs(data.total_debits - data.total_credits))}
                                    {!data.is_balanced && ' ⚠'}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}