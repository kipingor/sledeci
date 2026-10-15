import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type BreadcrumbItem } from '@/types';
import { Plus, Search, Mail, Phone, Star, Package, ShoppingCart, Building2, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Suppliers', href: '/suppliers' }];

interface Props {
    suppliers: { data: any[]; total: number; current_page: number; last_page: number };
    categories: string[];
}

function avCls(name: string) {
    const p = ['bg-amber-100 text-amber-800','bg-sky-100 text-sky-800','bg-emerald-100 text-emerald-800','bg-violet-100 text-violet-800'];
    return p[name.charCodeAt(0) % p.length];
}

export default function SuppliersIndex({ suppliers, categories }: Props) {
    const [search, setSearch] = useState('');

    function doSearch(q: string) {
        setSearch(q);
        router.get('/suppliers', q ? { search: q } : {}, { preserveState: true, preserveScroll: true });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Suppliers" />
            <div className="flex flex-col h-full">

                {/* Header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Suppliers</h1>
                                <p className="text-xs text-muted-foreground">{suppliers.total} suppliers</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/suppliers/create"><Plus className="h-3.5 w-3.5" /> Add Supplier</Link>
                        </Button>
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-2 px-4 py-2">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input placeholder="Search suppliers…" className="pl-8 h-7 text-xs" value={search} onChange={e => doSearch(e.target.value)} />
                        </div>
                        <Select onValueChange={v => router.get('/suppliers', v ? { category: v } : {}, { preserveState: true })}>
                            <SelectTrigger className="h-7 text-xs w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
                            <SelectContent>
                                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['Supplier', 'Contact Person', 'Email / Phone', 'Category', 'Products', 'POs', 'Rating', ''].map(h => (
                                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {suppliers.data.length === 0 && (
                                <tr><td colSpan={8} className="py-20 text-center text-muted-foreground">
                                    <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No suppliers yet</p>
                                    <Button size="sm" className="mt-4" asChild><Link href="/suppliers/create">Add Supplier</Link></Button>
                                </td></tr>
                            )}
                            {suppliers.data.map((s: any) => (
                                <tr key={s.id} className="group hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => router.visit(`/suppliers/${s.id}`)}>
                                    <td className="px-4 py-2.5">
                                        <div className="flex items-center gap-2.5">
                                            <Avatar className="h-7 w-7 shrink-0">
                                                <AvatarFallback className={cn('text-[11px] font-bold', avCls(s.name))}>
                                                    {s.name.slice(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="font-medium text-sm group-hover:text-primary transition-colors">{s.name}</p>
                                                {!s.active && <span className="text-[10px] text-red-600 font-medium">Inactive</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5"><span className="text-xs text-muted-foreground">{s.contact_person ?? '—'}</span></td>
                                    <td className="px-4 py-2.5">
                                        <div className="space-y-0.5">
                                            {s.email && <a href={`mailto:${s.email}`} onClick={e => e.stopPropagation()} className="text-xs text-primary hover:underline flex items-center gap-1"><Mail className="h-3 w-3" />{s.email}</a>}
                                            {s.phone && <span className="text-xs text-muted-foreground flex items-center gap-1"><Phone className="h-3 w-3" />{s.phone}</span>}
                                        </div>
                                    </td>
                                    <td className="px-4 py-2.5">
                                        {s.category
                                            ? <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-muted ring-1 ring-border text-muted-foreground">{s.category}</span>
                                            : <span className="text-xs text-muted-foreground/30">—</span>}
                                    </td>
                                    <td className="px-4 py-2.5"><span className="text-xs text-muted-foreground flex items-center gap-1"><Package className="h-3 w-3" />{s.products_count}</span></td>
                                    <td className="px-4 py-2.5"><span className="text-xs text-muted-foreground flex items-center gap-1"><ShoppingCart className="h-3 w-3" />{s.orders_count}</span></td>
                                    <td className="px-4 py-2.5">
                                        {s.rating > 0
                                            ? <span className="text-xs font-medium text-amber-600 flex items-center gap-0.5"><Star className="h-3 w-3 fill-current" />{s.rating}</span>
                                            : <span className="text-xs text-muted-foreground/30">—</span>}
                                    </td>
                                    <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                                    <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                                </button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="w-36 text-sm">
                                                <DropdownMenuItem onClick={() => router.visit(`/suppliers/${s.id}`)}>View</DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => router.visit(`/suppliers/${s.id}/edit`)}>Edit</DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}