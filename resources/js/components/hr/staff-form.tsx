import { useForm, Link } from '@inertiajs/react';

export interface StaffProfileData {
    id?: number;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string | null;
    role: string | null;
    hourly_rate: number | string | null;
    monthly_salary: number | string | null;
    is_contractor: boolean;
    is_available: boolean;
    skills: string[] | null;
    user_id: number | null;
}

interface Props {
    profile?: Partial<StaffProfileData>;
    users: { id: number; name: string; email: string }[];
    action: string;
    method: 'post' | 'put';
    submitLabel: string;
}

const input = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
const label = 'block text-xs font-medium text-muted-foreground mb-1';

export default function StaffForm({ profile, users, action, method, submitLabel }: Props) {
    const form = useForm({
        first_name: profile?.first_name ?? '',
        last_name: profile?.last_name ?? '',
        email: profile?.email ?? '',
        phone: profile?.phone ?? '',
        role: profile?.role ?? '',
        hourly_rate: profile?.hourly_rate ?? '',
        monthly_salary: profile?.monthly_salary ?? '',
        is_contractor: profile?.is_contractor ?? false,
        is_available: profile?.is_available ?? true,
        skills: (profile?.skills ?? []).join(', '),
        user_id: profile?.user_id ?? '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            skills: String(d.skills).split(',').map((s) => s.trim()).filter(Boolean),
            user_id: d.user_id === '' ? null : d.user_id,
            hourly_rate: d.hourly_rate === '' ? null : d.hourly_rate,
            monthly_salary: d.monthly_salary === '' ? null : d.monthly_salary,
        }));
        form[method](action);
    };

    const err = (k: keyof typeof form.errors) =>
        form.errors[k] ? <p className="text-xs text-destructive mt-1">{form.errors[k]}</p> : null;

    return (
        <form onSubmit={submit} className="max-w-3xl space-y-5 bg-card border border-border rounded-lg p-6">
            <div className="grid sm:grid-cols-2 gap-4">
                <div><label className={label}>First name *</label>
                    <input className={input} value={form.data.first_name} onChange={(e) => form.setData('first_name', e.target.value)} />{err('first_name')}</div>
                <div><label className={label}>Last name *</label>
                    <input className={input} value={form.data.last_name} onChange={(e) => form.setData('last_name', e.target.value)} />{err('last_name')}</div>
                <div><label className={label}>Email</label>
                    <input type="email" className={input} value={form.data.email ?? ''} onChange={(e) => form.setData('email', e.target.value)} />{err('email')}</div>
                <div><label className={label}>Phone</label>
                    <input className={input} value={form.data.phone ?? ''} onChange={(e) => form.setData('phone', e.target.value)} />{err('phone')}</div>
                <div><label className={label}>Job role</label>
                    <input className={input} value={form.data.role ?? ''} onChange={(e) => form.setData('role', e.target.value)} />{err('role')}</div>
                <div><label className={label}>Linked user account</label>
                    <select className={input} value={form.data.user_id ?? ''} onChange={(e) => form.setData('user_id', e.target.value)}>
                        <option value="">— none —</option>
                        {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
                    </select>{err('user_id')}</div>
                <div><label className={label}>Hourly rate</label>
                    <input type="number" step="0.01" min="0" className={input} value={form.data.hourly_rate ?? ''} onChange={(e) => form.setData('hourly_rate', e.target.value)} />{err('hourly_rate')}</div>
                <div><label className={label}>Monthly salary</label>
                    <input type="number" step="0.01" min="0" className={input} value={form.data.monthly_salary ?? ''} onChange={(e) => form.setData('monthly_salary', e.target.value)} />{err('monthly_salary')}</div>
            </div>
            <div><label className={label}>Skills (comma separated)</label>
                <input className={input} value={form.data.skills} onChange={(e) => form.setData('skills', e.target.value)} />{err('skills')}</div>
            <div className="flex gap-6 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.data.is_contractor} onChange={(e) => form.setData('is_contractor', e.target.checked)} /> Contractor</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={form.data.is_available} onChange={(e) => form.setData('is_available', e.target.checked)} /> Available</label>
            </div>
            <div className="flex gap-3 pt-2">
                <button type="submit" disabled={form.processing} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50">{submitLabel}</button>
                <Link href="/hr/staff" className="rounded-md border border-border px-4 py-2 text-sm">Cancel</Link>
            </div>
        </form>
    );
}
