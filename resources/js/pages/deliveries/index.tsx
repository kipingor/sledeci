/**
 * deliveries/index.tsx — Amber Obsidian redesign
 * All router.get() filter and Link hrefs preserved exactly.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Truck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Deliveries', href: '/deliveries' }];
const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');
const STATUS_PILL: Record<string, string> = {
    pending:    'bg-slate-50 text-slate-600 ring-slate-200',
    in_transit: 'bg-blue-50 text-blue-700 ring-blue-200',
    delivered:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    partial:    'bg-amber-50 text-amber-700 ring-amber-200',
    rejected:   'bg-red-50 text-red-600 ring-red-200',
};

interface Props {
    deliveries: { data: any[]; total: number; current_page: number; last_page: number };
    counts: Record<string, number>;
}

export default function DeliveriesIndex({ deliveries, counts }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Deliveries" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center gap-3 px-6 py-3.5 border-b border-border/60">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight">Deliveries</h1>
                            <p className="text-xs text-muted-foreground">{deliveries.total} total deliveries</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
                        {Object.entries(counts).map(([status, cnt]) => (
                            <button key={status}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 ring-border bg-muted text-muted-foreground hover:ring-primary/40 transition-colors capitalize"
                                onClick={() => router.get('/deliveries', { status }, { preserveScroll: true })}>
                                {status.replace('_', ' ')} <span className="font-bold">{cnt}</span>
                            </button>
                        ))}
                        <button className="text-xs text-muted-foreground hover:text-foreground underline" onClick={() => router.get('/deliveries', {})}>All</button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background p-5 space-y-2">
                    {deliveries.data.map((d: any) => (
                        <div key={d.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3">
                                    <div className={cn('p-2 rounded-lg flex-shrink-0', d.status === 'delivered' ? 'bg-emerald-50' : 'bg-sky-50')}>
                                        <Truck className={cn('h-4 w-4', d.status === 'delivered' ? 'text-emerald-600' : 'text-sky-600')} />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <Link href={`/deliveries/${d.id}`} className="font-semibold text-sm hover:text-primary hover:underline">{d.number}</Link>
                                            <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', STATUS_PILL[d.status] ?? STATUS_PILL.pending)}>
                                                {d.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            PO: <Link href={`/purchase-orders/${d.purchase_order?.id}`} className="hover:underline text-primary">{d.purchase_order?.number}</Link>
                                            {d.purchase_order?.supplier && ` · ${d.purchase_order.supplier.name}`}
                                        </p>
                                        {d.client && <p className="text-xs text-muted-foreground">Client: {d.client.company || d.client.name}</p>}
                                        {d.carrier && <p className="text-xs text-muted-foreground">Carrier: {d.carrier}{d.tracking_number ? ` · ${d.tracking_number}` : ''}</p>}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground flex-shrink-0">
                                    {d.expected_date && <p>Expected: {fmtDate(d.expected_date)}</p>}
                                    {d.delivered_date && <p className="text-emerald-600 font-medium">Delivered: {fmtDate(d.delivered_date)}</p>}
                                    {d.signed_by && <p className="text-emerald-600">Signed by: {d.signed_by}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
                    {deliveries.data.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Truck className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No deliveries yet</p>
                            <p className="text-sm mt-1">Create a delivery from a confirmed purchase order.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}