/**
 * field-agents/my-dashboard.tsx — Mobile-friendly field agent dashboard
 *
 * Agent's own view: GPS check-in at client sites, capture orders,
 * record cash/mobile-money collections, check out.
 */
import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import {
    MapPin, CheckCircle2, Plus, Minus, Trash2, Navigation,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'My Visits', href: '/my-visits' }];

interface Product { id: number; name: string; sku: string; unit_price: number; currency: string; stock_qty: number }
interface Visit {
    id: number; checked_in_at: string; checked_out_at: string | null;
    location_name: string | null; purpose: string; outcome: string | null;
    amount_collected: number | null; order_total: number | null;
}
interface Agent { id: number; agent_code: string; territory: string | null }

interface Props { agent: Agent; todayVisits: Visit[]; products: Product[]; monthRevenue: number }

interface OrderLine { product: Product; quantity: number }

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

const fmt = (n: number, c = 'KES') => new Intl.NumberFormat('en-KE', { style: 'currency', currency: c }).format(n);

export default function MyDashboard({ agent, todayVisits: initialVisits, products, monthRevenue }: Props) {
    const [visits, setVisits] = useState(initialVisits);
    const [activeVisit, setActiveVisit] = useState<number | null>(null);
    const [checkingIn, setCheckingIn] = useState(false);
    const [purpose, setPurpose] = useState('sales_call');
    const [locationName, setLocationName] = useState('');

    const [outcome, setOutcome] = useState('order_placed');
    const [amountCollected, setAmountCollected] = useState('');
    const [collectionRef, setCollectionRef] = useState('');
    const [orderLines, setOrderLines] = useState<OrderLine[]>([]);
    const [notes, setNotes] = useState('');
    const [submitting, setSubmitting] = useState(false);

    function getLocation(): Promise<GeolocationPosition> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) return reject(new Error('GPS not available on this device'));
            navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
        });
    }

    async function handleCheckIn() {
        setCheckingIn(true);
        try {
            const pos = await getLocation();
            const { ok, json } = await postJson('/field-agents/check-in', {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
                location_name: locationName || undefined,
                purpose,
            });
            if (ok) {
                setVisits(prev => [{
                    id: json.visit_id, checked_in_at: new Date().toISOString(),
                    checked_out_at: null, location_name: locationName || null,
                    purpose, outcome: null, amount_collected: null, order_total: null,
                }, ...prev]);
                setActiveVisit(json.visit_id);
                setLocationName('');
            }
        } catch (e: any) {
            alert(e.message ?? 'Could not get GPS location. Please enable location access.');
        } finally {
            setCheckingIn(false);
        }
    }

    function addProduct(product: Product) {
        setOrderLines(prev => {
            const existing = prev.find(l => l.product.id === product.id);
            if (existing) return prev.map(l => l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l);
            return [...prev, { product, quantity: 1 }];
        });
    }

    const orderTotal = orderLines.reduce((s, l) => s + l.quantity * l.product.unit_price, 0);

    async function handleCheckOut(visitId: number) {
        setSubmitting(true);
        const { ok, json } = await postJson(`/field-agents/visits/${visitId}/check-out`, {
            outcome,
            amount_collected: amountCollected || null,
            collection_reference: collectionRef || null,
            order_items: orderLines.length > 0
                ? orderLines.map(l => ({ product_id: l.product.id, quantity: l.quantity, unit_price: l.product.unit_price }))
                : null,
            notes,
        });
        setSubmitting(false);

        if (ok) {
            setVisits(prev => prev.map(v => v.id === visitId ? json.visit : v));
            setActiveVisit(null);
            setOrderLines([]);
            setAmountCollected('');
            setCollectionRef('');
            setNotes('');
        }
    }

    const current = visits.find(v => v.id === activeVisit);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="My Visits" />
            <div className="max-w-md mx-auto p-4 space-y-4">

                <div className="bg-card border border-border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-bold">{agent.agent_code}</p>
                            <p className="text-xs text-muted-foreground">{agent.territory ?? 'No territory assigned'}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground">This month</p>
                            <p className="text-sm font-bold text-emerald-600">{fmt(monthRevenue)}</p>
                        </div>
                    </div>
                </div>

                {!current && (
                    <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">New Visit</p>
                        <select value={purpose} onChange={e => setPurpose(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                            <option value="sales_call">Sales Call</option>
                            <option value="collection">Collection</option>
                            <option value="delivery">Delivery</option>
                            <option value="survey">Survey</option>
                            <option value="other">Other</option>
                        </select>
                        <Input placeholder="Location name (optional)" value={locationName}
                            onChange={e => setLocationName(e.target.value)} />
                        <Button onClick={handleCheckIn} disabled={checkingIn}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2 h-11">
                            <Navigation className={cn('h-4 w-4', checkingIn && 'animate-pulse')} />
                            {checkingIn ? 'Getting GPS location…' : 'Check In'}
                        </Button>
                    </div>
                )}

                {current && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 dark:bg-amber-950/20 dark:border-amber-800">
                        <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                <MapPin className="h-3.5 w-3.5" /> Active Visit
                            </p>
                            <span className="text-xs text-amber-700 dark:text-amber-400">
                                {format(new Date(current.checked_in_at), 'HH:mm')}
                            </span>
                        </div>

                        <div>
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Add to Order</p>
                            <div className="flex gap-1.5 overflow-x-auto pb-1">
                                {products.slice(0, 8).map(p => (
                                    <button key={p.id} onClick={() => addProduct(p)}
                                        className="shrink-0 px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:border-amber-300 transition-colors">
                                        {p.name}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {orderLines.length > 0 && (
                            <div className="space-y-1.5">
                                {orderLines.map(line => (
                                    <div key={line.product.id} className="flex items-center gap-2 p-2 bg-white dark:bg-background rounded-lg text-xs">
                                        <span className="flex-1 truncate">{line.product.name}</span>
                                        <button onClick={() => setOrderLines(p => p.map(l => l.product.id === line.product.id ? { ...l, quantity: Math.max(1, l.quantity - 1) } : l))}>
                                            <Minus className="h-3 w-3" />
                                        </button>
                                        <span className="w-5 text-center font-semibold">{line.quantity}</span>
                                        <button onClick={() => setOrderLines(p => p.map(l => l.product.id === line.product.id ? { ...l, quantity: l.quantity + 1 } : l))}>
                                            <Plus className="h-3 w-3" />
                                        </button>
                                        <span className="font-bold w-16 text-right">{fmt(line.quantity * line.product.unit_price)}</span>
                                        <button onClick={() => setOrderLines(p => p.filter(l => l.product.id !== line.product.id))}>
                                            <Trash2 className="h-3 w-3 text-red-500" />
                                        </button>
                                    </div>
                                ))}
                                <div className="flex justify-between text-xs font-bold pt-1 border-t border-amber-200">
                                    <span>Order Total</span><span>{fmt(orderTotal)}</span>
                                </div>
                            </div>
                        )}

                        <select value={outcome} onChange={e => setOutcome(e.target.value)}
                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                            <option value="order_placed">Order Placed</option>
                            <option value="payment_collected">Payment Collected</option>
                            <option value="no_decision">No Decision</option>
                            <option value="follow_up">Needs Follow-up</option>
                            <option value="rejected">Rejected</option>
                        </select>

                        <div className="grid grid-cols-2 gap-2">
                            <Input type="number" placeholder="Amount collected" value={amountCollected}
                                onChange={e => setAmountCollected(e.target.value)} />
                            <Input placeholder="M-Pesa code / ref" value={collectionRef}
                                onChange={e => setCollectionRef(e.target.value.toUpperCase())} className="font-mono" />
                        </div>

                        <Textarea placeholder="Notes…" rows={2} value={notes} onChange={e => setNotes(e.target.value)} />

                        <Button onClick={() => handleCheckOut(current.id)} disabled={submitting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11">
                            <CheckCircle2 className="h-4 w-4" /> {submitting ? 'Saving…' : 'Check Out & Save'}
                        </Button>
                    </div>
                )}

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-border bg-muted/30">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Today's Visits ({visits.length})</p>
                    </div>
                    {visits.length === 0 ? (
                        <p className="p-6 text-center text-sm text-muted-foreground">No visits yet today.</p>
                    ) : (
                        <div className="divide-y divide-border">
                            {visits.map(v => (
                                <div key={v.id} className="px-4 py-3 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium">{v.location_name ?? 'Unnamed location'}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {format(new Date(v.checked_in_at), 'HH:mm')}
                                            {v.checked_out_at ? ` – ${format(new Date(v.checked_out_at), 'HH:mm')}` : ' (in progress)'}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        {v.order_total != null && <p className="text-xs font-bold">{fmt(v.order_total)}</p>}
                                        {v.amount_collected != null && <p className="text-xs text-emerald-600">{fmt(v.amount_collected)} collected</p>}
                                        {!v.checked_out_at && <span className="text-xs text-amber-600">● Active</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
