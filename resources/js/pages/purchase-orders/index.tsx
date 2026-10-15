import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Plus, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Purchase Orders', href: '/purchase-orders' }];

const fmt = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');

const STATUS_PILL: Record<string, string> = {
    draft:               'bg-slate-50 text-slate-600 ring-slate-200',
    sent:                'bg-blue-50 text-blue-700 ring-blue-200',
    confirmed:           'bg-indigo-50 text-indigo-700 ring-indigo-200',
    partially_delivered: 'bg-amber-50 text-amber-700 ring-amber-200',
    delivered:           'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled:           'bg-red-50 text-red-600 ring-red-200',
};

interface Props {
    orders:    { data: any[]; total: number; current_page: number; last_page: number };
    suppliers: { id: number; name: string }[];
    counts:    Record<string, number>;
}

export default function PurchaseOrdersIndex({ orders, suppliers, counts }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Purchase Orders" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <ShoppingCart className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Purchase Orders</h1>
                                <p className="text-xs text-muted-foreground">{orders.total} orders total</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/purchase-orders/create"><Plus className="h-3.5 w-3.5" /> New PO</Link>
                        </Button>
                    </div>

                    {/* Status tabs */}
                    <div className="flex items-center gap-2 px-4 py-2 flex-wrap">
                        {Object.entries(counts).map(([status, cnt]) => (
                            <button key={status}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 ring-border bg-muted text-muted-foreground hover:ring-primary/40 hover:text-foreground transition-colors capitalize"
                                onClick={() => router.get('/purchase-orders', { status }, { preserveScroll: true })}>
                                {status.replace(/_/g, ' ')}
                                <span className="font-bold">{cnt}</span>
                            </button>
                        ))}
                        <button className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
                            onClick={() => router.get('/purchase-orders', {})}>
                            All
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['PO Number','Supplier','Client','Order Date','Expected','Total','Status'].map((h, i) => (
                                    <th key={h} className={cn(
                                        'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                                        i === 5 && 'text-right', i === 6 && 'text-center'
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {orders.data.map((o: any) => (
                                <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                                    <td className="px-4 py-2.5">
                                        <Link href={`/purchase-orders/${o.id}`} className="font-mono font-semibold text-sm text-primary hover:underline">{o.number}</Link>
                                    </td>
                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{o.supplier?.name}</td>
                                    <td className="px-4 py-2.5 text-sm text-muted-foreground">{o.client?.company || o.client?.name || '—'}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.order_date ? fmtDate(o.order_date) : '—'}</td>
                                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{o.expected_delivery_date ? fmtDate(o.expected_delivery_date) : '—'}</td>
                                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{fmt(o.total, o.currency)}</td>
                                    <td className="px-4 py-2.5 text-center">
                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                            STATUS_PILL[o.status] ?? STATUS_PILL.draft)}>
                                            {o.status.replace(/_/g, ' ')}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {orders.data.length === 0 && (
                                <tr><td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-20" />
                                    <p>No purchase orders. <Link href="/purchase-orders/create" className="text-primary hover:underline">Create one</Link></p>
                                </td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {orders.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                        <span>Page {orders.current_page} of {orders.last_page}</span>
                        <div className="flex gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={orders.current_page === 1}
                                onClick={() => router.get('/purchase-orders', { page: orders.current_page - 1 })}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" disabled={orders.current_page === orders.last_page}
                                onClick={() => router.get('/purchase-orders', { page: orders.current_page + 1 })}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}