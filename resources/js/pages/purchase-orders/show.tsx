/**
 * purchase-orders/show.tsx — Amber Obsidian redesign
 * All router.post/delete calls preserved: send, confirm, createDelivery, uploadDoc, cancel.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Send, CheckCircle, X, Truck, FileText, Package, ShoppingCart } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

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
const DOC_PILL: Record<string, string> = {
    pending:  'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-600 ring-red-200',
};

export default function PurchaseOrderShow({ order }: { order: any }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Purchase Orders', href: '/purchase-orders' },
        { title: order.number, href: `/purchase-orders/${order.id}` },
    ];

    const [deliveryOpen, setDeliveryOpen] = useState(false);
    const [docOpen,      setDocOpen]      = useState(false);
    const [delivForm,    setDelivForm]    = useState({ carrier: '', tracking_number: '', tracking_url: '', expected_date: '', delivery_notes: '' });
    const [docForm,      setDocForm]      = useState({ type: 'delivery_note', title: '', notes: '' });

    function createDelivery() { router.post(`/purchase-orders/${order.id}/deliveries`, delivForm, { onSuccess: () => setDeliveryOpen(false), preserveScroll: true }); }
    function uploadDoc()      { router.post(`/purchase-orders/${order.id}/documents`,  docForm,   { onSuccess: () => setDocOpen(false),      preserveScroll: true }); }

    const canSend    = order.status === 'draft';
    const canConfirm = order.status === 'sent';
    const canDeliver = ['confirmed', 'partially_delivered'].includes(order.status);
    const canCancel  = !['delivered', 'cancelled'].includes(order.status);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={order.number} />
            <div className="flex flex-col h-full">

                {/* SF record header */}
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <ShoppingCart className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-xl font-bold font-mono tracking-tight">{order.number}</h1>
                                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full ring-1 capitalize', STATUS_PILL[order.status] ?? STATUS_PILL.draft)}>
                                        {order.status.replace(/_/g, ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {order.supplier?.name} → {order.client?.company || order.client?.name || 'No client'}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap flex-shrink-0">
                            {canSend    && <Button variant="outline" size="sm" onClick={() => router.post(`/purchase-orders/${order.id}/send`, {}, { preserveScroll: true })}><Send className="h-3.5 w-3.5 mr-1.5" /> Send to Supplier</Button>}
                            {canConfirm && <Button variant="outline" size="sm" onClick={() => router.post(`/purchase-orders/${order.id}/confirm`, {}, { preserveScroll: true })}><CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Mark Confirmed</Button>}
                            {canDeliver && <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setDeliveryOpen(true)}><Truck className="h-3.5 w-3.5 mr-1.5" /> Create Delivery</Button>}
                            <Button variant="outline" size="sm" onClick={() => setDocOpen(true)}><FileText className="h-3.5 w-3.5 mr-1.5" /> Add Document</Button>
                            {canCancel && <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive/90"
                                onClick={() => { if (confirm('Cancel this PO?')) router.post(`/purchase-orders/${order.id}/cancel`, {}, { preserveScroll: true }); }}>
                                <X className="h-3.5 w-3.5 mr-1.5" /> Cancel
                            </Button>}
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background p-6 space-y-4 max-w-5xl">

                    {/* Create delivery panel */}
                    {deliveryOpen && (
                        <div className="bg-sky-50/80 border border-sky-200 rounded-lg p-5">
                            <h3 className="font-semibold text-sky-800 mb-4">Create Delivery</h3>
                            <div className="grid sm:grid-cols-3 gap-3 mb-3">
                                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Carrier / Courier</label><Input className="h-8 text-sm" placeholder="DHL, G4S, Own transport…" value={delivForm.carrier} onChange={e => setDelivForm(f => ({ ...f, carrier: e.target.value }))} /></div>
                                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Tracking Number</label><Input className="h-8 text-sm" value={delivForm.tracking_number} onChange={e => setDelivForm(f => ({ ...f, tracking_number: e.target.value }))} /></div>
                                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Expected Date</label><Input type="date" className="h-8 text-sm" value={delivForm.expected_date} onChange={e => setDelivForm(f => ({ ...f, expected_date: e.target.value }))} /></div>
                                <div className="sm:col-span-3"><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label><Input className="h-8 text-sm" value={delivForm.delivery_notes} onChange={e => setDelivForm(f => ({ ...f, delivery_notes: e.target.value }))} /></div>
                            </div>
                            <div className="flex gap-2"><Button size="sm" onClick={createDelivery}>Create Delivery</Button><Button size="sm" variant="outline" onClick={() => setDeliveryOpen(false)}>Cancel</Button></div>
                        </div>
                    )}

                    {/* Add document panel */}
                    {docOpen && (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-5">
                            <h3 className="font-semibold text-amber-800 mb-4">Attach Document</h3>
                            <div className="grid sm:grid-cols-3 gap-3 mb-3">
                                <div><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Type</label>
                                    <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs" value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}>
                                        {[['grn','GRN'],['delivery_note','Delivery Note'],['contract','Contract / Agreement'],['invoice','Supplier Invoice'],['other','Other']].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                                    </select>
                                </div>
                                <div className="sm:col-span-2"><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Title *</label><Input className="h-8 text-sm" placeholder="e.g. Supplier contract for computers" value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} /></div>
                                <div className="sm:col-span-3"><label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label><Input className="h-8 text-sm" value={docForm.notes} onChange={e => setDocForm(f => ({ ...f, notes: e.target.value }))} /></div>
                            </div>
                            <div className="flex gap-2"><Button size="sm" onClick={uploadDoc} disabled={!docForm.title}>Add Document</Button><Button size="sm" variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button></div>
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 space-y-5">
                            {/* Line items */}
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                                    <Package className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Items Ordered</h2>
                                </div>
                                <table className="w-full text-sm">
                                    <thead><tr className="bg-muted/20 border-b border-border">
                                        {['Description','Qty','Unit Price','Amount'].map((h, i) => (
                                            <th key={h} className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground text-left', i >= 2 && 'text-right')}>{h}</th>
                                        ))}
                                    </tr></thead>
                                    <tbody className="divide-y divide-border/50">
                                        {(order.lines || []).map((l: any, i: number) => (
                                            <tr key={i} className="hover:bg-muted/20">
                                                <td className="px-4 py-2.5">{l.description}</td>
                                                <td className="px-4 py-2.5 text-muted-foreground text-center">{l.quantity}</td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">{fmt(l.unit_price, order.currency)}</td>
                                                <td className="px-4 py-2.5 text-right font-medium tabular-nums">{fmt(l.amount, order.currency)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr className="bg-muted/20 border-t border-border">
                                            <td colSpan={2} />
                                            <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">Subtotal</td>
                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">{fmt(order.subtotal, order.currency)}</td>
                                        </tr>
                                        {+order.tax > 0 && <tr className="bg-muted/20">
                                            <td colSpan={2} />
                                            <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">Tax</td>
                                            <td className="px-4 py-2.5 text-right text-muted-foreground tabular-nums">{fmt(order.tax, order.currency)}</td>
                                        </tr>}
                                        <tr className="bg-muted/30 border-t-2 border-border font-bold">
                                            <td colSpan={2} />
                                            <td className="px-4 py-3 text-right text-sm">Total</td>
                                            <td className="px-4 py-3 text-right text-base tabular-nums">{fmt(order.total, order.currency)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Deliveries */}
                            {order.deliveries?.length > 0 && (
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                                        <Truck className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Deliveries</h2>
                                    </div>
                                    <div className="p-5 space-y-3">
                                        {order.deliveries.map((d: any) => (
                                            <div key={d.id} className="border border-border rounded-lg p-3">
                                                <div className="flex items-center justify-between">
                                                    <Link href={`/deliveries/${d.id}`} className="font-medium text-sm text-primary hover:underline">{d.number}</Link>
                                                    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', STATUS_PILL[d.status] ?? STATUS_PILL.draft)}>
                                                        {d.status.replace(/_/g,' ')}
                                                    </span>
                                                </div>
                                                {d.carrier && <p className="text-xs text-muted-foreground mt-0.5">Carrier: {d.carrier}{d.tracking_number ? ` · ${d.tracking_number}` : ''}</p>}
                                                {d.expected_date && <p className="text-xs text-muted-foreground">Expected: {fmtDate(d.expected_date)}</p>}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Documents */}
                            {order.documents?.length > 0 && (
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                                        <FileText className="h-4 w-4 text-primary" /><h2 className="text-sm font-semibold">Documents</h2>
                                    </div>
                                    <div className="p-5 space-y-2">
                                        {order.documents.map((d: any) => (
                                            <div key={d.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                                                <div><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground capitalize">{d.type.replace('_', ' ')} · Uploaded by {d.uploader?.name}</p></div>
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', DOC_PILL[d.status] ?? DOC_PILL.pending)}>{d.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4 text-sm">
                            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Supplier</p>
                                <p className="font-medium">{order.supplier?.name}</p>
                                {order.supplier?.contact_person && <p className="text-muted-foreground text-xs">{order.supplier.contact_person}</p>}
                                {order.supplier?.email && <a href={`mailto:${order.supplier.email}`} className="text-primary text-xs hover:underline block">{order.supplier.email}</a>}
                                {order.supplier?.phone && <p className="text-muted-foreground text-xs">{order.supplier.phone}</p>}
                            </div>
                            {order.client && (
                                <div className="bg-card border border-border rounded-lg p-4 space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
                                    <Link href={`/clients/${order.client.id}`} className="font-medium text-primary hover:underline block">{order.client.company || order.client.name}</Link>
                                    {order.client.email && <a href={`mailto:${order.client.email}`} className="text-xs text-muted-foreground hover:text-primary block">{order.client.email}</a>}
                                </div>
                            )}
                            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Dates</p>
                                {order.order_date && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Ordered</span><span>{fmtDate(order.order_date)}</span></div>}
                                {order.expected_delivery_date && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Expected</span><span>{fmtDate(order.expected_delivery_date)}</span></div>}
                            </div>
                            {order.notes && <div className="bg-card border border-border rounded-lg p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Notes</p><p className="text-xs text-muted-foreground whitespace-pre-wrap">{order.notes}</p></div>}
                            {order.shipping_address && <div className="bg-card border border-border rounded-lg p-4"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Ship To</p><p className="text-xs text-muted-foreground whitespace-pre-wrap">{order.shipping_address}</p></div>}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}