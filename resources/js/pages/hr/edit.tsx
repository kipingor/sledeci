import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import StaffForm, { type StaffProfileData } from '@/components/hr/staff-form';

interface Props {
    profile: StaffProfileData & { id: number };
    users: { id: number; name: string; email: string }[];
}

export default function HREditPage({ profile, users }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'HR', href: '/hr' },
        { title: 'Staff', href: '/hr/staff' },
        { title: `${profile.first_name} ${profile.last_name}`, href: `/hr/staff/${profile.id}` },
        { title: 'Edit', href: `/hr/staff/${profile.id}/edit` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit ${profile.first_name} ${profile.last_name}`} />
            <div className="p-6 space-y-4">
                <h1 className="text-base font-bold tracking-tight">Edit Staff Member</h1>
                <StaffForm profile={profile} users={users} action={`/hr/staff/${profile.id}`} method="put" submitLabel="Save changes" />
            </div>
        </AppLayout>
    );
}
