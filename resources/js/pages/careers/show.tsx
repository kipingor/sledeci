import { Head, Link, useForm } from '@inertiajs/react';
import { ArrowLeft, Briefcase, Clock, MapPin, Wallet } from 'lucide-react';
import type { FormEvent } from 'react';
import PublicLayout from '@/components/site/public-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import * as careers from '@/routes/careers';

interface Job {
    id: number;
    title: string;
    slug: string;
    department: string | null;
    location: string | null;
    is_remote: boolean;
    employment_type: string;
    experience_level: string | null;
    summary: string | null;
    description: string;
    responsibilities: string | null;
    requirements: string | null;
    benefits: string | null;
    salary: string | null;
    closes_at: string | null;
}

interface Props {
    job: Job;
    source: string | null;
    jsonLd: Record<string, unknown>;
}

function Block({ title, text }: { title: string; text: string | null }) {
    if (!text) return null;
    return (
        <section className="mt-8">
            <h2 className="text-xl font-semibold">{title}</h2>
            <p className="mt-3 whitespace-pre-line text-muted-foreground">{text}</p>
        </section>
    );
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

export default function CareersShow({ job, source, jsonLd }: Props) {
    const { data, setData, post, processing, errors, reset } = useForm<{
        name: string;
        email: string;
        phone: string;
        linkedin_url: string;
        portfolio_url: string;
        cover_letter: string;
        resume: File | null;
        consent: boolean;
        website: string;
    }>({
        name: '',
        email: '',
        phone: '',
        linkedin_url: '',
        portfolio_url: '',
        cover_letter: '',
        resume: null,
        consent: false,
        website: '', // honeypot
    });

    function submit(e: FormEvent) {
        e.preventDefault();
        const url = careers.apply(job.slug).url + (source ? `?src=${source}` : '');
        post(url, { forceFormData: true, preserveScroll: true, onSuccess: () => reset() });
    }

    return (
        <PublicLayout>
            <Head title={`${job.title} - Careers`}>
                <meta name="description" content={job.summary ?? `Apply for ${job.title}`} />
                <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
            </Head>

            <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
                <Link href={careers.index().url} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                    <ArrowLeft className="h-4 w-4" /> All roles
                </Link>

                <div className="mt-6 grid gap-10 lg:grid-cols-3">
                    <article className="lg:col-span-2">
                        <h1 className="text-3xl font-bold tracking-tight">{job.title}</h1>
                        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
                            {job.department && (
                                <span className="inline-flex items-center gap-1">
                                    <Briefcase className="h-4 w-4" /> {job.department}
                                </span>
                            )}
                            {(job.is_remote || job.location) && (
                                <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-4 w-4" /> {job.is_remote ? 'Remote' : job.location}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1">
                                <Clock className="h-4 w-4" /> {job.employment_type}
                                {job.experience_level ? ` · ${job.experience_level}` : ''}
                            </span>
                            {job.salary && (
                                <span className="inline-flex items-center gap-1">
                                    <Wallet className="h-4 w-4" /> {job.salary}
                                </span>
                            )}
                        </div>
                        {job.closes_at && <p className="mt-2 text-sm text-muted-foreground">Applications close on {job.closes_at}.</p>}

                        <Block title="About the role" text={job.description} />
                        <Block title="What you will do" text={job.responsibilities} />
                        <Block title="What we are looking for" text={job.requirements} />
                        <Block title="What we offer" text={job.benefits} />
                    </article>

                    <aside className="lg:col-span-1">
                        <form onSubmit={submit} className="sticky top-24 space-y-4 rounded-xl border border-border bg-card p-5" noValidate>
                            <h2 className="text-lg font-semibold">Apply for this role</h2>

                            <Field label="Full name" error={errors.name}>
                                <Input value={data.name} onChange={(e) => setData('name', e.target.value)} autoComplete="name" required />
                            </Field>
                            <Field label="Email" error={errors.email}>
                                <Input type="email" value={data.email} onChange={(e) => setData('email', e.target.value)} autoComplete="email" required />
                            </Field>
                            <Field label="Phone (optional)" error={errors.phone}>
                                <Input value={data.phone} onChange={(e) => setData('phone', e.target.value)} autoComplete="tel" />
                            </Field>
                            <Field label="LinkedIn profile (optional)" error={errors.linkedin_url}>
                                <Input type="url" placeholder="https://linkedin.com/in/…" value={data.linkedin_url} onChange={(e) => setData('linkedin_url', e.target.value)} />
                            </Field>
                            <Field label="Portfolio or website (optional)" error={errors.portfolio_url}>
                                <Input type="url" value={data.portfolio_url} onChange={(e) => setData('portfolio_url', e.target.value)} />
                            </Field>
                            <Field label="CV (PDF, DOC or DOCX, max 5 MB)" error={errors.resume}>
                                <Input type="file" accept=".pdf,.doc,.docx" onChange={(e) => setData('resume', e.target.files?.[0] ?? null)} required />
                            </Field>
                            <Field label="Cover letter (optional)" error={errors.cover_letter}>
                                <Textarea rows={5} value={data.cover_letter} onChange={(e) => setData('cover_letter', e.target.value)} />
                            </Field>

                            <div className="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
                                <label>
                                    Leave this field empty
                                    <input type="text" tabIndex={-1} autoComplete="off" value={data.website} onChange={(e) => setData('website', e.target.value)} />
                                </label>
                            </div>

                            <div>
                                <label className="flex items-start gap-2 text-sm">
                                    <input type="checkbox" className="mt-1" checked={data.consent} onChange={(e) => setData('consent', e.target.checked)} />
                                    <span>I agree that my details may be used to assess my application for this role.</span>
                                </label>
                                {errors.consent && <p className="mt-1 text-xs text-destructive">{errors.consent}</p>}
                            </div>

                            <Button type="submit" className="w-full" disabled={processing}>
                                {processing ? 'Submitting…' : 'Submit application'}
                            </Button>
                        </form>
                    </aside>
                </div>
            </div>
        </PublicLayout>
    );
}
