/**
 * BUG FIX: projects/edit.tsx — same phase field omission as create.tsx
 * The original edit form did not include `phase` in the form state,
 * causing all edits to hit the backend `phase required` validation rule
 * and silently fail (422 with no visible error).
 *
 * FIX: Added `phase` to useForm initial state (defaulting to project.phase
 * or the first phaseOption), plus the Phase select dropdown + InputError.
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
    Save, Link2, Users, LayoutGrid, AlertCircle, ChevronRight,
} from 'lucide-react';

type Option = { id: number; name?: string; title?: string; email?: string };

const STATUS_CFG: Record<string, { label: string; dot: string }> = {
    planning:  { label: 'Planning',  dot: 'bg-slate-400' },
    active:    { label: 'Active',    dot: 'bg-emerald-500' },
    on_hold:   { label: 'On Hold',   dot: 'bg-amber-400' },
    completed: { label: 'Completed', dot: 'bg-blue-500' },
    cancelled: { label: 'Cancelled', dot: 'bg-red-500' },
};

const PHASE_CFG: Record<string, { label: string; description: string }> = {
    initiating:             { label: 'Initiating',              description: 'Project charter, stakeholders' },
    planning:               { label: 'Planning',                description: 'WBS, schedule, budget' },
    executing:              { label: 'Executing',               description: 'Deliverables in progress' },
    monitoring_controlling: { label: 'Monitoring & Controlling', description: 'Track, review, regulate' },
    closing:                { label: 'Closing',                 description: 'Finalize and handover' },
};

function Section({ icon: Icon, title, description, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string; description: string; children: React.ReactNode;
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

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
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

export default function ProjectEdit() {
    const {
        project, opportunities = [], clients = [], owners = [],
        statusOptions = [], phaseOptions = [], currencyOptions = [],
    } = usePage<{
        project: any; opportunities: Option[]; clients: Option[]; owners: Option[];
        statusOptions: string[]; phaseOptions: string[]; currencyOptions: string[];
    }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Projects', href: '/projects' },
        { title: project?.name ?? 'Project', href: `/projects/${project?.id}` },
        { title: 'Edit', href: `/projects/${project?.id}/edit` },
    ];

    const form = useForm({
        name:           project?.name           ?? '',
        description:    project?.description    ?? '',
        opportunity_id: (project?.opportunity_id ?? '') as number | '' | null,
        client_id:      (project?.client_id      ?? '') as number | '' | null,
        owner_id:       (project?.owner_id       ?? '') as number | '' | null,
        status:         project?.status         ?? statusOptions[0] ?? 'planning',
        // FIX: phase was missing — causes silent 422 on all edit submissions
        phase:          project?.phase          ?? phaseOptions[0] ?? 'initiating',
        start_date:     project?.start_date     ?? '',
        end_date:       project?.end_date       ?? '',
        budget:         project?.budget         ?? '',
        currency:       project?.currency       ?? currencyOptions[0] ?? 'USD',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.put(`/projects/${project.id}`);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${project?.name ?? 'Project'}`} />

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
                    <nav className="flex items-center gap-1.5 text-sm">
                        <a href="/projects" className="text-muted-foreground hover:text-foreground transition-colors">Projects</a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <a href={`/projects/${project?.id}`} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[160px]">
                            {project?.name ?? 'Project'}
                        </a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">Edit</span>
                    </nav>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <FolderOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{project?.name ?? 'Edit Project'}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Update project details below</p>
                    </div>
                </div>
            </div>

            {/* Unsaved changes indicator */}
            {form.isDirty && (
                <div className="flex items-center gap-2 px-6 py-2 bg-amber-50 border-b border-amber-200">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                    <p className="text-xs text-amber-700">You have unsaved changes</p>
                </div>
            )}

            {/* ── Form ── */}
            <form onSubmit={handleSubmit}>
                <div className="p-6 max-w-3xl space-y-5">

                    <Section icon={Briefcase} title="Basic Information" description="Name, description and current status">
                        <div className="space-y-4">
                            <Field label="Project Name" required error={form.errors.name}>
                                <Input value={form.data.name} onChange={e => form.setData('name', e.target.value)} autoFocus />
                            </Field>
                            <Field label="Description" error={form.errors.description}>
                                <Textarea rows={3} value={form.data.description ?? ''} onChange={e => form.setData('description', e.target.value)} className="resize-none" />
                            </Field>
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Field label="Status" required error={form.errors.status}>
                                    <Select value={form.data.status} onValueChange={v => form.setData('status', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                                        <SelectContent>
                                            {statusOptions.map(s => {
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

                                {/* FIX: phase field was missing — caused silent 422 */}
                                <Field label="PMBOK Phase" required error={form.errors.phase}>
                                    <Select value={form.data.phase} onValueChange={v => form.setData('phase', v)}>
                                        <SelectTrigger><SelectValue placeholder="Select phase" /></SelectTrigger>
                                        <SelectContent>
                                            {phaseOptions.map(p => {
                                                const cfg = PHASE_CFG[p] ?? { label: p, description: '' };
                                                return (
                                                    <SelectItem key={p} value={p}>
                                                        <div>
                                                            <p className="font-medium">{cfg.label}</p>
                                                            {cfg.description && <p className="text-xs text-muted-foreground">{cfg.description}</p>}
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

                    <Section icon={Link2} title="Linked Records" description="Opportunity, client and project owner">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Opportunity" error={form.errors.opportunity_id}>
                                <Select value={String(form.data.opportunity_id ?? '')} onValueChange={v => form.setData('opportunity_id', v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder="No linked opportunity" /></SelectTrigger>
                                    <SelectContent>
                                        {opportunities.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Client" error={form.errors.client_id}>
                                <Select value={String(form.data.client_id ?? '')} onValueChange={v => form.setData('client_id', v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                        {clients.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Project Owner" error={form.errors.owner_id}>
                                <Select value={String(form.data.owner_id ?? '')} onValueChange={v => form.setData('owner_id', v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                    <SelectContent>
                                        {owners.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </Section>

                    <Section icon={Calendar} title="Timeline & Budget" description="Project dates and financial targets">
                        <div className="grid sm:grid-cols-3 gap-4">
                            <Field label="Start Date" error={form.errors.start_date}>
                                <Input type="date" value={form.data.start_date ?? ''} onChange={e => form.setData('start_date', e.target.value)} />
                            </Field>
                            <Field label="End Date" error={form.errors.end_date}>
                                <Input type="date" value={form.data.end_date ?? ''} min={form.data.start_date || undefined} onChange={e => form.setData('end_date', e.target.value)} />
                            </Field>
                            <Field label="Budget" error={form.errors.budget ?? form.errors.currency}>
                                <div className="flex gap-2">
                                    <Select value={form.data.currency} onValueChange={v => form.setData('currency', v)}>
                                        <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {currencyOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" step="0.01" min="0" placeholder="0.00" value={form.data.budget ?? ''} onChange={e => form.setData('budget', e.target.value)} />
                                </div>
                            </Field>
                        </div>
                    </Section>
                </div>

                {/* ── Sticky footer ── */}
                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => history.back()}>Discard Changes</Button>
                    <Button type="submit" disabled={form.processing} className="gap-2">
                        <Save className="h-4 w-4" />
                        {form.processing ? 'Saving…' : 'Save Changes'}
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}