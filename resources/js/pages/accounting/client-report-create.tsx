/**
 * accounting/client-report-create.tsx — Amber Obsidian redesign
 *
 * ALL logic preserved exactly:
 *  - api.get('/client-report-metrics') with debounce
 *  - buildProjectContent() / buildGeneralTemplate() generators
 *  - handleClientChange / handleTypeChange / regenerate / submit
 *  - router.post('/client-reports') with error handling
 *
 * Only layout/styling changes.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, BarChart3, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting',      href: '/accounting' },
    { title: 'Client Reports',  href: '/client-reports' },
    { title: 'New Report',      href: '/client-reports/create' },
];

const fmt = (n: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n ?? 0);
const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const periodLabel = (start: string) =>
    new Date(start).toLocaleString('en-US', { month: 'long', year: 'numeric' });

interface ClientStub  { id: number; name: string; email: string }
interface ProjectStub { id: number; name: string; client_id: number | null; status: string }
interface TaskStub         { id: number; title: string; completed_at?: string | null; assignee?: string }
interface DelayedTaskStub  { id: number; title: string; due?: string; delay_reason?: string; mitigation?: string; assignee?: string }
interface UpcomingTaskStub { title: string; due?: string; priority: string; assignee?: string }
interface ProjectMetrics {
    id: number; name: string; status: string;
    tasks_total: number; tasks_done: number;
    hours_estimated: number; hours_spent: number;
    completed_tasks: TaskStub[];
    delayed_tasks:   DelayedTaskStub[];
    wins:            TaskStub[];
    upcoming_tasks:  UpcomingTaskStub[];
}
interface Metrics {
    type: 'project' | 'general';
    invoices_total: number; invoices_paid: number;
    billed: number; collected: number; outstanding: number;
    projects: ProjectMetrics[];
}
interface Props {
    clientsWithProjects: ClientStub[];
    allClients:          ClientStub[];
    projects:            ProjectStub[];
}

// ── Content generators (preserved verbatim) ────────────────────────────────
function buildProjectContent(clientName: string, label: string, metrics: Metrics): string {
    const L: string[] = [];
    L.push(`# ${label} – Project Report`);
    L.push('');
    L.push(`Dear ${clientName},`);
    L.push('');
    L.push('Please find below a summary of project activities and progress for the reporting period.');
    for (const p of metrics.projects) {
        const pct = p.tasks_total > 0 ? Math.round((p.tasks_done / p.tasks_total) * 100) : 0;
        L.push(''); L.push(`## ${p.name}`);
        L.push(`**Progress:** ${p.tasks_done} of ${p.tasks_total} tasks completed (${pct}%)`);
        if (p.hours_estimated > 0) L.push(`**Hours:** ${p.hours_spent}h spent / ${p.hours_estimated}h estimated`);
        if (p.completed_tasks.length > 0) {
            L.push(''); L.push('### ✅ Completed This Period');
            for (const t of p.completed_tasks) {
                const who  = t.assignee ? ` *(${t.assignee})*` : '';
                const when = t.completed_at ? ` — ${fmtDate(t.completed_at)}` : '';
                L.push(`- ${t.title}${who}${when}`);
            }
        }
        if (p.wins.length > 0) {
            L.push(''); L.push('### 🏆 Wins');
            for (const w of p.wins) L.push(`- **${w.title}** delivered on schedule${w.assignee ? ` by ${w.assignee}` : ''}`);
        }
        if (p.delayed_tasks.length > 0) {
            L.push(''); L.push('### ⚠ Issues & Delays');
            for (const d of p.delayed_tasks) {
                const due = d.due ? ` (due ${fmtDate(d.due)})` : '';
                const who = d.assignee ? `, assigned to ${d.assignee}` : '';
                L.push(`- **${d.title}**${due}${who}`);
                if (d.delay_reason) L.push(`  - *Cause:* ${d.delay_reason}`);
                L.push(`  - *Mitigation:* ${d.mitigation || '[Add mitigation steps here]'}`);
            }
        }
        if (p.upcoming_tasks.length > 0) {
            L.push(''); L.push('### 📋 Upcoming Work');
            for (const u of p.upcoming_tasks) {
                const due = u.due ? ` — due ${fmtDate(u.due)}` : '';
                const who = u.assignee ? ` *(${u.assignee})*` : '';
                L.push(`- ${u.title}${who}${due}`);
            }
        }
    }
    L.push(''); L.push('## 💳 Billing Summary');
    L.push(`- **Invoiced:** ${fmt(metrics.billed)}`);
    L.push(`- **Collected:** ${fmt(metrics.collected)}`);
    if (metrics.outstanding > 0) L.push(`- **Overdue:** ${fmt(metrics.outstanding)} — *please review outstanding invoices*`);
    L.push(`- **Invoices:** ${metrics.invoices_paid} of ${metrics.invoices_total} paid`);
    L.push(''); L.push('---');
    L.push("*If you have any questions about this report, please don't hesitate to reach out.*");
    return L.join('\n');
}

function buildGeneralTemplate(clientName: string, label: string, metrics: Metrics): string {
    return `# ${label} – Client Update

Dear ${clientName},

Please find below our regular update for the period ending ${label}.

## General Update

[Summarise the key activities, interactions, and outcomes from this period.]

## Work Completed

[List deliverables, meetings, or services provided this period.]

## Upcoming

[Outline what is planned for the next period.]

## Billing Summary

- **Invoiced:** ${fmt(metrics.billed)}
- **Collected:** ${fmt(metrics.collected)}${metrics.outstanding > 0 ? `\n- **Overdue:** ${fmt(metrics.outstanding)} — please review outstanding invoices` : ''}
- **Invoices:** ${metrics.invoices_paid} of ${metrics.invoices_total} paid

## Notes

[Any additional items, risks, or items requiring client attention.]

---
*If you have any questions, please don't hesitate to reach out.*`;
}

// ── Component ──────────────────────────────────────────────────────────────
export default function ClientReportCreate({ clientsWithProjects, allClients, projects }: Props) {
    const today        = new Date().toISOString().slice(0, 10);
    const firstOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);

    const [reportType,      setReportType]      = useState<'project' | 'general'>('project');
    const [form,            setForm]            = useState({
        client_id: '', project_id: '', title: '',
        period_type: 'monthly', period_start: firstOfMonth, period_end: today, content: '',
    });
    const [saving,          setSaving]          = useState(false);
    const [loadingMetrics,  setLoadingMetrics]  = useState(false);
    const [metrics,         setMetrics]         = useState<Metrics | null>(null);
    const [errors,          setErrors]          = useState<Record<string, string>>({});

    const clientList      = reportType === 'project' ? clientsWithProjects : allClients;
    const clientProjects  = form.client_id ? projects.filter(p => p.client_id === Number(form.client_id)) : [];

    const fetchMetrics = useCallback(async (clientId: string, projectId: string, from: string, to: string, type: 'project' | 'general') => {
        if (!clientId) { setMetrics(null); return; }
        setLoadingMetrics(true);
        try {
            const params = new URLSearchParams({ client_id: clientId, from, to, type, ...(projectId ? { project_id: projectId } : {}) });
            const res = await api.get(`/client-report-metrics?${params}`);
            setMetrics(res.data);
        } catch { setMetrics(null); }
        finally { setLoadingMetrics(false); }
    }, []);

    useEffect(() => {
        if (!form.client_id) { setMetrics(null); return; }
        const t = setTimeout(() => fetchMetrics(form.client_id, form.project_id, form.period_start, form.period_end, reportType), 300);
        return () => clearTimeout(t);
    }, [form.client_id, form.project_id, form.period_start, form.period_end, reportType]);

    useEffect(() => {
        if (!metrics || !form.client_id) return;
        const client  = clientList.find(c => c.id === Number(form.client_id));
        if (!client) return;
        const label   = periodLabel(form.period_start);
        const content = reportType === 'project' ? buildProjectContent(client.name, label, metrics) : buildGeneralTemplate(client.name, label, metrics);
        setForm(f => ({ ...f, content }));
    }, [metrics, reportType]);

    function handleClientChange(clientId: string) {
        const client = clientList.find(c => c.id === Number(clientId));
        const label  = periodLabel(form.period_start);
        setForm(f => ({ ...f, client_id: clientId, project_id: '', title: client ? `${client.name} – ${label} Report` : '', content: '' }));
        setMetrics(null);
    }
    function handleTypeChange(type: 'project' | 'general') {
        setReportType(type);
        setForm(f => ({ ...f, client_id: '', project_id: '', content: '' }));
        setMetrics(null);
    }
    function regenerate() {
        if (!metrics || !form.client_id) return;
        const client = clientList.find(c => c.id === Number(form.client_id));
        if (!client) return;
        const label   = periodLabel(form.period_start);
        const content = reportType === 'project' ? buildProjectContent(client.name, label, metrics) : buildGeneralTemplate(client.name, label, metrics);
        setForm(f => ({ ...f, content }));
    }
    function submit() {
        setSaving(true);
        router.post('/client-reports', { ...form, report_type: reportType }, {
            onError:   e  => { setErrors(e); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    const canGenerate = !!form.client_id && !loadingMetrics;
    const hasProject  = reportType === 'project';

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Client Report" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <nav className="flex items-center gap-1.5 text-sm">
                            <a href="/client-reports" className="text-muted-foreground hover:text-foreground transition-colors">Client Reports</a>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <span className="font-semibold">New Report</span>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <BarChart3 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">New Client Report</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">
                                {reportType === 'project'
                                    ? 'Auto-generated from project task data — completed tasks, wins, delays, mitigations.'
                                    : 'Standard template for client updates not tied to a specific project.'}
                            </p>
                        </div>
                    </div>

                    {/* Report type toggle */}
                    <div className="flex gap-1 p-1 bg-muted rounded-lg w-fit mt-3">
                        {(['project', 'general'] as const).map(t => (
                            <button key={t} onClick={() => handleTypeChange(t)}
                                className={cn(
                                    'px-4 py-1.5 rounded-md text-xs font-medium transition-colors',
                                    reportType === t ? 'bg-card shadow text-foreground' : 'text-muted-foreground hover:text-foreground'
                                )}>
                                {t === 'project' ? '📋 Project Report' : '📄 General Report'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto bg-background p-6">
                    <div className="max-w-4xl mx-auto">
                        <div className="grid lg:grid-cols-3 gap-5">

                            {/* Left: main form */}
                            <div className="lg:col-span-2 space-y-5">

                                {/* Report details */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                                        <p className="text-sm font-semibold">Report Details</p>
                                    </div>
                                    <div className="p-5 space-y-4">
                                        <div className="grid sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                                                    Client *
                                                    {hasProject && <span className="ml-1.5 normal-case text-[10px] font-normal">(with projects only)</span>}
                                                </label>
                                                <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                    value={form.client_id} onChange={e => handleClientChange(e.target.value)}>
                                                    <option value="">{clientList.length === 0 ? (hasProject ? 'No clients with projects found' : 'No clients found') : 'Select client…'}</option>
                                                    {clientList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                                </select>
                                                {errors.client_id && <p className="text-xs text-destructive mt-1">{errors.client_id}</p>}
                                                {hasProject && clientsWithProjects.length === 0 && (
                                                    <p className="text-xs text-amber-600 mt-1">No clients have projects yet. Create a project first, or switch to General Report.</p>
                                                )}
                                            </div>

                                            {hasProject && (
                                                <div>
                                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">
                                                        Project <span className="normal-case text-[10px] font-normal">(optional — all if blank)</span>
                                                    </label>
                                                    <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                                        value={form.project_id}
                                                        onChange={e => setForm(f => ({ ...f, project_id: e.target.value }))}
                                                        disabled={!form.client_id}>
                                                        <option value="">All projects</option>
                                                        {clientProjects.map(p => (
                                                            <option key={p.id} value={p.id}>{p.name}{p.status !== 'active' ? ` (${p.status})` : ''}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            )}

                                            <div className="sm:col-span-2">
                                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 block">Report Title *</label>
                                                <Input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                                                    placeholder="e.g. Acme Corp – March 2025 Report" />
                                                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Content editor */}
                                <div className="bg-card border border-border rounded-lg overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
                                        <div>
                                            <p className="text-sm font-semibold">Report Content</p>
                                            <p className="text-[10px] text-muted-foreground mt-0.5">Markdown supported. Edit freely after generation.</p>
                                        </div>
                                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5"
                                            onClick={regenerate} disabled={!canGenerate}>
                                            {loadingMetrics
                                                ? <><RefreshCw className="h-3 w-3 animate-spin" /> Loading…</>
                                                : <><span>✨</span> Regenerate</>}
                                        </Button>
                                    </div>
                                    <div className="p-5">
                                        {!form.content && !loadingMetrics && (
                                            <div className="flex flex-col items-center justify-center h-24 rounded-md border-2 border-dashed border-border text-center text-sm text-muted-foreground mb-3">
                                                {!form.client_id ? 'Select a client to generate report content' : 'Click ✨ Regenerate or start typing below'}
                                            </div>
                                        )}
                                        {loadingMetrics && !form.content && (
                                            <div className="flex items-center justify-center h-24 text-sm text-muted-foreground">
                                                <RefreshCw className="h-4 w-4 animate-spin mr-2" /> Fetching data…
                                            </div>
                                        )}
                                        <textarea
                                            className="w-full rounded-md border border-input bg-background px-3 py-2.5 text-sm font-mono min-h-[400px] resize-y focus:outline-none focus:ring-2 focus:ring-ring"
                                            value={form.content}
                                            onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                                            placeholder="Report content (Markdown)…"
                                        />
                                        {errors.content && <p className="text-xs text-destructive mt-1">{errors.content}</p>}
                                    </div>
                                </div>
                            </div>

                            {/* Right sidebar */}
                            <div className="space-y-4">

                                {/* Period */}
                                <div className="bg-card border border-border rounded-lg p-5 space-y-3">
                                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Period</h2>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Period Type</label>
                                        <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                            value={form.period_type} onChange={e => setForm(f => ({ ...f, period_type: e.target.value }))}>
                                            {[['weekly','Weekly'],['monthly','Monthly'],['quarterly','Quarterly'],['custom','Custom']].map(([v,l]) => (
                                                <option key={v} value={v}>{l}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Start Date *</label>
                                        <Input type="date" className="h-8 text-xs" value={form.period_start}
                                            onChange={e => setForm(f => ({ ...f, period_start: e.target.value }))} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">End Date *</label>
                                        <Input type="date" className="h-8 text-xs" value={form.period_end}
                                            onChange={e => setForm(f => ({ ...f, period_end: e.target.value }))} />
                                    </div>
                                </div>

                                {/* Metrics snapshot */}
                                {metrics && (
                                    <div className="bg-card border border-border rounded-lg p-5">
                                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Data Snapshot</h3>
                                        <div className="space-y-1.5 text-xs">
                                            <div className="flex justify-between"><span className="text-muted-foreground">Invoices</span><span>{metrics.invoices_paid}/{metrics.invoices_total} paid</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Billed</span><span className="font-semibold">{fmt(metrics.billed)}</span></div>
                                            <div className="flex justify-between"><span className="text-muted-foreground">Collected</span><span className="font-semibold text-emerald-600">{fmt(metrics.collected)}</span></div>
                                            {metrics.outstanding > 0 && (
                                                <div className="flex justify-between"><span className="text-muted-foreground">Overdue</span><span className="font-semibold text-red-600">{fmt(metrics.outstanding)}</span></div>
                                            )}
                                            {metrics.projects?.map(p => (
                                                <div key={p.id} className="border-t border-border pt-2 mt-2">
                                                    <p className="font-semibold mb-1">{p.name}</p>
                                                    <div className="flex justify-between"><span className="text-muted-foreground">Tasks</span><span>{p.tasks_done}/{p.tasks_total} done</span></div>
                                                    {p.wins.length > 0 && <div className="flex justify-between text-emerald-600"><span>🏆 Wins</span><span>{p.wins.length}</span></div>}
                                                    {p.delayed_tasks.length > 0 && <div className="flex justify-between text-amber-600"><span>⚠ Delayed</span><span>{p.delayed_tasks.length}</span></div>}
                                                    {p.hours_estimated > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Hours</span><span>{p.hours_spent}h / {p.hours_estimated}h</span></div>}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <Button className="w-full" onClick={submit}
                                    disabled={saving || !form.client_id || !form.title || !form.content}>
                                    {saving ? 'Saving…' : 'Create Report'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}