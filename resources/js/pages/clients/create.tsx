import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Building2, User, MapPin, FileText, ArrowLeft, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Props {
    prefill?: {
        name?: string; email?: string; phone?: string; company?: string;
        notes?: string; _lead_id?: string; _opportunity_id?: string;
    };
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Clients', href: '/clients' },
    { title: 'New Client', href: '/clients/create' },
];

function Field({ label, required, error, children }: {
    label: string; required?: boolean; error?: string; children: React.ReactNode;
}) {
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

function Section({ icon: Icon, title, description, children }: {
    icon: React.ComponentType<{ className?: string }>;
    title: string; description?: string; children: React.ReactNode;
}) {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-3.5 w-3.5 text-primary" />
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

export default function ClientCreate({ prefill = {} }: Props) {
    const [form, setForm] = useState({
        name:             prefill.name    ?? '',
        email:            prefill.email   ?? '',
        phone:            prefill.phone   ?? '',
        company:          prefill.company ?? '',
        address:          '',
        notes:            prefill.notes   ?? '',
        client_since:     new Date().toISOString().slice(0, 10),
        _lead_id:         prefill._lead_id         ?? '',
        _opportunity_id:  prefill._opportunity_id  ?? '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const isConversion = !!(prefill._lead_id || prefill._opportunity_id);

    function submit() {
        setSaving(true);
        router.post('/clients', form, {
            onError: e => { setErrors(e as any); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm(f => ({ ...f, [k]: e.target.value }));

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={isConversion ? 'Convert to Client' : 'New Client'} />

            {/* ── Record header ── */}
            <div className="bg-card border-b border-border px-6 py-4">
                <div className="flex items-center gap-3">
                    <button type="button" onClick={() => history.back()}
                        className="h-8 w-8 rounded-md flex items-center justify-center hover:bg-muted transition-colors text-muted-foreground">
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <nav className="flex items-center gap-1.5 text-sm">
                        <a href="/clients" className="text-muted-foreground hover:text-foreground transition-colors">Clients</a>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                        <span className="font-semibold">{isConversion ? 'Convert to Client' : 'New Client'}</span>
                    </nav>
                </div>
                <div className="flex items-center gap-3 mt-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">
                            {isConversion ? 'Convert to Client' : 'New Client'}
                        </h1>
                        {isConversion && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Pre-filled from {prefill._lead_id ? 'lead' : 'opportunity'}. Review and confirm.
                            </p>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Form ── */}
            <div className="p-6 max-w-2xl space-y-5">

                <Section icon={User} title="Contact Details" description="Name and contact information">
                    <div className="grid sm:grid-cols-2 gap-4">
                        <Field label="Full Name" required error={errors.name}>
                            <Input value={form.name} onChange={set('name')} placeholder="Jane Doe" autoFocus />
                        </Field>
                        <Field label="Email" required error={errors.email}>
                            <Input type="email" value={form.email} onChange={set('email')} placeholder="jane@acme.com" />
                        </Field>
                        <Field label="Phone" error={errors.phone}>
                            <Input value={form.phone} onChange={set('phone')} placeholder="+254 700 000 000" />
                        </Field>
                        <Field label="Company / Organisation" error={errors.company}>
                            <Input value={form.company} onChange={set('company')} placeholder="Acme Corp" />
                        </Field>
                    </div>
                </Section>

                <Section icon={MapPin} title="Address & Details" description="Physical address and client since date">
                    <div className="space-y-4">
                        <Field label="Address" error={errors.address}>
                            <textarea
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-[72px] resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                value={form.address}
                                onChange={set('address')}
                                placeholder="Physical / mailing address"
                            />
                        </Field>
                        <Field label="Client Since" error={errors.client_since}>
                            <Input type="date" value={form.client_since} onChange={set('client_since')} className="max-w-[180px]" />
                        </Field>
                    </div>
                </Section>

                <Section icon={FileText} title="Notes" description="Any context about this client relationship">
                    <Field label="Internal Notes" error={errors.notes}>
                        <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-2 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                            value={form.notes}
                            onChange={set('notes')}
                            placeholder="Any relevant context about this client…"
                        />
                    </Field>
                </Section>
            </div>

            {/* ── Sticky footer ── */}
            <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center justify-between">
                <Button type="button" variant="ghost" onClick={() => history.back()}>Cancel</Button>
                <Button
                    type="button"
                    onClick={submit}
                    disabled={saving || !form.name || !form.email}
                    className="gap-2"
                >
                    <Save className="h-4 w-4" />
                    {saving ? 'Saving…' : isConversion ? 'Convert to Client' : 'Create Client'}
                </Button>
            </div>
        </AppLayout>
    );
}