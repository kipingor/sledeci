import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Pencil } from 'lucide-react';

interface Leave { id: number; type?: string; status: string; from_date: string; to_date: string }
interface Profile {
    id: number; first_name: string; last_name: string; email: string | null; phone: string | null; role: string | null;
    hourly_rate: number | null; monthly_salary: number | null; is_contractor: boolean; is_available: boolean;
    skills: string[] | null; user?: { name: string; email: string } | null; leave_requests?: Leave[];
}

export default function HRShowPage({ profile }: { profile: Profile }) {
    const name = `${profile.first_name} ${profile.last_name}`;
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'HR', href: '/hr' }, { title: 'Staff', href: '/hr/staff' }, { title: name, href: `/hr/staff/${profile.id}` }];
    const row = (k: string, v: React.ReactNode) => (
        <div className="flex justify-between border-b border-border py-2 text-sm"><span className="text-muted-foreground">{k}</span><span>{v ?? '—'}</span></div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={name} />
            <div className="p-6 space-y-6 max-w-3xl">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold tracking-tight">{name}</h1>
                    <Link href={`/hr/staff/${profile.id}/edit`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm"><Pencil className="h-4 w-4" /> Edit</Link>
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                    {row('Role', profile.role)}{row('Email', profile.email)}{row('Phone', profile.phone)}
                    {row('Type', profile.is_contractor ? 'Contractor' : 'Employee')}
                    {row('Availability', profile.is_available ? 'Available' : 'Unavailable')}
                    {row('Hourly rate', profile.hourly_rate)}{row('Monthly salary', profile.monthly_salary)}
                    {row('Linked account', profile.user ? `${profile.user.name} (${profile.user.email})` : null)}
                    {row('Skills', profile.skills?.join(', '))}
                </div>
                <div className="bg-card border border-border rounded-lg p-5">
                    <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Recent leave</h2>
                    {(profile.leave_requests ?? []).length === 0 && <p className="text-sm text-muted-foreground">No leave requests.</p>}
                    {(profile.leave_requests ?? []).map((l) => (
                        <div key={l.id} className="flex justify-between border-b border-border py-2 text-sm last:border-0">
                            <span>{l.from_date} → {l.to_date}</span><span className="capitalize">{l.status}</span>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
