import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search } from 'lucide-react';

interface Deal {
    id: number; title: string; value: string; currency: string; stage: string;
    expected_close_date: string | null;
    contact: { id: number; first_name: string; last_name: string | null } | null;
    company: { id: number; name: string } | null;
    owner: { id: number; name: string } | null;
}

interface Props {
    deals: { data: Deal[]; links: { url: string | null; label: string; active: boolean }[]; meta: { total: number } };
    stages: string[];
    teamMembers: { id: number; name: string }[];
    filters: { search?: string; stage?: string; owner_id?: string };
}

const STAGE_BADGE: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700', qualified: 'bg-blue-100 text-blue-700',
    proposal: 'bg-purple-100 text-purple-700', negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700',
};

export default function DealsIndex({ deals, stages, teamMembers, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const applyFilter = (key: string, value: string) =>
        router.get('/crm/deals', { view: 'list', ...filters, [key]: value || undefined }, { preserveState: true, replace: true });

    const handleSearch = (e: React.FormEvent) => { e.preventDefault(); applyFilter('search', search); };

    return (
        <AppLayout>
            <Head title="Deals" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Deals</h1>
                        <p className="text-sm text-gray-500 mt-1">{deals.meta?.total ?? deals.data.length} deals total</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/crm/deals?view=pipeline" className="rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">Pipeline View</Link>
                        <Link href="/crm/deals/create" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                            <Plus size={16} /> New Deal
                        </Link>
                    </div>
                </div>

                <div className="flex flex-wrap gap-3">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search deals…"
                                className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                        </div>
                        <button type="submit" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Search</button>
                    </form>
                    <select value={filters.stage ?? ''} onChange={e => applyFilter('stage', e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">All Stages</option>
                        {stages.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>
                    <select value={filters.owner_id ?? ''} onChange={e => applyFilter('owner_id', e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500">
                        <option value="">All Owners</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {deals.data.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">No deals yet.</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contact / Company</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Value</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Stage</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Close Date</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {deals.data.map(d => (
                                    <tr key={d.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <Link href={`/crm/deals/${d.id}`} className="font-medium text-gray-900 hover:text-indigo-600">{d.title}</Link>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {d.contact ? `${d.contact.first_name} ${d.contact.last_name ?? ''}` : d.company?.name ?? '—'}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-800">
                                            {d.currency} {Number(d.value).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGE[d.stage] ?? ''}`}>{d.stage}</span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {d.expected_close_date ? new Date(d.expected_close_date).toLocaleDateString('en-KE') : '—'}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{d.owner?.name ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {deals.links && deals.links.length > 3 && (
                    <div className="flex justify-center gap-1">
                        {deals.links.map((link, i) => (
                            link.url ? (
                                <Link key={i} href={link.url}
                                    className={`px-3 py-1.5 text-sm rounded-lg ${link.active ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }} />
                            ) : (
                                <span key={i} className="px-3 py-1.5 text-sm text-gray-300" dangerouslySetInnerHTML={{ __html: link.label }} />
                            )
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
