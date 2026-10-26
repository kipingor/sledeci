import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Exchange Rates', href: '/accounting/fx' },
];

interface Rate {
    id: number; from_currency: string; to_currency: string;
    rate: number; rate_type: string; rate_date: string;
    source: string | null;
    entered_by: { name: string } | null;
}

export default function ExchangeRates({ rates }: { rates: { data: Rate[] } }) {
    const [showForm, setShowForm] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        from_currency: 'USD',
        to_currency:   'KES',
        rate:          '',
        rate_type:     'spot',
        rate_date:     new Date().toISOString().slice(0, 10),
        source:        '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Exchange Rates" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <RefreshCw className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Exchange Rates</h1>
                                <p className="text-xs text-muted-foreground">IAS 21 · Foreign Currency Transactions</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setShowForm(!showForm)}>
                            <Plus className="h-3.5 w-3.5" /> Add Rate
                        </Button>
                    </div>
                </div>

                {/* Add form */}
                {showForm && (
                    <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 shrink-0">
                        <h3 className="text-sm font-semibold mb-3">New Exchange Rate</h3>
                        <div className="grid sm:grid-cols-6 gap-3 items-end">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">From *</Label>
                                <Input value={data.from_currency} onChange={e => setData('from_currency', e.target.value.toUpperCase())} maxLength={3} placeholder="USD" className="h-8 text-sm font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">To *</Label>
                                <Input value={data.to_currency} onChange={e => setData('to_currency', e.target.value.toUpperCase())} maxLength={3} placeholder="KES" className="h-8 text-sm font-mono" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rate *</Label>
                                <Input type="number" step="0.0001" value={data.rate} onChange={e => setData('rate', e.target.value)} placeholder="129.50" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</Label>
                                <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={data.rate_type} onChange={e => setData('rate_type', e.target.value)}>
                                    <option value="spot">Spot</option>
                                    <option value="average">Period Average</option>
                                    <option value="closing">Closing</option>
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date *</Label>
                                <Input type="date" value={data.rate_date} onChange={e => setData('rate_date', e.target.value)} className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source</Label>
                                <Input value={data.source} onChange={e => setData('source', e.target.value)} placeholder="CBK, ECB…" className="h-8 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => post('/accounting/fx', { onSuccess: () => { reset(); setShowForm(false); } })} disabled={processing}>
                                Save Rate
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Table */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['Pair','Rate','Type','Date','Source','Entered By'].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {rates.data.length === 0 && (
                                <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground text-sm">
                                    No exchange rates yet. Add your first rate above.
                                </td></tr>
                            )}
                            {rates.data.map(r => (
                                <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-2.5 font-mono font-bold text-sm">{r.from_currency}/{r.to_currency}</td>
                                    <td className="px-4 py-2.5 tabular-nums font-semibold">{Number(r.rate).toFixed(4)}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{r.rate_type}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                        {r.rate_date ? format(new Date(r.rate_date), 'MMM d, yyyy') : '—'}
                                    </td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.source ?? '—'}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.entered_by?.name ?? '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}