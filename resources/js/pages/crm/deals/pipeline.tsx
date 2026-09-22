import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { Plus, TrendingUp } from 'lucide-react';

interface Deal {
    id: number;
    title: string;
    value: string;
    currency: string;
    stage: string;
    expected_close_date: string | null;
    contact: { id: number; first_name: string; last_name: string | null } | null;
    company: { id: number; name: string } | null;
    owner: { id: number; name: string } | null;
}

interface Props {
    byStage: Record<string, Deal[]>;
    stages: string[];
    teamMembers: { id: number; name: string }[];
    filters: { search?: string; owner_id?: string };
    totals: Record<string, { count: number; total: number }>;
}

const STAGE_LABELS: Record<string, string> = {
    new: 'New', qualified: 'Qualified', proposal: 'Proposal',
    negotiation: 'Negotiation', won: 'Won', lost: 'Lost',
};
const STAGE_ACCENT: Record<string, string> = {
    new: 'border-t-gray-400', qualified: 'border-t-blue-400',
    proposal: 'border-t-purple-400', negotiation: 'border-t-orange-400',
    won: 'border-t-green-500', lost: 'border-t-red-400',
};
const STAGE_BADGE: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700', qualified: 'bg-blue-100 text-blue-700',
    proposal: 'bg-purple-100 text-purple-700', negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700',
};

function formatKES(value: string | number): string {
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (n >= 1_000_000) return `KES ${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `KES ${(n / 1_000).toFixed(0)}K`;
    return `KES ${n.toLocaleString()}`;
}

export default function DealPipeline({ byStage, stages, teamMembers, filters, totals }: Props) {
    const applyFilter = (key: string, value: string) => {
        router.get('/crm/deals', { view: 'pipeline', ...filters, [key]: value || undefined }, { preserveState: true, replace: true });
    };

    const moveStage = (deal: Deal, newStage: string) => {
        router.put(`/crm/deals/${deal.id}`, {
            ...deal, stage: newStage, value: deal.value,
        }, { preserveState: false });
    };

    const totalPipeline = stages
        .filter(s => s !== 'lost')
        .reduce((sum, s) => sum + (totals[s]?.total ?? 0), 0);

    return (
        <AppLayout>
            <Head title="Deal Pipeline" />
            <div className="space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Deal Pipeline</h1>
                        <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1">
                            <TrendingUp size={14} /> Pipeline value: {formatKES(totalPipeline)}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/crm/deals?view=list" className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">List View</Link>
                        <Link href="/crm/deals/create" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                            <Plus size={16} /> New Deal
                        </Link>
                    </div>
                </div>

                {/* Filter bar */}
                <div className="flex gap-3">
                    <select value={filters.owner_id ?? ''} onChange={e => applyFilter('owner_id', e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">All Owners</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>

                {/* Kanban board */}
                <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '70vh' }}>
                    {stages.map(stage => (
                        <div key={stage} className={`flex-shrink-0 w-64 bg-gray-50 rounded-xl border-t-4 ${STAGE_ACCENT[stage]} border border-gray-200 border-t-[4px]`}>
                            {/* Column header */}
                            <div className="p-3 border-b border-gray-200">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-semibold rounded-full px-2.5 py-1 ${STAGE_BADGE[stage]}`}>
                                        {STAGE_LABELS[stage]}
                                    </span>
                                    <span className="text-xs text-gray-500">{byStage[stage]?.length ?? 0}</span>
                                </div>
                                <p className="text-xs text-gray-500 mt-1 font-medium">
                                    {formatKES(totals[stage]?.total ?? 0)}
                                </p>
                            </div>

                            {/* Cards */}
                            <div className="p-2 space-y-2">
                                {(byStage[stage] ?? []).map(deal => (
                                    <div key={deal.id} className="bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                                        <Link href={`/crm/deals/${deal.id}`} className="block">
                                            <p className="text-sm font-medium text-gray-800 line-clamp-2">{deal.title}</p>
                                            <p className="text-sm font-semibold text-indigo-600 mt-1">{formatKES(deal.value)}</p>
                                            {(deal.contact || deal.company) && (
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {deal.contact
                                                        ? `${deal.contact.first_name} ${deal.contact.last_name ?? ''}`
                                                        : deal.company?.name}
                                                </p>
                                            )}
                                            {deal.expected_close_date && (
                                                <p className="text-xs text-gray-400 mt-1">
                                                    Close: {new Date(deal.expected_close_date).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}
                                                </p>
                                            )}
                                        </Link>
                                        {/* Quick stage move */}
                                        <div className="flex gap-1 mt-2 flex-wrap">
                                            {stages.filter(s => s !== stage).slice(0, 3).map(s => (
                                                <button key={s} onClick={() => moveStage(deal, s)}
                                                    className="text-xs px-1.5 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600">
                                                    → {STAGE_LABELS[s]}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                ))}

                                {(byStage[stage] ?? []).length === 0 && (
                                    <p className="text-xs text-gray-400 text-center py-6">No deals</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </AppLayout>
    );
}
