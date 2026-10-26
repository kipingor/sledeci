import { Head, Link, router } from '@inertiajs/react';
import { Linkedin } from 'lucide-react';
import JobForm from '@/components/hr/job-form';
import { Button } from '@/components/ui/button';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Props {
    job: Record<string, string | number | boolean | null> & { slug: string; title: string; status: 'draft' | 'published' | 'closed'; is_open: boolean };
    employmentTypes: Record<string, string>;
    experienceLevels: Record<string, string>;
}

export default function JobEdit({ job, employmentTypes, experienceLevels }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr' },
        { title: 'Jobs', href: '/hr/jobs' },
        { title: job.title, href: `/hr/jobs/${job.slug}/edit` },
    ];

    const act = (action: 'publish' | 'close') => router.post(`/hr/jobs/${job.slug}/${action}`, {}, { preserveScroll: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${job.title}`} />
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card px-6 py-4">
                <div>
                    <h1 className="text-xl font-bold tracking-tight">Edit job posting</h1>
                    <p className="text-sm capitalize text-muted-foreground">
                        Status: {job.status}
                        {job.status === 'published' && !job.is_open ? ' (past closing date)' : ''}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {job.status === 'published' ? (
                        <Button variant="outline" onClick={() => act('close')}>
                            Close role
                        </Button>
                    ) : (
                        <Button onClick={() => act('publish')}>Publish</Button>
                    )}
                    <Button asChild variant="outline">
                        <Link href={`/hr/jobs/${job.slug}/linkedin`}>
                            <Linkedin className="mr-2 h-4 w-4" /> LinkedIn
                        </Link>
                    </Button>
                    <Button asChild variant="outline">
                        <Link href={`/hr/applications?job=${job.id}`}>Applications</Link>
                    </Button>
                </div>
            </div>
            <div className="mx-auto max-w-3xl p-6">
                <JobForm
                    initial={job}
                    employmentTypes={employmentTypes}
                    experienceLevels={experienceLevels}
                    action={{ url: `/hr/jobs/${job.slug}`, method: 'put' }}
                    submitLabel="Save changes"
                />
            </div>
        </AppLayout>
    );
}
