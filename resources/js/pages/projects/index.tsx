import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, FolderKanban, CalendarDays, CheckCircle2, UserRound } from 'lucide-react';

interface Project {
    id: number; name: string; code: string | null; description: string | null;
    status: string; priority: string; start_date: string | null; due_date: string | null;
    budget: string | null; currency: string; tasks_count: number; completed_tasks_count: number;
    completion_percentage: number; owner: { id: number; name: string } | null;
}
interface Props {
    projects: { data: Project[]; links: { url: string | null; label: string; active: boolean }[]; meta: { total: number } };
    statuses: string[]; priorities: string[]; filters: { search?: string; status?: string; owner_id?: string };
    teamMembers: { id: number; name: string }[];
}
const statusColor: Record<string, string> = {
    planning: 'bg-blue-100 text-blue-700', active: 'bg-emerald-100 text-emerald-700',
    on_hold: 'bg-amber-100 text-amber-700', completed: 'bg-purple-100 text-purple-700', archived: 'bg-gray-100 text-gray-600',
};
const priorityColor: Record<string, string> = {
    low: 'text-gray-500', medium: 'text-blue-600', high: 'text-orange-600', urgent: 'text-red-600',
};
const label = (value: string) => value.replace('_', ' ').replace(/^./, c => c.toUpperCase());

export default function ProjectsIndex({ projects, statuses, filters, teamMembers }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const apply = (key: string, value: string) => router.get('/projects', { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });
    const submitSearch = (e: React.FormEvent) => { e.preventDefault(); apply('search', search); };

    return <AppLayout>
        <Head title="Projects" />
        <div className="p-6 max-w-7xl space-y-6">
            <div className="flex items-center justify-between">
                <div><h1 className="text-2xl font-bold text-stone-100">Projects</h1><p className="text-sm text-stone-500 mt-1">Organise delivery, deadlines, and team work.</p></div>
                <Link href="/projects/create" className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-stone-950 hover:bg-amber-400"><Plus size={16} /> New project</Link>
            </div>
            <div className="flex flex-wrap gap-3">
                <form onSubmit={submitSearch} className="flex gap-2">
                    <div className="relative"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search projects" className="pl-9 pr-3 py-2 text-sm bg-stone-900 border border-stone-800 text-stone-200 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-amber-500" /></div>
                    <button className="px-3 py-2 text-sm bg-stone-800 text-stone-300 rounded-lg hover:bg-stone-700">Search</button>
                </form>
                <select value={filters.status ?? ''} onChange={e => apply('status', e.target.value)} className="text-sm bg-stone-900 border border-stone-800 text-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"><option value="">All statuses</option>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select>
                <select value={filters.owner_id ?? ''} onChange={e => apply('owner_id', e.target.value)} className="text-sm bg-stone-900 border border-stone-800 text-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"><option value="">All owners</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select>
            </div>
            {projects.data.length === 0 ? <div className="py-20 text-center bg-stone-900 border border-stone-800 rounded-2xl"><FolderKanban size={36} className="mx-auto text-stone-700 mb-3" /><p className="text-stone-300 font-medium">No projects yet</p><p className="text-sm text-stone-500 mt-1">Create a project to start planning your team’s work.</p></div> : <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {projects.data.map(project => <Link key={project.id} href={'/projects/' + project.id} className="bg-stone-900 border border-stone-800 rounded-2xl p-5 hover:border-amber-500/50 hover:bg-stone-850 transition-colors space-y-4">
                    <div className="flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="font-semibold text-stone-100">{project.name}</h2>{project.code && <span className="text-xs text-stone-600">{project.code}</span>}</div><p className="text-xs text-stone-500 mt-1 line-clamp-2">{project.description || 'No description'}</p></div><span className={'rounded-full px-2 py-1 text-xs font-medium ' + (statusColor[project.status] || 'bg-gray-100 text-gray-600')}>{label(project.status)}</span></div>
                    <div><div className="flex justify-between text-xs mb-1.5"><span className="text-stone-500">Progress</span><span className="text-stone-300">{project.completion_percentage ?? 0}%</span></div><div className="h-2 bg-stone-800 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: (project.completion_percentage ?? 0) + '%' }} /></div></div>
                    <div className="flex items-center justify-between text-xs text-stone-500"><span className="flex items-center gap-1"><CheckCircle2 size={13} /> {project.completed_tasks_count ?? 0}/{project.tasks_count ?? 0} tasks</span><span className={'font-medium ' + (priorityColor[project.priority] || '')}>{label(project.priority)}</span></div>
                    <div className="flex items-center justify-between text-xs text-stone-500"><span className="flex items-center gap-1"><CalendarDays size={13} /> {project.due_date ? new Date(project.due_date).toLocaleDateString('en-KE') : 'No deadline'}</span><span className="flex items-center gap-1"><UserRound size={13} /> {project.owner?.name || 'Unassigned'}</span></div>
                </Link>)}
            </div>}
            {projects.links && projects.links.length > 3 && <div className="flex justify-center gap-1">{projects.links.map((link, i) => link.url ? <Link key={i} href={link.url} className={'px-3 py-1.5 text-sm rounded-lg ' + (link.active ? 'bg-amber-500 text-stone-950' : 'bg-stone-900 border border-stone-800 text-stone-400')} dangerouslySetInnerHTML={{ __html: link.label }} /> : <span key={i} className="px-3 py-1.5 text-sm text-stone-700" dangerouslySetInnerHTML={{ __html: link.label }} />)}</div>}
        </div>
    </AppLayout>;
}
