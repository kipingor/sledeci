import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Users, ChevronRight, Save } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const ROLE_DESCRIPTIONS: Record<string, string> = {
    admin:   'Full access — manage users, roles, settings, and all modules.',
    hr:      'HR module + create users and assign roles.',
    sales:   'Leads, contacts, opportunities, pipeline.',
    pm:      'Projects, tenders, milestones, tasks.',
    finance: 'Invoices, payments, expenses, accounting.',
    viewer:  'Read-only access to all modules.',
};

const ROLE_COLORS: Record<string, string> = {
    admin:   'border-red-300 bg-red-50 text-red-700',
    hr:      'border-purple-300 bg-purple-50 text-purple-700',
    sales:   'border-blue-300 bg-blue-50 text-blue-700',
    pm:      'border-emerald-300 bg-emerald-50 text-emerald-700',
    finance: 'border-amber-300 bg-amber-50 text-amber-700',
    viewer:  'border-slate-300 bg-slate-50 text-slate-600',
};

interface UserRecord {
    id: number;
    name: string;
    email: string;
    role_names: string[];
    email_verified_at: string | null;
}

interface Props {
    user:  UserRecord;
    roles: string[];
}

function Field({ label, required, error, children }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function UserEdit({ user, roles }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'User Management', href: '/users' },
        { title: user.name, href: `/users/${user.id}/edit` },
    ];

    const [form, setForm] = useState({
        name:  user.name,
        email: user.email,
        roles: user.role_names,
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);
    const s = (f: any) => setForm(prev => ({ ...prev, ...f }));

    function toggleRole(role: string) {
        setForm(prev => ({
            ...prev,
            roles: prev.roles.includes(role)
                ? prev.roles.filter(r => r !== role)
                : [...prev.roles, role],
        }));
    }

    function submit() {
        setSaving(true);
        router.put(`/users/${user.id}`, form, {
            onError: e => { setErrors(e); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    const isActive = !!user.email_verified_at;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit: ${user.name}`} />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/users" className="text-muted-foreground hover:text-foreground">User Management</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">{user.name}</span>
                </nav>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-lg font-bold text-primary">
                            {user.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">{user.name}</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">{user.email}</p>
                        </div>
                    </div>
                    <span className={cn('text-xs font-medium px-2.5 py-1 rounded-full ring-1',
                        isActive
                            ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                            : 'bg-rose-50 text-rose-600 ring-rose-200'
                    )}>
                        {isActive ? 'Active' : 'Suspended'}
                    </span>
                </div>
            </div>

            <div className="p-6 max-w-xl space-y-5">

                {/* Account details */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Account Details</p>
                    </div>
                    <div className="p-5 space-y-4">
                        <Field label="Full Name" required error={errors.name}>
                            <Input
                                value={form.name}
                                onChange={e => s({ name: e.target.value })}
                                autoFocus
                            />
                        </Field>
                        <Field label="Email Address" required error={errors.email}>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={e => s({ email: e.target.value })}
                            />
                        </Field>
                        <p className="text-xs text-muted-foreground">
                            To reset the user's password, use the key icon on the Users list.
                        </p>
                    </div>
                </div>

                {/* Role assignment */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
                        <p className="text-sm font-semibold">Roles</p>
                        <span className="text-xs text-muted-foreground">(select at least one)</span>
                    </div>
                    <div className="p-5 space-y-2.5">
                        {errors.roles && (
                            <p className="text-xs text-destructive mb-2">{errors.roles}</p>
                        )}
                        {roles.map(role => {
                            const selected = form.roles.includes(role);
                            return (
                                <button
                                    key={role}
                                    type="button"
                                    onClick={() => toggleRole(role)}
                                    className={cn(
                                        'w-full flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all',
                                        selected
                                            ? (ROLE_COLORS[role] ?? 'border-primary/40 bg-primary/5')
                                            : 'border-border bg-background hover:bg-muted/30'
                                    )}
                                >
                                    <div className={cn(
                                        'mt-0.5 h-4 w-4 rounded border-2 flex items-center justify-center shrink-0',
                                        selected ? 'border-current bg-current' : 'border-muted-foreground/40'
                                    )}>
                                        {selected && (
                                            <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 12 12">
                                                <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold capitalize">{role}</p>
                                        <p className="text-xs opacity-70 mt-0.5">{ROLE_DESCRIPTIONS[role] ?? ''}</p>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={submit}
                        disabled={saving || !form.name || !form.email || form.roles.length === 0}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving…' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </div>
        </AppLayout>
    );
}