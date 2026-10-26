import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { ArrowLeft, Save } from 'lucide-react';
import { useState } from 'react';

interface Client {
    id: number;
    name: string;
    email: string;
    phone?: string | null;
    company?: string | null;
    address?: string | null;
    notes?: string | null;
    client_since?: string | null;
}

interface Props {
    client: Client;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function ClientEdit({ client }: Props) {
    const [form, setForm] = useState({
        name: client.name ?? '',
        email: client.email ?? '',
        phone: client.phone ?? '',
        company: client.company ?? '',
        address: client.address ?? '',
        notes: client.notes ?? '',
        client_since: client.client_since ? String(client.client_since).slice(0, 10) : '',
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Clients', href: '/clients' },
        { title: client.name, href: `/clients/${client.id}` },
        { title: 'Edit', href: `/clients/${client.id}/edit` },
    ];

    const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        setForm((f) => ({ ...f, [key]: e.target.value }));

    function submit() {
        setSaving(true);
        router.put(`/clients/${client.id}`, form, {
            onError: (e) => {
                setErrors(e as Record<string, string>);
                setSaving(false);
            },
            onSuccess: () => setSaving(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${client.name}`} />

            <div className="border-b border-border bg-card px-6 py-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => history.back()}
                        className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted"
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </button>
                    <h1 className="text-xl font-bold tracking-tight">Edit client</h1>
                </div>
            </div>

            <div className="mx-auto max-w-3xl space-y-5 p-6">
                <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
                    <Field label="Name" error={errors.name}>
                        <Input value={form.name} onChange={set('name')} />
                    </Field>
                    <Field label="Email" error={errors.email}>
                        <Input type="email" value={form.email} onChange={set('email')} />
                    </Field>
                    <Field label="Phone" error={errors.phone}>
                        <Input value={form.phone} onChange={set('phone')} />
                    </Field>
                    <Field label="Company" error={errors.company}>
                        <Input value={form.company} onChange={set('company')} />
                    </Field>
                    <Field label="Client since" error={errors.client_since}>
                        <Input type="date" value={form.client_since} onChange={set('client_since')} />
                    </Field>
                    <div className="sm:col-span-2">
                        <Field label="Address" error={errors.address}>
                            <textarea
                                value={form.address}
                                onChange={set('address')}
                                rows={2}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </Field>
                    </div>
                    <div className="sm:col-span-2">
                        <Field label="Notes" error={errors.notes}>
                            <textarea
                                value={form.notes}
                                onChange={set('notes')}
                                rows={3}
                                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            />
                        </Field>
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" type="button" onClick={() => history.back()}>
                        Cancel
                    </Button>
                    <Button type="button" onClick={submit} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? 'Saving…' : 'Save changes'}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
