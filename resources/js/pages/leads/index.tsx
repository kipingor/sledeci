/**
 * Leads — Salesforce Sales Cloud list view
 * Amber Obsidian design system
 *
 * Layout: sticky toolbar → stats strip → filter bar → data table
 * No cards — SF list views use dense rows with hover states
 */

import { Head, router } from '@inertiajs/react';
import { useCallback, useState, useEffect } from 'react';
import AppLayout from '@/layouts/app-layout';
import api from '@/lib/axios';
import {
    Plus, Search, LayoutGrid, LayoutList, Download,
    MoreHorizontal, Eye, Edit, Archive, Trash2, Star, StarOff,
    FileText, AlertCircle, ChevronLeft, ChevronRight, SlidersHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useDeleteConfirmation, useConfirmDialog } from '@/components/ui/confirm-dialog';
import { formatDistanceToNow } from 'date-fns';
import { Lead, PaginatedData, Pipeline, User } from '@/types/models.types';
import { useDebounce } from '@/hooks/use-debounce';
import * as l from '@/routes/web/leads';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<string, { label: string; dot: string; pill: string }> = {
    new:           { label: 'New',           dot: 'bg-sky-500',     pill: 'bg-sky-50 text-sky-700 ring-sky-200' },
    contacted:     { label: 'Contacted',     dot: 'bg-violet-500',  pill: 'bg-violet-50 text-violet-700 ring-violet-200' },
    qualified:     { label: 'Qualified',     dot: 'bg-amber-500',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    proposal_sent: { label: 'Proposal Sent', dot: 'bg-blue-500',    pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    negotiation:   { label: 'Negotiation',   dot: 'bg-orange-500',  pill: 'bg-orange-50 text-orange-700 ring-orange-200' },
    won:           { label: 'Won',           dot: 'bg-emerald-500', pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    lost:          { label: 'Lost',          dot: 'bg-red-500',     pill: 'bg-red-50 text-red-700 ring-red-200' },
    archived:      { label: 'Archived',      dot: 'bg-gray-400',    pill: 'bg-gray-50 text-gray-500 ring-gray-200' },
};

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'KES', notation: 'compact', maximumFractionDigits: 0 }).format(n);

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
    leads:          PaginatedData<Lead>;
    filters:        { search?: string; status?: string; owner_id?: number; pipeline_stage_id?: number };
    users?:         User[];
    pipelineStages?: Pipeline[];
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function LeadsIndex({ leads, filters, users = [], pipelineStages = [] }: Props) {
    const [search, setSearch]           = useState(filters.search || '');
    const [isSearching, setIsSearching] = useState(false);
    const [isLoading, setIsLoading]     = useState(false);
    const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
    const [viewMode, setViewMode]       = useState<'list' | 'grid'>('list');
    const debouncedSearch               = useDebounce(search, 400);

    const { confirmDelete, ConfirmDialog: DeleteDialog } = useDeleteConfirmation();
    const { confirm: confirmAction, ConfirmDialog: ActionDialog } = useConfirmDialog();

    // Debounced search
    useEffect(() => {
        if (debouncedSearch === filters.search) return;
        setIsSearching(true);
        router.get(l.index().url, { ...filters, search: debouncedSearch || undefined, page: undefined }, {
            preserveState: true, preserveScroll: true,
            onFinish: () => setIsSearching(false),
        });
    }, [debouncedSearch]);

    const filter = useCallback((key: string, value: string) => {
        setIsLoading(true);
        router.get(l.index().url, { ...filters, [key]: value === 'all' ? undefined : value, page: undefined }, {
            preserveState: true, preserveScroll: true,
            onFinish: () => setIsLoading(false),
        });
    }, [filters]);

    const handleDelete = useCallback(async (lead: Lead) => {
        await confirmDelete({
            itemName: lead.title,
            onConfirm: async () => {
                await api.delete(`/leads/${lead.id}`);
                toast.success('Lead deleted');
                router.reload({ preserveUrl: true });
            },
        });
    }, [confirmDelete]);

    const handleBulkDelete = useCallback(async () => {
        await confirmDelete({
            itemName: `${selectedLeads.length} leads`,
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    await api.post('/leads/bulk-delete', { lead_ids: selectedLeads });
                    toast.success(`${selectedLeads.length} leads deleted`);
                    setSelectedLeads([]);
                    router.reload({ preserveUrl: true });
                } catch { toast.error('Failed to delete leads'); }
                finally { setIsLoading(false); }
            },
        });
    }, [selectedLeads, confirmDelete]);

    const handleBulkArchive = useCallback(async () => {
        await confirmAction({
            title: 'Archive Leads', description: `Archive ${selectedLeads.length} leads?`,
            confirmLabel: 'Archive', variant: 'warning',
            onConfirm: async () => {
                setIsLoading(true);
                try {
                    await api.post('/leads/bulk-archive', { lead_ids: selectedLeads });
                    toast.success(`${selectedLeads.length} leads archived`);
                    setSelectedLeads([]);
                  router.reload({ preserveUrl: true });
                } catch { toast.error('Failed to archive leads'); }
                finally { setIsLoading(false); }
            },
        });
    }, [selectedLeads, confirmAction]);

    const toggleStar = useCallback(async (lead: Lead) => {
        try {
            await api.post(`/leads/${lead.id}/toggle-star`);
          router.reload({ preserveUrl: true });
        } catch { toast.error('Failed to update'); }
    }, []);

    const allSelected = selectedLeads.length === leads.data.length && leads.data.length > 0;

    // ── Status tab counts ──────────────────────────────────────────────────────
    const statusCounts = Object.entries(STATUS).map(([key, cfg]) => ({
        key, label: cfg.label,
        active: filters.status === key,
    }));

    return (
        <>
            <Head title="Leads" />
            <AppLayout breadcrumbs={[{ title: 'Leads', href: '/leads' }]}>
                <div className="flex flex-col h-full">

                    {/* ── Record list header ── */}
                    <div className="bg-card border-b border-border">
                        {/* Title bar */}
                        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                    <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-base font-bold tracking-tight">Leads</h1>
                                    {leads?.meta?.total !== undefined && (
                                        <p className="text-xs text-muted-foreground">
                                            {leads.meta.total} record{leads.meta.total !== 1 ? 's' : ''}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                    <Download className="h-3.5 w-3.5" /> Export
                                </Button>
                                <Button
                                    size="sm"
                                    className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                    onClick={() => router.visit('/leads/create')}
                                >
                                    <Plus className="h-3.5 w-3.5" /> New Lead
                                </Button>
                            </div>
                        </div>

                        {/* Status tab bar */}
                        <div className="flex items-center gap-0 px-4 overflow-x-auto">
                            <button
                                onClick={() => filter('status', 'all')}
                                className={cn(
                                    'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    !filters.status
                                        ? 'sf-tab-active'
                                        : 'sf-tab-inactive'
                                )}
                            >
                                All Leads
                            </button>
                            {statusCounts.map(s => (
                                <button
                                    key={s.key}
                                    onClick={() => filter('status', s.key)}
                                    className={cn(
                                        'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                        s.active ? 'sf-tab-active' : 'sf-tab-inactive'
                                    )}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>

                        {/* Filter / search bar */}
                        <div className="flex items-center gap-2 px-4 py-2 border-t border-border/60">
                            {/* Search */}
                            <div className="relative flex-1 max-w-sm">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    placeholder="Search leads…"
                                    className="pl-8 h-7 text-xs"
                                />
                                {isSearching && (
                                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                                )}
                            </div>

                            {/* Stage filter */}
                            <Select value={filters.pipeline_stage_id?.toString() || 'all'} onValueChange={v => filter('pipeline_stage_id', v)}>
                                <SelectTrigger className="h-7 text-xs w-36">
                                    <SelectValue placeholder="All Stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    {pipelineStages.map(s => (
                                        <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Owner filter */}
                            <Select value={filters.owner_id?.toString() || 'all'} onValueChange={v => filter('owner_id', v)}>
                                <SelectTrigger className="h-7 text-xs w-36">
                                    <SelectValue placeholder="All Owners" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Owners</SelectItem>
                                    {users.map(u => (
                                        <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <div className="ml-auto flex items-center gap-1">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={cn('h-7 w-7 rounded flex items-center justify-center transition-colors',
                                        viewMode === 'list' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                                >
                                    <LayoutList className="h-3.5 w-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('grid')}
                                    className={cn('h-7 w-7 rounded flex items-center justify-center transition-colors',
                                        viewMode === 'grid' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted')}
                                >
                                    <LayoutGrid className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Bulk action bar ── */}
                    {selectedLeads.length > 0 && (
                        <div className="flex items-center gap-3 px-6 py-2 bg-primary/5 border-b border-primary/20">
                            <span className="text-xs font-semibold text-primary">
                                {selectedLeads.length} selected
                            </span>
                            <div className="flex items-center gap-1.5">
                                <Button variant="outline" size="sm" className="h-6 text-xs" onClick={handleBulkArchive}>
                                    <Archive className="h-3 w-3 mr-1" /> Archive
                                </Button>
                                <Button variant="outline" size="sm" className="h-6 text-xs text-destructive border-destructive/30 hover:bg-destructive/5" onClick={handleBulkDelete}>
                                    <Trash2 className="h-3 w-3 mr-1" /> Delete
                                </Button>
                                <button
                                    onClick={() => setSelectedLeads([])}
                                    className="text-xs text-muted-foreground hover:text-foreground ml-2"
                                >
                                    Clear
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ── List view ── */}
                    <div className="flex-1 overflow-auto bg-background">
                        {viewMode === 'list' ? (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/40 border-b border-border">
                                        <th className="w-10 px-4 py-2.5">
                                            <Checkbox
                                                checked={allSelected}
                                                onCheckedChange={(c) =>
                                                    setSelectedLeads(c ? leads.data.map(l => l.id) : [])
                                                }
                                            />
                                        </th>
                                        <th className="w-6 px-2" />
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Lead
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                                            Status
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                                            Stage
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                                            Owner
                                        </th>
                                        <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                                            Est. Value
                                        </th>
                                        <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                                            Created
                                        </th>
                                        <th className="w-10 px-3 py-2.5" />
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {leads.data.length === 0 && (
                                        <tr>
                                            <td colSpan={9} className="py-20 text-center text-muted-foreground">
                                                <FileText className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                                <p className="font-medium">No leads found</p>
                                                <p className="text-xs mt-1 opacity-70">Adjust your filters or create a new lead</p>
                                            </td>
                                        </tr>
                                    )}
                                    {leads.data.map(lead => {
                                        const s = STATUS[lead.status] ?? STATUS.new;
                                        const selected = selectedLeads.includes(lead.id);
                                        return (
                                            <tr
                                                key={lead.id}
                                                className={cn(
                                                    'group transition-colors cursor-pointer',
                                                    selected ? 'bg-primary/5' : 'hover:bg-muted/40'
                                                )}
                                                onClick={() => router.visit(`/leads/${lead.id}`)}
                                            >
                                                {/* Checkbox */}
                                                <td className="px-4 py-2.5" onClick={e => e.stopPropagation()}>
                                                    <Checkbox
                                                        checked={selected}
                                                        onCheckedChange={() =>
                                                            setSelectedLeads(prev =>
                                                                prev.includes(lead.id)
                                                                    ? prev.filter(id => id !== lead.id)
                                                                    : [...prev, lead.id]
                                                            )
                                                        }
                                                    />
                                                </td>

                                                {/* Star */}
                                                <td className="px-2 py-2.5" onClick={e => e.stopPropagation()}>
                                                    <button
                                                        onClick={() => toggleStar(lead)}
                                                        className="opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                                                    >
                                                        {lead.is_starred
                                                            ? <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                                                            : <StarOff className="h-3.5 w-3.5 text-muted-foreground hover:text-amber-400" />}
                                                    </button>
                                                </td>

                                                {/* Lead name + description */}
                                                <td className="px-4 py-2.5 min-w-0">
                                                    <div className="flex items-center gap-2.5">
                                                        {lead.is_starred && (
                                                            <Star className="h-3 w-3 text-amber-500 fill-amber-500 shrink-0" />
                                                        )}
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm text-foreground truncate group-hover:text-primary transition-colors">
                                                                {lead.title}
                                                            </p>
                                                            {lead.description && (
                                                                <p className="text-xs text-muted-foreground truncate max-w-xs">
                                                                    {lead.description}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-2.5 hidden md:table-cell">
                                                    <span className={cn(
                                                        'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                                                        s.pill
                                                    )}>
                                                        <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                                                        {s.label}
                                                    </span>
                                                </td>

                                                {/* Stage */}
                                                <td className="px-4 py-2.5 hidden lg:table-cell">
                                                    <span className="text-xs text-muted-foreground">
                                                        {lead.pipeline_stage?.name ?? '—'}
                                                    </span>
                                                </td>

                                                {/* Owner */}
                                                <td className="px-4 py-2.5 hidden lg:table-cell">
                                                    <div className="flex items-center gap-1.5">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={lead.owner?.avatar} />
                                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                                {lead.owner?.name?.charAt(0) ?? '?'}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                                            {lead.owner?.name ?? '—'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Est value */}
                                                <td className="px-4 py-2.5 text-right hidden xl:table-cell">
                                                    {lead.estimated_value
                                                        ? <span className="text-xs font-semibold text-emerald-700">{fmt(lead.estimated_value)}</span>
                                                        : <span className="text-xs text-muted-foreground/40">—</span>}
                                                </td>

                                                {/* Created */}
                                                <td className="px-4 py-2.5 hidden xl:table-cell">
                                                    <span className="text-xs text-muted-foreground">
                                                        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true })}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <button className="h-6 w-6 rounded flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-muted transition-all">
                                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                                            </button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-40 text-sm">
                                                            <DropdownMenuItem onClick={() => router.visit(`/leads/${lead.id}`)}>
                                                                <Eye className="mr-2 h-3.5 w-3.5" /> View
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => router.visit(`/leads/${lead.id}/edit`)}>
                                                                <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive focus:text-destructive"
                                                                onClick={() => handleDelete(lead)}
                                                            >
                                                                <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        ) : (
                            /* Grid view — 3-col cards */
                            <div className="p-6 grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {leads.data.map(lead => {
                                    const s = STATUS[lead.status] ?? STATUS.new;
                                    return (
                                        <div
                                            key={lead.id}
                                            className="bg-card border border-border rounded-lg p-4 hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer group"
                                            onClick={() => router.visit(`/leads/${lead.id}`)}
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <p className="font-semibold text-sm leading-snug group-hover:text-primary transition-colors line-clamp-2">
                                                    {lead.title}
                                                </p>
                                                <span className={cn(
                                                    'inline-flex items-center gap-1 text-[11px] font-medium px-1.5 py-0.5 rounded-full ring-1 shrink-0',
                                                    s.pill
                                                )}>
                                                    <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
                                                    {s.label}
                                                </span>
                                            </div>
                                            {lead.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                                                    {lead.description}
                                                </p>
                                            )}
                                            <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
                                                <div className="flex items-center gap-1.5">
                                                    <Avatar className="h-5 w-5">
                                                        <AvatarImage src={lead.owner?.avatar} />
                                                        <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                            {lead.owner?.name?.charAt(0)}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <span className="text-xs text-muted-foreground">{lead.owner?.name}</span>
                                                </div>
                                                {lead.estimated_value && (
                                                    <span className="text-xs font-semibold text-emerald-700">
                                                        {fmt(lead.estimated_value)}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* ── Pagination ── */}
                    {leads?.meta?.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                            <span>
                                Page {leads.meta.current_page} of {leads.meta.last_page}
                                &nbsp;·&nbsp;{leads.meta.total} records
                            </span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    disabled={leads.meta.current_page === 1}
                                    onClick={() => router.visit(`/leads?page=${leads.meta.current_page - 1}`)}>
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                {Array.from({ length: Math.min(5, leads.meta.last_page) }, (_, i) => i + 1).map(p => (
                                    <button
                                        key={p}
                                        onClick={() => router.visit(`/leads?page=${p}`)}
                                        className={cn(
                                            'h-7 min-w-[28px] px-1.5 rounded text-xs font-medium transition-colors',
                                            p === leads.meta.current_page
                                                ? 'bg-primary text-primary-foreground'
                                                : 'hover:bg-muted'
                                        )}
                                    >{p}</button>
                                ))}
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    disabled={leads.meta.current_page === leads.meta.last_page}
                                    onClick={() => router.visit(`/leads?page=${leads.meta.current_page + 1}`)}>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                <DeleteDialog />
                <ActionDialog />
            </AppLayout>
        </>
    );
}