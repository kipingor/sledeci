import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Plus } from 'lucide-react';
import { useState } from 'react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'HR', href: '/hr' }, { title: 'Staff', href: '/hr/staff' }];

interface StaffRow {
    id: number; first_name: string; last_name: string; email: string | null; role: string | null;
    is_contractor: boolean; is_available: boolean; user?: { name: string } | null;
}
interface Paginated<T> { data: T[]; links: { url: string | null; label: string; active: boolean }[]; total: number }
interface Props { staff: Paginated<StaffRow>; filters: { search?: string; type?: string } }

export default function HRStaffPage({ staff, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const apply = (next: Record<string, string>) =>
        router.get('/hr/staff', { search, type: filters.type ?? '', ...next }, { preserveState: true, replace: true });

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Staff Directory" />
            <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                    <h1 className="text-base font-bold tracking-tight">Staff Directory <span className="text-muted-foreground font-normal">({staff.total})</span></h1>
                    <Link href="/hr/staff/create" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
                        <Plus className="h-4 w-4" /> Add staff
                    </Link>
                </div>

                <div className="flex gap-2">
                    <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply({})}
                        placeholder="Search name or email…" className="w-72 rounded-md border border-input bg-background px-3 py-2 text-sm" />
                    <select value={filters.type ?? ''} onChange={(e) => apply({ type: e.target.value })}
                        className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                        <option value="">All</option><option value="employee">Employees</option><option value="contractor">Contractors</option>
                    </select>
                </div>

                <div className="bg-card border border-border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr><th className="text-left p-3">Name</th><th className="text-left p-3">Role</th><th className="text-left p-3">Email</th><th className="text-left p-3">Type</th><th className="text-left p-3">Status</th></tr>
                        </thead>
                        <tbody>
                            {staff.data.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No staff found.</td></tr>}
                            {staff.data.map((s) => (
                                <tr key={s.id} className="border-t border-border hover:bg-muted/30">
                                    <td className="p-3"><Link href={`/hr/staff/${s.id}`} className="font-medium hover:text-primary">{s.first_name} {s.last_name}</Link></td>
                                    <td className="p-3">{s.role ?? '—'}</td>
                                    <td className="p-3">{s.email ?? '—'}</td>
                                    <td className="p-3">{s.is_contractor ? 'Contractor' : 'Employee'}</td>
                                    <td className="p-3">{s.is_available ? 'Available' : 'Unavailable'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-wrap gap-1">
                    {staff.links.map((l, i) => (
                        <button key={i} disabled={!l.url} onClick={() => l.url && router.get(l.url, {}, { preserveState: true })}
                            className={`rounded border px-2.5 py-1 text-xs ${l.active ? 'bg-primary text-primary-foreground' : 'border-border'} disabled:opacity-40`}
                            dangerouslySetInnerHTML={{ __html: l.label }} />
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
