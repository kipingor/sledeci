import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { type BreadcrumbItem } from '@/types';
import {
    Plus, Search, Building2, Phone, FolderOpen,
    FileText, MoreHorizontal, Users, TrendingUp, ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Clients', href: '/clients' }];

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(n);

interface Client {
    id: number; name: string; email: string; company: string | null;
    phone: string | null; client_since: string | null;
    projects_count: number; invoices_count: number; total_billed: number | null;
}

interface Props {
    clients: { data: Client[]; total: number; last_page: number; current_page: number };
    stats: { total: number; new_month: number; active: number };
}

// Generates a consistent color from a name string
function nameColor(name: string): string {
    const colors = [
        'bg-amber-100 text-amber-800',
        'bg-violet-100 text-violet-800',
        'bg-sky-100 text-sky-800',
        'bg-emerald-100 text-emerald-800',
        'bg-rose-100 text-rose-800',
        'bg-blue-100 text-blue-800',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

export default function ClientsIndex({ clients, stats }: Props) {
    const [search, setSearch] = useState('');

    function doSearch(q: string) {
        setSearch(q);
        router.get('/clients', q ? { search: q } : {}, { preserveState: true, preserveScroll: true });
    }

    const statCards = [
        { label: 'Total Clients',     value: stats.total,     color: 'text-foreground',  icon: Users },
        { label: 'New This Month',    value: stats.new_month, color: 'text-emerald-600', icon: TrendingUp },
        { label: 'Active Projects',   value: stats.active,    color: 'text-primary',     icon: FolderOpen },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Clients" />
            <div className="flex flex-col h-full">

                {/* ── Header ── */}
                <div className="bg-card border-b border-border">
                    {/* Title bar */}
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Building2 className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Clients</h1>
                                <p className="text-xs text-muted-foreground">
                                    {clients.total} client{clients.total !== 1 ? 's' : ''}
                                </p>
                            </div>
                        </div>
                        <Button
                            size="sm"
                            className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            asChild
                        >
                            <Link href="/clients/create">
                                <Plus className="h-3.5 w-3.5" /> New Client
                            </Link>
                        </Button>
                    </div>

                    {/* Stats strip */}
                    <div className="flex divide-x divide-border/60 border-b border-border/60">
                        {statCards.map(s => (
                            <div key={s.label} className="flex-1 px-5 py-2.5 flex items-center gap-2.5">
                                <div className="h-7 w-7 rounded-md bg-muted flex items-center justify-center shrink-0">
                                    <s.icon className="h-3.5 w-3.5 text-muted-foreground" />
                                </div>
                                <div>
                                    <p className={cn('text-xl font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Search bar */}
                    <div className="px-4 py-2">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                placeholder="Search clients…"
                                className="pl-8 h-7 text-xs"
                                value={search}
                                onChange={e => doSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['Client', 'Company', 'Contact', 'Projects', 'Invoices', 'Total Billed', 'Since', ''].map(h => (
                                    <th
                                        key={h}
                                        className={cn(
                                            'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                                            h === '' && 'w-10',
                                            h === 'Total Billed' && 'text-right',
                                        )}
                                    >
                                        {h}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {clients.data.length === 0 && (
                                <tr>
                                    <td colSpan={8} className="py-20 text-center text-muted-foreground">
                                        <Building2 className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                        <p className="font-medium">No clients found</p>
                                        <p className="text-xs mt-1 opacity-70">Add your first client or convert a won opportunity</p>
                                        <Button size="sm" className="mt-4" asChild>
                                            <Link href="/clients/create">Add Client</Link>
                                        </Button>
                                    </td>
                                </tr>
                            )}
                            {clients.data.map(c => {
                                const avatarCls = nameColor(c.name);
                                return (
                                    <tr
                                        key={c.id}
                                        className="group hover:bg-muted/40 transition-colors cursor-pointer"
                                        onClick={() => router.visit(`/clients/${c.id}`)}
                                    >
                                        {/* Client name + avatar */}
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-2.5">
                                                <Avatar className="h-7 w-7 shrink-0">
                                                    <AvatarFallback className={cn('text-[11px] font-semibold', avatarCls)}>
                                                        {c.name.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div>
                                                    <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors">
                                                        {c.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">{c.email}</p>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Company */}
                                        <td className="px-4 py-2.5">
                                            {c.company
                                                ? <span className="text-xs text-muted-foreground">{c.company}</span>
                                                : <span className="text-xs text-muted-foreground/30">—</span>}
                                        </td>

                                        {/* Phone */}
                                        <td className="px-4 py-2.5">
                                            {c.phone
                                                ? <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Phone className="h-3 w-3" />{c.phone}
                                                  </span>
                                                : <span className="text-xs text-muted-foreground/30">—</span>}
                                        </td>

                                        {/* Projects count */}
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <FolderOpen className="h-3 w-3" />
                                                {c.projects_count}
                                            </span>
                                        </td>

                                        {/* Invoices count */}
                                        <td className="px-4 py-2.5">
                                            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                                <FileText className="h-3 w-3" />
                                                {c.invoices_count}
                                            </span>
                                        </td>

                                        {/* Total billed */}
                                        <td className="px-4 py-2.5 text-right">
                                            {c.total_billed
                                                ? <span className="text-xs font-semibold text-emerald-700">{fmt(c.total_billed)}</span>
                                                : <span className="text-xs text-muted-foreground/30">—</span>}
                                        </td>

                                        {/* Client since */}
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-muted-foreground">
                                                {c.client_since ? format(new Date(c.client_since), 'MMM yyyy') : '—'}
                                            </span>
                                        </td>

                                        {/* Row actions */}
                                        <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 text-sm">
                                                    <DropdownMenuItem onClick={() => router.visit(`/clients/${c.id}`)}>
                                                        View Client
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.visit(`/clients/${c.id}/edit`)}>
                                                        Edit
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* ── Pagination ── */}
                {clients.last_page > 1 && (
                    <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                        <span>Page {clients.current_page} of {clients.last_page} · {clients.total} clients</span>
                        <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={clients.current_page === 1}
                                onClick={() => router.visit(`/clients?page=${clients.current_page - 1}`)}>
                                <ChevronLeft className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7"
                                disabled={clients.current_page === clients.last_page}
                                onClick={() => router.visit(`/clients?page=${clients.current_page + 1}`)}>
                                <ChevronRight className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}