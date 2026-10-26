import { Head, Link, router } from '@inertiajs/react';
import { ExternalLink, FileDown, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Application {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    linkedin_url: string | null;
    portfolio_url: string | null;
    cover_letter: string | null;
    has_resume: boolean;
    status: string;
    rating: number | null;
    notes: string | null;
    source: string;
    job: { id: number; title: string } | null;
    applied_at: string;
}

interface Paginated<T> {
    data: T[];
    links: { url: string | null; label: string; active: boolean }[];
    total: number;
}

interface Props {
    applications: Paginated<Application>;
    jobs: { id: number; title: string }[];
    statuses: string[];
    filters: { job?: string; status?: string; search?: string };
    counts: Record<string, number>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr' },
    { title: 'Jobs', href: '/hr/jobs' },
    { title: 'Applications', href: '/hr/applications' },
];

const selectClass = 'h-9 rounded-md border border-input bg-background px-3 text-sm';

function ApplicationCard({ app, statuses }: { app: Application; statuses: string[] }) {
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(app.status);
    const [rating, setRating] = useState<string>(app.rating ? String(app.rating) : '');
    const [notes, setNotes] = useState(app.notes ?? '');
    const [saving, setSaving] = useState(false);

    const save = () => {
        setSaving(true);
        router.patch(`/hr/applications/${app.id}`, { status, rating: rating === '' ? null : Number(rating), notes: notes || null }, { preserveScroll: true, onFinish: () => setSaving(false) });
    };

    const remove = () => {
        if (confirm(`Delete the application from ${app.name}? This also deletes their CV.`)) {
            router.delete(`/hr/applications/${app.id}`, { preserveScroll: true });
        }
    };

    return (
        <li className="rounded-lg border border-border bg-card">
            <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 p-4 text-left" aria-expanded={open}>
                <div>
                    <div className="font-medium">{app.name}</div>
                    <div className="text-xs text-muted-foreground">
                        {app.job?.title ?? 'Deleted job'} · {app.applied_at}
                        {app.source === 'linkedin' ? ' · via LinkedIn' : ''}
                    </div>
                </div>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">{app.status}</span>
            </button>

            {open && (
                <div className="space-y-4 border-t border-border p-4 text-sm">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                        <a href={`mailto:${app.email}`} className="text-primary hover:underline">
                            {app.email}
                        </a>
                        {app.phone && <span>{app.phone}</span>}
                        {app.linkedin_url && (
                            <a href={app.linkedin_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                LinkedIn <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                        {app.portfolio_url && (
                            <a href={app.portfolio_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                                Portfolio <ExternalLink className="h-3 w-3" />
                            </a>
                        )}
                        {app.has_resume && (
                            <a href={`/hr/applications/${app.id}/resume`} className="inline-flex items-center gap-1 text-primary hover:underline">
                                <FileDown className="h-4 w-4" /> Download CV
                            </a>
                        )}
                    </div>

                    {app.cover_letter && <p className="whitespace-pre-line rounded-md bg-muted/40 p-3 text-muted-foreground">{app.cover_letter}</p>}

                    <div className="grid gap-3 sm:grid-cols-3">
                        <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stage</span>
                            <select className={`${selectClass} w-full capitalize`} value={status} onChange={(e) => setStatus(e.target.value)}>
                                {statuses.map((s) => (
                                    <option key={s} value={s}>
                                        {s}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Rating</span>
                            <select className={`${selectClass} w-full`} value={rating} onChange={(e) => setRating(e.target.value)}>
                                <option value="">Not rated</option>
                                {[1, 2, 3, 4, 5].map((n) => (
                                    <option key={n} value={n}>
                                        {n} / 5
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                    <label className="block space-y-1">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Internal notes</span>
                        <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    </label>

                    <div className="flex justify-between">
                        <Button type="button" variant="ghost" size="sm" onClick={remove} className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </Button>
                        <Button type="button" size="sm" onClick={save} disabled={saving}>
                            {saving ? 'Saving…' : 'Save'}
                        </Button>
                    </div>
                </div>
            )}
        </li>
    );
}

export default function Applications({ applications, jobs, statuses, filters, counts }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const apply = (next: Record<string, string | undefined>) =>
        router.get('/hr/applications', { ...filters, ...next }, { preserveState: true, replace: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Applications" />

            <div className="border-b border-border bg-card px-6 py-4">
                <h1 className="text-xl font-bold tracking-tight">Applications</h1>
                <p className="text-sm text-muted-foreground">
                    {applications.total} total ·{' '}
                    {statuses
                        .filter((s) => counts[s])
                        .map((s) => `${counts[s]} ${s}`)
                        .join(' · ') || 'none yet'}
                </p>
            </div>

            <div className="space-y-4 p-6">
                <div className="flex flex-wrap items-end gap-3">
                    <select className={selectClass} value={filters.job ?? ''} onChange={(e) => apply({ job: e.target.value || undefined })} aria-label="Filter by job">
                        <option value="">All jobs</option>
                        {jobs.map((j) => (
                            <option key={j.id} value={j.id}>
                                {j.title}
                            </option>
                        ))}
                    </select>
                    <select className={`${selectClass} capitalize`} value={filters.status ?? ''} onChange={(e) => apply({ status: e.target.value || undefined })} aria-label="Filter by stage">
                        <option value="">All stages</option>
                        {statuses.map((s) => (
                            <option key={s} value={s}>
                                {s}
                            </option>
                        ))}
                    </select>
                    <form
                        className="flex gap-2"
                        onSubmit={(e) => {
                            e.preventDefault();
                            apply({ search: search || undefined });
                        }}
                    >
                        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or email" className="w-56" />
                        <Button type="submit" variant="outline">
                            Search
                        </Button>
                    </form>
                </div>

                {applications.data.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">No applications match.</div>
                ) : (
                    <ul className="space-y-3">
                        {applications.data.map((a) => (
                            <ApplicationCard key={a.id} app={a} statuses={statuses} />
                        ))}
                    </ul>
                )}

                {applications.links.length > 3 && (
                    <nav className="flex flex-wrap gap-1" aria-label="Pagination">
                        {applications.links.map((l, i) =>
                            l.url ? (
                                <Link key={i} href={l.url} preserveScroll className={`rounded-md border px-3 py-1 text-sm ${l.active ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'}`} dangerouslySetInnerHTML={{ __html: l.label }} />
                            ) : (
                                <span key={i} className="rounded-md border border-border px-3 py-1 text-sm text-muted-foreground" dangerouslySetInnerHTML={{ __html: l.label }} />
                            ),
                        )}
                    </nav>
                )}
            </div>
        </AppLayout>
    );
}
