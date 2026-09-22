import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft } from 'lucide-react';

interface Company {
    id?: number;
    name: string;
    industry: string;
    website: string;
    phone: string;
    email: string;
    address: string;
    notes: string;
    owner_id: string;
}

interface Props {
    company?: Company;
    teamMembers: { id: number; name: string }[];
    industries: string[];
}

export default function CompanyForm({ company, teamMembers, industries }: Props) {
    const isEdit = !!company?.id;
    const { data, setData, post, put, processing, errors } = useForm({
        name:     company?.name ?? '',
        industry: company?.industry ?? '',
        website:  company?.website ?? '',
        phone:    company?.phone ?? '',
        email:    company?.email ?? '',
        address:  company?.address ?? '',
        notes:    company?.notes ?? '',
        owner_id: company?.owner_id ? String(company.owner_id) : '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        isEdit ? put(`/crm/companies/${company!.id}`) : post('/crm/companies');
    };

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';
    const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );

    return (
        <AppLayout>
            <Head title={isEdit ? 'Edit Company' : 'New Company'} />
            <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/crm/companies" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={20} /></Link>
                    <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Company' : 'New Company'}</h1>
                </div>
                <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Company Name *" error={errors.name}>
                            <input className={inputCls} value={data.name} onChange={e => setData('name', e.target.value)} />
                        </Field>
                        <Field label="Industry" error={errors.industry}>
                            <select className={inputCls} value={data.industry} onChange={e => setData('industry', e.target.value)}>
                                <option value="">Select industry</option>
                                {industries.map(i => <option key={i} value={i}>{i}</option>)}
                            </select>
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Website" error={errors.website}>
                            <input className={inputCls} placeholder="https://" value={data.website} onChange={e => setData('website', e.target.value)} />
                        </Field>
                        <Field label="Phone" error={errors.phone}>
                            <input className={inputCls} value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+254 20 XXX XXXX" />
                        </Field>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Email" error={errors.email}>
                            <input type="email" className={inputCls} value={data.email} onChange={e => setData('email', e.target.value)} />
                        </Field>
                        <Field label="Assigned To" error={errors.owner_id}>
                            <select className={inputCls} value={data.owner_id} onChange={e => setData('owner_id', e.target.value)}>
                                <option value="">Assign to me</option>
                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </Field>
                    </div>
                    <Field label="Address" error={errors.address}>
                        <textarea className={inputCls} rows={2} value={data.address} onChange={e => setData('address', e.target.value)} />
                    </Field>
                    <Field label="Notes" error={errors.notes}>
                        <textarea className={inputCls} rows={3} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </Field>
                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                            {processing ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Company'}
                        </button>
                        <Link href="/crm/companies" className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
