import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { MapPin, Users } from 'lucide-react';

interface Visit {
    id: number;
    status?: string;
    checked_in_at?: string;
    checked_out_at?: string;
    notes?: string;
}

interface Props {
    fieldAgent: {
        id: number;
        agent_code: string;
        territory: string | null;
        active: boolean;
        phone?: string;
        commission_rate?: number;
        user?: { id: number; name: string; email: string };
    };
    visits: Visit[];
    stats?: Record<string, number | string>;
}

export default function FieldAgentShow({ fieldAgent, visits, stats }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Field Agents', href: '/field-agents' },
        { title: fieldAgent.agent_code || `Agent #${fieldAgent.id}`, href: `/field-agents/${fieldAgent.id}` },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Agent ${fieldAgent.agent_code}`} />
            <div className="space-y-6 p-6">
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-amber-500" />
                            {fieldAgent.user?.name ?? fieldAgent.agent_code}
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            {fieldAgent.agent_code}
                            {fieldAgent.territory && (
                                <span className="inline-flex items-center gap-1 ml-2">
                                    <MapPin className="h-3 w-3" /> {fieldAgent.territory}
                                </span>
                            )}
                        </p>
                    </div>
                    <Link href="/field-agents" className="text-sm text-primary hover:underline">
                        All agents
                    </Link>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Status</p>
                        <p className="font-semibold mt-1">{fieldAgent.active ? 'Active' : 'Inactive'}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-semibold mt-1">{fieldAgent.phone || '—'}</p>
                    </div>
                    <div className="rounded-xl border bg-card p-4">
                        <p className="text-xs text-muted-foreground">Commission</p>
                        <p className="font-semibold mt-1">
                            {fieldAgent.commission_rate != null ? `${fieldAgent.commission_rate}%` : '—'}
                        </p>
                    </div>
                </div>

                {stats && (
                    <div className="rounded-xl border bg-card p-4">
                        <h2 className="text-sm font-semibold mb-2">Stats</h2>
                        <dl className="grid grid-cols-2 gap-2 text-sm">
                            {Object.entries(stats).map(([k, v]) => (
                                <div key={k} className="flex justify-between gap-2">
                                    <dt className="text-muted-foreground">{k}</dt>
                                    <dd className="font-medium tabular-nums">{String(v)}</dd>
                                </div>
                            ))}
                        </dl>
                    </div>
                )}

                <div className="rounded-xl border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b">
                        <h2 className="text-sm font-semibold">Recent visits</h2>
                    </div>
                    <ul className="divide-y">
                        {(visits ?? []).length === 0 && (
                            <li className="px-4 py-6 text-sm text-muted-foreground">No visits yet.</li>
                        )}
                        {(visits ?? []).map((v) => (
                            <li key={v.id} className="px-4 py-3 text-sm flex justify-between gap-4">
                                <span>Visit #{v.id} {v.status && <span className="text-muted-foreground">· {v.status}</span>}</span>
                                <span className="text-muted-foreground tabular-nums">{v.checked_in_at ?? ''}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </AppLayout>
    );
}
