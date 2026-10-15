import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TrendingUp, Printer } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Profit & Loss', href: '/accounting/reports/profit-loss' },
];

interface LineItem { code: string; name: string; balance: number }
interface PLData {
    period:             { from: string; to: string };
    revenue:            LineItem[]; revenue_total:       number;
    cogs:               LineItem[]; cogs_total:          number;
    gross_profit:       number;     gross_margin_pct:    number;
    operating_expenses: LineItem[]; opex_total:          number;
    ebit:               number;     ebit_margin_pct:     number;
    other_income:       LineItem[];
    other_expense:      LineItem[];
    profit_before_tax:  number;
    tax_expense:        number;
    net_profit:         number;     net_margin_pct:      number;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

function Section({ title, items, total, totalLabel, isNegative = false }: {
    title: string; items: LineItem[]; total: number; totalLabel: string; isNegative?: boolean;
}) {
    return (
        <div className="mb-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground py-2 border-b border-border">{title}</div>
            {items.map(item => (
                <div key={item.code} className="flex justify-between py-1.5 px-3 text-sm hover:bg-muted/20">
                    <span className="text-muted-foreground">{item.code} — {item.name}</span>
                    <span className="tabular-nums">{fmt(item.balance)}</span>
                </div>
            ))}
            <div className="flex justify-between py-2 px-3 font-semibold text-sm border-t border-border mt-1">
                <span>{totalLabel}</span>
                <span className={cn('tabular-nums', isNegative && total < 0 ? 'text-red-600' : '')}>{fmt(total)}</span>
            </div>
        </div>
    );
}

function SubtotalRow({ label, amount, highlight = false, margin }: {
    label: string; amount: number; highlight?: boolean; margin?: number;
}) {
    const color = amount >= 0 ? 'text-emerald-700' : 'text-red-600';
    return (
        <div className={cn('flex justify-between items-center py-2.5 px-3 border-t border-b border-border', highlight && 'bg-primary/5')}>
            <span className="font-bold text-sm">{label}</span>
            <div className="text-right">
                <span className={cn('font-bold tabular-nums', color)}>{fmt(amount)}</span>
                {margin !== undefined && <span className="ml-2 text-xs text-muted-foreground">({margin}%)</span>}
            </div>
        </div>
    );
}

export default function ProfitLoss({ data, from, to }: { data: PLData; from: string; to: string }) {
    const [dateFrom, setDateFrom] = useState(from);
    const [dateTo,   setDateTo]   = useState(to);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Profit & Loss" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <TrendingUp className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Statement of Profit or Loss</h1>
                                <p className="text-xs text-muted-foreground">
                                    {format(new Date(data.period.from), 'MMM d, yyyy')} to {format(new Date(data.period.to), 'MMM d, yyyy')} · IFRS (IAS 1)
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
                        <Button size="sm" className="h-7 text-xs" onClick={() => router.get('/accounting/reports/profit-loss', { from: dateFrom, to: dateTo })}>
                            Apply
                        </Button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    <div className="max-w-2xl mx-auto space-y-5">

                        {/* KPI margin cards */}
                        <div className="grid grid-cols-3 gap-3">
                            {[
                                { label: 'Gross Margin', pct: data.gross_margin_pct },
                                { label: 'EBIT Margin',  pct: data.ebit_margin_pct },
                                { label: 'Net Margin',   pct: data.net_margin_pct },
                            ].map(kpi => (
                                <div key={kpi.label} className="bg-card border border-border rounded-lg p-4 text-center">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{kpi.label}</p>
                                    <p className={cn('text-2xl font-bold mt-1', kpi.pct >= 0 ? 'text-emerald-700' : 'text-red-600')}>
                                        {kpi.pct}%
                                    </p>
                                </div>
                            ))}
                        </div>

                        {/* P&L statement */}
                        <div className="bg-card border border-border rounded-lg overflow-hidden print:shadow-none">
                            <div className="p-5 space-y-1">
                                <Section title="Revenue (IFRS 15)" items={data.revenue} total={data.revenue_total} totalLabel="Total Revenue" />
                                <Section title="Cost of Sales" items={data.cogs} total={data.cogs_total} totalLabel="Total Cost of Sales" isNegative />
                                <SubtotalRow label="Gross Profit" amount={data.gross_profit} highlight margin={data.gross_margin_pct} />
                                <Section title="Operating Expenses" items={data.operating_expenses} total={data.opex_total} totalLabel="Total Operating Expenses" isNegative />
                                <SubtotalRow label="Operating Profit (EBIT)" amount={data.ebit} highlight margin={data.ebit_margin_pct} />
                                {data.other_income.length > 0 && (
                                    <Section title="Other Income" items={data.other_income} total={data.other_income.reduce((s, i) => s + i.balance, 0)} totalLabel="Total Other Income" />
                                )}
                                {data.other_expense.length > 0 && (
                                    <Section title="Finance Costs / Other Expenses" items={data.other_expense} total={data.other_expense.reduce((s, i) => s + i.balance, 0)} totalLabel="Total Other Expenses" isNegative />
                                )}
                                <SubtotalRow label="Profit Before Tax" amount={data.profit_before_tax} />
                                <div className="flex justify-between py-1.5 px-3 text-sm">
                                    <span className="text-muted-foreground">Income Tax Expense (IAS 12)</span>
                                    <span className="tabular-nums text-red-600">({fmt(data.tax_expense)})</span>
                                </div>
                                <SubtotalRow label="Net Profit for the Period" amount={data.net_profit} highlight margin={data.net_margin_pct} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}