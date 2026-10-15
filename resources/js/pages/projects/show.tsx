import { useState } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import api from '@/lib/axios';
import AppLayout from '@/layouts/app-layout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
    AlertTriangle, CheckCircle2, Clock, TrendingUp, TrendingDown,
    Users, Shield, FileWarning, GitPullRequest, BookOpen, Activity,
    PlusCircle, Trash2, Edit, ArrowRight, DollarSign, CheckSquare,
    Circle, RotateCcw, Folder, Calendar, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ── Types ─────────────────────────────────────────────────────────────────────
interface EVM {
    bac: number; pv: number; ev: number; ac: number;
    cv: number; sv: number;
    cpi: number | null; spi: number | null;
    eac: number | null; etc: number | null; vac: number | null; tcpi: number | null;
    cost_status: 'on_track' | 'at_risk' | 'critical' | 'unknown';
    schedule_status: 'on_track' | 'at_risk' | 'critical' | 'unknown';
}
interface Risk { id: number; title: string; category: string; probability: number; impact: number; risk_score: number; response_type: string | null; response_plan: string | null; contingency_plan: string | null; trigger: string | null; status: string; owner?: { id: number; name: string; avatar?: string }; identified_date: string | null; review_date: string | null; notes: string | null }
interface Issue { id: number; title: string; description: string | null; category: string; severity: string; priority: string; status: string; owner?: { name: string }; raised_date: string | null; target_resolution_date: string | null; resolved_date: string | null; impact_description: string | null }
interface Change { id: number; title: string; description: string; change_type: string; status: string; impacts_scope: boolean; impacts_schedule: boolean; impacts_cost: boolean; schedule_impact_days: number | null; cost_impact: number | null; requestedBy?: { name: string }; requested_date: string | null; decision_date: string | null }
interface Stakeholder { id: number; name: string; display_name?: string; role: string | null; organization: string | null; influence: string; interest: string; current_engagement: string; desired_engagement: string; management_strategy?: string; has_engagement_gap?: boolean; user?: { name: string; avatar?: string } }
interface Lesson { id: number; title: string; situation: string; impact: string; recommendation: string; category: string; type: string; phase_captured: string | null; createdBy?: { name: string } }

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmt = (n: number | null | undefined, decimals = 2) =>
    n == null ? '—' : Number(n).toFixed(decimals);
const fmtMoney = (n: number | null | undefined, c = 'USD') =>
    n == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: c, maximumFractionDigits: 0 }).format(n);
const fmtDate = (d: string | null | undefined) =>
    d ? format(new Date(d), 'MMM d, yyyy') : '—';

const STATUS_CFG: Record<string, { label: string; dot: string; pill: string }> = {
    planning:  { label: 'Planning',  dot: 'bg-slate-400',    pill: 'bg-slate-50 text-slate-700 ring-slate-200' },
    active:    { label: 'Active',    dot: 'bg-emerald-500',  pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    on_hold:   { label: 'On Hold',   dot: 'bg-amber-400',    pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    completed: { label: 'Completed', dot: 'bg-blue-500',     pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    cancelled: { label: 'Cancelled', dot: 'bg-red-500',      pill: 'bg-red-50 text-red-600 ring-red-200' },
};

const PHASE_LABEL: Record<string, string> = {
    initiating:             'Initiating',
    planning:               'Planning',
    executing:              'Executing',
    monitoring_controlling: 'Monitoring',
    closing:                'Closing',
};

const SEVERITY_COLOR: Record<string, string> = {
    critical: 'text-red-600',
    high:     'text-orange-600',
    medium:   'text-amber-600',
    low:      'text-slate-500',
};

// ── EVM mini-card ─────────────────────────────────────────────────────────────
function EVMCard({ label, value, subtitle, highlight = 'neutral' }: {
    label: string; value: string; subtitle: string; highlight?: 'good' | 'bad' | 'neutral';
}) {
    return (
        <div className={cn(
            'rounded-lg border p-3 text-center',
            highlight === 'good' ? 'border-emerald-200 bg-emerald-50' :
            highlight === 'bad'  ? 'border-red-200 bg-red-50' :
            'border-border bg-card'
        )}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
            <p className={cn(
                'text-base font-bold tabular-nums mt-0.5',
                highlight === 'good' ? 'text-emerald-700' :
                highlight === 'bad'  ? 'text-red-600' :
                'text-foreground'
            )}>{value}</p>
            <p className="text-[10px] text-muted-foreground leading-tight">{subtitle}</p>
        </div>
    );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProjectShow({
    project, progress, evm, riskSummary, budget, isAtRisk,
    timeline, recentActivity, availableUsers, canManage,
    riskCategories, riskResponseTypes, riskStatuses,
    changeTypes, changeTypeLabels, lessonCategories, lessonTypes, engagementLevels, phaseOptions
}: any) {

    const [activeTab, setActiveTab] = useState('overview');

    const statusCfg = STATUS_CFG[project.status] ?? STATUS_CFG.planning;
    const openIssues   = project.issues?.filter((i: Issue) => !['resolved','closed'].includes(i.status)).length ?? 0;
    const pendingChg   = project.changes?.filter((c: Change) => c.status === 'submitted').length ?? 0;

    const breadcrumbs = [
        { title: 'Projects', href: '/projects' },
        { title: project.name, href: `/projects/${project.id}` },
    ];

    const tabs = [
        { key: 'overview',      label: 'Overview',         icon: Activity },
        { key: 'tasks',         label: 'Tasks',            icon: CheckSquare },
        { key: 'risks',         label: `Risks (${riskSummary?.total ?? 0})`, icon: Shield },
        { key: 'issues',        label: `Issues (${openIssues})`, icon: FileWarning },
        { key: 'changes',       label: `Changes (${pendingChg})`, icon: GitPullRequest },
        { key: 'stakeholders',  label: 'Stakeholders',     icon: Users },
        { key: 'lessons',       label: 'Lessons',          icon: BookOpen },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={project.name} />
            <div className="flex flex-col h-full">

                {/* ── Record header ── */}
                <div className="bg-card border-b border-border">
                    <div className="px-6 pt-5 pb-0">
                        <div className="flex items-start justify-between gap-4 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                    <Folder className="h-5 w-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2.5 flex-wrap">
                                        <h1 className="text-xl font-bold tracking-tight">{project.name}</h1>
                                        <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ring-1', statusCfg.pill)}>
                                            <span className={cn('h-1.5 w-1.5 rounded-full', statusCfg.dot)} />
                                            {statusCfg.label}
                                        </span>
                                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-200 capitalize">
                                            {PHASE_LABEL[project.phase] ?? project.phase?.replace('_', ' ')}
                                        </span>
                                        {isAtRisk && (
                                            <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700 ring-1 ring-red-200">
                                                <AlertTriangle className="h-3 w-3" /> At Risk
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                        {project.owner   && <span>PM: <strong>{project.owner.name}</strong></span>}
                                        {project.sponsor && <span>Sponsor: <strong>{project.sponsor.name}</strong></span>}
                                        {project.client  && <span>Client: <strong>{project.client.name}</strong></span>}
                                        {project.start_date && (
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                {fmtDate(project.start_date)} → {project.end_date ? fmtDate(project.end_date) : '?'}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {canManage && (
                                <div className="flex items-center gap-2 shrink-0">
                                    <Button variant="outline" size="sm" onClick={() =>
                                        router.post(`/projects/${project.id}/advance-phase`, {}, { preserveScroll: true })}>
                                        Advance Phase <ArrowRight className="h-3.5 w-3.5 ml-1" />
                                    </Button>
                                    <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90"
                                        onClick={() => router.visit(`/projects/${project.id}/edit`)}>
                                        <Edit className="h-3.5 w-3.5 mr-1.5" /> Edit
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Highlights bar */}
                    <div className="flex divide-x divide-border/60 border-t border-border bg-muted/20">
                        {[
                            {
                                label: 'Overall Progress',
                                value: (
                                    <div className="flex items-center gap-2">
                                        <div className="w-16 h-1.5 rounded-full bg-muted overflow-hidden">
                                            <div className={cn('h-full rounded-full', progress.overall >= 100 ? 'bg-emerald-500' : 'bg-primary')}
                                                style={{ width: `${progress.overall}%` }} />
                                        </div>
                                        <span className="font-bold tabular-nums">{progress.overall}%</span>
                                    </div>
                                ),
                            },
                            {
                                label: 'Budget (EAC)',
                                value: evm.bac > 0
                                    ? <span className={cn('font-semibold', evm.eac > evm.bac ? 'text-red-600' : 'text-emerald-600')}>
                                        {fmtMoney(evm.eac ?? evm.bac, project.currency)}
                                      </span>
                                    : '—',
                            },
                            {
                                label: 'CPI',
                                value: evm.cpi != null
                                    ? <span className={cn('font-bold', evm.cpi >= 1 ? 'text-emerald-600' : evm.cpi >= 0.8 ? 'text-amber-600' : 'text-red-600')}>
                                        {fmt(evm.cpi)}
                                      </span>
                                    : '—',
                            },
                            {
                                label: 'Team Members',
                                value: <span className="font-semibold">{project.teamMembers?.length ?? 0}</span>,
                            },
                            {
                                label: 'Due Date',
                                value: project.end_date ? (
                                    <span className={cn(isAtRisk ? 'text-red-600 font-medium' : '')}>
                                        {fmtDate(project.end_date)}
                                    </span>
                                ) : '—',
                            },
                        ].map((cell, i) => (
                            <div key={i} className="flex-1 px-4 py-2.5 min-w-0">
                                <p className="record-field-label">{cell.label}</p>
                                <div className="record-field-value mt-0.5">{cell.value}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* ── EVM strip ── */}
                {evm.bac > 0 && (
                    <div className="bg-muted/20 border-b border-border px-6 py-3 shrink-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mr-2">EVM</span>
                            {[
                                { label: 'BAC', value: fmtMoney(evm.bac, project.currency), hi: 'neutral' as const },
                                { label: 'EV',  value: fmtMoney(evm.ev,  project.currency), hi: 'neutral' as const },
                                { label: 'AC',  value: fmtMoney(evm.ac,  project.currency), hi: 'neutral' as const },
                                { label: 'CPI', value: fmt(evm.cpi), hi: (evm.cpi == null ? 'neutral' : evm.cpi >= 1 ? 'good' : 'bad') as any },
                                { label: 'SPI', value: fmt(evm.spi), hi: (evm.spi == null ? 'neutral' : evm.spi >= 1 ? 'good' : 'bad') as any },
                                { label: 'EAC', value: fmtMoney(evm.eac, project.currency), hi: (evm.eac == null ? 'neutral' : evm.eac <= evm.bac ? 'good' : 'bad') as any },
                            ].map(c => (
                                <span key={c.label} className={cn(
                                    'inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1',
                                    c.hi === 'good' ? 'bg-emerald-50 text-emerald-700 ring-emerald-200' :
                                    c.hi === 'bad'  ? 'bg-red-50 text-red-700 ring-red-200' :
                                    'bg-muted text-muted-foreground ring-border'
                                )}>
                                    <span className="font-semibold">{c.label}</span> {c.value}
                                </span>
                            ))}

                            {/* Risk / Issue / Change chips */}
                            <span className="ml-2 text-muted-foreground/40">·</span>
                            <button onClick={() => setActiveTab('risks')}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100 transition-colors">
                                <Shield className="h-3 w-3" />
                                <span className="font-semibold text-red-600">{riskSummary.high}</span> high ·
                                <span className="font-semibold text-amber-600">{riskSummary.medium}</span> medium
                            </button>
                            <button onClick={() => setActiveTab('issues')}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 bg-orange-50 text-orange-700 ring-orange-200 hover:bg-orange-100 transition-colors">
                                <FileWarning className="h-3 w-3" /> {openIssues} open issues
                            </button>
                            <button onClick={() => setActiveTab('changes')}
                                className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ring-1 bg-blue-50 text-blue-700 ring-blue-200 hover:bg-blue-100 transition-colors">
                                <GitPullRequest className="h-3 w-3" /> {pendingChg} pending changes
                            </button>
                        </div>
                    </div>
                )}

                {/* ── Tabs ── */}
                <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                    {/* Tab bar */}
                    <div className="flex border-b border-border bg-card shrink-0 overflow-x-auto">
                        {tabs.map(tab => (
                            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    'flex items-center gap-1.5 px-5 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                                    activeTab === tab.key ? 'sf-tab-active' : 'sf-tab-inactive'
                                )}>
                                <tab.icon className="h-3.5 w-3.5" />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Tab content */}
                    <div className="flex-1 overflow-y-auto bg-background p-6">

                        {/* ── Overview ── */}
                        {activeTab === 'overview' && (
                            <div className="max-w-4xl grid md:grid-cols-2 gap-5">
                                <Card>
                                    <CardHeader><CardTitle className="text-sm">EVM Detail (PMBOK §7.4)</CardTitle></CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-3 text-sm">
                                        {([
                                            ['CV',   evm.cv,   'Cost Variance',          evm.cv >= 0],
                                            ['SV',   evm.sv,   'Schedule Variance',       evm.sv >= 0],
                                            ['ETC',  evm.etc,  'Est. To Complete',        null],
                                            ['VAC',  evm.vac,  'Variance At Completion',  evm.vac != null && evm.vac >= 0],
                                            ['TCPI', evm.tcpi, 'To-Complete PI',          evm.tcpi != null && evm.tcpi <= 1],
                                        ] as [string, number | null, string, boolean | null][]).map(([key, val, label, good]) => (
                                            <div key={key} className="rounded-lg border border-border p-2.5">
                                                <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{key} — {label}</p>
                                                <p className={cn('font-semibold text-sm mt-0.5',
                                                    good === null ? '' : good ? 'text-emerald-600' : 'text-red-600')}>
                                                    {typeof val === 'number' && Math.abs(val) > 100 ? fmtMoney(val, project.currency) : fmt(val)}
                                                </p>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader><CardTitle className="text-sm">Project Charter (PMBOK §4.1)</CardTitle></CardHeader>
                                    <CardContent className="space-y-3 text-sm">
                                        {project.objectives && (
                                            <div>
                                                <p className="record-field-label mb-1">Objectives</p>
                                                <p className="text-muted-foreground">{project.objectives}</p>
                                            </div>
                                        )}
                                        {project.success_criteria?.length > 0 && (
                                            <div>
                                                <p className="record-field-label mb-1">Success Criteria</p>
                                                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                                    {project.success_criteria.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {project.assumptions?.length > 0 && (
                                            <div>
                                                <p className="record-field-label mb-1">Assumptions</p>
                                                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                                    {project.assumptions.map((a: string, i: number) => <li key={i}>{a}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {project.constraints?.length > 0 && (
                                            <div>
                                                <p className="record-field-label mb-1">Constraints</p>
                                                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                                                    {project.constraints.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                                </ul>
                                            </div>
                                        )}
                                        {!project.objectives && !project.success_criteria?.length && (
                                            <p className="text-muted-foreground italic text-sm">
                                                No charter fields defined yet. Edit the project to add objectives and success criteria.
                                            </p>
                                        )}
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {activeTab === 'tasks' && (
                            <TasksTab project={project} canManage={canManage} />
                        )}
                        {activeTab === 'risks' && (
                            <RisksTab project={project} canManage={canManage}
                                riskCategories={riskCategories} riskResponseTypes={riskResponseTypes}
                                riskStatuses={riskStatuses} availableUsers={availableUsers} />
                        )}
                        {activeTab === 'issues' && (
                            <IssuesTab project={project} canManage={canManage} />
                        )}
                        {activeTab === 'changes' && (
                            <ChangesTab project={project} canManage={canManage}
                                changeTypes={changeTypes} changeTypeLabels={changeTypeLabels} />
                        )}
                        {activeTab === 'stakeholders' && (
                            <StakeholdersTab project={project} canManage={canManage}
                                engagementLevels={engagementLevels} />
                        )}
                        {activeTab === 'lessons' && (
                            <LessonsTab project={project} canManage={canManage}
                                lessonCategories={lessonCategories} lessonTypes={lessonTypes} />
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

// ════════════════════════════════════════════════════════════════════════════
// SUB-TAB COMPONENTS — all logic preserved verbatim from original show.tsx
// Only styling classes updated to use design tokens
// ════════════════════════════════════════════════════════════════════════════

// ── Tasks tab ─────────────────────────────────────────────────────────────────
function TasksTab({ project, canManage }: any) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({
        title: '', description: '', wbs_code: '', assignee_id: '',
        priority: 'medium', status: 'not_started', due_date: '',
        estimated_hours: '', parent_id: '',
    });
    const submit = () => {
        post(`/projects/${project.id}/tasks`, {
            onSuccess: () => { reset(); setOpen(false); },
        });
    };
    const tasksByParent = (project.tasks ?? []).filter((t: any) => !t.parent_id);

    function TaskRow({ task, depth = 0 }: { task: any; depth?: number }) {
        const children = (project.tasks ?? []).filter((t: any) => t.parent_id === task.id);
        return (
            <>
                <div className={cn('flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors',
                    depth > 0 && 'ml-6 mt-1')}>
                    {task.status === 'completed'
                        ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                        : task.status === 'in_progress'
                            ? <RotateCcw className="h-4 w-4 text-primary shrink-0 mt-0.5 animate-spin" />
                            : <Circle className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            {task.wbs_code && <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{task.wbs_code}</span>}
                            <span className={cn('font-medium text-sm', task.status === 'completed' && 'line-through text-muted-foreground')}>{task.title}</span>
                            <span className={cn('text-xs px-1.5 py-0.5 rounded ring-1 capitalize',
                                task.priority === 'high'   ? 'bg-red-50 text-red-700 ring-red-200' :
                                task.priority === 'medium' ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                                'bg-slate-50 text-slate-600 ring-slate-200')}>
                                {task.priority}
                            </span>
                        </div>
                        {task.description && <p className="text-xs text-muted-foreground mt-0.5">{task.description}</p>}
                        <div className="flex gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
                            {task.assignee && <span>👤 {task.assignee.name}</span>}
                            {task.due_date && <span>📅 {fmtDate(task.due_date)}</span>}
                            {task.estimated_hours && <span>⏱ {task.estimated_hours}h est.</span>}
                        </div>
                    </div>
                    {canManage && (
                        <button onClick={() => router.delete(`/projects/${project.id}/tasks/${task.id}`, { preserveScroll: true })}
                            className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                {children.map((c: any) => <TaskRow key={c.id} task={c} depth={depth + 1} />)}
            </>
        );
    }

    return (
        <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">
                    Task List <span className="text-muted-foreground font-normal ml-1 text-xs">PMBOK §5.4</span>
                </h3>
                {canManage && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm"><PlusCircle className="h-4 w-4 mr-1" /> Add Task</Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
                            <div className="space-y-3 mt-2">
                                <div><Label>Title *</Label><Input value={data.title} onChange={e => setData('title', e.target.value)} /></div>
                                <div><Label>WBS Code</Label><Input value={data.wbs_code} onChange={e => setData('wbs_code', e.target.value)} placeholder="1.2.3" /></div>
                                <div><Label>Description</Label><Textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={2} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Priority</Label>
                                        <Select value={data.priority} onValueChange={v => setData('priority', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {['low','medium','high','critical'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Due Date</Label><Input type="date" value={data.due_date} onChange={e => setData('due_date', e.target.value)} /></div>
                                </div>
                                <div><Label>Est. Hours</Label><Input type="number" value={data.estimated_hours} onChange={e => setData('estimated_hours', e.target.value)} /></div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={submit} disabled={processing}>Add Task</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <div className="space-y-2">
                {tasksByParent.length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-10">No tasks yet. Add your first task to start building your WBS.</p>
                    : tasksByParent.map((t: any) => <TaskRow key={t.id} task={t} />)}
            </div>
        </div>
    );
}

// ── Risks tab ─────────────────────────────────────────────────────────────────
function RisksTab({ project, canManage, riskCategories, riskResponseTypes, riskStatuses, availableUsers }: any) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        title: '', description: '', category: 'other', probability: '3', impact: '3',
        response_type: '', response_plan: '', contingency_plan: '', trigger: '',
        owner_id: '', status: 'identified', identified_date: '', review_date: '', notes: '',
    });
    const submit = () => { post(`/projects/${project.id}/risks`, { onSuccess: () => { reset(); setOpen(false); } }); };
    const deleteRisk = (id: number) => { if (confirm('Remove this risk?')) router.delete(`/projects/${project.id}/risks/${id}`); };
    const realize = (id: number) => {
        const title = prompt('Issue title (this risk will be converted to an issue):');
        if (title) router.post(`/projects/${project.id}/risks/${id}/realize`, { issue_title: title });
    };

    const riskScore = (r: Risk) => {
        const s = r.risk_score;
        return s >= 16 ? 'bg-red-100 text-red-700' : s >= 9 ? 'bg-orange-100 text-orange-700' : s >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700';
    };

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Risk Register <span className="text-muted-foreground font-normal ml-1 text-xs">PMBOK §11</span></h3>
                {canManage && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-1" /> Add Risk</Button></DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                            <DialogHeader><DialogTitle>Identify Risk</DialogTitle></DialogHeader>
                            <div className="grid grid-cols-2 gap-4 mt-2">
                                <div className="col-span-2"><Label>Title *</Label><Input value={data.title} onChange={e => setData('title', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Description</Label><Textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={2} /></div>
                                <div><Label>Category *</Label>
                                    <Select value={data.category} onValueChange={v => setData('category', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{riskCategories.map((c: string) => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Status</Label>
                                    <Select value={data.status} onValueChange={v => setData('status', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{riskStatuses.map((s: string) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Probability (1–5) *</Label>
                                    <Select value={data.probability} onValueChange={v => setData('probability', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} – {['Very Low','Low','Medium','High','Very High'][n-1]}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Impact (1–5) *</Label>
                                    <Select value={data.impact} onValueChange={v => setData('impact', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={String(n)}>{n} – {['Very Low','Low','Medium','High','Very High'][n-1]}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Response Strategy</Label>
                                    <Select value={data.response_type} onValueChange={v => setData('response_type', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
                                        <SelectContent>{riskResponseTypes.map((t: string) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Owner</Label>
                                    <Select value={data.owner_id} onValueChange={v => setData('owner_id', v)}>
                                        <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                        <SelectContent>{availableUsers.map((u: any) => <SelectItem key={u.id} value={String(u.id)}>{u.name}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="col-span-2"><Label>Response Plan</Label><Textarea value={data.response_plan} onChange={e => setData('response_plan', e.target.value)} rows={2} /></div>
                                <div className="col-span-2"><Label>Contingency Plan</Label><Textarea value={data.contingency_plan} onChange={e => setData('contingency_plan', e.target.value)} rows={2} /></div>
                                <div><Label>Trigger</Label><Input value={data.trigger} onChange={e => setData('trigger', e.target.value)} /></div>
                                <div><Label>Identified Date</Label><Input type="date" value={data.identified_date} onChange={e => setData('identified_date', e.target.value)} /></div>
                                <div><Label>Review Date</Label><Input type="date" value={data.review_date} onChange={e => setData('review_date', e.target.value)} /></div>
                                <div className="col-span-2"><Label>Notes</Label><Textarea value={data.notes} onChange={e => setData('notes', e.target.value)} rows={2} /></div>
                                <div className="col-span-2 flex justify-end gap-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={submit} disabled={processing}>Add Risk</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <div className="space-y-2">
                {(project.risks ?? []).length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-10">No risks identified yet. Proactively identify and log risks.</p>
                    : (project.risks ?? []).map((risk: Risk) => (
                        <div key={risk.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <div>
                                    <span className={cn('text-xs font-bold px-1.5 py-0.5 rounded', riskScore(risk))}>
                                        {risk.probability}×{risk.impact}={risk.risk_score}
                                    </span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{risk.title}</span>
                                        <span className="text-xs text-muted-foreground capitalize bg-muted px-1.5 py-0.5 rounded">{risk.category}</span>
                                        <span className="text-xs text-muted-foreground capitalize">{risk.status}</span>
                                    </div>
                                    {risk.response_plan && <p className="text-xs text-muted-foreground mt-1">Response: {risk.response_plan}</p>}
                                    {risk.owner && <p className="text-xs text-muted-foreground mt-0.5">Owner: {risk.owner.name}</p>}
                                </div>
                                {canManage && (
                                    <div className="flex gap-1 shrink-0">
                                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => realize(risk.id)}>
                                            → Issue
                                        </Button>
                                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteRisk(risk.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ── Issues tab ────────────────────────────────────────────────────────────────
function IssuesTab({ project, canManage }: any) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        title: '', description: '', category: 'technical', severity: 'medium',
        priority: 'medium', status: 'open', owner_id: '', raised_date: '',
        target_resolution_date: '', impact_description: '',
    });
    const submit = () => { post(`/projects/${project.id}/issues`, { onSuccess: () => { reset(); setOpen(false); } }); };

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Issue Log <span className="text-muted-foreground font-normal ml-1 text-xs">PMBOK §4.3.3</span></h3>
                {canManage && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-1" /> Log Issue</Button></DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Log Issue</DialogTitle></DialogHeader>
                            <div className="space-y-3 mt-2">
                                <div><Label>Title *</Label><Input value={data.title} onChange={e => setData('title', e.target.value)} /></div>
                                <div><Label>Description</Label><Textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={2} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Severity</Label>
                                        <Select value={data.severity} onValueChange={v => setData('severity', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{['critical','high','medium','low'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Priority</Label>
                                        <Select value={data.priority} onValueChange={v => setData('priority', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{['critical','high','medium','low'].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div><Label>Target Resolution</Label><Input type="date" value={data.target_resolution_date} onChange={e => setData('target_resolution_date', e.target.value)} /></div>
                                <div><Label>Impact Description</Label><Textarea value={data.impact_description} onChange={e => setData('impact_description', e.target.value)} rows={2} /></div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={submit} disabled={processing}>Log Issue</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <div className="space-y-2">
                {(project.issues ?? []).length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-10">No issues logged.</p>
                    : (project.issues ?? []).map((issue: Issue) => (
                        <div key={issue.id} className={cn('border rounded-lg p-4', ['resolved','closed'].includes(issue.status) ? 'border-border opacity-60' : 'border-border')}>
                            <div className="flex items-start gap-3">
                                {['resolved','closed'].includes(issue.status)
                                    ? <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                    : <AlertCircle className={cn('h-4 w-4 shrink-0 mt-0.5', SEVERITY_COLOR[issue.severity] ?? 'text-muted-foreground')} />}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{issue.title}</span>
                                        <span className={cn('text-xs capitalize', SEVERITY_COLOR[issue.severity])}>{issue.severity}</span>
                                        <span className="text-xs text-muted-foreground capitalize">{issue.status?.replace('_', ' ')}</span>
                                    </div>
                                    {issue.description && <p className="text-xs text-muted-foreground mt-0.5">{issue.description}</p>}
                                    {issue.owner && <p className="text-xs text-muted-foreground">Owner: {issue.owner.name}</p>}
                                    {issue.target_resolution_date && <p className="text-xs text-muted-foreground">Target: {fmtDate(issue.target_resolution_date)}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ── Changes tab ───────────────────────────────────────────────────────────────
function ChangesTab({ project, canManage, changeTypes, changeTypeLabels }: any) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        title: '', description: '', change_type: 'scope', reason: '',
        impacts_scope: false, impacts_schedule: false, impacts_cost: false,
        schedule_impact_days: '', cost_impact: '', requested_date: '',
    });
    const submit = () => { post(`/projects/${project.id}/changes`, { onSuccess: () => { reset(); setOpen(false); } }); };

    const STATUS_PILL: Record<string, string> = {
        submitted: 'bg-blue-50 text-blue-700 ring-blue-200',
        approved:  'bg-emerald-50 text-emerald-700 ring-emerald-200',
        rejected:  'bg-red-50 text-red-600 ring-red-200',
        deferred:  'bg-amber-50 text-amber-700 ring-amber-200',
        withdrawn: 'bg-slate-50 text-slate-600 ring-slate-200',
    };

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Change Log <span className="text-muted-foreground font-normal ml-1 text-xs">PMBOK §4.6</span></h3>
                {canManage && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-1" /> Log Change</Button></DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Log Change Request</DialogTitle></DialogHeader>
                            <div className="space-y-3 mt-2">
                                <div><Label>Title *</Label><Input value={data.title} onChange={e => setData('title', e.target.value)} /></div>
                                <div><Label>Description *</Label><Textarea value={data.description} onChange={e => setData('description', e.target.value)} rows={2} /></div>
                                <div><Label>Change Type</Label>
                                    <Select value={data.change_type} onValueChange={v => setData('change_type', v)}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{changeTypes.map((t: string) => <SelectItem key={t} value={t}>{changeTypeLabels[t] ?? t}</SelectItem>)}</SelectContent>
                                    </Select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Schedule Impact (days)</Label><Input type="number" value={data.schedule_impact_days} onChange={e => setData('schedule_impact_days', e.target.value)} /></div>
                                    <div><Label>Cost Impact</Label><Input type="number" value={data.cost_impact} onChange={e => setData('cost_impact', e.target.value)} /></div>
                                </div>
                                <div><Label>Reason</Label><Textarea value={data.reason} onChange={e => setData('reason', e.target.value)} rows={2} /></div>
                                <div><Label>Requested Date</Label><Input type="date" value={data.requested_date} onChange={e => setData('requested_date', e.target.value)} /></div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={submit} disabled={processing}>Submit</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <div className="space-y-2">
                {(project.changes ?? []).length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-10">No change requests logged.</p>
                    : (project.changes ?? []).map((chg: Change) => (
                        <div key={chg.id} className="border border-border rounded-lg p-4">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{chg.title}</span>
                                        <span className={cn('text-xs px-2 py-0.5 rounded-full ring-1 capitalize', STATUS_PILL[chg.status] ?? STATUS_PILL.submitted)}>
                                            {chg.status}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">{changeTypeLabels[chg.change_type] ?? chg.change_type}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">{chg.description}</p>
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {chg.impacts_scope     && <span className="text-xs text-orange-600">⚠ Scope</span>}
                                        {chg.impacts_schedule  && <span className="text-xs text-orange-600">⚠ Schedule {chg.schedule_impact_days ? `(${chg.schedule_impact_days}d)` : ''}</span>}
                                        {chg.impacts_cost      && <span className="text-xs text-orange-600">⚠ Cost</span>}
                                    </div>
                                </div>
                                <div className="text-right text-xs text-muted-foreground shrink-0">
                                    {chg.requestedBy && <p>By {chg.requestedBy.name}</p>}
                                    {chg.requested_date && <p>{fmtDate(chg.requested_date)}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ── Stakeholders tab ──────────────────────────────────────────────────────────
function StakeholdersTab({ project, canManage, engagementLevels }: any) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        name: '', role: '', organization: '', email: '', phone: '',
        influence: 'medium', interest: 'medium',
        current_engagement: 'neutral', desired_engagement: 'supportive',
        management_strategy: '', notes: '',
    });
    const submit = () => { post(`/projects/${project.id}/stakeholders`, { onSuccess: () => { reset(); setOpen(false); } }); };

    const INFLUENCE_COLOR: Record<string, string> = {
        high: 'text-red-600', medium: 'text-amber-600', low: 'text-slate-500',
    };

    return (
        <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Stakeholder Register <span className="text-muted-foreground font-normal ml-1 text-xs">PMBOK §13</span></h3>
                {canManage && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-1" /> Add Stakeholder</Button></DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Add Stakeholder</DialogTitle></DialogHeader>
                            <div className="space-y-3 mt-2">
                                <div><Label>Name *</Label><Input value={data.name} onChange={e => setData('name', e.target.value)} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Role</Label><Input value={data.role} onChange={e => setData('role', e.target.value)} /></div>
                                    <div><Label>Organization</Label><Input value={data.organization} onChange={e => setData('organization', e.target.value)} /></div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Influence</Label>
                                        <Select value={data.influence} onValueChange={v => setData('influence', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{['high','medium','low'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Interest</Label>
                                        <Select value={data.interest} onValueChange={v => setData('interest', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{['high','medium','low'].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Current Engagement</Label>
                                        <Select value={data.current_engagement} onValueChange={v => setData('current_engagement', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{(engagementLevels ?? []).map((l: string) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Desired Engagement</Label>
                                        <Select value={data.desired_engagement} onValueChange={v => setData('desired_engagement', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{(engagementLevels ?? []).map((l: string) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div><Label>Management Strategy</Label><Textarea value={data.management_strategy} onChange={e => setData('management_strategy', e.target.value)} rows={2} /></div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={submit} disabled={processing}>Add Stakeholder</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <div className="space-y-2">
                {(project.stakeholders ?? []).length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-10">No stakeholders registered.</p>
                    : (project.stakeholders ?? []).map((s: Stakeholder) => (
                        <div key={s.id} className={cn('border rounded-lg p-4', s.has_engagement_gap ? 'border-amber-200 bg-amber-50/20' : 'border-border')}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{s.display_name ?? s.user?.name ?? s.name}</span>
                                        {s.role && <span className="text-xs text-muted-foreground">{s.role}</span>}
                                        {s.organization && <span className="text-xs text-muted-foreground">@ {s.organization}</span>}
                                        {s.has_engagement_gap && <span className="text-xs text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">Gap</span>}
                                    </div>
                                    <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                        <span>Influence: <span className={cn('font-medium', INFLUENCE_COLOR[s.influence])}>{s.influence}</span></span>
                                        <span>Interest: <span className="font-medium">{s.interest}</span></span>
                                        <span>Current: {s.current_engagement} → Desired: {s.desired_engagement}</span>
                                    </div>
                                    {s.management_strategy && <p className="text-xs text-muted-foreground mt-1">Strategy: {s.management_strategy}</p>}
                                </div>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}

// ── Lessons tab ───────────────────────────────────────────────────────────────
function LessonsTab({ project, canManage, lessonCategories, lessonTypes }: any) {
    const [open, setOpen] = useState(false);
    const { data, setData, post, processing, reset } = useForm({
        title: '', situation: '', impact: '', recommendation: '',
        category: 'process', type: 'lesson', phase_captured: '',
    });
    const submit = () => { post(`/projects/${project.id}/lessons`, { onSuccess: () => { reset(); setOpen(false); } }); };

    const TYPE_PILL: Record<string, string> = {
        lesson:       'bg-blue-50 text-blue-700 ring-blue-200',
        best_practice:'bg-emerald-50 text-emerald-700 ring-emerald-200',
        warning:      'bg-amber-50 text-amber-700 ring-amber-200',
    };

    return (
        <div className="space-y-4 max-w-3xl">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-sm">Lessons Learned <span className="text-muted-foreground font-normal ml-1 text-xs">PMBOK §4.4</span></h3>
                {canManage && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild><Button size="sm"><PlusCircle className="h-4 w-4 mr-1" /> Add Lesson</Button></DialogTrigger>
                        <DialogContent className="max-w-lg">
                            <DialogHeader><DialogTitle>Add Lesson Learned</DialogTitle></DialogHeader>
                            <div className="space-y-3 mt-2">
                                <div><Label>Title *</Label><Input value={data.title} onChange={e => setData('title', e.target.value)} /></div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div><Label>Type</Label>
                                        <Select value={data.type} onValueChange={v => setData('type', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{(lessonTypes ?? []).map((t: string) => <SelectItem key={t} value={t}>{t.replace('_', ' ')}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                    <div><Label>Category</Label>
                                        <Select value={data.category} onValueChange={v => setData('category', v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>{(lessonCategories ?? []).map((c: string) => <SelectItem key={c} value={c}>{c.replace('_', ' ')}</SelectItem>)}</SelectContent>
                                        </Select>
                                    </div>
                                </div>
                                <div><Label>Situation *</Label><Textarea value={data.situation} onChange={e => setData('situation', e.target.value)} rows={2} /></div>
                                <div><Label>Impact</Label><Textarea value={data.impact} onChange={e => setData('impact', e.target.value)} rows={2} /></div>
                                <div><Label>Recommendation *</Label><Textarea value={data.recommendation} onChange={e => setData('recommendation', e.target.value)} rows={2} /></div>
                                <div className="flex justify-end gap-2 pt-2">
                                    <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                                    <Button onClick={submit} disabled={processing}>Add</Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>
            <div className="space-y-3">
                {(project.lessons ?? []).length === 0
                    ? <p className="text-sm text-muted-foreground text-center py-10">No lessons documented yet.</p>
                    : (project.lessons ?? []).map((l: Lesson) => (
                        <div key={l.id} className="border border-border rounded-lg p-4 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-medium text-sm">{l.title}</span>
                                        <span className={cn('text-xs px-2 py-0.5 rounded-full ring-1 capitalize', TYPE_PILL[l.type] ?? TYPE_PILL.lesson)}>
                                            {l.type?.replace('_', ' ')}
                                        </span>
                                        <span className="text-xs text-muted-foreground capitalize">{l.category?.replace('_', ' ')}</span>
                                    </div>
                                </div>
                                {l.createdBy && <span className="text-xs text-muted-foreground shrink-0">by {l.createdBy.name}</span>}
                            </div>
                            <div className="space-y-1 text-xs">
                                <p><span className="font-medium text-muted-foreground">Situation:</span> {l.situation}</p>
                                {l.impact && <p><span className="font-medium text-muted-foreground">Impact:</span> {l.impact}</p>}
                                <p><span className="font-medium text-muted-foreground">Recommendation:</span> {l.recommendation}</p>
                            </div>
                        </div>
                    ))}
            </div>
        </div>
    );
}