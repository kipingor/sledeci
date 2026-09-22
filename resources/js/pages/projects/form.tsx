import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft } from 'lucide-react';

interface Project { id?: number; name: string; code: string; description: string; status: string; priority: string; start_date: string; due_date: string; budget: string; currency: string; owner_id: string; }
interface Props { project?: Project; statuses: string[]; priorities: string[]; teamMembers: { id: number; name: string }[]; }
const label = (value: string) => value.replace('_', ' ').replace(/^./, c => c.toUpperCase());

export default function ProjectForm({ project, statuses, priorities, teamMembers }: Props) {
    const isEdit = Boolean(project?.id);
    const { data, setData, post, put, processing, errors } = useForm({
        name: project?.name ?? '', code: project?.code ?? '', description: project?.description ?? '', status: project?.status ?? 'planning', priority: project?.priority ?? 'medium', start_date: project?.start_date ?? '', due_date: project?.due_date ?? '', budget: project?.budget ?? '', currency: project?.currency ?? 'KES', owner_id: project?.owner_id ? String(project.owner_id) : '',
    });
    const submit = (e: React.FormEvent) => { e.preventDefault(); isEdit ? put('/projects/' + project!.id) : post('/projects'); };
    const input = 'w-full bg-stone-950 border border-stone-800 text-stone-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500';
    const Field = ({ title, error, children }: { title: string; error?: string; children: React.ReactNode }) => <div><label className="block text-sm font-medium text-stone-300 mb-1">{title}</label>{children}{error && <p className="text-xs text-red-400 mt-1">{error}</p>}</div>;

    return <AppLayout><Head title={isEdit ? 'Edit Project' : 'New Project'} /><div className="p-6 max-w-3xl space-y-6"><div className="flex items-center gap-3"><Link href="/projects" className="text-stone-500 hover:text-stone-200"><ArrowLeft size={20} /></Link><h1 className="text-2xl font-bold text-stone-100">{isEdit ? 'Edit project' : 'New project'}</h1></div><form onSubmit={submit} className="bg-stone-900 border border-stone-800 rounded-2xl p-6 space-y-5">
        <div className="grid grid-cols-3 gap-4"><div className="col-span-2"><Field title="Project name *" error={errors.name}><input className={input} value={data.name} onChange={e => setData('name', e.target.value)} /></Field></div><Field title="Code" error={errors.code}><input className={input} value={data.code} onChange={e => setData('code', e.target.value.toUpperCase())} placeholder="PRJ-001" /></Field></div>
        <Field title="Description" error={errors.description}><textarea className={input} rows={4} value={data.description} onChange={e => setData('description', e.target.value)} /></Field>
        <div className="grid grid-cols-2 gap-4"><Field title="Status *" error={errors.status}><select className={input} value={data.status} onChange={e => setData('status', e.target.value)}>{statuses.map(s => <option key={s} value={s}>{label(s)}</option>)}</select></Field><Field title="Priority *" error={errors.priority}><select className={input} value={data.priority} onChange={e => setData('priority', e.target.value)}>{priorities.map(p => <option key={p} value={p}>{label(p)}</option>)}</select></Field></div>
        <div className="grid grid-cols-2 gap-4"><Field title="Start date" error={errors.start_date}><input type="date" className={input} value={data.start_date} onChange={e => setData('start_date', e.target.value)} /></Field><Field title="Due date" error={errors.due_date}><input type="date" className={input} value={data.due_date} onChange={e => setData('due_date', e.target.value)} /></Field></div>
        <div className="grid grid-cols-3 gap-4"><div className="col-span-2"><Field title="Budget" error={errors.budget}><input type="number" min="0" step="0.01" className={input} value={data.budget} onChange={e => setData('budget', e.target.value)} /></Field></div><Field title="Currency" error={errors.currency}><input maxLength={3} className={input} value={data.currency} onChange={e => setData('currency', e.target.value.toUpperCase())} /></Field></div>
        <Field title="Project owner" error={errors.owner_id}><select className={input} value={data.owner_id} onChange={e => setData('owner_id', e.target.value)}><option value="">Assign to me</option>{teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}</select></Field>
        <div className="flex gap-3 pt-2"><button disabled={processing} className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-semibold text-stone-950 hover:bg-amber-400 disabled:opacity-50">{processing ? 'Saving...' : isEdit ? 'Save changes' : 'Create project'}</button><Link href="/projects" className="rounded-lg border border-stone-700 px-5 py-2 text-sm text-stone-300 hover:bg-stone-800">Cancel</Link></div>
    </form></div></AppLayout>;
}
