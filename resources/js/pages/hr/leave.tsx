import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'HR', href: '/hr' }, { title: 'Leave', href: '/hr/leave' }];

interface LeaveRow {
    id: number; type?: string; status: string; from_date: string; to_date: string; reason?: string | null;
    staff_profile?: { first_name: string; last_name: string } | null; approver?: { name: string } | null;
}
interface Props {
    leaves: { data: LeaveRow[]; links: { url: string | null; label: string; active: boolean }[] };
    filters: { status?: string };
    stats: { pending: number; approved: number };
}

export default function HRLeavePage({ leaves, filters, stats }: Props) {
    const decide = (id: number, action: 'approve' | 'reject') => {
        const notes = action === 'reject' ? window.prompt('Reason for rejection (required):') : null;
        if (action === 'reject' && !notes) return;
        router.post(`/hr/leave/${id}/${action}`, { admin_notes: notes ?? undefined }, { preserveScroll: true });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leave Management" />
            <div className="p-6 space-y-4">
                <h1 className="text-base font-bold tracking-tight">Leave Management</h1>
                <div className="grid grid-cols-2 gap-4 max-w-md">
                    <div className="bg-card border border-border rounded-lg p-4"><div className="text-2xl font-bold">{stats.pending}</div><div className="text-xs text-muted-foreground">Pending</div></div>
                    <div className="bg-card border border-border rounded-lg p-4"><div className="text-2xl font-bold">{stats.approved}</div><div className="text-xs text-muted-foreground">Currently on leave</div></div>
                </div>
                <select value={filters.status ?? ''} onChange={(e) => router.get('/hr/leave', { status: e.target.value }, { preserveState: true })}
                    className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">All statuses</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option>
                </select>
                <div className="bg-card border border-border rounded-lg overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                            <tr><th className="text-left p-3">Staff</th><th className="text-left p-3">Dates</th><th className="text-left p-3">Reason</th><th className="text-left p-3">Status</th><th className="p-3" /></tr>
                        </thead>
                        <tbody>
                            {leaves.data.length === 0 && <tr><td colSpan={5} className="p-6 text-center text-muted-foreground">No leave requests.</td></tr>}
                            {leaves.data.map((l) => (
                                <tr key={l.id} className="border-t border-border">
                                    <td className="p-3">{l.staff_profile ? `${l.staff_profile.first_name} ${l.staff_profile.last_name}` : '—'}</td>
                                    <td className="p-3">{l.from_date} → {l.to_date}</td>
                                    <td className="p-3">{l.reason ?? '—'}</td>
                                    <td className="p-3 capitalize">{l.status}{l.approver ? ` · ${l.approver.name}` : ''}</td>
                                    <td className="p-3 text-right space-x-2">
                                        {l.status === 'pending' && (<>
                                            <button onClick={() => decide(l.id, 'approve')} className="rounded bg-emerald-600 px-2.5 py-1 text-xs text-white">Approve</button>
                                            <button onClick={() => decide(l.id, 'reject')} className="rounded bg-red-600 px-2.5 py-1 text-xs text-white">Reject</button>
                                        </>)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </AppLayout>
    );
}
