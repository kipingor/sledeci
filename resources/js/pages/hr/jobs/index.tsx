import { Head, Link, router } from '@inertiajs/react';
import { Eye, Inbox, Linkedin, Pencil, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Job {
    id: number;
    title: string;
    slug: string;
    department: string | null;
    location: string | null;
    status: 'draft' | 'published' | 'closed';
    is_open: boolean;
    published_at: string | null;
    closes_at: string | null;
    applications_count: number;
    new_applications_count: number;
    linkedin_posted_at: string | null;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr' },
    { title: 'Jobs', href: '/hr/jobs' },
];

const statusStyle: Record<Job['status'], string> = {
    draft: 'bg-muted text-muted-foreground',
    published: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300',
    closed: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
};

export default function JobsIndex({ jobs }: { jobs: Job[] }) {
    const act = (job: Job, action: 'publish' | 'close') => router.post(`/hr/jobs/${job.slug}/${action}`, {}, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Job postings" />

            <div className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Job postings</h1>
                    <p className="text-sm text-muted-foreground">Roles shown on the public careers page.</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild variant="outline">
                        <Link href="/hr/applications">
                            <Inbox className="mr-2 h-4 w-4" /> All applications
                        </Link>
                    </Button>
                    <Button asChild>
                        <Link href="/hr/jobs/create">
                            <Plus className="mr-2 h-4 w-4" /> New job
                        </Link>
                    </Button>
                </div>
            </div>

            <div className="p-6">
                {jobs.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-border p-10 text-center text-muted-foreground">No jobs yet. Create your first posting.</div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border border-border">
                        <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                                <tr>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Applications</th>
                                    <th className="px-4 py-3">LinkedIn</th>
                                    <th className="px-4 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {jobs.map((job) => (
                                    <tr key={job.id}>
                                        <td className="px-4 py-3">
                                            <div className="font-medium">{job.title}</div>
                                            <div className="text-xs text-muted-foreground">{[job.department, job.location].filter(Boolean).join(' · ') || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${statusStyle[job.status]}`}>{job.status}</span>
                                            {job.status === 'published' && !job.is_open && <span className="ml-2 text-xs text-muted-foreground">(past closing date)</span>}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Link href={`/hr/applications?job=${job.id}`} className="text-primary hover:underline">
                                                {job.applications_count}
                                            </Link>
                                            {job.new_applications_count > 0 && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">{job.new_applications_count} new</span>}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">{job.linkedin_posted_at ?? 'Not shared'}</td>
                                        <td className="px-4 py-3">
                                            <div className="flex flex-wrap justify-end gap-1.5">
                                                {job.status !== 'published' ? (
                                                    <Button size="sm" variant="outline" onClick={() => act(job, 'publish')}>
                                                        Publish
                                                    </Button>
                                                ) : (
                                                    <Button size="sm" variant="outline" onClick={() => act(job, 'close')}>
                                                        Close
                                                    </Button>
                                                )}
                                                <Button asChild size="sm" variant="ghost" title="LinkedIn">
                                                    <Link href={`/hr/jobs/${job.slug}/linkedin`}>
                                                        <Linkedin className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                                {job.is_open && (
                                                    <Button asChild size="sm" variant="ghost" title="View on careers page">
                                                        <a href={`/careers/${job.slug}`} target="_blank" rel="noopener noreferrer">
                                                            <Eye className="h-4 w-4" />
                                                        </a>
                                                    </Button>
                                                )}
                                                <Button asChild size="sm" variant="ghost" title="Edit">
                                                    <Link href={`/hr/jobs/${job.slug}/edit`}>
                                                        <Pencil className="h-4 w-4" />
                                                    </Link>
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
