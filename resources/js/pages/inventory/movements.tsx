/**
 * inventory/movements.tsx — Per-product stock movement ledger + adjustment
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import {
    Package, ArrowUpCircle, ArrowDownCircle, RefreshCw, XCircle,
    Plus, Minus, X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Movement {
    id: number; type: string; quantity: number; quantity_after: number;
    reference: string | null; notes: string | null; unit_cost: number | null;
    created_at: string; creator: { id: number; name: string } | null;
}

interface Product {
    id: number; name: string; sku: string; barcode: string | null;
    stock_qty: number; reorder_point: number; reorder_qty: number;
    unit: string | null; currency: string;
    supplier: { id: number; name: string } | null;
}

interface Props {
    product: Product;
    movements: { data: Movement[]; links: any[]; current_page: number; last_page: number };
}

const MOVEMENT_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
    receipt:       { label: 'Goods Received', color: 'text-emerald-600', icon: ArrowUpCircle },
    sale:          { label: 'Sale',           color: 'text-blue-600',    icon: ArrowDownCircle },
    adjustment:    { label: 'Adjustment',     color: 'text-amber-600',   icon: RefreshCw },
    return_in:     { label: 'Client Return',  color: 'text-emerald-600', icon: ArrowUpCircle },
    return_out:    { label: 'Supplier Return',color: 'text-red-600',     icon: ArrowDownCircle },
    write_off:     { label: 'Write-Off',      color: 'text-red-600',     icon: XCircle },
    transfer_in:   { label: 'Transfer In',    color: 'text-blue-600',    icon: ArrowUpCircle },
    transfer_out:  { label: 'Transfer Out',   color: 'text-orange-600',  icon: ArrowDownCircle },
};

export default function InventoryMovements({ product, movements }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Inventory', href: '/inventory' },
        { title: product.name, href: `/inventory/products/${product.id}/movements` },
    ];

    const [adjustOpen, setAdjustOpen] = useState(false);
    const [adjustType, setAdjustType] = useState('adjustment');
    const [newQty,     setNewQty]     = useState(String(product.stock_qty));
    const [reason,     setReason]     = useState('');
    const [saving,     setSaving]     = useState(false);

    const delta = parseInt(newQty || '0') - product.stock_qty;

    function submitAdjustment() {
        setSaving(true);
        router.post(`/inventory/products/${product.id}/adjust`, {
            new_quantity: newQty,
            type: adjustType,
            reason,
        }, {
            onSuccess: () => { setAdjustOpen(false); setSaving(false); setReason(''); },
            onFinish: () => setSaving(false),
            preserveScroll: true,
        });
    }

    const stockBadge = product.stock_qty <= 0
        ? 'bg-red-50 text-red-700 ring-red-200'
        : product.reorder_point > 0 && product.stock_qty <= product.reorder_point
        ? 'bg-amber-50 text-amber-700 ring-amber-200'
        : 'bg-emerald-50 text-emerald-700 ring-emerald-200';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${product.name} — Stock Ledger`} />
            <div className="space-y-5 p-6">

                {/* Header */}
                <div className="bg-card border border-border rounded-xl p-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Package className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-lg font-bold">{product.name}</h1>
                            <p className="text-xs text-muted-foreground font-mono">
                                {product.sku}{product.barcode ? ` · ${product.barcode}` : ''}
                                {product.supplier ? ` · ${product.supplier.name}` : ''}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={cn('inline-flex items-center gap-1.5 text-sm font-bold px-3 py-1.5 rounded-full ring-1', stockBadge)}>
                            {product.stock_qty} {product.unit ?? 'units'}
                        </span>
                        <Button size="sm" onClick={() => setAdjustOpen(true)} className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                            <RefreshCw className="h-3.5 w-3.5" /> Adjust Stock
                        </Button>
                    </div>
                </div>

                {/* Movement ledger */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Movement History</p>
                    </div>
                    {movements.data.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No stock movements recorded yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    {['Date', 'Type', 'Quantity', 'Balance After', 'Unit Cost', 'Reference', 'Notes', 'By'].map(h => (
                                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {movements.data.map(m => {
                                    const cfg = MOVEMENT_CONFIG[m.type] ?? MOVEMENT_CONFIG.adjustment;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={m.id} className="hover:bg-muted/10">
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(m.created_at), 'MMM d, yyyy HH:mm')}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={cn('inline-flex items-center gap-1 text-xs font-medium', cfg.color)}>
                                                    <Icon className="h-3.5 w-3.5" /> {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={cn('text-xs font-bold tabular-nums', m.quantity > 0 ? 'text-emerald-600' : 'text-red-600')}>
                                                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-mono font-semibold">{m.quantity_after}</td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">
                                                {m.unit_cost ? `${product.currency} ${Number(m.unit_cost).toFixed(2)}` : '—'}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{m.reference ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground max-w-xs truncate">{m.notes ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.creator?.name ?? 'System'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Adjustment modal */}
            {adjustOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Adjust Stock — {product.name}</h2>
                            <button onClick={() => setAdjustOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adjustment Type</label>
                                <select value={adjustType} onChange={e => setAdjustType(e.target.value)}
                                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                    <option value="adjustment">Stocktake Correction</option>
                                    <option value="write_off">Write-Off (damaged/expired/lost)</option>
                                    <option value="return_in">Client Return</option>
                                    <option value="return_out">Return to Supplier</option>
                                    <option value="transfer_in">Transfer In</option>
                                    <option value="transfer_out">Transfer Out</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                    New Quantity <span className="text-muted-foreground/60 normal-case">(current: {product.stock_qty})</span>
                                </label>
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => setNewQty(String(Math.max(0, parseInt(newQty || '0') - 1)))}>
                                        <Minus className="h-3.5 w-3.5" />
                                    </Button>
                                    <Input type="number" min="0" value={newQty} onChange={e => setNewQty(e.target.value)} className="text-center" />
                                    <Button size="sm" variant="outline" onClick={() => setNewQty(String(parseInt(newQty || '0') + 1))}>
                                        <Plus className="h-3.5 w-3.5" />
                                    </Button>
                                </div>
                                {delta !== 0 && (
                                    <p className={cn('text-xs font-medium', delta > 0 ? 'text-emerald-600' : 'text-red-600')}>
                                        {delta > 0 ? '+' : ''}{delta} units
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</label>
                                <Textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
                                    placeholder="e.g. Physical stocktake on 20 Jun found 3 fewer units" />
                            </div>
                        </div>
                        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setAdjustOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={submitAdjustment} disabled={saving || !reason.trim() || delta === 0}
                                className="bg-amber-500 hover:bg-amber-600 text-white">
                                {saving ? 'Saving…' : 'Apply Adjustment'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
