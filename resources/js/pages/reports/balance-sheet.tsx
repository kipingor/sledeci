import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Printer, AlertTriangle, CheckCircle2, Scale } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

interface BSSection { items: { code: string; name: string; balance: number }[]; total: number }
interface BSData {
    as_of: string;
    current_assets: BSSection;          non_current_assets: BSSection;       total_assets: number;
    current_liabilities: BSSection;     non_current_liabilities: BSSection;  total_liabilities: number;
    equity: BSSection;                  current_year_earnings: number;       total_equity: number;
    total_liabilities_equity: number;   is_balanced: boolean;
}

function BSSectionBlock({ title, section }: { title: string; section: BSSection }) {
    return (
        <div className="mb-4">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">{title}</p>
            {section.items.map(i => (
                <div key={i.code} className="flex justify-between py-1 text-sm px-2 hover:bg-muted/20">
                    <span className="text-muted-foreground">{i.code} — {i.name}</span>
                    <span className="tabular-nums">{fmt(i.balance)}</span>
                </div>
            ))}
            <div className="flex justify-between py-2 px-2 font-semibold text-sm border-t border-border">
                <span>Subtotal</span>
                <span className="tabular-nums">{fmt(section.total)}</span>
            </div>
        </div>
    );
}

export function BalanceSheet({ data, as_of }: { data: BSData; as_of: string }) {
    const [date, setDate] = useState(as_of);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Accounting', href: '/accounting' },
        { title: 'Balance Sheet', href: '/accounting/reports/balance-sheet' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Balance Sheet" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Scale className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Statement of Financial Position</h1>
                                <p className="text-xs text-muted-foreground">
                                    As at {format(new Date(data.as_of), 'MMMM d, yyyy')} · IFRS (IAS 1)
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
                    <div className="flex items-center gap-2 px-4 py-2">
                        <span className="text-xs text-muted-foreground">As at</span>
                        <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="h-7 text-xs w-40" />
                        <Button size="sm" className="h-7 text-xs" onClick={() => router.get('/accounting/reports/balance-sheet', { as_of: date })}>
                            Apply
                        </Button>
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid md:grid-cols-2 gap-5">
                            {/* Assets */}
                            <div className="bg-card border border-border rounded-lg p-5 print:shadow-none">
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-4">Assets</h2>
                                <BSSectionBlock title="Current Assets" section={data.current_assets} />
                                <BSSectionBlock title="Non-Current Assets" section={data.non_current_assets} />
                                <div className="flex justify-between py-3 px-2 font-bold text-sm border-t-2 border-foreground">
                                    <span>TOTAL ASSETS</span>
                                    <span className="tabular-nums">{fmt(data.total_assets)}</span>
                                </div>
                            </div>

                            {/* Liabilities + Equity */}
                            <div className="bg-card border border-border rounded-lg p-5 print:shadow-none">
                                <h2 className="font-bold text-sm uppercase tracking-wider mb-4">Liabilities &amp; Equity</h2>
                                <BSSectionBlock title="Current Liabilities" section={data.current_liabilities} />
                                <BSSectionBlock title="Non-Current Liabilities" section={data.non_current_liabilities} />
                                <div className="flex justify-between py-2 px-2 font-semibold text-sm border-t border-border">
                                    <span>Total Liabilities</span>
                                    <span className="tabular-nums">{fmt(data.total_liabilities)}</span>
                                </div>
                                <div className="mt-4">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Equity</p>
                                    {data.equity.items.map(i => (
                                        <div key={i.code} className="flex justify-between py-1 text-sm px-2 hover:bg-muted/20">
                                            <span className="text-muted-foreground">{i.code} — {i.name}</span>
                                            <span className="tabular-nums">{fmt(i.balance)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between py-1 text-sm px-2">
                                        <span className="text-muted-foreground">Current Year Earnings</span>
                                        <span className={cn('tabular-nums', data.current_year_earnings >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                            {fmt(data.current_year_earnings)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between py-2 px-2 font-semibold text-sm border-t border-border">
                                        <span>Total Equity</span>
                                        <span className="tabular-nums">{fmt(data.total_equity)}</span>
                                    </div>
                                </div>
                                <div className="flex justify-between py-3 px-2 font-bold text-sm border-t-2 border-foreground mt-1">
                                    <span>TOTAL LIABILITIES &amp; EQUITY</span>
                                    <span className="tabular-nums">{fmt(data.total_liabilities_equity)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

export default BalanceSheet;