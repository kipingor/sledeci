import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Package, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Products', href: '/products' },
    { title: 'Add Product', href: '/products/create' },
];

interface Props {
    suppliers:  { id: number; name: string }[];
    currencies: Record<string, string>;
}

function Field({ label, required, error, children }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function ProductCreate({ suppliers, currencies }: Props) {
    const [form, setForm] = useState({
        name: '', sku: '', description: '', category: '',
        unit: 'pcs', unit_cost: '', unit_price: '',
        currency: 'KES',          // ← defaults to KES
        stock_qty: '0', supplier_id: '', active: true,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const s = (f: any) => setForm(prev => ({ ...prev, ...f }));

    const margin = form.unit_cost && form.unit_price
        ? Math.round((+form.unit_price - +form.unit_cost) / +form.unit_cost * 100)
        : null;

    function submit() {
        setSaving(true);
        router.post('/products', form, {
            onError: e => { setErrors(e); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Product" />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/products" className="text-muted-foreground hover:text-foreground">Products</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Add Product</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Package className="h-5 w-5 text-primary" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">Add Product</h1>
                </div>
            </div>

            <div className="p-6 max-w-2xl space-y-5">
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Product Details</p>
                    </div>
                    <div className="p-5 grid sm:grid-cols-2 gap-4">

                        <div className="sm:col-span-2">
                            <Field label="Product Name" required error={errors.name}>
                                <Input
                                    value={form.name}
                                    onChange={e => s({ name: e.target.value })}
                                    placeholder="e.g. Dell Laptop OptiPlex 7090"
                                    autoFocus
                                />
                            </Field>
                        </div>

                        <Field label="SKU / Item Code" error={errors.sku}>
                            <Input
                                value={form.sku}
                                onChange={e => s({ sku: e.target.value })}
                                placeholder="DELL-7090-I5"
                            />
                        </Field>

                        <Field label="Category">
                            <Input
                                value={form.category}
                                onChange={e => s({ category: e.target.value })}
                                placeholder="Computers, Networking…"
                            />
                        </Field>

                        <Field label="Supplier">
                            <select
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={form.supplier_id}
                                onChange={e => s({ supplier_id: e.target.value })}
                            >
                                <option value="">No supplier</option>
                                {suppliers.map(s2 => (
                                    <option key={s2.id} value={s2.id}>{s2.name}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Unit">
                            <select
                                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                value={form.unit}
                                onChange={e => s({ unit: e.target.value })}
                            >
                                {['pcs', 'each', 'box', 'kg', 'litre', 'licence', 'service', 'hour'].map(u => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                        </Field>

                        {/* Currency selector — spans full width, placed before pricing */}
                        <div className="sm:col-span-2">
                            <Field label="Currency" required error={errors.currency}>
                                <select
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                    value={form.currency}
                                    onChange={e => s({ currency: e.target.value })}
                                >
                                    {Object.entries(currencies).map(([code, label]) => (
                                        <option key={code} value={code}>{label}</option>
                                    ))}
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                    All prices below are in the selected currency.
                                </p>
                            </Field>
                        </div>

                        <Field label="Cost Price" required error={errors.unit_cost}>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-muted-foreground w-10 shrink-0">{form.currency}</span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.unit_cost}
                                    onChange={e => s({ unit_cost: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                        </Field>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                                Selling Price{' '}
                                {margin !== null && (
                                    <span className={cn('text-xs font-medium', margin >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                        ({margin}% margin)
                                    </span>
                                )}
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-mono text-muted-foreground w-10 shrink-0">{form.currency}</span>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={form.unit_price}
                                    onChange={e => s({ unit_price: e.target.value })}
                                    placeholder="0.00"
                                />
                            </div>
                            {errors.unit_price && (
                                <p className="text-xs text-destructive">{errors.unit_price}</p>
                            )}
                        </div>

                        <Field label="Initial Stock Qty">
                            <Input
                                type="number"
                                min="0"
                                value={form.stock_qty}
                                onChange={e => s({ stock_qty: e.target.value })}
                            />
                        </Field>

                        <div className="sm:col-span-2">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
                                Description
                            </label>
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none"
                                value={form.description}
                                onChange={e => s({ description: e.target.value })}
                                placeholder="Technical specs, notes…"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={submit}
                        disabled={saving || !form.name || !form.unit_cost || !form.unit_price}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Add Product'}
                    </Button>
                    <Button variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </div>
        </AppLayout>
    );
}