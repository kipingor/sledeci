import AppLayout from '@/layouts/app-layout';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import {
    Users, UserPlus, Search, Shield, MoreHorizontal,
    CheckCircle2, XCircle, KeyRound, Pencil, Trash2
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'User Management', href: '/users' }];

const ROLE_COLORS: Record<string, string> = {
    admin:   'bg-red-100 text-red-700 ring-red-200',
    hr:      'bg-purple-100 text-purple-700 ring-purple-200',
    sales:   'bg-blue-100 text-blue-700 ring-blue-200',
    pm:      'bg-emerald-100 text-emerald-700 ring-emerald-200',
    finance: 'bg-amber-100 text-amber-700 ring-amber-200',
    viewer:  'bg-slate-100 text-slate-600 ring-slate-200',
};

interface User {
    id: number;
    name: string;
    email: string;
    email_verified_at: string | null;
    created_at: string;
    roles: Array<{ id: number; name: string }>;
}

interface Props {
    users:     { data: User[]; links: any[]; meta: any };
    filters:   { search?: string; role?: string };
    roles:     string[];
    roleStats: Record<string, number>;
}

export default function UsersIndex({ users, filters, roles, roleStats }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [roleFilter, setRoleFilter] = useState(filters.role ?? '');

    function applyFilters() {
        router.get('/users', { search, role: roleFilter }, { preserveScroll: true });
    }

    function toggleActive(user: User) {
        if (!confirm(`${user.email_verified_at ? 'Suspend' : 'Reactivate'} user "${user.name}"?`)) return;
        router.post(`/users/${user.id}/toggle-active`, {}, { preserveScroll: true });
    }

    function resetPassword(user: User) {
        if (!confirm(`Reset password for "${user.name}"? A new temporary password will be shown.`)) return;
        router.post(`/users/${user.id}/reset-password`, {}, { preserveScroll: true });
    }

    function destroy(user: User) {
        if (!confirm(`Permanently delete "${user.name}"? This cannot be undone.`)) return;
        router.delete(`/users/${user.id}`, { preserveScroll: true });
    }

    const isActive = (u: User) => !!u.email_verified_at;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            <div className="flex flex-col h-full">

                {/* Header */}
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Users className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">User Management</h1>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    {users.meta?.total ?? users.data.length} users · Admin-created accounts only
                                </p>
                            </div>
                        </div>
                        <Button asChild className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                            <Link href="/users/create">
                                <UserPlus className="h-4 w-4" /> Add User
                            </Link>
                        </Button>
                    </div>

                    {/* Role stat pills */}
                    <div className="flex gap-2 mt-4 flex-wrap">
                        <button
                            onClick={() => { setRoleFilter(''); router.get('/users', { search }, { preserveScroll: true }); }}
                            className={cn('text-xs px-3 py-1 rounded-full ring-1 font-medium transition-colors',
                                !roleFilter ? 'bg-primary/10 text-primary ring-primary/30' : 'bg-muted text-muted-foreground ring-border hover:bg-muted/80'
                            )}
                        >
                            All · {users.meta?.total ?? users.data.length}
                        </button>
                        {roles.map(role => (
                            <button
                                key={role}
                                onClick={() => { setRoleFilter(role); router.get('/users', { search, role }, { preserveScroll: true }); }}
                                className={cn('text-xs px-3 py-1 rounded-full ring-1 font-medium capitalize transition-colors',
                                    roleFilter === role
                                        ? (ROLE_COLORS[role] ?? 'bg-primary/10 text-primary ring-primary/30')
                                        : 'bg-muted text-muted-foreground ring-border hover:bg-muted/80'
                                )}
                            >
                                {role} · {roleStats[role] ?? 0}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Search bar */}
                <div className="bg-card border-b border-border px-6 py-3">
                    <div className="flex gap-3 max-w-lg">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                className="pl-8 h-8 text-sm"
                                placeholder="Search name or email…"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                            />
                        </div>
                        <Button size="sm" variant="outline" onClick={applyFilters} className="h-8">Search</Button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto bg-background">
                    {users.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
                            <Users className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No users found</p>
                            <p className="text-sm mt-1">Adjust your filters or add a new user.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/30">
                                    <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">User</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Roles</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Joined</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {users.data.map(user => (
                                    <tr key={user.id} className="hover:bg-muted/20 transition-colors">
                                        <td className="px-6 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <p className="font-medium text-foreground">{user.name}</p>
                                                    <p className="text-xs text-muted-foreground">{user.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex gap-1.5 flex-wrap">
                                                {user.roles.length === 0 ? (
                                                    <span className="text-xs text-muted-foreground">No role</span>
                                                ) : user.roles.map(r => (
                                                    <span
                                                        key={r.id}
                                                        className={cn('text-xs px-2 py-0.5 rounded-full ring-1 font-medium capitalize',
                                                            ROLE_COLORS[r.name] ?? ROLE_COLORS.viewer
                                                        )}
                                                    >
                                                        {r.name}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <span className={cn('inline-flex items-center gap-1 text-xs font-medium',
                                                isActive(user) ? 'text-emerald-600' : 'text-rose-500'
                                            )}>
                                                {isActive(user)
                                                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> Active</>
                                                    : <><XCircle className="h-3.5 w-3.5" /> Suspended</>
                                                }
                                            </span>
                                        </td>
                                        <td className="px-4 py-3.5 text-xs text-muted-foreground">
                                            {new Date(user.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-4 py-3.5">
                                            <div className="flex items-center gap-1 justify-end">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0"
                                                    title="Edit user & roles"
                                                    asChild
                                                >
                                                    <Link href={`/users/${user.id}/edit`}>
                                                        <Pencil className="h-3.5 w-3.5" />
                                                    </Link>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-amber-600 hover:text-amber-700"
                                                    title="Reset password"
                                                    onClick={() => resetPassword(user)}
                                                >
                                                    <KeyRound className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className={cn('h-7 w-7 p-0',
                                                        isActive(user)
                                                            ? 'text-rose-500 hover:text-rose-600'
                                                            : 'text-emerald-600 hover:text-emerald-700'
                                                    )}
                                                    title={isActive(user) ? 'Suspend user' : 'Reactivate user'}
                                                    onClick={() => toggleActive(user)}
                                                >
                                                    {isActive(user)
                                                        ? <XCircle className="h-3.5 w-3.5" />
                                                        : <CheckCircle2 className="h-3.5 w-3.5" />
                                                    }
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                                    title="Delete user"
                                                    onClick={() => destroy(user)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}