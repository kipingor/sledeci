import React, { useState } from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { Plus, Search, ChevronRight, Globe, Phone, Users, Briefcase } from 'lucide-react';

interface Company {
    id: number;
    name: string;
    industry: string | null;
    website: string | null;
    phone: string | null;
    email: string | null;
    contacts_count: number;
    deals_count: number;
    owner: { id: number; name: string } | null;
}

interface Props {
    companies: {
        data: Company[];
        links: { url: string | null; label: string; active: boolean }[];
        meta: { total: number };
    };
    filters: { search?: string };
}

export default function CompaniesIndex({ companies, filters }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        router.get('/crm/companies', { search: search || undefined }, { preserveState: true, replace: true });
    };

    return (
        <AppLayout>
            <Head title="Companies" />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
                        <p className="text-sm text-gray-500 mt-1">{companies.meta?.total ?? companies.data.length} companies</p>
                    </div>
                    <Link href="/crm/companies/create" className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
                        <Plus size={16} /> New Company
                    </Link>
                </div>

                <form onSubmit={handleSearch} className="flex gap-2">
                    <div className="relative">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies…"
                            className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <button type="submit" className="px-3 py-2 text-sm bg-gray-100 rounded-lg hover:bg-gray-200">Search</button>
                </form>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {companies.data.length === 0 ? (
                        <div className="col-span-3 py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
                            No companies yet. Add your first.
                        </div>
                    ) : companies.data.map(c => (
                        <Link key={c.id} href={`/crm/companies/${c.id}`}
                            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow space-y-3 block">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                                    {c.industry && <p className="text-xs text-gray-500">{c.industry}</p>}
                                </div>
                                <ChevronRight size={16} className="text-gray-400 mt-1" />
                            </div>
                            <div className="space-y-1 text-sm text-gray-500">
                                {c.website && <div className="flex items-center gap-1.5"><Globe size={13} /> {c.website}</div>}
                                {c.phone && <div className="flex items-center gap-1.5"><Phone size={13} /> {c.phone}</div>}
                            </div>
                            <div className="flex items-center gap-4 text-xs text-gray-500 pt-1 border-t border-gray-100">
                                <span className="flex items-center gap-1"><Users size={12} /> {c.contacts_count} contacts</span>
                                <span className="flex items-center gap-1"><Briefcase size={12} /> {c.deals_count} deals</span>
                                {c.owner && <span className="ml-auto">{c.owner.name}</span>}
                            </div>
                        </Link>
                    ))}
                </div>

                {companies.links && companies.links.length > 3 && (
                    <div className="flex justify-center gap-1">
                        {companies.links.map((link, i) => (
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
