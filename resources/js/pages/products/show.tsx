import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { useDeleteConfirmation } from '@/components/ui/confirm-dialog';
import { Package, Edit, ShoppingCart, Trash2, Tag, CheckCircle2, CreditCard, CircleDollarSign, MapPin, ClipboardList, Clock, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const fmt = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

const fmtDate = (d?: string | null) =>
    d ? format(new Date(d), 'MMM d, yyyy') : '—';

const STATUS_PILL: Record<string, string> = {
    draft: 'bg-slate-50 text-slate-600 ring-slate-200',
    sent: 'bg-blue-50 text-blue-700 ring-blue-200',
    confirmed: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
    partially_delivered: 'bg-amber-50 text-amber-700 ring-amber-200',
    delivered: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    cancelled: 'bg-red-50 text-red-600 ring-red-200',
};

interface Props {
    product: any;
    recentOrders: any[];
}

export default function ProductShow({ product, recentOrders }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Products', href: '/products' },
        { title: product?.name ?? 'Product', href: `/products/${product?.id}` },
    ];

    const margin = product?.unit_cost > 0
        ? Math.round(((product.unit_price - product.unit_cost) / product.unit_cost) * 100)
        : 0;

    const { confirmDelete, ConfirmDialog } = useDeleteConfirmation();

    const handleDelete = () => confirmDelete({
        itemName: product.name,
        onConfirm: async () => {
            await router.delete(`/products/${product.id}`);
            router.visit('/products');
        },
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={product?.name ?? 'Product'} />
            <ConfirmDialog />

            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <Package className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h1 className="text-xl font-bold tracking-tight">{product?.name}</h1>
                                    <div className="flex items-center gap-2 flex-wrap mt-0.5 text-sm text-muted-foreground">
                                        <span className="font-medium">SKU:</span> {product?.sku || '—'}
                                        <span className="text-muted-foreground/40">·</span>
                                        <span>{product?.category || 'Uncategorized'}</span>
                                        <span className="text-muted-foreground/40">·</span>
                                        <span>{product.active ? 'Active' : 'Inactive'}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" variant="outline" asChild>
                                    <Link href={`/products/${product.id}/edit`}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                    </Link>
                                </Button>
                                <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                                    <Link href={`/purchase-orders/create?product_id=${product.id}`}>
                                        <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> New PO
                                    </Link>
                                </Button>
                                <Button variant="outline" size="sm" className="text-destructive border-destructive" onClick={handleDelete}>
                                    <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Delete
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="flex divide-x divide-border/60 border-t border-border bg-muted/20">
                        {[
                            { label: 'Cost Price', value: fmt(product.unit_cost ?? 0), icon: CircleDollarSign },
                            { label: 'Selling Price', value: fmt(product.unit_price ?? 0), icon: CreditCard },
                            { label: 'Margin', value: `${margin}%`, icon: TrendingUp },
                            { label: 'Stock', value: product.stock_qty ?? 0, icon: ClipboardList },
                            { label: 'Unit', value: product.unit ?? 'pcs', icon: Tag },
                        ].map((item, index) => (
                            <div key={index} className="flex-1 px-4 py-2.5 min-w-0">
                                <div className="flex items-center gap-1 mb-0.5 text-muted-foreground text-xs">
                                    <item.icon className="h-3 w-3" /> {item.label}
                                </div>
                                <p className="record-field-value truncate font-medium">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-auto bg-background p-6 space-y-5">
                    <div className="grid lg:grid-cols-3 gap-5">
                        <div className="lg:col-span-2 bg-card border border-border rounded-lg p-5">
                            <h2 className="text-sm font-semibold mb-3">Product Details</h2>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div><span className="font-medium text-foreground">Description</span><p className="mt-1 text-sm text-foreground whitespace-pre-wrap">{product.description || 'No description provided.'}</p></div>
                                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div><span className="font-medium">Supplier</span><br />{product.supplier ? <Link href={`/suppliers/${product.supplier.id}`} className="text-primary hover:underline">{product.supplier.name}</Link> : 'No supplier'}</div>
                                    <div><span className="font-medium">Category</span><br />{product.category || '—'}</div>
                                    <div><span className="font-medium">SKU</span><br />{product.sku || '—'}</div>
                                    <div><span className="font-medium">Active</span><br />{product.active ? 'Yes' : 'No'}</div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-card border border-border rounded-lg p-5">
                                <h3 className="text-sm font-semibold mb-2">Metadata</h3>
                                {product.metadata && Object.keys(product.metadata).length > 0 ? (
                                    <ul className="text-sm text-muted-foreground space-y-1">
                                        {Object.entries(product.metadata).map(([key, value]) => (
                                            <li key={key}><span className="font-medium text-foreground">{key}:</span> {String(value)}</li>
                                        ))}
                                    </ul>
                                ) : (
                                    <p className="text-sm text-muted-foreground">No metadata available.</p>
                                )}
                            </div>
                            <div className="bg-card border border-border rounded-lg p-5">
                                <h3 className="text-sm font-semibold mb-2">Key Dates</h3>
                                <div className="text-sm text-muted-foreground space-y-1">
                                    <div className="flex justify-between"><span>Created</span><span>{fmtDate(product.created_at)}</span></div>
                                    <div className="flex justify-between"><span>Updated</span><span>{fmtDate(product.updated_at)}</span></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-card border border-border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                            <h2 className="text-sm font-semibold">Recent Purchase Orders</h2>
                            <Button size="sm" variant="outline" asChild>
                                <Link href={`/purchase-orders/create?supplier_id=${product.supplier?.id ?? ''}`}>
                                    <ShoppingCart className="h-3 w-3 mr-1" /> New PO
                                </Link>
                            </Button>
                        </div>

                        {recentOrders.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">No purchase orders yet for this supplier.</p>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/20 border-b border-border">
                                        {['#', 'Supplier order', 'Date', 'Total', 'Status'].map((h, i) => (
                                            <th key={h} className={cn('px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground', i === 3 && 'text-right', i === 4 && 'text-center')}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {recentOrders.map((order: any) => (
                                        <tr key={order.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="px-4 py-2.5 font-mono text-xs text-muted-foreground">{order.number || `#${order.id}`}</td>
                                            <td className="px-4 py-2.5">
                                                <Link href={`/purchase-orders/${order.id}`} className="text-primary hover:underline">{order.client?.company || order.client?.name || '—'}</Link>
                                            </td>
                                            <td className="px-4 py-2.5 text-muted-foreground text-xs">{fmtDate(order.created_at)}</td>
                                            <td className="px-4 py-2.5 text-right font-medium">{fmt(order.total ?? 0, order.currency ?? 'USD')}</td>
                                            <td className="px-4 py-2.5 text-center">
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', STATUS_PILL[order.status] ?? 'bg-slate-50 text-slate-600 ring-slate-200')}>
                                                    {order.status?.replace(/_/g, ' ') || '—'}
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
