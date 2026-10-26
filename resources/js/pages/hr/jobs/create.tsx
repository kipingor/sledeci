import { Head } from '@inertiajs/react';
import JobForm from '@/components/hr/job-form';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

interface Props {
    employmentTypes: Record<string, string>;
    experienceLevels: Record<string, string>;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr' },
    { title: 'Jobs', href: '/hr/jobs' },
    { title: 'New job', href: '/hr/jobs/create' },
];

export default function JobCreate({ employmentTypes, experienceLevels }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New job" />
            <div className="border-b border-border bg-card px-6 py-4">
                <h1 className="text-xl font-bold tracking-tight">New job posting</h1>
                <p className="text-sm text-muted-foreground">Saved as a draft. Publish it from the jobs list when it is ready.</p>
            </div>
            <div className="mx-auto max-w-3xl p-6">
                <JobForm employmentTypes={employmentTypes} experienceLevels={experienceLevels} action={{ url: '/hr/jobs', method: 'post' }} submitLabel="Save draft" />
            </div>
        </AppLayout>
    );
}
