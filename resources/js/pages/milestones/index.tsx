import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Flag, Search, CheckCircle2, Clock, AlertTriangle, Circle, Filter } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format, isPast, isToday, parseISO } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Milestones', href: '/milestones' }];

const STATUS_CFG: Record<string, { label: string; color: string; icon: any }> = {
    pending:     { label: 'Pending',     color: 'bg-slate-100 text-slate-600 ring-slate-200',   icon: Circle },
    in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700 ring-blue-200',      icon: Clock },
    completed:   { label: 'Completed',   color: 'bg-emerald-100 text-emerald-700 ring-emerald-200', icon: CheckCircle2 },
    missed:      { label: 'Missed',      color: 'bg-red-100 text-red-600 ring-red-200',         icon: AlertTriangle },
};

interface Milestone {
    id: number;
    title: string;
    description: string | null;
    scheduled_date: string | null;
    completed_date: string | null;
    status: string;
    project: { id: number; name: string; status: string } | null;
}

interface Props {
    milestones: { data: Milestone[]; links: any[]; meta: any };
    projects:   { id: number; name: string }[];
    filters:    { project_id?: string; status?: string; search?: string };
    counts:     Record<string, number>;
}

function statusColor(m: Milestone): string {
    if (m.status === 'completed') return 'border-l-emerald-500';
    if (m.status === 'missed')    return 'border-l-red-500';
    if (m.status === 'in_progress') return 'border-l-blue-500';
    if (m.scheduled_date && isPast(parseISO(m.scheduled_date)) && m.status === 'pending') return 'border-l-amber-500';
    return 'border-l-border';
}

export default function MilestonesIndex({ milestones, projects, filters, counts }: Props) {
    const [search, setSearch]     = useState(filters.search ?? '');
    const [project, setProject]   = useState(filters.project_id ?? '');
    const [status,  setStatus]    = useState(filters.status ?? '');

    function apply() {
        router.get('/milestones', { search, project_id: project, status }, { preserveScroll: true });
    }

    function complete(id: number) {
        router.post(`/milestones/${id}/complete`, {}, { preserveScroll: true });
    }

    const total = milestones.meta?.total ?? milestones.data.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Milestones" />
            <div className="flex flex-col h-full">

                {/* Header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Flag className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Milestones</h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {total} milestone{total !== 1 ? 's' : ''} across all projects
                                </p>
                            </div>
                        </div>
                        {/* No standalone create — milestones are created from within a project */}
                        <Button asChild variant="outline" size="sm">
                            <Link href="/projects">Open a Project to Add Milestones</Link>
                        </Button>
                    </div>

                    {/* Status tabs */}
                    <div className="flex gap-0 border-t border-border px-6 overflow-x-auto">
                        {[
                            { key: '',            label: 'All',         count: total },
                            { key: 'pending',     label: 'Pending',     count: counts.pending ?? 0 },
                            { key: 'in_progress', label: 'In Progress', count: counts.in_progress ?? 0 },
                            { key: 'completed',   label: 'Completed',   count: counts.completed ?? 0 },
                            { key: 'missed',      label: 'Missed',      count: counts.missed ?? 0 },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => { setStatus(tab.key); router.get('/milestones', { search, project_id: project, status: tab.key }, { preserveScroll: true }); }}
                                className={cn(
                                    'px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors',
                                    status === tab.key
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {tab.label}
                                <span className={cn('ml-1.5 text-xs px-1.5 py-0.5 rounded-full',
                                    status === tab.key ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                                )}>
                                    {tab.count}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Filter bar */}
                <div className="bg-card border-b border-border px-6 py-3">
                    <div className="flex gap-3 flex-wrap items-center">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                className="pl-8 h-8 text-sm w-52"
                                placeholder="Search milestones…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && apply()}
                            />
                        </div>
                        <select
                            className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                            value={project}
                            onChange={e => { setProject(e.target.value); router.get('/milestones', { search, project_id: e.target.value, status }, { preserveScroll: true }); }}
                        >
                            <option value="">All Projects</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-auto bg-background p-5 space-y-3">
                    {milestones.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                            <Flag className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No milestones found</p>
                            <p className="text-sm mt-1">Open a project to add milestones to it.</p>
                        </div>
                    ) : (
                        milestones.data.map(m => {
                            const cfg = STATUS_CFG[m.status] ?? STATUS_CFG.pending;
                            const Icon = cfg.icon;
                            const overdue = m.status === 'pending' && m.scheduled_date && isPast(parseISO(m.scheduled_date));
                            const dueToday = m.scheduled_date && isToday(parseISO(m.scheduled_date));

                            return (
                                <div
                                    key={m.id}
                                    className={cn(
                                        'bg-card border border-border rounded-lg p-4 border-l-4 hover:shadow-sm transition-shadow',
                                        statusColor(m)
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className={cn('mt-0.5 flex items-center justify-center h-8 w-8 rounded-full shrink-0', cfg.color.split(' ').slice(0,2).join(' '))}>
                                            <Icon className="h-4 w-4" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <p className="font-semibold text-foreground leading-tight">{m.title}</p>
                                                    {m.project && (
                                                        <Link
                                                            href={`/projects/${m.project.id}`}
                                                            className="text-xs text-primary hover:underline mt-0.5 inline-block"
                                                        >
                                                            {m.project.name}
                                                        </Link>
                                                    )}
                                                    {m.description && (
                                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{m.description}</p>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className={cn('text-xs px-2.5 py-1 rounded-full ring-1 font-medium', cfg.color)}>
                                                        {cfg.label}
                                                    </span>
                                                    {m.status !== 'completed' && m.status !== 'missed' && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs"
                                                            onClick={() => complete(m.id)}
                                                        >
                                                            <CheckCircle2 className="h-3 w-3 mr-1" />
                                                            Complete
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                                                        <Link href={`/milestones/${m.id}/edit`}>Edit</Link>
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                                {m.scheduled_date && (
                                                    <span className={cn('flex items-center gap-1',
                                                        overdue ? 'text-red-600 font-medium' :
                                                        dueToday ? 'text-amber-600 font-medium' : ''
                                                    )}>
                                                        <Clock className="h-3 w-3" />
                                                        {overdue ? 'Overdue · ' : dueToday ? 'Due today · ' : 'Due '}
                                                        {format(parseISO(m.scheduled_date), 'MMM d, yyyy')}
                                                    </span>
                                                )}
                                                {m.completed_date && (
                                                    <span className="flex items-center gap-1 text-emerald-600">
                                                        <CheckCircle2 className="h-3 w-3" />
                                                        Completed {format(parseISO(m.completed_date), 'MMM d, yyyy')}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}

                    {/* Pagination */}
                    {milestones.links?.length > 3 && (
                        <div className="flex justify-center gap-1 pt-4">
                            {milestones.links.map((link: any, i: number) => (
                                <button
                                    key={i}
                                    onClick={() => link.url && router.get(link.url)}
                                    disabled={!link.url}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                    className={cn(
                                        'px-3 py-1.5 text-sm rounded-md transition-colors',
                                        link.active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                                        !link.url && 'opacity-40 cursor-not-allowed'
                                    )}
                                />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}