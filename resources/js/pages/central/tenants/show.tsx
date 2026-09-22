import { Head, useForm, usePage, Link } from '@inertiajs/react';
import { type PageProps, type Tenant } from '@/types';
import { ArrowLeft, Globe, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react';

interface Props extends PageProps {
    tenant: Tenant;
}

function StatusBadge({ status }: { status: Tenant['status'] }) {
    const cfg = {
        active:    { label: 'Active',    cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: <CheckCircle size={14} /> },
        trial:     { label: 'Trial',     cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20',       icon: <Clock size={14} /> },
        suspended: { label: 'Suspended', cls: 'bg-red-500/10 text-red-400 border-red-500/20',             icon: <XCircle size={14} /> },
    }[status];
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${cfg.cls}`}>
            {cfg.icon} {cfg.label}
        </span>
    );
}

export default function TenantShow() {
    const { tenant, flash } = usePage<Props>().props;

    const suspendForm = useForm({});
    const activateForm = useForm({});
    const deleteForm = useForm({});

    return (
        <>
            <Head title={`${tenant.name} — Admin`} />
            <div className="min-h-screen bg-stone-950 text-stone-100 font-sans">
                <header className="border-b border-stone-800 px-6 py-4">
                    <div className="max-w-5xl mx-auto flex items-center gap-4">
                        <Link href="/admin/tenants" className="text-stone-400 hover:text-stone-100 transition-colors">
                            <ArrowLeft size={20} />
                        </Link>
                        <span className="text-stone-600">/</span>
                        <span className="font-semibold">{tenant.name}</span>
                    </div>
                </header>

                <main className="max-w-5xl mx-auto px-6 py-8">
                    {flash?.success && (
                        <div className="mb-6 px-4 py-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm rounded-xl">
                            {flash.success}
                        </div>
                    )}

                    <div className="grid lg:grid-cols-3 gap-6">
                        {/* Left: Details */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                                <div className="flex items-start justify-between mb-6">
                                    <div>
                                        <h1 className="text-2xl font-semibold">{tenant.name}</h1>
                                        <p className="text-stone-400 text-sm mt-1">{tenant.id}</p>
                                    </div>
                                    <StatusBadge status={tenant.status} />
                                </div>

                                <dl className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: 'Plan', value: <span className="capitalize">{tenant.plan ?? '—'}</span> },
                                        {
                                            label: 'Trial ends',
                                            value: tenant.trial_ends_at
                                                ? new Date(tenant.trial_ends_at).toLocaleDateString('en-KE')
                                                : '—',
                                        },
                                        {
                                            label: 'Created',
                                            value: new Date(tenant.created_at).toLocaleDateString('en-KE', {
                                                day: 'numeric', month: 'long', year: 'numeric',
                                            }),
                                        },
                                        {
                                            label: 'Last updated',
                                            value: new Date(tenant.updated_at).toLocaleDateString('en-KE', {
                                                day: 'numeric', month: 'long', year: 'numeric',
                                            }),
                                        },
                                    ].map((item) => (
                                        <div key={item.label}>
                                            <dt className="text-xs text-stone-500 mb-1">{item.label}</dt>
                                            <dd className="text-sm text-stone-200">{item.value}</dd>
                                        </div>
                                    ))}
                                </dl>
                            </div>

                            {/* Domains */}
                            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-6">
                                <h2 className="font-semibold mb-4 flex items-center gap-2">
                                    <Globe size={16} className="text-stone-400" /> Domains
                                </h2>
                                {(tenant.domains ?? []).length === 0 ? (
                                    <p className="text-sm text-stone-500">No domains configured.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {(tenant.domains ?? []).map((d) => (
                                            <li key={d.id} className="flex items-center gap-2 text-sm text-stone-300">
                                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full flex-shrink-0" />
                                                {d.domain}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        {/* Right: Actions */}
                        <div className="space-y-4">
                            <div className="bg-stone-900 border border-stone-800 rounded-2xl p-5">
                                <h2 className="font-semibold mb-4 text-sm text-stone-400 uppercase tracking-wide">Actions</h2>
                                <div className="space-y-3">
                                    {tenant.status !== 'active' && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                activateForm.post(`/admin/tenants/${tenant.id}/activate`);
                                            }}
                                        >
                                            <button
                                                type="submit"
                                                disabled={activateForm.processing}
                                                className="w-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400
                                                    py-2.5 rounded-xl text-sm font-medium hover:bg-emerald-500/20 transition-colors
                                                    disabled:opacity-50"
                                            >
                                                Activate tenant
                                            </button>
                                        </form>
                                    )}
                                    {tenant.status !== 'suspended' && (
                                        <form
                                            onSubmit={(e) => {
                                                e.preventDefault();
                                                suspendForm.post(`/admin/tenants/${tenant.id}/suspend`);
                                            }}
                                        >
                                            <button
                                                type="submit"
                                                disabled={suspendForm.processing}
                                                className="w-full bg-amber-500/10 border border-amber-500/20 text-amber-400
                                                    py-2.5 rounded-xl text-sm font-medium hover:bg-amber-500/20 transition-colors
                                                    disabled:opacity-50"
                                            >
                                                Suspend tenant
                                            </button>
                                        </form>
                                    )}
                                </div>
                            </div>

                            {/* Danger zone */}
                            <div className="bg-stone-900 border border-red-900/30 rounded-2xl p-5">
                                <h2 className="font-semibold mb-1 text-red-400 text-sm">Danger zone</h2>
                                <p className="text-xs text-stone-500 mb-4">
                                    Permanently deletes this tenant and all their data. This cannot be undone.
                                </p>
                                <form
                                    onSubmit={(e) => {
                                        e.preventDefault();
                                        if (confirm(`Delete ${tenant.name}? This is irreversible.`)) {
                                            deleteForm.delete(`/admin/tenants/${tenant.id}`);
                                        }
                                    }}
                                >
                                    <button
                                        type="submit"
                                        disabled={deleteForm.processing}
                                        className="w-full flex items-center justify-center gap-2 bg-red-500/10 border
                                            border-red-500/20 text-red-400 py-2.5 rounded-xl text-sm font-medium
                                            hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                    >
                                        <Trash2 size={14} /> Delete tenant
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
}
