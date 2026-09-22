import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { UserPlus, MoreHorizontal, UserCheck, UserX, Trash2, Pencil } from 'lucide-react';
import { useState } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    is_active: boolean;
    role: string | null;
    created_at: string;
}

interface PaginatedUsers {
    data: User[];
    current_page: number;
    last_page: number;
    from: number;
    to: number;
    total: number;
    next_page_url: string | null;
    prev_page_url: string | null;
}

interface Props {
    users: PaginatedUsers;
}

const roleColour: Record<string, string> = {
    admin:   'bg-amber-500/15 text-amber-400',
    sales:   'bg-blue-500/15 text-blue-400',
    finance: 'bg-emerald-500/15 text-emerald-400',
    ops:     'bg-purple-500/15 text-purple-400',
};

function RoleBadge({ role }: { role: string | null }) {
    if (!role) return <span className="text-stone-600 text-xs">—</span>;
    const cls = roleColour[role] ?? 'bg-stone-700 text-stone-300';
    return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium capitalize ${cls}`}>
            {role}
        </span>
    );
}

export default function UsersIndex({ users }: Props) {
    const [menuOpen, setMenuOpen] = useState<number | null>(null);

    const deleteUser = (user: User) => {
        if (!confirm(`Remove ${user.name}? This cannot be undone.`)) return;
        router.delete(`/users/${user.id}`);
        setMenuOpen(null);
    };

    return (
        <AppLayout>
            <Head title="Team" />
            <div className="p-6 max-w-6xl">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-xl font-semibold text-stone-100">Team members</h1>
                        <p className="text-sm text-stone-400 mt-0.5">
                            {users.total} {users.total === 1 ? 'member' : 'members'} in your organisation
                        </p>
                    </div>
                    <Link
                        href="/users/invite"
                        className="flex items-center gap-2 bg-amber-500 text-stone-950 font-semibold
                            px-4 py-2 rounded-xl hover:bg-amber-400 transition-colors text-sm"
                    >
                        <UserPlus size={15} />
                        Invite member
                    </Link>
                </div>

                {/* Table */}
                <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                    {users.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <UserPlus size={32} className="text-stone-700 mb-3" />
                            <p className="text-sm text-stone-500">No team members yet</p>
                            <p className="text-xs text-stone-600 mt-1">Invite your first team member to get started</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-stone-800">
                                    <th className="text-left px-6 py-3.5 text-xs font-medium text-stone-500 uppercase tracking-wider">Name</th>
                                    <th className="text-left px-6 py-3.5 text-xs font-medium text-stone-500 uppercase tracking-wider hidden sm:table-cell">Role</th>
                                    <th className="text-left px-6 py-3.5 text-xs font-medium text-stone-500 uppercase tracking-wider hidden md:table-cell">Status</th>
                                    <th className="text-left px-6 py-3.5 text-xs font-medium text-stone-500 uppercase tracking-wider hidden lg:table-cell">Joined</th>
                                    <th className="px-6 py-3.5 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-stone-800">
                                {users.data.map((user) => (
                                    <tr key={user.id} className="hover:bg-stone-800/40 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-amber-500/15 rounded-full flex items-center
                                                    justify-center text-amber-400 text-sm font-semibold flex-shrink-0">
                                                    {user.name.charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="text-stone-100 font-medium leading-none">{user.name}</div>
                                                    <div className="text-stone-500 text-xs mt-1">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 hidden sm:table-cell">
                                            <RoleBadge role={user.role} />
                                        </td>
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <span className={`inline-flex items-center gap-1.5 text-xs font-medium
                                                ${user.is_active ? 'text-emerald-400' : 'text-stone-500'}`}>
                                                {user.is_active
                                                    ? <><UserCheck size={13} /> Active</>
                                                    : <><UserX size={13} /> Inactive</>}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-stone-500 text-xs hidden lg:table-cell">
                                            {new Date(user.created_at).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="relative">
                                                <button
                                                    onClick={() => setMenuOpen(menuOpen === user.id ? null : user.id)}
                                                    className="text-stone-500 hover:text-stone-200 transition-colors p-1 rounded-lg hover:bg-stone-700"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                {menuOpen === user.id && (
                                                    <div className="absolute right-0 top-8 w-40 bg-stone-800 border border-stone-700
                                                        rounded-xl shadow-xl z-10 overflow-hidden py-1">
                                                        <Link
                                                            href={`/users/${user.id}/edit`}
                                                            className="flex items-center gap-2 px-4 py-2 text-sm text-stone-300
                                                                hover:bg-stone-700 hover:text-stone-100 transition-colors"
                                                        >
                                                            <Pencil size={13} /> Edit
                                                        </Link>
                                                        <button
                                                            onClick={() => deleteUser(user)}
                                                            className="flex items-center gap-2 w-full px-4 py-2 text-sm
                                                                text-red-400 hover:bg-stone-700 transition-colors"
                                                        >
                                                            <Trash2 size={13} /> Remove
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-between mt-4 text-sm text-stone-500">
                        <span>Showing {users.from}–{users.to} of {users.total}</span>
                        <div className="flex gap-2">
                            {users.prev_page_url && (
                                <Link href={users.prev_page_url}
                                    className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg hover:border-stone-700 transition-colors">
                                    Previous
                                </Link>
                            )}
                            {users.next_page_url && (
                                <Link href={users.next_page_url}
                                    className="px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-lg hover:border-stone-700 transition-colors">
                                    Next
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
