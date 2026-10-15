import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, TrendingDown, Minus, Printer, Activity } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Cash Flows', href: '/accounting/reports/cash-flows' },
];

interface Adjustments {
    depreciation: number; amortisation: number; bad_debt_expense: number;
    change_in_receivables: number; change_in_payables: number;
}
interface CFData {
    period:               { from: string; to: string };
    net_profit:           number;
    adjustments:          Adjustments;
    cash_from_operations: number;
    cash_from_investing:  number;
    cash_from_financing:  number;
    net_change_in_cash:   number;
    opening_cash_balance: number;
    closing_cash_balance: number;
}

const fmtN  = (n: number) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2 }).format(Math.abs(n));
const sign    = (n: number) => n < 0 ? '(' : '';
const signEnd = (n: number) => n < 0 ? ')' : '';
const colCls  = (n: number) => n < 0 ? 'text-red-600' : n > 0 ? 'text-emerald-600' : 'text-foreground';

function CFRow({ label, amount, indent = false, note }: { label: string; amount: number; indent?: boolean; note?: string }) {
    return (
        <div className={cn('flex justify-between py-1.5 text-sm', indent ? 'px-6' : 'px-3')}>
            <div>
                <span className={indent ? 'text-muted-foreground' : ''}>{label}</span>
                {note && <span className="ml-2 text-xs text-muted-foreground italic">{note}</span>}
            </div>
            <span className={cn('tabular-nums', indent ? 'text-muted-foreground' : 'font-medium', colCls(amount))}>
                {sign(amount)}{fmtN(amount)}{signEnd(amount)}
            </span>
        </div>
    );
}

function SectionTotal({ label, amount }: { label: string; amount: number }) {
    return (
        <div className="flex justify-between py-2.5 px-3 font-bold text-sm border-t border-border mt-1">
            <span>{label}</span>
            <span className={cn('tabular-nums', colCls(amount))}>
                {sign(amount)}{fmtN(amount)}{signEnd(amount)}
            </span>
        </div>
    );
}

export default function CashFlows({ data, from, to }: { data: CFData; from: string; to: string }) {
    const [dateFrom, setDateFrom] = useState(from);
    const [dateTo,   setDateTo]   = useState(to);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Cash Flow Statement" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Activity className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Statement of Cash Flows</h1>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(data.period.from), 'MMM d, yyyy')} to {format(new Date(data.period.to), 'MMM d, yyyy')} · Indirect method (IAS 7)
                                </p>
                            </div>
                        </div>
                        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => window.print()}>
                            <Printer className="h-3.5 w-3.5" /> Print
                        </Button>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2">
                        <span className="text-xs text-muted-foreground">From</span>
                        <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-7 text-xs w-36" />
                        <span className="text-xs text-muted-foreground">To</span>
                        <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-7 text-xs w-36" />
                        <Button size="sm" className="h-7 text-xs" onClick={() => router.get('/accounting/reports/cash-flows', { from: dateFrom, to: dateTo })}>
                            Apply
                        </Button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    <div className="max-w-2xl mx-auto space-y-5">

                        {/* KPI mini-strip */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Operating Cash', value: data.cash_from_operations, icon: data.cash_from_operations >= 0 ? TrendingUp : TrendingDown },
                                { label: 'Investing Cash',  value: data.cash_from_investing,  icon: Minus },
                                { label: 'Closing Balance', value: data.closing_cash_balance, icon: data.closing_cash_balance >= 0 ? TrendingUp : TrendingDown },
                            ].map(kpi => (
                                <div key={kpi.label} className="bg-card border border-border rounded-lg p-4 text-center">
                                    <kpi.icon className={cn('h-4 w-4 mx-auto mb-1', kpi.value >= 0 ? 'text-emerald-500' : 'text-red-500')} />
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                                    <p className={cn('text-lg font-bold tabular-nums mt-0.5', colCls(kpi.value))}>
                                        {sign(kpi.value)}
                                        {new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(Math.abs(kpi.value))}
                                        {signEnd(kpi.value)}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* Cash flow statement */}
                        <div className="bg-card border border-border rounded-lg p-5 space-y-4 print:shadow-none">
                            {/* Operating */}
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    A. Cash Flows from Operating Activities
                                </p>
                                <CFRow label="Net Profit for the Period" amount={data.net_profit} />
                                <p className="px-3 text-xs text-muted-foreground mt-2 mb-1 italic">Adjustments for non-cash items:</p>
                                <CFRow label="Depreciation &amp; Amortisation" amount={data.adjustments.depreciation + data.adjustments.amortisation} indent note="IAS 16/38" />
                                <CFRow label="Bad Debt Expense" amount={data.adjustments.bad_debt_expense} indent note="IFRS 9" />
                                <p className="px-3 text-xs text-muted-foreground mt-2 mb-1 italic">Changes in working capital:</p>
                                <CFRow label="(Increase) / Decrease in Trade Receivables" amount={data.adjustments.change_in_receivables} indent />
                                <CFRow label="Increase / (Decrease) in Trade Payables" amount={data.adjustments.change_in_payables} indent />
                                <SectionTotal label="Net Cash from Operating Activities" amount={data.cash_from_operations} />
                            </div>

                            {/* Investing */}
                            <div className="border-t border-border pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    B. Cash Flows from Investing Activities
                                </p>
                                <CFRow label="Purchase of Property, Plant &amp; Equipment" amount={data.cash_from_investing} indent note="IAS 16" />
                                <SectionTotal label="Net Cash from Investing Activities" amount={data.cash_from_investing} />
                            </div>

                            {/* Financing */}
                            <div className="border-t border-border pt-4">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    C. Cash Flows from Financing Activities
                                </p>
                                <div className="px-6 py-1.5 text-sm text-muted-foreground">
                                    No financing activities recorded in this period.
                                </div>
                                <SectionTotal label="Net Cash from Financing Activities" amount={data.cash_from_financing} />
                            </div>

                            {/* Net change */}
                            <div className="border-t-2 border-foreground pt-3">
                                <SectionTotal label="Net Increase / (Decrease) in Cash (A+B+C)" amount={data.net_change_in_cash} />
                            </div>

                            {/* Reconciliation */}
                            <div className="border-t border-border pt-3">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
                                    Cash &amp; Cash Equivalents
                                </p>
                                <CFRow label="Opening Balance" amount={data.opening_cash_balance} />
                                <CFRow label="Net Change in Cash" amount={data.net_change_in_cash} />
                                <div className="flex justify-between py-2.5 px-3 font-bold text-sm border-t-2 border-foreground mt-1">
                                    <span>Closing Balance</span>
                                    <span className={cn('tabular-nums', colCls(data.closing_cash_balance))}>
                                        {sign(data.closing_cash_balance)}{fmtN(data.closing_cash_balance)}{signEnd(data.closing_cash_balance)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}