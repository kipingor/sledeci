/**
 * BUG FIX: Project creation submits silently, nothing happens
 *
 * ROOT CAUSE
 * ──────────
 * The backend ProjectController::rules() declares:
 *   'phase' => ['required', Rule::in(Project::PHASES)]
 *
 * The original form did not include a `phase` field at all.
 * Inertia's useForm sends only the declared form fields. The backend receives
 * no `phase` value, validation fails with 422, but because there was also no
 * <InputError message={form.errors.phase} /> in the JSX, the error was
 * completely invisible. The form appeared to do nothing.
 *
 * FIX
 * ───
 * Add `phase` to the initial form state (default: 'planning') and render a
 * Phase select field + InputError. The form now passes backend validation.
 */

import AppLayout from '@/layouts/app-layout';
import { Head, useForm, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import InputError from '@/components/input-error';
import { cn } from '@/lib/utils';
import {
    FolderOpen, Briefcase, Calendar, DollarSign, ArrowLeft,
    Save, Link2, Users, LayoutGrid, ChevronRight,
} from 'lucide-react';

type Option = { id: number; name?: string; title?: string; email?: string };

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Projects', href: '/projects' },
    { title: 'New Project', href: '/projects/create' },
];

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
    planning:  { label: 'Planning',  dot: 'bg-slate-400' },
    active:    { label: 'Active',    dot: 'bg-emerald-500' },
    on_hold:   { label: 'On Hold',   dot: 'bg-amber-400' },
    completed: { label: 'Completed', dot: 'bg-blue-500'  },
    cancelled: { label: 'Cancelled', dot: 'bg-red-500'   },
};

// PMBOK process group phases — matches Project::PHASES on the backend
const PHASE_CFG: Record<string, { label: string; description: string }> = {
    initiating:              { label: 'Initiating',              description: 'Project charter, stakeholders' },
    planning:                { label: 'Planning',                description: 'WBS, schedule, budget' },
    executing:               { label: 'Executing',               description: 'Deliverables in progress' },
    monitoring_controlling:  { label: 'Monitoring & Controlling', description: 'Track, review, regulate' },
    closing:                 { label: 'Closing',                 description: 'Finalize and handover' },
};

// ── Field component ───────────────────────────────────────────────────────────

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode
}) {
    return (
        <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </Label>
            {children}
            <InputError message={error} />
        </div>
    );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, description, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string; description: string;
    children: React.ReactNode;
}) {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProjectCreate() {
    const {
        opportunities = [], clients = [], owners = [],
        statusOptions = [], phaseOptions = [], currencyOptions = [],
    } = usePage<{
        opportunities: Option[]; clients: Option[]; owners: Option[];
        statusOptions: string[]; phaseOptions: string[];
        currencyOptions: string[];
    }>().props;

    const form = useForm({
        name:           '',
        description:    '',
        opportunity_id: '' as number | '' | null,
        client_id:      '' as number | '' | null,
        owner_id:       '' as number | '' | null,
        status:         statusOptions[0] ?? 'planning',
        // FIX: 'phase' was missing — backend requires it (Rule::in(Project::PHASES))
        // Without this field the form silently returned 422 and nothing happened.
        phase:          phaseOptions[0] ?? 'initiating',
        start_date:     '',
        end_date:       '',
        budget:         '',
        currency:       currencyOptions[0] ?? 'USD',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/projects');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Project" />

            {/* ── Record header ── */}
            <div className="bg-card border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => history.back()}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>

                    {/* Breadcrumb path */}
                    <nav className="flex items-center gap-1.5 text-sm">
                        <a href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">
                            Projects
                        </a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">New Project</span>
                    </nav>
                </div>

                <div className="flex items-center gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">New Project</h1>
                        <p className="text-sm text-muted-foreground">Fill in the details to create your project</p>
                    </div>
                </div>
            </div>

            {/* ── Form body ── */}
            <form onSubmit={handleSubmit}>
                <div className="p-6 max-w-3xl space-y-5">

                    {/* Basic Information */}
                    <Section icon={Briefcase} title="Basic Information" description="Name, description and initial status">
                        <div className="space-y-4">
                            <Field label="Project Name" required error={form.errors.name}>
                                <Input
                                    placeholder="e.g. Website Redesign Q2"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    autoFocus
                                />
                            </Field>

                            <Field label="Description" error={form.errors.description}>
                                <Textarea
                                    placeholder="Describe the project scope, goals and deliverables…"
                                    rows={3}
                                    value={form.data.description ?? ''}
                                    onChange={(e) => form.setData('description', e.target.value)}
                                    className="resize-none"
                                />
                            </Field>

                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Status" required error={form.errors.status}>
                                    <Select
                                        value={form.data.status}
                                        onValueChange={(v) => form.setData('status', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map((s) => {
                                                const cfg = STATUS_CFG[s] ?? { label: s, dot: 'bg-gray-400' };
                                                return (
                                                    <SelectItem key={s} value={s}>
                                                        <div className="flex items-center gap-2">
                                                            <span className={cn('h-2 w-2 rounded-full', cfg.dot)} />
                                                            {cfg.label}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </Field>

                                {/* FIX: Phase field was missing — caused silent 422 on all submissions */}
                                <Field label="PMBOK Phase" required error={form.errors.phase}>
                                    <Select
                                        value={form.data.phase}
                                        onValueChange={(v) => form.setData('phase', v)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select phase" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {phaseOptions.map((p) => {
                                                const cfg = PHASE_CFG[p] ?? { label: p, description: '' };
                                                return (
                                                    <SelectItem key={p} value={p}>
                                                        <div>
                                                            <p className="font-medium">{cfg.label}</p>
                                                            {cfg.description && (
                                                                <p className="text-xs text-muted-foreground">{cfg.description}</p>
                                                            )}
                                                        </div>
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </Field>
                            </div>
                        </div>
                    </Section>

                    {/* Linked Records */}
                    <Section icon={Link2} title="Linked Records" description="Connect to an opportunity, client, and assign a project owner">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Opportunity" error={form.errors.opportunity_id}>
                                <Select
                                    value={String(form.data.opportunity_id ?? '')}
                                    onValueChange={(v) => form.setData('opportunity_id', v ? Number(v) : null)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="No linked opportunity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {opportunities.map((o) => (
                                            <SelectItem key={o.id} value={String(o.id)}>
                                                {o.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Client" error={form.errors.client_id}>
                                <Select
                                    value={String(form.data.client_id ?? '')}
                                    onValueChange={(v) => form.setData('client_id', v ? Number(v) : null)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {clients.map((c) => (
                                            <SelectItem key={c.id} value={String(c.id)}>
                                                {c.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>

                            <Field label="Project Owner" error={form.errors.owner_id}>
                                <Select
                                    value={String(form.data.owner_id ?? '')}
                                    onValueChange={(v) => form.setData('owner_id', v ? Number(v) : null)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign to me" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {owners.map((o) => (
                                            <SelectItem key={o.id} value={String(o.id)}>
                                                {o.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </Section>

                    {/* Timeline & Budget */}
                    <Section icon={Calendar} title="Timeline & Budget" description="Set project dates and financial targets">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Field label="Start Date" error={form.errors.start_date}>
                                <Input
                                    type="date"
                                    value={form.data.start_date ?? ''}
                                    onChange={(e) => form.setData('start_date', e.target.value)}
                                />
                            </Field>

                            <Field label="End Date" error={form.errors.end_date}>
                                <Input
                                    type="date"
                                    value={form.data.end_date ?? ''}
                                    min={form.data.start_date || undefined}
                                    onChange={(e) => form.setData('end_date', e.target.value)}
                                />
                            </Field>

                            <Field label="Budget" error={form.errors.budget ?? form.errors.currency}>
                                <div className="flex gap-2">
                                    <Select
                                        value={form.data.currency}
                                        onValueChange={(v) => form.setData('currency', v)}
                                    >
                                        <SelectTrigger className="w-24 shrink-0">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {currencyOptions.map((c) => (
                                                <SelectItem key={c} value={c}>{c}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={form.data.budget ?? ''}
                                        onChange={(e) => form.setData('budget', e.target.value)}
                                    />
                                </div>
                            </Field>
                        </div>
                    </Section>

                </div>

                {/* ── Sticky footer actions ── */}
                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => history.back()}>
                        Cancel
                    </Button>
                    <Button type="submit" disabled={form.processing} className="gap-2">
                        <Save className="h-4 w-4" />
                        {form.processing ? 'Creating…' : 'Create Project'}
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}