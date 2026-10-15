/**
 * field-agents/index.tsx — Admin view of all field agents
 */
import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Users, Plus, MapPin, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Field Agents', href: '/field-agents' }];

interface Agent {
    id: number; agent_code: string; territory: string | null; active: boolean;
    visits_count: number; today_visits: number; month_revenue: number;
    user: { id: number; name: string; email: string };
}

interface Props {
    agents: { data: Agent[]; links: any[]; current_page: number; last_page: number; total: number };
    territories: string[];
    filters: { territory?: string; active_only?: string };
}

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', notation: 'compact' }).format(n);

export default function FieldAgentsIndex({ agents, territories, filters }: Props) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Field Agents" />
            <div className="space-y-5 p-6">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold flex items-center gap-2">
                            <Users className="h-5 w-5 text-amber-500" /> Field Agents
                        </h1>
                        <p className="text-xs text-muted-foreground mt-0.5">
                            Sales reps and collection agents working in the field
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/field-agents/territory-report">
                            <Button size="sm" variant="outline" className="gap-1.5">
                                <TrendingUp className="h-3.5 w-3.5" /> Territory Report
                            </Button>
                        </Link>
                        <Link href="/field-agents/create">
                            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                <Plus className="h-3.5 w-3.5" /> Add Agent
                            </Button>
                        </Link>
                    </div>
                </div>

                <div className="flex gap-2">
                    <select value={filters.territory ?? ''}
                        onChange={e => router.get('/field-agents', { territory: e.target.value }, { preserveState: true })}
                        className="h-8 text-xs rounded-md border border-input bg-background px-2">
                        <option value="">All territories</option>
                        {territories.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                </div>

                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/30">
                                {['Agent', 'Territory', 'Today', 'Total Visits', 'This Month', 'Status'].map(h => (
                                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {agents.data.map(agent => (
                                <tr key={agent.id} className="hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                        <Link href={`/field-agents/${agent.id}`} className="font-medium hover:text-amber-600 transition-colors">
                                            {agent.user.name}
                                        </Link>
                                        <p className="text-xs font-mono text-muted-foreground">{agent.agent_code}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-1">
                                        <MapPin className="h-3 w-3" /> {agent.territory ?? '—'}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-semibold">{agent.today_visits}</td>
                                    <td className="px-4 py-3 text-xs text-muted-foreground">{agent.visits_count}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{fmt(agent.month_revenue)}</td>
                                    <td className="px-4 py-3">
                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                                            agent.active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-50 text-zinc-500')}>
                                            {agent.active ? 'Active' : 'Inactive'}
                                        </span>
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
