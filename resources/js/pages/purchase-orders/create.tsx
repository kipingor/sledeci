import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Plus, Trash2, ChevronRight, ShoppingCart, Save } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Purchase Orders', href: '/purchase-orders' },
    { title: 'New PO', href: '/purchase-orders/create' },
];

interface LineItem {
    [key: string]: string;
    product_id: string;
    description: string;
    quantity: string;
    unit_price: string;
}
const emptyLine = (): LineItem => ({ product_id: '', description: '', quantity: '1', unit_price: '' });

interface Props {
    suppliers: any[];
    products:  any[];
    clients:   { id: number; name: string; company: string | null; address: string | null }[];
    projects:  { id: number; name: string; client_id: number | null }[];
}

function Field({ label, required, children, error }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-destructive mt-0.5">{error}</p>}
        </div>
    );
}

export default function PurchaseOrderCreate({ suppliers, products, clients, projects }: Props) {
    const [form, setForm] = useState({
        supplier_id: '', client_id: '', project_id: '',
        order_date: new Date().toISOString().slice(0, 10),
        expected_delivery_date: '', currency: 'USD',
        shipping_address: '', notes: '', tax_rate: '0',
    });
    const [lines,  setLines]  = useState<LineItem[]>([emptyLine()]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const s = (f: any) => setForm(prev => ({ ...prev, ...f }));

    const supplierProducts = form.supplier_id
        ? products.filter(p => p.supplier_id === +form.supplier_id)
        : products;

    function pickProduct(i: number, productId: string) {
        const p = products.find(pr => pr.id === +productId);
        setLines(prev => prev.map((l, idx) => idx === i
            ? { ...l, product_id: productId, description: p?.name ?? l.description, unit_price: String(p?.unit_price ?? l.unit_price) }
            : l));
    }

    const subtotal = lines.reduce((s, l) => s + (+l.quantity || 0) * (+l.unit_price || 0), 0);
    const tax      = subtotal * (+form.tax_rate || 0) / 100;
    const total    = subtotal + tax;
    const fmt      = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: form.currency || 'USD' }).format(n);

    function submit() {
        setSaving(true);
        router.post('/purchase-orders', { ...form, lines }, {
            onError:   e => { setErrors(e); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Purchase Order" />

            {/* SF header */}
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/purchase-orders" className="text-muted-foreground hover:text-foreground">Purchase Orders</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">New PO</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <ShoppingCart className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">New Purchase Order</h1>
                </div>
            </div>

            <div className="p-6 max-w-4xl">
                <div className="grid lg:grid-cols-3 gap-5">
                    {/* Main form */}
                    <div className="lg:col-span-2 space-y-5">
                        {/* Order details */}
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-border bg-muted/30"><p className="text-sm font-semibold">Order Details</p></div>
                            <div className="p-5 grid sm:grid-cols-2 gap-4">
                                <Field label="Supplier" required error={errors.supplier_id}>
                                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                        value={form.supplier_id} onChange={e => s({ supplier_id: e.target.value })}>
                                        <option value="">Select supplier…</option>
                                        {suppliers.map(s2 => <option key={s2.id} value={s2.id}>{s2.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Client (end customer)">
                                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                        value={form.client_id} onChange={e => s({ client_id: e.target.value })}>
                                        <option value="">Select client…</option>
                                        {clients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Project (optional)">
                                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                        value={form.project_id} onChange={e => s({ project_id: e.target.value })}>
                                        <option value="">No project</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                </Field>
                                <Field label="Currency">
                                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                        value={form.currency} onChange={e => s({ currency: e.target.value })}>
                                        {['USD','EUR','GBP','KES','ZAR'].map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </Field>
                            </div>
                        </div>

                        {/* Line items */}
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-border bg-muted/30"><p className="text-sm font-semibold">Items to Order</p></div>
                            <div className="p-5">
                                <div className="space-y-2">
                                    <div className="grid grid-cols-12 gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                                        <span className="col-span-4">Description</span>
                                        <span className="col-span-3">Product</span>
                                        <span className="col-span-2 text-center">Qty</span>
                                        <span className="col-span-2 text-right">Unit Cost</span>
                                        <span className="col-span-1" />
                                    </div>
                                    {lines.map((line, i) => (
                                        <div key={i} className="grid grid-cols-12 gap-2 items-center">
                                            <Input className="col-span-4 h-8 text-xs" placeholder="Description *" value={line.description}
                                                onChange={e => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, description: e.target.value } : l))} />
                                            <select className="col-span-3 h-8 rounded-md border border-input bg-background px-2 text-xs"
                                                value={line.product_id} onChange={e => pickProduct(i, e.target.value)}>
                                                <option value="">Custom</option>
                                                {supplierProducts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                            <Input className="col-span-2 h-8 text-xs text-center" placeholder="1" value={line.quantity}
                                                onChange={e => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, quantity: e.target.value } : l))} />
                                            <Input className="col-span-2 h-8 text-xs text-right tabular-nums" placeholder="0.00" value={line.unit_price}
                                                onChange={e => setLines(prev => prev.map((l, idx) => idx === i ? { ...l, unit_price: e.target.value } : l))} />
                                            <button className="col-span-1 flex justify-center text-muted-foreground hover:text-destructive transition-colors"
                                                onClick={() => setLines(prev => prev.filter((_, idx) => idx !== i))}
                                                disabled={lines.length === 1}>
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <Button variant="outline" size="sm" className="mt-3 h-7 text-xs gap-1"
                                    onClick={() => setLines(prev => [...prev, emptyLine()])}>
                                    <Plus className="h-3 w-3" /> Add Item
                                </Button>
                            </div>
                        </div>

                        {/* Shipping + Notes */}
                        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                            <p className="text-sm font-semibold">Shipping &amp; Notes</p>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Shipping Address</label>
                                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                    value={form.shipping_address} onChange={e => s({ shipping_address: e.target.value })} placeholder="Delivery address for goods…" />
                            </div>
                            <Input placeholder="Notes / instructions for supplier…" value={form.notes} onChange={e => s({ notes: e.target.value })} />
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Dates</p>
                            <Field label="Order Date" required>
                                <Input type="date" className="h-8 text-sm" value={form.order_date} onChange={e => s({ order_date: e.target.value })} />
                            </Field>
                            <Field label="Expected Delivery">
                                <Input type="date" className="h-8 text-sm" value={form.expected_delivery_date} onChange={e => s({ expected_delivery_date: e.target.value })} />
                            </Field>
                            <Field label="Tax Rate (%)">
                                <Input type="number" min="0" max="100" step="0.1" className="h-8 text-sm" value={form.tax_rate} onChange={e => s({ tax_rate: e.target.value })} />
                            </Field>
                        </div>

                        <div className="bg-card border border-border rounded-lg p-5 space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="font-medium tabular-nums">{fmt(subtotal)}</span></div>
                            {tax > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span className="tabular-nums">{fmt(tax)}</span></div>}
                            <div className="flex justify-between font-bold border-t border-border pt-2 text-base">
                                <span>Total</span><span className="tabular-nums">{fmt(total)}</span>
                            </div>
                        </div>

                        <Button className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={submit} disabled={saving || !form.supplier_id}>
                            <Save className="h-4 w-4" />
                            {saving ? 'Saving…' : 'Create PO'}
                        </Button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}