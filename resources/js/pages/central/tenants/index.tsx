import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { type PageProps, type Tenant, type PaginatedData } from '@/types';
import { Plus, Search, Building2, MoreHorizontal, CheckCircle, XCircle, Clock } from 'lucide-react';
import { useState } from 'react';

interface Props extends PageProps {
    tenants: PaginatedData<Tenant>;
    stats: { total: number; active: number; trial: number; suspended: number };
}

function StatusBadge({ status }: { status: Tenant['status'] }) {
    const config = {
        active:    { label: 'Active',    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={12} /> },
        trial:     { label: 'Trial',     cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       icon: <Clock size={12} /> },
        suspended: { label: 'Suspended', cls: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: <XCircle size={12} /> },
    }[status];

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${config.cls}`}>
            {config.icon} {config.label}
        </span>
    );
}

export default function TenantsIndex() {
    const { tenants, stats, flash } = usePage<Props>().props;
    const [showCreate, setShowCreate] = useState(false);

    const createForm = useForm({ name: '', subdomain: '', plan: 'starter' });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        createForm.post('/admin/tenants', {
            onSuccess: () => { setShowCreate(false); createForm.reset(); },
        });
    };

    return (
        <>
            <Head title="Tenants — Platform Admin" />
            <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
                {/* Header */}
                <header className="border-b border-stone-800 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center">
                                <Building2 size={16} className="text-stone-950" />
                            </div>
                            <span className="font-semibold">Nexus Admin</span>
                        </div>
                        <button
                            onClick={() => setShowCreate(true)}
                            className="flex items-center gap-2 bg-amber-500 text-stone-950 font-semibold
                                text-sm px-4 py-2 rounded-xl hover:bg-amber-400 transition-colors"
                        >
                            <Plus size={16} /> New Tenant
                        </button>
                    </div>
                </header>

                <main className="max-w-7xl mx-auto px-6 py-8">
                    {flash?.success && (
                        <div className="mb-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
                            {flash.success}
                        </div>
                    )}

                    {/* Stats */}
                    <div className="grid grid-cols-4 gap-4 mb-8">
                        {[
                            { label: 'Total', value: stats.total, color: 'text-stone-100' },
                            { label: 'Active', value: stats.active, color: 'text-emerald-400' },
                            { label: 'Trial', value: stats.trial, color: 'text-amber-400' },
                            { label: 'Suspended', value: stats.suspended, color: 'text-red-400' },
                        ].map((s) => (
                            <div key={s.label} className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                                <div className="text-xs text-stone-500 mt-1">{s.label}</div>
                            </div>
                        ))}
                    </div>

                    {/* Tenants Table */}
                    <div className="bg-stone-900 border border-stone-800 rounded-2xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between">
                            <h2 className="font-semibold text-stone-100">All Tenants</h2>
                            <div className="relative">
                                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
                                <input
                                    className="bg-stone-800 border border-stone-700 rounded-lg pl-8 pr-3 py-2 text-sm
                                        text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 w-56"
                                    placeholder="Search tenants..."
                                />
                            </div>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="text-left text-xs text-stone-500 border-b border-stone-800">
                                    <th className="px-5 py-3 font-medium">Name</th>
                                    <th className="px-5 py-3 font-medium">Domain</th>
                                    <th className="px-5 py-3 font-medium">Plan</th>
                                    <th className="px-5 py-3 font-medium">Status</th>
                                    <th className="px-5 py-3 font-medium">Created</th>
                                    <th className="px-5 py-3 font-medium"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tenants.data.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="px-5 py-12 text-center text-stone-500">
                                            No tenants yet. Create the first one.
                                        </td>
                                    </tr>
                                ) : (
                                    tenants.data.map((tenant) => (
                                        <tr key={tenant.id} className="border-b border-stone-800 hover:bg-stone-800/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/admin/tenants/${tenant.id}`}
                                                    className="font-medium text-stone-100 hover:text-amber-400 transition-colors"
                                                >
                                                    {tenant.name}
                                                </Link>
                                                <div className="text-xs text-stone-500 mt-0.5">{tenant.id}</div>
                                            </td>
                                            <td className="px-5 py-4 text-stone-400">
                                                {tenant.domains?.[0]?.domain ?? '—'}
                                            </td>
                                            <td className="px-5 py-4">
                                                <span className="capitalize text-stone-300">{tenant.plan ?? '—'}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <StatusBadge status={tenant.status} />
                                            </td>
                                            <td className="px-5 py-4 text-stone-400">
                                                {new Date(tenant.created_at).toLocaleDateString('en-KE')}
                                            </td>
                                            <td className="px-5 py-4">
                                                <Link
                                                    href={`/admin/tenants/${tenant.id}`}
                                                    className="text-stone-500 hover:text-stone-300 transition-colors"
                                                >
                                                    <MoreHorizontal size={16} />
                                                </Link>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </main>

                {/* Create Tenant Modal */}
                {showCreate && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
                        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl">
                            <h3 className="text-lg font-semibold mb-5">Provision new tenant</h3>
                            <form onSubmit={submit} className="space-y-4">
                                <div>
                                    <label className="block text-sm text-stone-300 mb-1.5">Company name</label>
                                    <input
                                        type="text"
                                        value={createForm.data.name}
                                        onChange={(e) => createForm.setData('name', e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm
                                            text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
                                        placeholder="Acme Corp Ltd"
                                        required
                                    />
                                    {createForm.errors.name && <p className="mt-1 text-xs text-red-400">{createForm.errors.name}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm text-stone-300 mb-1.5">Subdomain</label>
                                    <div className="flex">
                                        <input
                                            type="text"
                                            value={createForm.data.subdomain}
                                            onChange={(e) => createForm.setData('subdomain', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                                            className="flex-1 bg-stone-800 border border-stone-700 rounded-l-xl px-4 py-2.5 text-sm
                                                text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
                                            placeholder="acme"
                                            required
                                        />
                                        <span className="bg-stone-700 border border-stone-700 border-l-0 rounded-r-xl px-3 py-2.5
                                            text-sm text-stone-400 flex items-center whitespace-nowrap">
                                            .nexus.co.ke
                                        </span>
                                    </div>
                                    {createForm.errors.subdomain && <p className="mt-1 text-xs text-red-400">{createForm.errors.subdomain}</p>}
                                </div>
                                <div>
                                    <label className="block text-sm text-stone-300 mb-1.5">Plan</label>
                                    <select
                                        value={createForm.data.plan}
                                        onChange={(e) => createForm.setData('plan', e.target.value)}
                                        className="w-full bg-stone-800 border border-stone-700 rounded-xl px-4 py-2.5 text-sm
                                            text-stone-100 focus:outline-none focus:border-amber-500 transition-colors"
                                    >
                                        <option value="starter">Starter</option>
                                        <option value="growth">Growth</option>
                                        <option value="enterprise">Enterprise</option>
                                    </select>
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreate(false)}
                                        className="flex-1 bg-stone-800 text-stone-300 py-2.5 rounded-xl text-sm
                                            hover:bg-stone-700 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={createForm.processing}
                                        className="flex-1 bg-amber-500 text-stone-950 font-semibold py-2.5 rounded-xl
                                            text-sm hover:bg-amber-400 disabled:opacity-50 transition-colors"
                                    >
                                        Provision
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
