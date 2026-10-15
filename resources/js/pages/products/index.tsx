import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Package, Plus, Search, AlertTriangle, XCircle, ScanLine, Barcode } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Products', href: '/products' }];

interface Product {
    id: number; name: string; sku: string; barcode: string | null;
    category: string | null; unit: string | null;
    unit_cost: number; unit_price: number; currency: string;
    stock_qty: number; reorder_point: number;
    active: boolean;
    supplier: { id: number; name: string } | null;
}

interface Props {
    products: { data: Product[]; links: any[]; current_page: number; last_page: number; total: number };
    filters: { search?: string; category?: string; stock_status?: string };
    categories: string[];
}

// ── Currency-aware formatter (the actual bug fix) ──────────────────────────────
function fmt(amount: number, currency: string): string {
    try {
        return new Intl.NumberFormat('en-KE', {
            style: 'currency',
            currency: currency || 'KES',
            maximumFractionDigits: 2,
        }).format(amount);
    } catch {
        // Fallback if an unsupported currency code slips through
        return `${currency} ${amount.toFixed(2)}`;
    }
}

function stockStatus(product: Product): { label: string; pill: string; icon: React.ElementType } {
    if (product.stock_qty <= 0) {
        return { label: 'Out of Stock', pill: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-950/30 dark:text-red-300', icon: XCircle };
    }
    if (product.reorder_point > 0 && product.stock_qty <= product.reorder_point) {
        return { label: 'Low Stock', pill: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300', icon: AlertTriangle };
    }
    return { label: 'In Stock', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300', icon: Package };
}

export default function ProductsIndex({ products, filters, categories }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [category, setCategory] = useState(filters.category ?? '');
    const [stockStatusFilter, setStockStatusFilter] = useState(filters.stock_status ?? '');
    const [scanOpen, setScanOpen] = useState(false);
    const [scanQuery, setScanQuery] = useState('');

    function applyFilters(overrides: Record<string, string> = {}) {
        router.get('/products', {
            search:       overrides.search       ?? search,
            category:     overrides.category     ?? category,
            stock_status: overrides.stock_status ?? stockStatusFilter,
        }, { preserveState: true, preserveScroll: true });
    }

    async function handleScanLookup() {
        if (!scanQuery.trim()) return;
        const res = await fetch(`/inventory/lookup?q=${encodeURIComponent(scanQuery)}`);
        if (res.ok) {
            const { product } = await res.json();
            if (product) router.visit(`/products/${product.id}`);
        }
        setScanOpen(false);
        setScanQuery('');
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Products" />
            <div className="flex flex-col h-full">

                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                            <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base font-bold tracking-tight">Products</h1>
                            <p className="text-xs text-muted-foreground">{products.total} items in catalog</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setScanOpen(true)} className="gap-1.5">
                            <ScanLine className="h-3.5 w-3.5" /> Scan
                        </Button>
                        <Link href="/products/create">
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                <Plus className="h-3.5 w-3.5" /> New Product
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Filters */}
                <div className="px-4 py-2.5 border-b border-border flex flex-wrap gap-2 items-center bg-card">
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        <Input placeholder="Search name, SKU, barcode…" className="pl-8 h-8 text-xs w-56"
                            value={search} onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && applyFilters()} />
                    </div>
                    <select value={category} onChange={e => { setCategory(e.target.value); applyFilters({ category: e.target.value }); }}
                        className="h-8 text-xs rounded-md border border-input bg-background px-2">
                        <option value="">All categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>

                    {/* Stock status tabs */}
                    <div className="flex gap-1 ml-auto">
                        {[
                            { value: '',           label: 'All' },
                            { value: 'low_stock',  label: 'Low Stock' },
                            { value: 'out_of_stock', label: 'Out of Stock' },
                        ].map(tab => (
                            <button key={tab.value}
                                onClick={() => { setStockStatusFilter(tab.value); applyFilters({ stock_status: tab.value }); }}
                                className={cn(
                                    'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                                    stockStatusFilter === tab.value
                                        ? 'bg-amber-500 text-white'
                                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                                )}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['Product', 'SKU / Barcode', 'Category', 'Supplier', 'Stock', 'Unit Price', ''].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {products.data.length === 0 && (
                                <tr><td colSpan={7} className="py-16 text-center text-muted-foreground">
                                    <Package className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                    No products found.
                                </td></tr>
                            )}
                            {products.data.map(p => {
                                const stock = stockStatus(p);
                                const StockIcon = stock.icon;
                                return (
                                    <tr key={p.id} className="group hover:bg-muted/30 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <Link href={`/products/${p.id}`} className="font-medium hover:text-amber-600 transition-colors">
                                                {p.name}
                                            </Link>
                                            {!p.active && <span className="ml-2 text-[10px] text-muted-foreground">(inactive)</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <p className="text-xs font-mono text-muted-foreground">{p.sku}</p>
                                            {p.barcode && (
                                                <p className="text-[10px] font-mono text-muted-foreground/60 flex items-center gap-1 mt-0.5">
                                                    <Barcode className="h-2.5 w-2.5" /> {p.barcode}
                                                </p>
                                            )}
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.category ?? '—'}</td>
                                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{p.supplier?.name ?? '—'}</td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2">
                                                <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ring-1', stock.pill)}>
                                                    <StockIcon className="h-3 w-3" />
                                                    {p.stock_qty} {p.unit ?? 'units'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-sm font-semibold tabular-nums">
                                            {fmt(p.unit_price, p.currency)}
                                        </td>
                                        <td className="px-3 py-2.5">
                                            <Link href={`/inventory/products/${p.id}/movements`}
                                                className="opacity-0 group-hover:opacity-100 text-xs text-primary hover:underline transition-opacity">
                                                Ledger
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {products.last_page > 1 && (
                    <div className="flex items-center justify-center gap-1 px-6 py-2.5 border-t border-border bg-card">
                        {products.links?.map((link: any, i: number) => (
                            link.url ? (
                                <Link key={i} href={link.url}
                                    className={cn('px-3 py-1 rounded text-xs border transition-colors',
                                        link.active ? 'bg-primary text-primary-foreground border-primary' : 'border-border text-muted-foreground hover:bg-muted')}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ) : (
                                <span key={i} className="px-3 py-1 rounded text-xs border border-border text-muted-foreground opacity-40"
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            )
                        ))}
                    </div>
                )}
            </div>

            {/* Scan modal */}
            {scanOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl p-5 space-y-4">
                        <p className="text-sm font-semibold flex items-center gap-2">
                            <ScanLine className="h-4 w-4 text-amber-500" /> Scan Barcode / SKU
                        </p>
                        <Input autoFocus placeholder="Scan or type barcode…" value={scanQuery}
                            onChange={e => setScanQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleScanLookup()} />
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setScanOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={handleScanLookup} className="bg-amber-500 hover:bg-amber-600 text-white">
                                Look up
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
