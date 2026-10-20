import { Head, router, Link } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Plus, Search, Folder, MoreHorizontal, Eye, Edit, Trash2,
    Calendar, Users, DollarSign, CheckSquare, AlertCircle,
    ChevronLeft, ChevronRight, TrendingUp, Activity,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, formatDistanceToNow } from 'date-fns';
import { type ProjectsIndexProps, type ProjectWithProgress, PROJECT_STATUS_CONFIG } from '@/types/project.types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency, notation: 'compact', maximumFractionDigits: 0 }).format(n);

const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');

const PHASE_LABEL: Record<string, string> = {
    initiating:             'Initiating',
    planning:               'Planning',
    executing:              'Executing',
    monitoring_controlling: 'Monitoring',
    closing:                'Closing',
};

// Mini progress bar
function ProgressBar({ value }: { value: number }) {
    return (
        <div className="flex items-center gap-2 min-w-0">
            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden max-w-[80px]">
                <div
                    className={cn('h-full rounded-full transition-all',
                        value >= 100 ? 'bg-emerald-500' : value > 60 ? 'bg-primary' : value > 30 ? 'bg-amber-400' : 'bg-rose-400'
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">{Math.round(value)}%</span>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectsIndex({ projects, filters, statistics }: ProjectsIndexProps) {
    const [searchQuery, setSearchQuery] = useState(filters.search || '');

    const handleSearch = (v: string) => {
        setSearchQuery(v);
        router.get('/projects', { ...filters, search: v || undefined }, { preserveState: true, preserveScroll: true });
    };

    const handleFilter = (key: string, value: string) => {
        router.get('/projects',
            { ...filters, [key]: value === 'all' ? undefined : value },
            { preserveState: true, preserveScroll: true }
        );
    };

    // Status tab config
    const statusTabs = [
        { key: 'all',       label: 'All' },
        { key: 'active',    label: 'Active' },
        { key: 'planning',  label: 'Planning' },
        { key: 'on_hold',   label: 'On Hold' },
        { key: 'completed', label: 'Completed' },
        { key: 'cancelled', label: 'Cancelled' },
    ];

    const statStrip = [
        { label: 'Total Projects',      value: statistics?.total ?? 0,      color: 'text-foreground',  icon: Folder },
        { label: 'Active',              value: statistics?.by_status.active ?? 0,     color: 'text-emerald-600', icon: Activity },
        { label: 'At Risk',             value: statistics?.at_risk ?? 0,    color: 'text-rose-600',    icon: AlertCircle },
        { label: 'Completed',           value: statistics?.by_status.completed ?? 0,  color: 'text-primary',     icon: CheckSquare },
    ];

    return (
        <>
            <Head title="Projects" />
            <AppLayout breadcrumbs={[{ title: 'Projects', href: '/projects' }]}>
                <div className="flex flex-col h-full">

                    {/* ── Header ── */}
                    <div className="bg-card border-b border-border">
                        {/* Title bar */}
                        <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                    <Folder className="h-4 w-4 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-base font-bold tracking-tight">Projects</h1>
                                    <p className="text-xs text-muted-foreground">
                                        {projects?.total ?? 0} project{(projects?.total ?? 0) !== 1 ? 's' : ''}
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                                asChild
                            >
                                <Link href="/projects/create">
                                    <Plus className="h-3.5 w-3.5" /> New Project
                                </Link>
                            </Button>
                        </div>

                        {/* Stats strip */}
                        <div className="flex divide-x divide-border/60 border-b border-border/60">
                            {statStrip.map(s => (
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

                        {/* Status tab bar */}
                        <div className="flex items-center px-4 overflow-x-auto border-b border-border/60">
                            {statusTabs.map(tab => (
                                <button
                                    key={tab.key}
                                    onClick={() => handleFilter('status', tab.key)}
                                    className={cn(
                                        'px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                        (tab.key === 'all' ? !filters.status : filters.status === tab.key)
                                            ? 'sf-tab-active'
                                            : 'sf-tab-inactive'
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        {/* Filter bar */}
                        <div className="flex items-center gap-2 px-4 py-2">
                            <div className="relative max-w-sm flex-1">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={searchQuery}
                                    onChange={e => handleSearch(e.target.value)}
                                    placeholder="Search projects…"
                                    className="pl-8 h-7 text-xs"
                                />
                            </div>
                            <Select
                                value={filters.phase || 'all'}
                                onValueChange={v => handleFilter('phase', v)}
                            >
                                <SelectTrigger className="h-7 text-xs w-36">
                                    <SelectValue placeholder="All Phases" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Phases</SelectItem>
                                    {Object.entries(PHASE_LABEL).map(([k, v]) => (
                                        <SelectItem key={k} value={k}>{v}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* ── Table ── */}
                    <div className="flex-1 overflow-auto bg-background">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 border-b border-border sticky top-0">
                                    {[
                                        'Project', 'Status', 'Phase', 'Progress',
                                        'Client', 'Owner', 'Budget', 'Due Date', ''
                                    ].map(h => (
                                        <th
                                            key={h}
                                            className={cn(
                                                'px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap',
                                                h === '' && 'w-10',
                                                h === 'Budget' && 'text-right',
                                            )}
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {projects?.data?.length === 0 && (
                                    <tr>
                                        <td colSpan={9} className="py-20 text-center text-muted-foreground">
                                            <Folder className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                            <p className="font-medium">No projects found</p>
                                            <p className="text-xs mt-1 opacity-70">Create a project or adjust your filters</p>
                                            <Button size="sm" className="mt-4" asChild>
                                                <Link href="/projects/create">New Project</Link>
                                            </Button>
                                        </td>
                                    </tr>
                                )}
                                {projects?.data?.map((project: ProjectWithProgress) => {
                                    const statusCfg = PROJECT_STATUS_CONFIG[project.status] ?? { label: project.status, color: 'bg-gray-400', bgColor: 'bg-gray-50 text-gray-700 ring-gray-200' };
                                    const progress = project.progress?.overall ?? 0;
                                    const isOverdue = project.overdue;
                                    return (
                                        <tr
                                            key={project.id}
                                            className="group hover:bg-muted/40 transition-colors cursor-pointer"
                                            onClick={() => router.visit(`/projects/${project.id}`)}
                                        >
                                            {/* Project name */}
                                            <td className="px-4 py-2.5 min-w-0 max-w-xs">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                                                        <Folder className="h-3.5 w-3.5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <p className="font-medium text-sm text-foreground group-hover:text-primary transition-colors truncate">
                                                            {project.name}
                                                        </p>
                                                        {project.opportunity && (
                                                            <p className="text-xs text-muted-foreground truncate">
                                                                {project.opportunity.title}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Status */}
                                            <td className="px-4 py-2.5">
                                                <span className={cn(
                                                    'inline-flex items-center gap-1.5 text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                                                    statusCfg.bgColor
                                                )}>
                                                    <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.color)} />
                                                    {statusCfg.label}
                                                </span>
                                            </td>

                                            {/* Phase */}
                                            <td className="px-4 py-2.5">
                                                <span className="text-xs text-muted-foreground">
                                                    {project.phase
                                                        ? PHASE_LABEL[project.phase] ?? project.phase
                                                        : '—'}
                                                </span>
                                            </td>

                                            {/* Progress */}
                                            <td className="px-4 py-2.5">
                                                <ProgressBar value={project.progress.overall} />
                                            </td>

                                            {/* Client */}
                                            <td className="px-4 py-2.5">
                                                {project.client ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={project.client.avatar ?? undefined} />
                                                            <AvatarFallback className="text-[9px] bg-muted">
                                                                {project.client.name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                                            {project.client.name}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Owner */}
                                            <td className="px-4 py-2.5">
                                                {project.owner ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={project.owner.avatar ?? undefined} />
                                                            <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                                                                {project.owner.name?.charAt(0)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                                                            {project.owner.name}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Budget */}
                                            <td className="px-4 py-2.5 text-right">
                                                {project.budget
                                                    ? <span className="text-xs font-medium tabular-nums">{fmt(project.budget, project.currency)}</span>
                                                    : <span className="text-xs text-muted-foreground/30">—</span>}
                                            </td>

                                            {/* Due date */}
                                            <td className="px-4 py-2.5">
                                                {project.end_date ? (
                                                    <div className="flex items-center gap-1">
                                                        {isOverdue && <AlertCircle className="h-3 w-3 text-rose-500 shrink-0" />}
                                                        <span className={cn('text-xs', isOverdue ? 'text-rose-600 font-medium' : 'text-muted-foreground')}>
                                                            {fmtDate(project.end_date)}
                                                        </span>
                                                    </div>
                                                ) : <span className="text-xs text-muted-foreground/30">—</span>}
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
                                                        <DropdownMenuItem onClick={() => router.visit(`/projects/${project.id}`)}>
                                                            <Eye className="mr-2 h-3.5 w-3.5" /> View
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => router.visit(`/projects/${project.id}/edit`)}>
                                                            <Edit className="mr-2 h-3.5 w-3.5" /> Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem className="text-destructive focus:text-destructive">
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
                    </div>

                    {/* ── Pagination ── */}
                    {projects?.last_page > 1 && (
                        <div className="flex items-center justify-between px-6 py-2.5 border-t border-border bg-card text-xs text-muted-foreground">
                            <span>Page {projects.current_page} of {projects.last_page} · {projects.total} projects</span>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    disabled={projects.current_page === 1}
                                    onClick={() => router.visit(`/projects?page=${projects.current_page - 1}`)}>
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7"
                                    disabled={projects.current_page === projects.last_page}
                                    onClick={() => router.visit(`/projects?page=${projects.current_page + 1}`)}>
                                    <ChevronRight className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </AppLayout>
        </>
    );
}