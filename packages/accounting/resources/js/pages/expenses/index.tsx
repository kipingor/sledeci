import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type BreadcrumbItem } from '@/types';
import { Receipt, Plus, DollarSign, Search, MoreHorizontal, Eye } from 'lucide-react';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { type Expense } from '@/pages/expenses/expense-card';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Expenses', href: '/expenses' }];

const fmt = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c, notation: 'compact', maximumFractionDigits: 1 }).format(n);
const fmtFull = (n: number, c = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: c }).format(n);

const CATEGORIES = ['travel','accommodation','software','hardware','meals','supplies','marketing','utilities','other'];

const CAT_COLOR: Record<string, string> = {
    travel:        'bg-sky-50 text-sky-700 ring-sky-200',
    accommodation: 'bg-violet-50 text-violet-700 ring-violet-200',
    software:      'bg-blue-50 text-blue-700 ring-blue-200',
    hardware:      'bg-indigo-50 text-indigo-700 ring-indigo-200',
    meals:         'bg-amber-50 text-amber-700 ring-amber-200',
    supplies:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
    marketing:     'bg-rose-50 text-rose-700 ring-rose-200',
    utilities:     'bg-slate-50 text-slate-600 ring-slate-200',
    other:         'bg-gray-50 text-gray-600 ring-gray-200',
};

export default function ExpensesIndex() {
    const { props } = usePage<any>();
    const expenses: Expense[] = props.expenses?.data ?? [];
    const [search,       setSearch]       = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [projectFilter,  setProjectFilter]  = useState('all');

    const projects = Array.from(
        new Map(expenses.filter(e => e.project).map(e => [e.project!.id, e.project!])).values()
    );

    const filtered = expenses.filter(e => {
        const matchCat  = categoryFilter === 'all' || e.category === categoryFilter;
        const matchProj = projectFilter  === 'all' || String(e.project_id) === projectFilter;
        const matchSrch = !search || e.description.toLowerCase().includes(search.toLowerCase()) || (e.vendor ?? '').toLowerCase().includes(search.toLowerCase());
        return matchCat && matchProj && matchSrch;
    });

    const totalAll      = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const totalFiltered = filtered.reduce((s, e) => s + Number(e.amount), 0);

    // Category breakdown
    const byCategory: Record<string, number> = {};
    expenses.forEach(e => {
        const cat = e.category ?? 'other';
        byCategory[cat] = (byCategory[cat] ?? 0) + Number(e.amount);
    });
    const topCategory = Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0];

    const statStrip = [
        { label: 'Total Expenses',  value: fmtFull(totalAll),      color: 'text-foreground' },
        { label: 'Filtered Total',  value: fmtFull(totalFiltered), color: 'text-muted-foreground' },
        { label: 'Top Category',    value: topCategory?.[0] ? `${topCategory[0]} (${fmt(topCategory[1])})` : '—', color: 'text-primary' },
        { label: 'Records',         value: expenses.length,        color: 'text-muted-foreground' },
    ];

    const categoryTabs = [
        { key: 'all', label: 'All' },
        ...CATEGORIES.map(c => ({ key: c, label: c.charAt(0).toUpperCase() + c.slice(1) })),
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Expenses" />
            <div className="flex flex-col h-full">

                {/* ── Header ── */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Receipt className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Expenses</h1>
                                <p className="text-xs text-muted-foreground">Track project and operational expenses</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/expenses/create">
                                <Plus className="h-3.5 w-3.5" /> New Expense
                            </Link>
                        </Button>
                    </div>

                    {/* Stats strip */}
                    <div className="flex divide-x divide-border/60 border-b border-border/60">
                        {statStrip.map(s => (
                            <div key={s.label} className="flex-1 px-4 py-2.5">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">{s.label}</p>
                                <p className={cn('text-lg font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
                            </div>
                        ))}
                    </div>

                    {/* Category tab bar */}
                    <div className="flex items-center px-4 overflow-x-auto border-b border-border/60">
                        {categoryTabs.map(tab => (
                            <button key={tab.key} onClick={() => setCategoryFilter(tab.key)}
                                className={cn('px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    categoryFilter === tab.key ? 'sf-tab-active' : 'sf-tab-inactive')}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Filter bar */}
                    <div className="flex items-center gap-2 px-4 py-2">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input placeholder="Search description or vendor…" className="pl-8 h-7 text-xs" value={search} onChange={e => setSearch(e.target.value)} />
                        </div>
                        {projects.length > 0 && (
                            <Select value={projectFilter} onValueChange={setProjectFilter}>
                                <SelectTrigger className="h-7 text-xs w-48"><SelectValue placeholder="All Projects" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Projects</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                {/* ── Table ── */}
                <div className="flex-1 overflow-auto bg-background">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 border-b border-border sticky top-0">
                                {['Date', 'Description', 'Vendor', 'Project', 'Category', 'Amount', ''].map(h => (
                                    <th key={h} className={cn(
                                        'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                                        h === '' && 'w-10',
                                        h === 'Amount' && 'text-right',
                                    )}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/50">
                            {filtered.length === 0 && (
                                <tr><td colSpan={7} className="py-20 text-center text-muted-foreground">
                                    <Receipt className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="font-medium">No expenses found</p>
                                    <p className="text-xs mt-1 opacity-70">
                                        {expenses.length === 0 ? 'Record your first expense to get started.' : 'Try adjusting your filters.'}
                                    </p>
                                </td></tr>
                            )}
                            {filtered.map(e => {
                                const catCls = CAT_COLOR[e.category ?? 'other'] ?? CAT_COLOR.other;
                                return (
                                    <tr key={e.id} className="group hover:bg-muted/40 transition-colors cursor-pointer" onClick={() => router.visit(`/expenses/${e.id}`)}>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-muted-foreground">
                                                {e.incurred_at ? format(new Date(e.incurred_at), 'MMM d, yyyy') : '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5 max-w-xs">
                                            <p className="text-sm font-medium group-hover:text-primary transition-colors truncate">{e.description}</p>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className="text-xs text-muted-foreground">{e.vendor ?? '—'}</span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {e.project
                                                ? <span className="text-xs text-muted-foreground">{e.project.name}</span>
                                                : <span className="text-xs text-muted-foreground/30">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            {e.category ? (
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize', catCls)}>
                                                    {e.category}
                                                </span>
                                            ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-right">
                                            <span className="text-xs font-semibold tabular-nums">{fmtFull(Number(e.amount), e.currency)}</span>
                                        </td>
                                        <td className="px-3 py-2.5" onClick={ev => ev.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                                        <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-36 text-sm">
                                                    <DropdownMenuItem onClick={() => router.visit(`/expenses/${e.id}`)}>
                                                        <Eye className="mr-2 h-3.5 w-3.5" /> View
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

                {/* Pagination */}
                {props.expenses?.links && (
                    <div className="flex items-center justify-center gap-1 px-6 py-2.5 border-t border-border bg-card">
                        {props.expenses.links.map((link: any, i: number) => (
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
        </AppLayout>
    );
}