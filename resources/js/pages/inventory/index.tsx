/**
 * inventory/index.tsx — Inventory Dashboard
 *
 * Central hub for stock health: low-stock alerts, out-of-stock items,
 * total stock value, and a live feed of recent movements.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import {
    Package, AlertTriangle, XCircle, TrendingUp, TrendingDown,
    ArrowUpCircle, ArrowDownCircle, RefreshCw, ClipboardList,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Inventory', href: '/inventory' }];

interface Product {
    id: number; name: string; sku: string; stock_qty: number;
    reorder_point: number; reorder_qty: number; currency: string;
    supplier: { id: number; name: string } | null;
}

interface Movement {
    id: number; type: string; quantity: number; quantity_after: number;
    reference: string | null; created_at: string;
    product: { id: number; name: string; sku: string };
    creator: { id: number; name: string } | null;
}

interface Stats {
    total_products: number; low_stock_count: number;
    out_of_stock: number; total_value: number;
}

interface Props {
    lowStock: Product[];
    outOfStock: Product[];
    recentMovements: Movement[];
    stats: Stats;
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

const fmt = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);

export default function InventoryIndex({ lowStock, outOfStock, recentMovements, stats }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Inventory" />
            <div className="space-y-5 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">Inventory</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Stock levels, movements, and reorder alerts</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/inventory/valuation">
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors">
                                <ClipboardList className="h-3.5 w-3.5" /> Valuation Report
                            </span>
                        </Link>
                    </div>
                </div>

                {/* Stat cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                        { label: 'Active Products', value: stats.total_products, icon: Package,       color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
                        { label: 'Low Stock',       value: stats.low_stock_count, icon: AlertTriangle, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
                        { label: 'Out of Stock',    value: stats.out_of_stock,   icon: XCircle,        color: 'text-red-600 bg-red-50 dark:bg-red-950/30' },
                        { label: 'Total Stock Value', value: fmt(stats.total_value), icon: TrendingUp, color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
                    ].map(card => (
                        <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                            <div className={cn('inline-flex p-1.5 rounded-lg mb-2', card.color)}>
                                <card.icon className="h-4 w-4" />
                            </div>
                            <p className="text-xl font-bold tabular-nums">{card.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

                    {/* Low stock alerts */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-amber-50/50 dark:bg-amber-950/10 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                            <p className="text-sm font-semibold">Low Stock — Reorder Needed</p>
                        </div>
                        {lowStock.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">All products are above their reorder point. 🎉</p>
                        ) : (
                            <div className="divide-y divide-border">
                                {lowStock.map(p => (
                                    <Link key={p.id} href={`/products/${p.id}`}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                                        <div>
                                            <p className="text-sm font-medium">{p.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{p.sku}{p.supplier ? ` · ${p.supplier.name}` : ''}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm font-bold text-amber-600">{p.stock_qty} left</p>
                                            <p className="text-xs text-muted-foreground">reorder at {p.reorder_point} → order {p.reorder_qty}</p>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Out of stock */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-red-50/50 dark:bg-red-950/10 flex items-center gap-2">
                            <XCircle className="h-4 w-4 text-red-500" />
                            <p className="text-sm font-semibold">Out of Stock</p>
                        </div>
                        {outOfStock.length === 0 ? (
                            <p className="p-8 text-center text-sm text-muted-foreground">No products are out of stock.</p>
                        ) : (
                            <div className="divide-y divide-border">
                                {outOfStock.map(p => (
                                    <Link key={p.id} href={`/products/${p.id}`}
                                        className="flex items-center justify-between px-5 py-3 hover:bg-muted/30 transition-colors">
                                        <div>
                                            <p className="text-sm font-medium">{p.name}</p>
                                            <p className="text-xs text-muted-foreground font-mono">{p.sku}{p.supplier ? ` · ${p.supplier.name}` : ''}</p>
                                        </div>
                                        <span className="text-xs font-semibold text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-full">
                                            0 units
                                        </span>
                                    </Link>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Recent movements feed */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Recent Stock Movements</p>
                    </div>
                    {recentMovements.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No stock movements yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    {['Date', 'Product', 'Type', 'Qty', 'Balance', 'Reference', 'By'].map(h => (
                                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {recentMovements.map(m => {
                                    const cfg = MOVEMENT_CONFIG[m.type] ?? MOVEMENT_CONFIG.adjustment;
                                    const Icon = cfg.icon;
                                    return (
                                        <tr key={m.id} className="hover:bg-muted/10">
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(m.created_at), 'MMM d, HH:mm')}
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <Link href={`/products/${m.product.id}`} className="font-medium hover:text-amber-600 transition-colors">
                                                    {m.product.name}
                                                </Link>
                                                <p className="text-xs text-muted-foreground font-mono">{m.product.sku}</p>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={cn('inline-flex items-center gap-1 text-xs font-medium', cfg.color)}>
                                                    <Icon className="h-3.5 w-3.5" /> {cfg.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5">
                                                <span className={cn('text-xs font-semibold tabular-nums', m.quantity > 0 ? 'text-emerald-600' : 'text-red-600')}>
                                                    {m.quantity > 0 ? '+' : ''}{m.quantity}
                                                </span>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{m.quantity_after}</td>
                                            <td className="px-4 py-2.5 text-xs font-mono text-muted-foreground">{m.reference ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{m.creator?.name ?? 'System'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
