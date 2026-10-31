import AppLayout from '@/layouts/app-layout';
import { Head, Link } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { MapPin, TrendingUp } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Field Agents', href: '/field-agents' },
    { title: 'Territory Report', href: '/field-agents/territory-report' },
];

interface AgentRow {
    id: number;
    agent_code: string;
    territory: string | null;
    active?: boolean;
    visits_count?: number;
    month_revenue?: number;
    user?: { name: string };
}

interface Props {
    agents: AgentRow[];
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(n || 0);

export default function TerritoryReport({ agents }: Props) {
    const byTerritory = (agents ?? []).reduce<Record<string, AgentRow[]>>((acc, a) => {
        const key = a.territory || 'Unassigned';
        (acc[key] ??= []).push(a);
        return acc;
    }, {});

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Territory Report" />
            <div className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-amber-500" />
                        Territory report
                    </h1>
                    <Link href="/field-agents" className="text-sm text-primary hover:underline">
                        All agents
                    </Link>
                </div>

                {Object.keys(byTerritory).length === 0 && (
                    <p className="text-sm text-muted-foreground">No field agents to report on.</p>
                )}

                {Object.entries(byTerritory).map(([territory, rows]) => (
                    <div key={territory} className="rounded-xl border bg-card overflow-hidden">
                        <div className="px-4 py-3 border-b flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <h2 className="text-sm font-semibold">{territory}</h2>
                            <span className="text-xs text-muted-foreground ml-auto">{rows.length} agents</span>
                        </div>
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b text-left text-muted-foreground">
                                    <th className="px-4 py-2 font-medium">Agent</th>
                                    <th className="px-4 py-2 font-medium">Code</th>
                                    <th className="px-4 py-2 font-medium text-right">Visits</th>
                                    <th className="px-4 py-2 font-medium text-right">Month revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((a) => (
                                    <tr key={a.id} className="border-b last:border-0">
                                        <td className="px-4 py-2">
                                            <Link href={`/field-agents/${a.id}`} className="text-primary hover:underline">
                                                {a.user?.name ?? '—'}
                                            </Link>
                                        </td>
                                        <td className="px-4 py-2 tabular-nums">{a.agent_code}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">{a.visits_count ?? '—'}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">
                                            {a.month_revenue != null ? fmt(a.month_revenue) : '—'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>
        </AppLayout>
    );
}
