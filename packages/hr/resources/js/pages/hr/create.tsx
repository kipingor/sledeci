import AppLayout from '@/layouts/app-layout';
import { Head } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import StaffForm from '@/components/hr/staff-form';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'HR', href: '/hr' },
    { title: 'Staff', href: '/hr/staff' },
    { title: 'Add', href: '/hr/staff/create' },
];

export default function HRCreatePage({ users }: { users: { id: number; name: string; email: string }[] }) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add Staff Member" />
            <div className="p-6 space-y-4">
                <h1 className="text-base font-bold tracking-tight">Add Staff Member</h1>
                <StaffForm users={users} action="/hr/staff" method="post" submitLabel="Create staff member" />
            </div>
        </AppLayout>
    );
}
