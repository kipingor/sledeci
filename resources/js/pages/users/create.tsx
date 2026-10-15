import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Users, ChevronRight, Save, Eye, EyeOff, Info } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'User Management', href: '/users' },
    { title: 'Add User', href: '/users/create' },
];

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

interface Props { roles: string[] }

function Field({ label, required, error, hint, children }: any) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function UserCreate({ roles }: Props) {
    const [form, setForm] = useState({
        name: '', email: '', password: '', password_confirmation: '',
        roles: [] as string[],
    });
    const [errors, setErrors]   = useState<Record<string, string>>({});
    const [saving, setSaving]   = useState(false);
    const [showPw, setShowPw]   = useState(false);
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
        router.post('/users', form, {
            onError: e => { setErrors(e); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Add User" />
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/users" className="text-muted-foreground hover:text-foreground">User Management</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Add User</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Add User</h1>
                        <p className="text-sm text-muted-foreground mt-0.5">Create a new system user and assign their role</p>
                    </div>
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
                                placeholder="e.g. Jane Wanjiku"
                                autoFocus
                            />
                        </Field>

                        <Field label="Email Address" required error={errors.email}>
                            <Input
                                type="email"
                                value={form.email}
                                onChange={e => s({ email: e.target.value })}
                                placeholder="jane@company.co.ke"
                            />
                        </Field>

                        <Field
                            label="Password"
                            error={errors.password}
                            hint="Leave blank to auto-generate a temporary password (shown after saving)."
                        >
                            <div className="relative">
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    value={form.password}
                                    onChange={e => s({ password: e.target.value })}
                                    placeholder="Min. 8 characters"
                                    className="pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </Field>

                        {form.password && (
                            <Field label="Confirm Password" error={errors.password_confirmation}>
                                <Input
                                    type={showPw ? 'text' : 'password'}
                                    value={form.password_confirmation}
                                    onChange={e => s({ password_confirmation: e.target.value })}
                                    placeholder="Repeat password"
                                />
                            </Field>
                        )}
                    </div>
                </div>

                {/* Role assignment */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
                        <p className="text-sm font-semibold">Assign Role</p>
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
                                            ? (ROLE_COLORS[role] ?? 'border-primary/40 bg-primary/5 text-primary')
                                            : 'border-border bg-background hover:border-border/70 hover:bg-muted/30'
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

                {/* Info notice */}
                <div className="flex gap-2.5 p-3.5 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-800">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                        The new user's account will be created as active. Self-registration is disabled —
                        only Admin and HR users can create accounts.
                    </p>
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={submit}
                        disabled={saving || !form.name || !form.email || form.roles.length === 0}
                        className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Creating…' : 'Create User'}
                    </Button>
                    <Button variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </div>
        </AppLayout>
    );
}