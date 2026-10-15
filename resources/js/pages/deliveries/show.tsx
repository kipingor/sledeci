/**
 * deliveries/show.tsx — Amber Obsidian redesign
 * Added: Download Confirmation PDF button + Copy Confirmation Link button
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import {
    Truck, CheckCircle2, XCircle, FileText, CheckSquare,
    Package, PenLine, Download, Link2, Copy,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';

const fmtDate = (d: string) => format(new Date(d), 'MMMM d, yyyy');

const STATUS_PILL: Record<string, string> = {
    pending:    'bg-slate-50 text-slate-600 ring-slate-200',
    in_transit: 'bg-blue-50 text-blue-700 ring-blue-200',
    delivered:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
    partial:    'bg-amber-50 text-amber-700 ring-amber-200',
    rejected:   'bg-red-50 text-red-600 ring-red-200',
};
const DOC_PILL: Record<string, string> = {
    pending:  'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    rejected: 'bg-red-50 text-red-600 ring-red-200',
};

export default function DeliveryShow({ delivery }: { delivery: any }) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Deliveries', href: '/deliveries' },
        { title: delivery.number, href: `/deliveries/${delivery.id}` },
    ];

    const [signOffOpen, setSignOffOpen] = useState(false);
    const [rejectOpen,  setRejectOpen]  = useState(false);
    const [docOpen,     setDocOpen]     = useState(false);
    const [signForm,    setSignForm]    = useState({ signed_by: '', client_notes: '', delivered_date: new Date().toISOString().slice(0, 10) });
    const [rejectForm,  setRejectForm]  = useState({ signed_by: '', client_notes: '' });
    const [docForm,     setDocForm]     = useState({ type: 'grn', title: '', notes: '' });

    function dispatch()    { router.post(`/deliveries/${delivery.id}/dispatch`, {}, { preserveScroll: true }); }
    function deliver()     { router.post(`/deliveries/${delivery.id}/deliver`, signForm, { onSuccess: () => setSignOffOpen(false), preserveScroll: true }); }
    function reject()      { router.post(`/deliveries/${delivery.id}/reject`, rejectForm, { onSuccess: () => setRejectOpen(false), preserveScroll: true }); }
    function uploadDoc()   { router.post(`/deliveries/${delivery.id}/documents`, docForm, { onSuccess: () => setDocOpen(false), preserveScroll: true }); }
    function approveDoc(docId: number, action: string) { router.post(`/delivery-documents/${docId}/approve`, { action }, { preserveScroll: true }); }

    /** Open the PDF in a new tab — browser will prompt download */
    function downloadPdf() {
        window.open(`/deliveries/${delivery.id}/confirmation-pdf`, '_blank');
    }

    /** Extract the confirm token from items JSON and copy the link */
    function copyConfirmLink() {
        const token = delivery.items?._confirm_token;
        if (!token) {
            toast.info('Generate the PDF first to create the confirmation link.');
            return;
        }
        const url = `${window.location.origin}/delivery-confirm/${token}`;
        navigator.clipboard.writeText(url).then(() => {
            toast.success('Confirmation link copied to clipboard!');
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Delivery ${delivery.number}`} />
            <div className="flex flex-col h-full">

                {/* SF record header */}
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Truck className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2.5 flex-wrap">
                                    <h1 className="text-xl font-bold font-mono">{delivery.number}</h1>
                                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full ring-1 capitalize', STATUS_PILL[delivery.status] ?? STATUS_PILL.pending)}>
                                        {delivery.status.replace('_', ' ')}
                                    </span>
                                </div>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    PO: <Link href={`/purchase-orders/${delivery.purchase_order?.id}`} className="text-primary hover:underline">{delivery.purchase_order?.number}</Link>
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2 flex-wrap flex-shrink-0">
                            {delivery.status === 'pending' && (
                                <Button variant="outline" size="sm" onClick={dispatch}>
                                    <Truck className="h-3.5 w-3.5 mr-1.5" /> Mark In Transit
                                </Button>
                            )}
                            {delivery.status === 'in_transit' && (
                                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => setSignOffOpen(true)}>
                                    <PenLine className="h-3.5 w-3.5 mr-1.5" /> Client Sign-off
                                </Button>
                            )}
                            {delivery.status === 'in_transit' && (
                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive/90" onClick={() => setRejectOpen(true)}>
                                    <XCircle className="h-3.5 w-3.5 mr-1.5" /> Reject
                                </Button>
                            )}
                            {/* ── PDF + confirmation link ── */}
                            <Button variant="outline" size="sm" onClick={downloadPdf} title="Download branded delivery confirmation PDF">
                                <Download className="h-3.5 w-3.5 mr-1.5" /> Download PDF
                            </Button>
                            <Button variant="outline" size="sm" onClick={copyConfirmLink} title="Copy customer confirmation link">
                                <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Confirm Link
                            </Button>
                            <Button variant="outline" size="sm" onClick={() => setDocOpen(true)}>
                                <FileText className="h-3.5 w-3.5 mr-1.5" /> Add Document
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background p-6 space-y-4 max-w-4xl">

                    {/* PDF info banner */}
                    <div className="flex items-center gap-3 p-3 bg-primary/5 border border-primary/20 rounded-lg text-sm text-foreground/80">
                        <Download className="h-4 w-4 text-primary shrink-0" />
                        <span>
                            <strong>Download PDF</strong> to get a branded delivery confirmation document with signature blocks.
                            Share the <strong>Confirm Link</strong> with the customer for digital sign-off (generated when PDF is first downloaded).
                        </span>
                    </div>

                    {/* Sign-off panel */}
                    {signOffOpen && (
                        <div className="bg-emerald-50/80 border border-emerald-200 rounded-lg p-5">
                            <h3 className="font-semibold text-emerald-800 mb-1 flex items-center gap-2"><PenLine className="h-4 w-4" /> Client Delivery Sign-off</h3>
                            <p className="text-xs text-muted-foreground mb-4">Record the client's acceptance. A GRN will be auto-generated.</p>
                            <div className="grid sm:grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Signed By *</label>
                                    <Input value={signForm.signed_by} onChange={e => setSignForm(f => ({ ...f, signed_by: e.target.value }))} placeholder="Full name of person signing" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Delivery Date *</label>
                                    <Input type="date" value={signForm.delivered_date} onChange={e => setSignForm(f => ({ ...f, delivered_date: e.target.value }))} />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Client Notes</label>
                                    <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" rows={2} value={signForm.client_notes} onChange={e => setSignForm(f => ({ ...f, client_notes: e.target.value }))} />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={deliver} disabled={!signForm.signed_by}>
                                    <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" /> Confirm & Generate GRN
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => setSignOffOpen(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* Reject panel */}
                    {rejectOpen && (
                        <div className="bg-red-50/80 border border-red-200 rounded-lg p-5">
                            <h3 className="font-semibold text-red-700 mb-3">Record Delivery Rejection</h3>
                            <div className="grid sm:grid-cols-2 gap-3 mb-3">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Rejected By</label>
                                    <Input value={rejectForm.signed_by} onChange={e => setRejectForm(f => ({ ...f, signed_by: e.target.value }))} />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Reason *</label>
                                    <Input value={rejectForm.client_notes} onChange={e => setRejectForm(f => ({ ...f, client_notes: e.target.value }))} placeholder="Why was delivery rejected?" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" variant="destructive" onClick={reject} disabled={!rejectForm.client_notes}>Record Rejection</Button>
                                <Button size="sm" variant="outline" onClick={() => setRejectOpen(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    {/* Add document panel */}
                    {docOpen && (
                        <div className="bg-amber-50/80 border border-amber-200 rounded-lg p-5">
                            <h3 className="font-semibold text-amber-800 mb-4">Attach Document</h3>
                            <div className="grid sm:grid-cols-3 gap-3 mb-3">
                                <div>
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Type</label>
                                    <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs" value={docForm.type} onChange={e => setDocForm(f => ({ ...f, type: e.target.value }))}>
                                        {[['grn','GRN'],['delivery_note','Delivery Note'],['contract','Contract'],['invoice','Invoice'],['other','Other']].map(([v,l]) => (
                                            <option key={v} value={v}>{l}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Title *</label>
                                    <Input value={docForm.title} onChange={e => setDocForm(f => ({ ...f, title: e.target.value }))} className="h-8 text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button size="sm" onClick={uploadDoc} disabled={!docForm.title}>Attach</Button>
                                <Button size="sm" variant="outline" onClick={() => setDocOpen(false)}>Cancel</Button>
                            </div>
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 space-y-5">
                            {/* Items */}
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                                    <Package className="h-4 w-4 text-primary" />
                                    <h2 className="text-sm font-semibold">Items</h2>
                                </div>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/20 border-b border-border text-left">
                                            {['Description','Qty','Unit Price','Amount'].map((h, i) => (
                                                <th key={h} className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground', i >= 2 && 'text-right')}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {(Array.isArray(delivery.items)
                                            ? delivery.items
                                            : Object.values(delivery.items ?? {}).filter((v: any) => typeof v === 'object' && v?.description)
                                        ).map((l: any, i: number) => (
                                            <tr key={i} className="hover:bg-muted/20">
                                                <td className="px-4 py-2.5">{l.description ?? l.name}</td>
                                                <td className="px-4 py-2.5 text-muted-foreground">{l.quantity ?? l.qty_delivered}</td>
                                                <td className="px-4 py-2.5 text-right text-muted-foreground">{l.unit_price != null ? `${l.unit_price}` : '—'}</td>
                                                <td className="px-4 py-2.5 text-right font-medium">{l.amount != null ? `${l.amount}` : '—'}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Documents */}
                            <div className="bg-card border border-border rounded-lg overflow-hidden">
                                <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border bg-muted/30">
                                    <FileText className="h-4 w-4 text-primary" />
                                    <h2 className="text-sm font-semibold">Documents</h2>
                                </div>
                                <div className="p-5">
                                    {!delivery.documents?.length ? (
                                        <p className="text-sm text-muted-foreground text-center py-4">No documents attached</p>
                                    ) : delivery.documents.map((d: any) => (
                                        <div key={d.id} className="flex items-center justify-between p-3 border border-border rounded-lg mb-2">
                                            <div>
                                                <p className="text-sm font-medium">{d.title}</p>
                                                <p className="text-xs text-muted-foreground capitalize">{d.type.replace('_', ' ')} · {d.uploader?.name}</p>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', DOC_PILL[d.status] ?? DOC_PILL.pending)}>{d.status}</span>
                                                {d.status === 'pending' && (
                                                    <div className="flex gap-1">
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-emerald-600" onClick={() => approveDoc(d.id, 'approved')}><CheckSquare className="h-3.5 w-3.5" /></Button>
                                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => approveDoc(d.id, 'rejected')}><XCircle className="h-3.5 w-3.5" /></Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="space-y-4 text-sm">
                            {delivery.status === 'delivered' && (
                                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 text-emerald-700 font-semibold mb-2"><CheckCircle2 className="h-4 w-4" /> Delivery Confirmed</div>
                                    <div className="space-y-1 text-xs text-emerald-700">
                                        <p>Signed by: <strong>{delivery.signed_by}</strong></p>
                                        {delivery.delivered_date && <p>Date: {fmtDate(delivery.delivered_date)}</p>}
                                        {delivery.client_notes && <p className="italic mt-1">"{delivery.client_notes}"</p>}
                                    </div>
                                </div>
                            )}
                            {delivery.client && (
                                <div className="bg-card border border-border rounded-lg p-4 space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Client</p>
                                    <Link href={`/clients/${delivery.client.id}`} className="text-primary hover:underline font-medium block">
                                        {delivery.client.company || delivery.client.name}
                                    </Link>
                                    {delivery.client.phone && <p className="text-xs text-muted-foreground">{delivery.client.phone}</p>}
                                </div>
                            )}
                            {delivery.carrier && (
                                <div className="bg-card border border-border rounded-lg p-4 space-y-1">
                                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Carrier</p>
                                    <p className="font-medium">{delivery.carrier}</p>
                                    {delivery.tracking_number && <p className="text-muted-foreground font-mono text-xs">{delivery.tracking_number}</p>}
                                    {delivery.tracking_url && (
                                        <a href={delivery.tracking_url} target="_blank" className="text-primary text-xs hover:underline">Track shipment →</a>
                                    )}
                                </div>
                            )}
                            {/* PDF quick actions */}
                            <div className="bg-card border border-border rounded-lg p-4 space-y-2">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Confirmation Documents</p>
                                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={downloadPdf}>
                                    <Download className="h-3.5 w-3.5" /> Download Confirmation PDF
                                </Button>
                                <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={copyConfirmLink}>
                                    <Copy className="h-3.5 w-3.5" /> Copy Customer Confirm Link
                                </Button>
                                <p className="text-[10px] text-muted-foreground leading-relaxed">
                                    The PDF contains company branding, item list, and a signature block. The confirm link lets the customer digitally acknowledge receipt.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}