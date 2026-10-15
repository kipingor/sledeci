/**
 * opportunities/create.tsx — Amber Obsidian redesign
 * Replaces bare HTML <input className="input"> with design-system components.
 * useForm + form.post() logic preserved exactly.
 */
import AppLayout from '@/layouts/app-layout';
import InputError from '@/components/input-error';
import { Head, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { Briefcase, ChevronRight, Save, TrendingUp, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { id: number; title?: string; name?: string };

const STAGE_LABELS: Record<string, string> = {
    qualification: 'Qualification', proposal: 'Proposal',
    negotiation: 'Negotiation', closed_won: 'Closed Won', closed_lost: 'Closed Lost',
};

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Opportunities', href: '/opportunities' },
    { title: 'Create', href: '/opportunities/create' },
];

function Section({ icon: Icon, title, description, children }: { icon: React.ComponentType<{className?: string}>; title: string; description: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center flex-shrink-0">
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

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function OpportunityCreate() {
    const { leads = [], owners = [], stageOptions = [], currencyOptions = [] } = usePage<{
        leads: Option[]; owners: Option[]; stageOptions: string[]; currencyOptions: string[];
    }>().props;

    const form = useForm({
        title: '', summary: '',
        lead_id: '' as number | '' | null,
        estimated_value: '',
        currency: currencyOptions[0] ?? 'KES',
        stage: stageOptions[0] ?? 'qualification',
        owner_id: '' as number | '' | null,
        expected_close_date: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        form.post('/opportunities');
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Create Opportunity" />

            {/* SF header */}
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/opportunities" className="text-muted-foreground hover:text-foreground transition-colors">Opportunities</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">New Opportunity</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">New Opportunity</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Add a new sales opportunity to the pipeline</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit}>
                <div className="p-6 max-w-3xl space-y-5">
                    <Section icon={Briefcase} title="Opportunity Details" description="Title, stage and summary">
                        <div className="space-y-4">
                            <Field label="Title" required error={form.errors.title}>
                                <Input value={form.data.title} onChange={e => form.setData('title', e.target.value)} autoFocus placeholder="e.g. Website Redesign for Acme Corp" />
                            </Field>
                            <Field label="Stage" required error={form.errors.stage}>
                                <Select value={form.data.stage} onValueChange={v => form.setData('stage', v)}>
                                    <SelectTrigger><SelectValue placeholder="Select stage" /></SelectTrigger>
                                    <SelectContent>
                                        {stageOptions.map(s => <SelectItem key={s} value={s}>{STAGE_LABELS[s] ?? s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Summary" error={form.errors.summary}>
                                <Textarea rows={3} value={form.data.summary ?? ''} onChange={e => form.setData('summary', e.target.value)} className="resize-none" placeholder="Brief description…" />
                            </Field>
                        </div>
                    </Section>

                    <Section icon={User} title="Assignment" description="Source lead and owner">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Source Lead" error={form.errors.lead_id}>
                                <Select value={String(form.data.lead_id ?? '')} onValueChange={v => form.setData('lead_id', v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder="No linked lead" /></SelectTrigger>
                                    <SelectContent>
                                        {leads.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Owner" error={form.errors.owner_id}>
                                <Select value={String(form.data.owner_id ?? '')} onValueChange={v => form.setData('owner_id', v ? Number(v) : null)}>
                                    <SelectTrigger><SelectValue placeholder="Assign to me" /></SelectTrigger>
                                    <SelectContent>
                                        {owners.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </Field>
                        </div>
                    </Section>

                    <Section icon={TrendingUp} title="Financials & Timeline" description="Estimated value and expected close date">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Estimated Value" error={form.errors.estimated_value}>
                                <div className="flex gap-2">
                                    <Select value={form.data.currency} onValueChange={v => form.setData('currency', v)}>
                                        <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {currencyOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <Input type="number" step="0.01" min="0" placeholder="0.00" className="flex-1"
                                        value={form.data.estimated_value ?? ''} onChange={e => form.setData('estimated_value', e.target.value)} />
                                </div>
                            </Field>
                            <Field label="Expected Close Date" error={form.errors.expected_close_date}>
                                <Input type="date" value={form.data.expected_close_date ?? ''} onChange={e => form.setData('expected_close_date', e.target.value)} />
                            </Field>
                        </div>
                    </Section>
                </div>

                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => history.back()}>Cancel</Button>
                    <Button type="submit" disabled={form.processing} className="gap-2">
                        <Save className="h-4 w-4" />
                        {form.processing ? 'Saving…' : 'Create Opportunity'}
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}