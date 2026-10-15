import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import {
    ShoppingCart, Search, Plus, Minus, Trash2, ScanLine,
    Smartphone, Banknote, CreditCard, X, Receipt, Lock, Unlock,
} from 'lucide-react';
import { useState, useMemo, useRef } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Point of Sale', href: '/pos' }];

interface Product {
    id: number; name: string; sku: string; barcode: string | null;
    unit_price: number; currency: string; stock_qty: number;
    category: string | null; unit: string | null;
}

interface CartLine { product: Product; quantity: number; discount: number }

interface Shift { id: number; opening_float: number; opened_at: string }

interface Props {
    products: Product[];
    categories: string[];
    openShift: Shift | null;
    currency: string;
}

const fmt = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c }).format(n);

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}
function postJson(url: string, data: Record<string, unknown> = {}) {
    return fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
        body: JSON.stringify(data),
    }).then(r => r.json().then(json => ({ ok: r.ok, json })));
}

export default function PosIndex({ products, categories, openShift, currency }: Props) {
    const [cart,     setCart]     = useState<CartLine[]>([]);
    const [search,   setSearch]   = useState('');
    const [category, setCategory] = useState('');
    const [scanInput, setScanInput] = useState('');
    const [checkoutOpen, setCheckoutOpen] = useState(false);
    const [paymentChannel, setPaymentChannel] = useState<'cash' | 'mpesa' | 'card'>('cash');
    const [amountTendered, setAmountTendered] = useState('');
    const [mpesaPhone, setMpesaPhone] = useState('');
    const [mpesaStatus, setMpesaStatus] = useState<string | null>(null);
    const [mpesaCode,  setMpesaCode]  = useState('');
    const [taxRate,    setTaxRate]    = useState('16');
    const [processing, setProcessing] = useState(false);
    const [lastReceipt, setLastReceipt] = useState<string | null>(null);

    const [shiftModalOpen, setShiftModalOpen] = useState(!openShift);
    const [openingFloat, setOpeningFloat] = useState('');

    const scanRef = useRef<HTMLInputElement>(null);

    const filtered = useMemo(() => products.filter(p => {
        const matchSearch = !search ||
            p.name.toLowerCase().includes(search.toLowerCase()) ||
            p.sku.toLowerCase().includes(search.toLowerCase()) ||
            (p.barcode ?? '').includes(search);
        const matchCategory = !category || p.category === category;
        return matchSearch && matchCategory;
    }), [products, search, category]);

    function addToCart(product: Product) {
        setCart(prev => {
            const existing = prev.find(l => l.product.id === product.id);
            if (existing) {
                if (existing.quantity >= product.stock_qty) return prev;
                return prev.map(l => l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l);
            }
            return [...prev, { product, quantity: 1, discount: 0 }];
        });
    }

    function updateQty(productId: number, qty: number) {
        setCart(prev => prev
            .map(l => l.product.id === productId ? { ...l, quantity: Math.max(0, qty) } : l)
            .filter(l => l.quantity > 0)
        );
    }

    function removeLine(productId: number) {
        setCart(prev => prev.filter(l => l.product.id !== productId));
    }

    async function handleScan(e: React.KeyboardEvent<HTMLInputElement>) {
        if (e.key !== 'Enter' || !scanInput.trim()) return;
        const res = await fetch(`/inventory/lookup?q=${encodeURIComponent(scanInput)}`);
        if (res.ok) {
            const { product } = await res.json();
            if (product) {
                const full = products.find(p => p.id === product.id);
                if (full) addToCart(full);
            }
        }
        setScanInput('');
    }

    const subtotal = cart.reduce((s, l) => s + (l.quantity * l.product.unit_price) - l.discount, 0);
    const tax      = subtotal * (parseFloat(taxRate) || 0) / 100;
    const total    = subtotal + tax;
    const tendered = parseFloat(amountTendered) || 0;
    const change   = Math.max(0, tendered - total);

    async function openShiftAction() {
        const { ok } = await postJson('/pos/shift/open', { opening_float: openingFloat });
        if (ok) { setShiftModalOpen(false); router.reload(); }
    }

    async function initiateMpesa() {
        setMpesaStatus('Sending STK push…');
        const { ok, json } = await postJson('/pos/mpesa-push', { phone: mpesaPhone, amount: total });
        setMpesaStatus(ok ? '✅ Sent — ask customer to check their phone' : `❌ ${json.error}`);
        if (ok) setMpesaCode(json.reference ?? '');
    }

    async function completeSale() {
        setProcessing(true);
        const { ok, json } = await postJson('/pos/checkout', {
            items: cart.map(l => ({
                product_id: l.product.id, quantity: l.quantity,
                unit_price: l.product.unit_price, discount: l.discount,
            })),
            tax_rate: taxRate,
            payment_channel: paymentChannel,
            amount_tendered: paymentChannel === 'cash' ? tendered : null,
            mobile_money_code: paymentChannel === 'mpesa' ? mpesaCode : null,
            mobile_money_phone: paymentChannel === 'mpesa' ? mpesaPhone : null,
        });
        setProcessing(false);

        if (ok) {
            setLastReceipt(json.sale.receipt_number);
            setCart([]);
            setCheckoutOpen(false);
            setAmountTendered('');
            setMpesaCode('');
            setMpesaStatus(null);
            router.reload({ only: ['products'] });
        } else {
            alert(json.error ?? 'Checkout failed');
        }
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Point of Sale" />
            <div className="flex h-[calc(100vh-4rem)]">

                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="p-4 border-b border-border bg-card flex gap-2 items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Search products…" className="pl-9"
                                value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        <div className="relative w-56">
                            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-emerald-600" />
                            <Input ref={scanRef} placeholder="Scan barcode…" className="pl-9 border-emerald-200"
                                value={scanInput} onChange={e => setScanInput(e.target.value)}
                                onKeyDown={handleScan} />
                        </div>
                        <select value={category} onChange={e => setCategory(e.target.value)}
                            className="h-9 text-sm rounded-md border border-input bg-background px-3">
                            <option value="">All categories</option>
                            {categories.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        {openShift && (
                            <span className="ml-auto inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300">
                                <Unlock className="h-3 w-3" /> Shift Open
                            </span>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                            {filtered.map(p => {
                                const inCart = cart.find(l => l.product.id === p.id);
                                const lowStock = p.stock_qty <= 5;
                                return (
                                    <button key={p.id} onClick={() => addToCart(p)}
                                        disabled={p.stock_qty <= 0}
                                        className={cn(
                                            'text-left p-3 rounded-xl border bg-card transition-all hover:shadow-md hover:-translate-y-0.5',
                                            inCart ? 'border-amber-400 ring-1 ring-amber-300' : 'border-border',
                                            p.stock_qty <= 0 && 'opacity-40 cursor-not-allowed'
                                        )}>
                                        <p className="text-sm font-semibold truncate">{p.name}</p>
                                        <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.sku}</p>
                                        <div className="flex items-center justify-between mt-2">
                                            <span className="text-sm font-bold">{fmt(p.unit_price, p.currency)}</span>
                                            <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full',
                                                lowStock ? 'bg-amber-50 text-amber-700' : 'bg-muted text-muted-foreground')}>
                                                {p.stock_qty} {p.unit ?? ''}
                                            </span>
                                        </div>
                                        {inCart && (
                                            <div className="mt-1.5 text-xs font-bold text-amber-600">
                                                In cart: {inCart.quantity}
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="w-96 border-l border-border bg-card flex flex-col">
                    <div className="p-4 border-b border-border flex items-center justify-between">
                        <p className="font-semibold flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" /> Cart ({cart.length})
                        </p>
                        {cart.length > 0 && (
                            <button onClick={() => setCart([])} className="text-xs text-muted-foreground hover:text-destructive">
                                Clear
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-3 space-y-2">
                        {cart.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                                <ShoppingCart className="h-10 w-10 opacity-20 mb-2" />
                                <p className="text-sm">Cart is empty</p>
                                <p className="text-xs mt-1">Tap a product or scan a barcode</p>
                            </div>
                        ) : (
                            cart.map(line => (
                                <div key={line.product.id} className="flex items-center gap-2 p-2.5 bg-muted/30 rounded-lg">
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{line.product.name}</p>
                                        <p className="text-xs text-muted-foreground">{fmt(line.product.unit_price, line.product.currency)} each</p>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button onClick={() => updateQty(line.product.id, line.quantity - 1)}
                                            className="p-1 rounded bg-background border border-border hover:bg-muted">
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-6 text-center text-sm font-semibold">{line.quantity}</span>
                                        <button onClick={() => updateQty(line.product.id, line.quantity + 1)}
                                            disabled={line.quantity >= line.product.stock_qty}
                                            className="p-1 rounded bg-background border border-border hover:bg-muted disabled:opacity-30">
                                            <Plus className="h-3 w-3" />
                                        </button>
                                    </div>
                                    <span className="text-sm font-bold w-16 text-right">
                                        {fmt(line.quantity * line.product.unit_price - line.discount, line.product.currency)}
                                    </span>
                                    <button onClick={() => removeLine(line.product.id)} className="text-muted-foreground hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ))
                        )}
                    </div>

                    <div className="p-4 border-t border-border space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Subtotal</span><span>{fmt(subtotal, currency)}</span>
                        </div>
                        <div className="flex justify-between text-xs text-muted-foreground">
                            <span>VAT ({taxRate}%)</span><span>{fmt(tax, currency)}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-1.5 border-t border-border">
                            <span>Total</span><span>{fmt(total, currency)}</span>
                        </div>
                        <Button className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 h-11"
                            disabled={cart.length === 0 || !openShift}
                            onClick={() => setCheckoutOpen(true)}>
                            <Receipt className="h-4 w-4" /> Checkout
                        </Button>
                    </div>
                </div>
            </div>

            {shiftModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-6 text-center space-y-4">
                        <Lock className="h-8 w-8 mx-auto text-amber-500" />
                        <div>
                            <p className="font-semibold">Open Your Till</p>
                            <p className="text-xs text-muted-foreground mt-1">Enter your opening cash float to start the shift.</p>
                        </div>
                        <Input type="number" min="0" placeholder="Opening float (KES)"
                            value={openingFloat} onChange={e => setOpeningFloat(e.target.value)} className="text-center" />
                        <Button onClick={openShiftAction} disabled={!openingFloat}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white">
                            Open Shift
                        </Button>
                    </div>
                </div>
            )}

            {checkoutOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-md shadow-xl">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Complete Sale — {fmt(total, currency)}</h2>
                            <button onClick={() => setCheckoutOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-3 gap-2">
                                {([
                                    { id: 'cash',  label: 'Cash',   icon: Banknote },
                                    { id: 'mpesa', label: 'M-Pesa', icon: Smartphone },
                                    { id: 'card',  label: 'Card',   icon: CreditCard },
                                ] as const).map(opt => (
                                    <button key={opt.id} onClick={() => setPaymentChannel(opt.id)}
                                        className={cn(
                                            'flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs font-medium transition-all',
                                            paymentChannel === opt.id
                                                ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/30'
                                                : 'border-border text-muted-foreground hover:border-amber-200'
                                        )}>
                                        <opt.icon className="h-5 w-5" /> {opt.label}
                                    </button>
                                ))}
                            </div>

                            {paymentChannel === 'cash' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount Tendered</label>
                                    <Input type="number" min={total} value={amountTendered}
                                        onChange={e => setAmountTendered(e.target.value)}
                                        placeholder={String(total)} />
                                    {tendered > 0 && (
                                        <div className="flex justify-between text-sm p-2.5 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg">
                                            <span className="text-muted-foreground">Change</span>
                                            <span className="font-bold text-emerald-600">{fmt(change, currency)}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            {paymentChannel === 'mpesa' && (
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Customer Phone</label>
                                    <div className="flex gap-2">
                                        <Input placeholder="254712345678" value={mpesaPhone}
                                            onChange={e => setMpesaPhone(e.target.value)} className="font-mono" />
                                        <Button variant="outline" onClick={initiateMpesa} disabled={!mpesaPhone}>
                                            Send STK
                                        </Button>
                                    </div>
                                    {mpesaStatus && <p className="text-xs">{mpesaStatus}</p>}
                                    <Input placeholder="Transaction code (after confirmation)" value={mpesaCode}
                                        onChange={e => setMpesaCode(e.target.value.toUpperCase())} className="font-mono text-xs" />
                                </div>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={completeSale} disabled={processing ||
                                (paymentChannel === 'cash' && tendered < total) ||
                                (paymentChannel === 'mpesa' && !mpesaCode)}
                                className="bg-amber-500 hover:bg-amber-600 text-white">
                                {processing ? 'Processing…' : 'Complete Sale'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {lastReceipt && (
                <div className="fixed bottom-6 right-6 bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
                    <Receipt className="h-4 w-4" />
                    Sale complete — {lastReceipt}
                    <button onClick={() => window.open(`/pos/receipt/${lastReceipt}`, '_blank')} className="underline text-xs ml-2">
                        View receipt
                    </button>
                    <button onClick={() => setLastReceipt(null)} className="ml-2"><X className="h-3.5 w-3.5" /></button>
                </div>
            )}
        </AppLayout>
    );
}
