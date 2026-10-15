/**
 * suppliers/show.tsx — Amber Obsidian redesign
 * All router.* calls and Link hrefs preserved exactly.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Mail, Phone, Globe, MapPin, Star, Edit, Package, ShoppingCart, Plus, TrendingUp, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const fmt     = (n: number, c = 'USD') => new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);
const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');

const PO_PILL: Record<string, string> = {
    draft: 'bg-slate-50 text-slate-600 ring-slate-200',
    sent: 'bg-blue-50 text-blue-700 ring-blue-200',
    confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-red-50 text-red-600 ring-red-200',
};

interface Props {
    supplier: any;
    products: any[];
    recentOrders: any[];
    stats: { total_orders: number; total_spent: number; products_count: number; pending_orders: number };
}

export default function SupplierShow({ supplier, products, recentOrders, stats }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Suppliers', href: '/suppliers' },
        { title: supplier.name, href: `/suppliers/${supplier.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={supplier.name} />
            <div className="flex flex-col h-full">

                {/* SF record header */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="h-6 w-6 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <h1 className="text-xl font-bold tracking-tight">{supplier.name}</h1>
                                        {supplier.category && (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted ring-1 ring-border text-muted-foreground">{supplier.category}</span>
                                        )}
                                        {!supplier.active && (
                                            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">Inactive</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                                        {supplier.contact_person && <span>{supplier.contact_person}</span>}
                                        {supplier.rating > 0 && (
                                            <span className="flex items-center gap-1 text-amber-600">
                                                <Star className="h-3 w-3 fill-current" /> {supplier.rating}/5
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <Button variant="outline" size="sm" asChild>
                                    <Link href={`/suppliers/${supplier.id}/edit`}><Edit className="h-3.5 w-3.5 mr-1.5" /> Edit</Link>
                                </Button>
                                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                    <Link href={`/purchase-orders/create?supplier_id=${supplier.id}`}>
                                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> New PO
                                    </Link>
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* KPI strip */}
                    <div className="flex divide-x divide-border/60 border-t border-border bg-muted/20">
                        {[
                            { label: 'Total Orders',  value: stats.total_orders,     color: 'text-foreground' },
                            { label: 'Total Spent',   value: fmt(stats.total_spent), color: 'text-foreground' },
                            { label: 'Products',      value: stats.products_count,   color: 'text-primary' },
                            { label: 'Pending POs',   value: stats.pending_orders,   color: stats.pending_orders > 0 ? 'text-amber-600' : 'text-foreground' },
                        ].map((c, i) => (
                            <div key={i} className="flex-1 px-5 py-2.5">
                                <p className={cn('text-lg font-bold tabular-nums', c.color)}>{c.value}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">{c.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-background p-6 space-y-5">
                    <div className="grid lg:grid-cols-3 gap-5">
                        {/* Contact info */}
                        <div className="bg-card border border-border rounded-lg p-5">
                            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contact Info</h2>
                            <div className="space-y-2 text-sm">
                                {supplier.email && <a href={`mailto:${supplier.email}`} className="flex items-center gap-2 hover:text-primary transition-colors text-muted-foreground"><Mail className="h-3.5 w-3.5 flex-shrink-0" />{supplier.email}</a>}
                                {supplier.phone && <a href={`tel:${supplier.phone}`} className="flex items-center gap-2 hover:text-primary transition-colors text-muted-foreground"><Phone className="h-3.5 w-3.5 flex-shrink-0" />{supplier.phone}</a>}
                                {supplier.website && <a href={supplier.website} target="_blank" className="flex items-center gap-2 hover:text-primary transition-colors text-muted-foreground text-xs break-all"><Globe className="h-3.5 w-3.5 flex-shrink-0" />{supplier.website}</a>}
                                {supplier.address && <p className="flex items-start gap-2 text-muted-foreground text-xs"><MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />{supplier.address}</p>}
                                {supplier.payment_terms && (
                                    <div className="pt-2 border-t border-border">
                                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Payment Terms</p>
                                        <p className="text-sm mt-0.5">{supplier.payment_terms}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Products */}
                        <div className="lg:col-span-2 bg-card border border-border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                                <h2 className="text-sm font-semibold">Products / Catalog</h2>
                                <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                                    <Link href={`/products/create?supplier_id=${supplier.id}`}><Plus className="h-3 w-3" /> Add Product</Link>
                                </Button>
                            </div>
                            {products.length === 0 ? (
                                <p className="text-sm text-muted-foreground text-center py-8">No products catalogued for this supplier</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="bg-muted/20 border-b border-border">
                                            {['Name', 'SKU', 'Cost', 'Price', 'Margin'].map((h, i) => (
                                                <th key={h} className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground', i >= 2 && 'text-right')}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {products.map((p: any) => {
                                            const margin = p.unit_cost > 0 ? Math.round((p.unit_price - p.unit_cost) / p.unit_cost * 100) : 0;
                                            return (
                                                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                                                    <td className="px-4 py-2.5"><Link href={`/products/${p.id}`} className="text-primary hover:underline font-medium">{p.name}</Link></td>
                                                    <td className="px-4 py-2.5 text-muted-foreground font-mono text-xs">{p.sku || '—'}</td>
                                                    <td className="px-4 py-2.5 text-right text-xs">{fmt(p.unit_cost)}</td>
                                                    <td className="px-4 py-2.5 text-right text-xs font-medium">{fmt(p.unit_price)}</td>
                                                    <td className="px-4 py-2.5 text-right">
                                                        <span className={cn('flex items-center justify-end gap-0.5 text-xs font-medium', margin >= 0 ? 'text-emerald-600' : 'text-red-600')}>
                                                            <TrendingUp className="h-3 w-3" />{margin}%
                                                        </span>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Recent orders */}
                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                            <h2 className="text-sm font-semibold">Recent Purchase Orders</h2>
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                                <Link href={`/purchase-orders/create?supplier_id=${supplier.id}`}><Plus className="h-3 w-3" /> New PO</Link>
                            </Button>
                        </div>
                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No purchase orders yet</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/20 border-b border-border">
                                        {['Number', 'Client', 'Date', 'Total', 'Status'].map((h, i) => (
                                            <th key={h} className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground', i === 3 && 'text-right', i === 4 && 'text-center')}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {recentOrders.map((o: any) => (
                                        <tr key={o.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-2.5"><Link href={`/purchase-orders/${o.id}`} className="text-primary hover:underline font-medium font-mono">{o.number}</Link></td>
                                            <td className="px-4 py-2.5 text-muted-foreground">{o.client?.company || o.client?.name || '—'}</td>
                                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{o.order_date ? fmtDate(o.order_date) : '—'}</td>
                                            <td className="px-4 py-2.5 text-right font-medium tabular-nums">{fmt(o.total, o.currency)}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', PO_PILL[o.status] ?? PO_PILL.draft)}>
                                                    {o.status.replace(/_/g, ' ')}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}