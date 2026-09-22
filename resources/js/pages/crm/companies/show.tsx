import React from 'react';
import { Head, Link, router } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, Globe, Phone, Mail, MapPin, Edit, Trash2, Users, Briefcase } from 'lucide-react';

interface Contact { id: number; first_name: string; last_name: string | null; stage: string; job_title: string | null; }
interface Deal { id: number; title: string; value: string; currency: string; stage: string; }

interface Company {
    id: number; name: string; industry: string | null; website: string | null;
    phone: string | null; email: string | null; address: string | null; notes: string | null;
    owner: { id: number; name: string } | null;
    contacts: Contact[];
    deals: Deal[];
}

interface Props { company: Company; }

const STAGE_COLORS: Record<string, string> = {
    lead: 'bg-blue-100 text-blue-700', prospect: 'bg-yellow-100 text-yellow-700',
    customer: 'bg-green-100 text-green-700', churned: 'bg-gray-100 text-gray-600',
    new: 'bg-gray-100 text-gray-700', qualified: 'bg-blue-100 text-blue-700',
    proposal: 'bg-purple-100 text-purple-700', negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700',
};

export default function CompanyShow({ company }: Props) {
    const deleteCompany = () => {
        if (confirm('Delete this company? This cannot be undone.')) router.delete(`/crm/companies/${company.id}`);
    };

    return (
        <AppLayout>
            <Head title={company.name} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/crm/companies" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={20} /></Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                            {company.industry && <p className="text-sm text-gray-500">{company.industry}</p>}
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/crm/companies/${company.id}/edit`} className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50">
                            <Edit size={14} /> Edit
                        </Link>
                        <button onClick={deleteCompany} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                            <Trash2 size={14} /> Delete
                        </button>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                            <h2 className="font-semibold text-gray-800">Details</h2>
                            {company.website && <a href={company.website} target="_blank" rel="noopener" className="flex items-center gap-2 text-sm text-indigo-600 hover:underline"><Globe size={14} />{company.website}</a>}
                            {company.phone && <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={14} />{company.phone}</div>}
                            {company.email && <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={14} />{company.email}</div>}
                            {company.address && <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin size={14} />{company.address}</div>}
                            {company.owner && <div className="text-sm text-gray-600">Owner: {company.owner.name}</div>}
                        </div>
                        {company.notes && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <h2 className="font-semibold text-gray-800 mb-2">Notes</h2>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{company.notes}</p>
                            </div>
                        )}
                    </div>

                    <div className="col-span-2 space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Users size={16} /> Contacts ({company.contacts.length})</h2>
                                <Link href={`/crm/contacts/create?company_id=${company.id}`} className="text-sm text-indigo-600 hover:underline">+ Add</Link>
                            </div>
                            {company.contacts.length === 0
                                ? <p className="text-sm text-gray-400">No contacts yet.</p>
                                : company.contacts.map(c => (
                                    <Link key={c.id} href={`/crm/contacts/${c.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                        <div>
                                            <span className="text-sm font-medium text-gray-800">{c.first_name} {c.last_name}</span>
                                            {c.job_title && <span className="text-xs text-gray-500 ml-2">{c.job_title}</span>}
                                        </div>
                                        <span className={`rounded-full px-2 py-0.5 text-xs ${STAGE_COLORS[c.stage]}`}>{c.stage}</span>
                                    </Link>
                                ))
                            }
                        </div>
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Briefcase size={16} /> Deals ({company.deals.length})</h2>
                                <Link href={`/crm/deals/create?company_id=${company.id}`} className="text-sm text-indigo-600 hover:underline">+ Add</Link>
                            </div>
                            {company.deals.length === 0
                                ? <p className="text-sm text-gray-400">No deals yet.</p>
                                : company.deals.map(d => (
                                    <Link key={d.id} href={`/crm/deals/${d.id}`} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                                        <span className="text-sm font-medium text-gray-800">{d.title}</span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">{d.currency} {Number(d.value).toLocaleString()}</span>
                                            <span className={`rounded-full px-2 py-0.5 text-xs ${STAGE_COLORS[d.stage]}`}>{d.stage}</span>
                                        </div>
                                    </Link>
                                ))
                            }
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
