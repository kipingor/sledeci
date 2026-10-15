import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock, CheckCircle2, Calendar } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Periods', href: '/accounting/periods' },
];

const STATUS_PILL: Record<string, string> = {
    open:    'bg-emerald-50 text-emerald-700 ring-emerald-200',
    closing: 'bg-amber-50 text-amber-700 ring-amber-200',
    closed:  'bg-slate-50 text-slate-600 ring-slate-200',
    locked:  'bg-red-50 text-red-700 ring-red-200',
};

interface Period {
    id: number; name: string; type: string; fiscal_year: number;
    period_number: number; starts_on: string; ends_on: string;
    status: string; closed_at: string | null;
    closed_by: { name: string } | null;
    is_adjustment_period: boolean;
}

export default function AccountingPeriods({ periods }: { periods: Period[] }) {
    const [showCreate, setShowCreate] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        fiscal_year: new Date().getFullYear().toString(),
        start_month: '1',
    });

    const fmtD = (d: string) => format(new Date(d), 'MMM d, yyyy');

    function closePeriod(id: number, lock: boolean) {
        const action = lock ? 'Lock' : 'Close';
        if (!confirm(`${action} this period?${lock ? ' Locked periods cannot be reopened.' : ''}`)) return;
        router.post(`/accounting/periods/${id}/close`, { lock }, { preserveScroll: true });
    }

    const byYear = periods.reduce((acc, p) => {
        if (!acc[p.fiscal_year]) acc[p.fiscal_year] = [];
        acc[p.fiscal_year].push(p);
        return acc;
    }, {} as Record<number, Period[]>);

    const years = Object.keys(byYear).map(Number).sort((a, b) => b - a);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Accounting Periods" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Calendar className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Accounting Periods</h1>
                                <p className="text-xs text-muted-foreground">Manage fiscal years and period statuses (IAS 1)</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setShowCreate(!showCreate)}>
                            <Calendar className="h-3.5 w-3.5" /> Create Fiscal Year
                        </Button>
                    </div>
                </div>

                {/* Create form */}
                {showCreate && (
                    <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 shrink-0">
                        <h3 className="text-sm font-semibold mb-3">Create Monthly Periods</h3>
                        <div className="flex items-end gap-3 flex-wrap">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fiscal Year *</Label>
                                <Input type="number" value={data.fiscal_year} onChange={e => setData('fiscal_year', e.target.value)} className="h-8 text-sm w-28" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Start Month *</Label>
                                <select className="h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={data.start_month} onChange={e => setData('start_month', e.target.value)}>
                                    {['January','February','March','April','May','June','July','August','September','October','November','December']
                                        .map((m, i) => <option key={i + 1} value={i + 1}>{m}</option>)}
                                </select>
                            </div>
                            <Button size="sm" onClick={() => post('/accounting/periods', { onSuccess: () => { reset(); setShowCreate(false); } })} disabled={processing}>
                                Create 12 Periods
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-auto bg-background p-6 space-y-6">
                    {periods.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Calendar className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No accounting periods set up</p>
                            <p className="text-sm mt-1">Create your first fiscal year to start posting journal entries.</p>
                        </div>
                    )}

                    {years.map(year => (
                        <div key={year}>
                            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                Fiscal Year {year}
                            </h2>
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/30 border-b border-border">
                                            {['Period','Dates','Status','Closed By','Actions'].map(h => (
                                                <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {byYear[year].sort((a, b) => a.period_number - b.period_number).map(p => (
                                            <tr key={p.id} className={cn('transition-colors', p.status === 'locked' ? 'opacity-60' : 'hover:bg-muted/20')}>
                                                <td className="px-4 py-2.5 font-medium text-sm">
                                                    {p.name}
                                                    {p.is_adjustment_period && <span className="ml-1.5 text-xs text-muted-foreground">(Adj.)</span>}
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                    {fmtD(p.starts_on)} — {fmtD(p.ends_on)}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                                        STATUS_PILL[p.status] ?? STATUS_PILL.open)}>
                                                        {p.status === 'locked' && <Lock className="h-2.5 w-2.5" />}
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                    {p.closed_by?.name ?? '—'}
                                                    {p.closed_at && <span className="ml-1">{fmtD(p.closed_at)}</span>}
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <div className="flex items-center gap-1.5">
                                                        {p.status === 'open' && (
                                                            <>
                                                                <Button size="sm" variant="outline" className="h-6 text-xs gap-1"
                                                                    onClick={() => closePeriod(p.id, false)}>
                                                                    <CheckCircle2 className="h-3 w-3" /> Close
                                                                </Button>
                                                                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-red-600 hover:text-red-700"
                                                                    onClick={() => closePeriod(p.id, true)}>
                                                                    <Lock className="h-3 w-3" /> Lock
                                                                </Button>
                                                            </>
                                                        )}
                                                        {p.status === 'closed' && (
                                                            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 text-red-600"
                                                                onClick={() => closePeriod(p.id, true)}>
                                                                <Lock className="h-3 w-3" /> Lock
                                                            </Button>
                                                        )}
                                                        {p.status === 'locked' && (
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Lock className="h-3 w-3" /> Immutable
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}