import React, { useState } from 'react';
import { Head, Link, router, usePage } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, ChevronRight, Building2, Phone, Mail } from 'lucide-react';

interface Contact {
    id: number;
    first_name: string;
    last_name: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    stage: string;
    source: string;
    company: { id: number; name: string } | null;
    owner: { id: number; name: string } | null;
    created_at: string;
}

interface Props {
    contacts: {
        data: Contact[];
        links: { url: string | null; label: string; active: boolean }[];
        meta: { current_page: number; last_page: number; total: number; per_page: number };
    };
    stages: string[];
    filters: { search?: string; stage?: string; owner_id?: string };
    teamMembers: { id: number; name: string }[];
}

const STAGE_COLORS: Record<string, string> = {
    lead:      'bg-blue-100 text-blue-700',
    prospect:  'bg-yellow-100 text-yellow-700',
    customer:  'bg-green-100 text-green-700',
    churned:   'bg-gray-100 text-gray-600',
};

export default function ContactsIndex({ contacts, stages, filters, teamMembers }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const applyFilter = (key: string, value: string) => {
        router.get('/crm/contacts', { ...filters, [key]: value || undefined }, { preserveState: true, replace: true });
    };

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        applyFilter('search', search);
    };

    return (
        <AppLayout>
            <Head title="Contacts" />
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
                        <p className="text-sm text-gray-500 mt-1">{contacts.meta?.total ?? contacts.data.length} contacts total</p>
                    </div>
                    <Link
                        href="/crm/contacts/create"
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                        <Plus size={16} /> New Contact
                    </Link>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap gap-3">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search contacts…"
                                className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                        </div>
                        <button type="submit" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Search</button>
                    </form>

                    <select
                        value={filters.stage ?? ''}
                        onChange={e => applyFilter('stage', e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Stages</option>
                        {stages.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                    </select>

                    <select
                        value={filters.owner_id ?? ''}
                        onChange={e => applyFilter('owner_id', e.target.value)}
                        className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                        <option value="">All Owners</option>
                        {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {contacts.data.length === 0 ? (
                        <div className="py-16 text-center text-gray-400">
                            <p className="text-lg font-medium">No contacts yet</p>
                            <p className="text-sm mt-1">Add your first contact to get started.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Company</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Contact</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Stage</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Owner</th>
                                    <th />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {contacts.data.map(c => (
                                    <tr key={c.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <Link href={`/crm/contacts/${c.id}`} className="font-medium text-gray-900 hover:text-indigo-600">
                                                {c.first_name} {c.last_name}
                                            </Link>
                                            {c.job_title && <p className="text-xs text-gray-500">{(c as any).job_title}</p>}
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">
                                            {c.company ? (
                                                <Link href={`/crm/companies/${c.company.id}`} className="flex items-center gap-1 hover:text-indigo-600">
                                                    <Building2 size={14} /> {c.company.name}
                                                </Link>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="space-y-0.5">
                                                {c.email && <div className="flex items-center gap-1 text-gray-600"><Mail size={12} /> {c.email}</div>}
                                                {c.phone && <div className="flex items-center gap-1 text-gray-600"><Phone size={12} /> {c.phone}</div>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_COLORS[c.stage] ?? 'bg-gray-100 text-gray-600'}`}>
                                                {c.stage}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-600">{c.owner?.name ?? '—'}</td>
                                        <td className="px-4 py-3 text-right">
                                            <Link href={`/crm/contacts/${c.id}`} className="text-gray-400 hover:text-indigo-600">
                                                <ChevronRight size={16} />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {/* Pagination */}
                {contacts.links && contacts.links.length > 3 && (
                    <div className="flex justify-center gap-1">
                        {contacts.links.map((link, i) => (
                            link.url ? (
                                <Link
                                    key={i}
                                    href={link.url}
                                    className={`px-3 py-1.5 text-sm rounded-lg ${link.active ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                />
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
