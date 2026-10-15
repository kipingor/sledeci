/**
 * opportunities/edit.tsx — Amber Obsidian redesign
 *
 * CLEANED UP:
 * - Removed all commented-out dead code (the old Inertia useForm block)
 * - Removed meaningless FormDescription placeholders ("This is where you place…")
 * - Kept react-hook-form + zodResolver exactly as-is (no resolver change needed)
 * - router.put() submission preserved exactly
 *
 * ADDED:
 * - SF record header with breadcrumb path, icon, title
 * - Section-card layout matching projects/create pattern
 * - Sticky footer action bar
 */
import AppLayout from '@/layouts/app-layout';
import { zodResolver } from '@hookform/resolvers/zod';
import { Head, usePage, router } from '@inertiajs/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { Briefcase, ArrowLeft, ChevronRight, Save, User, TrendingUp, Calendar, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

type Option = { id: number; title?: string; name?: string };

const STAGE_LABELS: Record<string, string> = {
    qualification: 'Qualification',
    proposal:      'Proposal',
    negotiation:   'Negotiation',
    closed_won:    'Closed Won',
    closed_lost:   'Closed Lost',
};

const formSchema = z.object({
    title:               z.string().min(2, { message: 'Title must be at least 2 characters.' }),
    summary:             z.string().optional(),
    lead_id:             z.union([z.number(), z.string().length(0), z.null()]).optional(),
    estimated_value:     z.string().optional(),
    currency:            z.string().min(1, { message: 'Currency is required.' }),
    stage:               z.string().min(1, { message: 'Stage is required.' }),
    owner_id:            z.union([z.number(), z.string().length(0), z.null()]).optional(),
    expected_close_date: z.string().optional(),
});

// ── Section card ──────────────────────────────────────────────────────────────
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

export default function OpportunityEdit() {
    const {
        opportunity, leads = [], owners = [], stageOptions = [], currencyOptions = [],
    } = usePage<{
        opportunity: any; leads: Option[]; owners: Option[];
        stageOptions: string[]; currencyOptions: string[];
    }>().props;

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Opportunities', href: '/opportunities' },
        { title: opportunity?.title ?? 'Opportunity', href: `/opportunities/${opportunity?.id}` },
        { title: 'Edit', href: `/opportunities/${opportunity?.id}/edit` },
    ];

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title:               opportunity?.title               ?? '',
            summary:             opportunity?.summary             ?? '',
            lead_id:             (opportunity?.lead_id            ?? '') as number | '' | null,
            estimated_value:     String(opportunity?.estimated_value ?? ''),
            currency:            opportunity?.currency            ?? currencyOptions[0] ?? 'KES',
            stage:               opportunity?.stage               ?? stageOptions[0]   ?? 'qualification',
            owner_id:            (opportunity?.owner_id           ?? '') as number | '' | null,
            expected_close_date: opportunity?.expected_close_date ?? '',
        },
    });

    function onSubmit(data: z.infer<typeof formSchema>) {
        router.put(`/opportunities/${opportunity.id}`, data);
        form.reset(data);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${opportunity?.title ?? 'Opportunity'}`} />

            {/* ── Record header ── */}
            <div className="bg-card border-b border-border px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => router.visit(`/opportunities/${opportunity?.id}`)}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <nav className="flex items-center gap-1.5 text-sm">
                        <a href="/opportunities" className="text-muted-foreground hover:text-foreground transition-colors">Opportunities</a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <a href={`/opportunities/${opportunity?.id}`} className="text-muted-foreground hover:text-foreground transition-colors truncate max-w-[180px]">
                            {opportunity?.title ?? 'Opportunity'}
                        </a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">Edit</span>
                    </nav>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Briefcase className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">{opportunity?.title ?? 'Edit Opportunity'}</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Update opportunity details below</p>
                    </div>
                </div>
            </div>

            {/* ── Form ── */}
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <div className="p-6 max-w-3xl space-y-5">

                        {/* Core info */}
                        <Section icon={Briefcase} title="Opportunity Details" description="Title, stage and summary">
                            <div className="space-y-4">
                                <FormField control={form.control} name="title" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Title <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Website Redesign for Acme Corp" autoFocus {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="stage" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Stage <span className="text-destructive">*</span>
                                        </FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select stage" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {stageOptions.map(s => (
                                                    <SelectItem key={s} value={s}>
                                                        {STAGE_LABELS[s] ?? s.replace('_', ' ')}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="summary" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Summary</FormLabel>
                                        <FormControl>
                                            <Textarea placeholder="Brief description of the opportunity…" rows={3} className="resize-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </Section>

                        {/* Assignment */}
                        <Section icon={User} title="Assignment" description="Lead source and owner">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="lead_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Source Lead</FormLabel>
                                        <Select onValueChange={v => field.onChange(v ? Number(v) : null)}
                                            defaultValue={field.value ? String(field.value) : ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="No linked lead" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {leads.map(l => <SelectItem key={l.id} value={String(l.id)}>{l.title}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="owner_id" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Owner</FormLabel>
                                        <Select onValueChange={v => field.onChange(v ? Number(v) : null)}
                                            defaultValue={field.value ? String(field.value) : ''}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {owners.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </Section>

                        {/* Financials + Timeline */}
                        <Section icon={TrendingUp} title="Financials & Timeline" description="Estimated value, currency and expected close date">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="estimated_value" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated Value</FormLabel>
                                        <div className="flex gap-2">
                                            <FormField control={form.control} name="currency" render={({ field: cf }) => (
                                                <Select onValueChange={cf.onChange} defaultValue={cf.value}>
                                                    <SelectTrigger className="w-24 shrink-0"><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {currencyOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                            <FormControl>
                                                <Input type="number" step="0.01" min="0" placeholder="0.00" className="flex-1" {...field} />
                                            </FormControl>
                                        </div>
                                        <FormMessage />
                                    </FormItem>
                                )} />

                                <FormField control={form.control} name="expected_close_date" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Expected Close Date</FormLabel>
                                        <FormControl>
                                            <Input type="date" value={field.value ?? ''} onChange={field.onChange} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                        </Section>
                    </div>

                    {/* ── Sticky footer ── */}
                    <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
                        <Button type="button" variant="ghost" onClick={() => router.visit(`/opportunities/${opportunity?.id}`)}>
                            Discard Changes
                        </Button>
                        <Button type="submit" disabled={form.formState.isSubmitting} className="gap-2">
                            <Save className="h-4 w-4" />
                            {form.formState.isSubmitting ? 'Saving…' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </Form>
        </AppLayout>
    );
}