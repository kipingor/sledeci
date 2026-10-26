import { Head, useForm } from '@inertiajs/react';
import { Linkedin, Mail, MapPin, Phone } from 'lucide-react';
import type { FormEvent } from 'react';
import PublicLayout from '@/components/site/public-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as contactRoutes from '@/routes/contact';

interface Props {
    details: { email?: string | null; phone?: string | null; address?: string | null; linkedin?: string | null };
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="text-sm font-medium">{label}</label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function Contact({ details }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: '',
        phone: '',
        company: '',
        subject: '',
        message: '',
        website: '', // honeypot: must stay empty
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        post(contactRoutes.store().url, { preserveScroll: true, onSuccess: () => reset() });
    }

    const rows = [
        { icon: Mail, label: details.email, href: details.email ? `mailto:${details.email}` : undefined },
        { icon: Phone, label: details.phone, href: details.phone ? `tel:${details.phone}` : undefined },
        { icon: MapPin, label: details.address },
        { icon: Linkedin, label: details.linkedin ? 'Follow us on LinkedIn' : null, href: details.linkedin ?? undefined },
    ].filter((r) => r.label);

    return (
        <PublicLayout>
            <Head title="Contact us" />

            <section className="mx-auto grid max-w-5xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-5">
                <div className="md:col-span-2">
                    <h1 className="text-4xl font-bold tracking-tight">Contact us</h1>
                    <p className="mt-3 text-muted-foreground">Questions, a demo request or a partnership idea? Send us a message and we will reply as soon as we can.</p>
                    <ul className="mt-6 space-y-4">
                        {rows.map(({ icon: Icon, label, href }) => (
                            <li key={String(label)} className="flex items-start gap-3 text-sm">
                                <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                {href ? (
                                    <a href={href} className="hover:underline" {...(href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
                                        {label}
                                    </a>
                                ) : (
                                    <span>{label}</span>
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                <form onSubmit={submit} className="space-y-4 rounded-xl border border-border bg-card p-6 md:col-span-3" noValidate>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <Field label="Your name" error={errors.name}>
                            <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoComplete="name" required />
                        </Field>
                        <Field label="Email" error={errors.email}>
                            <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} autoComplete="email" required />
                        </Field>
                        <Field label="Phone (optional)" error={errors.phone}>
                            <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} autoComplete="tel" />
                        </Field>
                        <Field label="Company (optional)" error={errors.company}>
                            <Input value={data.company} onChange={(e) => setData('company', e.target.value)} autoComplete="organization" />
                        </Field>
                    </div>
                    <Field label="Subject (optional)" error={errors.subject}>
                        <Input value={data.subject} onChange={(e) => setData('subject', e.target.value)} />
                    </Field>
                    <Field label="Message" error={errors.message}>
                        <Textarea rows={6} value={data.message} onChange={(e) => setData('message', e.target.value)} required />
                    </Field>

                    {/* Honeypot: hidden from people, tempting to bots. */}
                    <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                        <label>
                            Leave this field empty
                            <input type="text" tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => setData('website', e.target.value)} />
                        </label>
                    </div>

                    <Button type="submit" disabled={processing}>
                        {processing ? 'Sending…' : 'Send message'}
                    </Button>
                </form>
            </section>
        </PublicLayout>
    );
}
