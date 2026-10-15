import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import InputError from '@/components/input-error';
import {
    Sparkles, User, Building2, MapPin, MessageSquare,
    ArrowLeft, Save, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Contacts', href: '/contacts' },
    { title: 'Add Contact', href: '/contacts/create' },
];

const SOURCES = [
    { value: 'networking_event', label: 'Networking Event' },
    { value: 'conference',       label: 'Conference / Summit' },
    { value: 'referral',         label: 'Referral' },
    { value: 'cold_outreach',    label: 'Cold Outreach' },
    { value: 'social_media',     label: 'Social Media' },
    { value: 'other',            label: 'Other' },
];

// ── Shared section card ───────────────────────────────────────────────────────
function Section({ icon: Icon, title, description, children, highlight = false }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string; description?: string;
    children: React.ReactNode;
    highlight?: boolean;
}) {
    return (
        <div className={cn(
            'border rounded-lg overflow-hidden',
            highlight
                ? 'border-primary/30 bg-primary/5'
                : 'border-border bg-card'
        )}>
            <div className={cn(
                'flex items-center gap-3 px-5 py-3.5 border-b',
                highlight ? 'border-primary/20 bg-primary/8' : 'border-border bg-muted/30'
            )}>
                <div className={cn(
                    'h-7 w-7 rounded-md flex items-center justify-center shrink-0',
                    highlight ? 'bg-primary/20' : 'bg-primary/10'
                )}>
                    <Icon className={cn('h-3.5 w-3.5', highlight ? 'text-primary' : 'text-primary')} />
                </div>
                <div>
                    <p className="text-sm font-semibold">{title}</p>
                    {description && <p className="text-xs text-muted-foreground">{description}</p>}
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

// ── Field pair ────────────────────────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ContactCreate() {
    const { data, setData, post, processing, errors } = useForm({
        name: '', email: '', phone: '', company: '', role: '',
        event_name: '', event_location: '', met_at: '',
        source: 'networking_event',
        talking_points: '', notes: '',
    });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Networking Contact" />

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
                        <a href="/contacts" className="text-muted-foreground hover:text-foreground transition-colors">Contacts</a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">Add Contact</span>
                    </nav>
                </div>
                <div className="flex items-start gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Add Networking Contact</h1>
                        <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            AI will draft a personalised email and schedule a 3-touch follow-up trail
                        </p>
                    </div>
                </div>
            </div>

            {/* ── Form ── */}
            <form onSubmit={e => { e.preventDefault(); post('/contacts'); }}>
                <div className="p-6 max-w-2xl space-y-5">

                    {/* Contact Details */}
                    <Section icon={User} title="Contact Details">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Full Name" required error={errors.name}>
                                <Input
                                    value={data.name}
                                    onChange={e => setData('name', e.target.value)}
                                    placeholder="Jane Smith"
                                />
                            </Field>
                            <Field label="Email" error={errors.email}>
                                <Input
                                    type="email"
                                    value={data.email}
                                    onChange={e => setData('email', e.target.value)}
                                    placeholder="jane@company.com"
                                />
                            </Field>
                            <Field label="Phone" error={errors.phone}>
                                <Input
                                    value={data.phone}
                                    onChange={e => setData('phone', e.target.value)}
                                    placeholder="+254 700 000 000"
                                />
                            </Field>
                            <Field label="Role / Title" error={errors.role}>
                                <Input
                                    value={data.role}
                                    onChange={e => setData('role', e.target.value)}
                                    placeholder="Head of Procurement"
                                />
                            </Field>
                        </div>
                    </Section>

                    {/* Company */}
                    <Section icon={Building2} title="Company">
                        <Field label="Company Name" error={errors.company}>
                            <Input
                                value={data.company}
                                onChange={e => setData('company', e.target.value)}
                                placeholder="Acme Corporation"
                            />
                        </Field>
                    </Section>

                    {/* Where We Met */}
                    <Section icon={MapPin} title="Where We Met" description="Used to personalise outreach context">
                        <div className="grid sm:grid-cols-2 gap-4">
                            <Field label="Source" error={errors.source}>
                                <Select value={data.source} onValueChange={v => setData('source', v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {SOURCES.map(s => (
                                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </Field>
                            <Field label="Date Met" error={errors.met_at}>
                                <Input
                                    type="date"
                                    value={data.met_at}
                                    onChange={e => setData('met_at', e.target.value)}
                                />
                            </Field>
                            <Field label="Event Name" error={errors.event_name}>
                                <Input
                                    value={data.event_name}
                                    onChange={e => setData('event_name', e.target.value)}
                                    placeholder="Tech Summit 2026"
                                />
                            </Field>
                            <Field label="Location" error={errors.event_location}>
                                <Input
                                    value={data.event_location}
                                    onChange={e => setData('event_location', e.target.value)}
                                    placeholder="Nairobi, Kenya"
                                />
                            </Field>
                        </div>
                    </Section>

                    {/* AI Talking Points — highlighted section */}
                    <Section
                        icon={MessageSquare}
                        title="Talking Points"
                        description="The AI uses these notes to personalise your emails — more detail = better emails"
                        highlight
                    >
                        <div className="space-y-4">
                            <Field label="Key Discussion Points" error={errors.talking_points}>
                                <Textarea
                                    value={data.talking_points}
                                    onChange={e => setData('talking_points', e.target.value)}
                                    placeholder="e.g. They mentioned struggling with manual reporting. Currently evaluating software for Q2. Budget approved. Interested in our analytics module. Frustrated with their current vendor's slow support."
                                    rows={5}
                                    className="bg-card resize-none"
                                />
                                <p className="text-xs text-muted-foreground mt-1">
                                    Include pain points, interests, goals, and specific things they mentioned
                                </p>
                            </Field>
                            <Field label="Private Notes (not used in AI emails)" error={errors.notes}>
                                <Textarea
                                    value={data.notes}
                                    onChange={e => setData('notes', e.target.value)}
                                    placeholder="Internal notes…"
                                    rows={2}
                                    className="bg-card resize-none"
                                />
                            </Field>
                        </div>
                    </Section>
                </div>

                {/* ── Sticky footer ── */}
                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
                    <Button type="button" variant="ghost" onClick={() => history.back()}>Cancel</Button>
                    <Button
                        type="submit"
                        disabled={processing}
                        className="gap-2 min-w-[220px] bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        {processing ? (
                            <>
                                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                Generating follow-up plan…
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-3.5 w-3.5" />
                                Save &amp; Generate Follow-up Plan
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </AppLayout>
    );
}