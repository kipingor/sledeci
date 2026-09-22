import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft } from 'lucide-react';

interface Deal {
    id?: number; title: string; value: string; currency: string; stage: string;
    expected_close_date: string; notes: string; contact_id: string; company_id: string; owner_id: string;
}

interface Props {
    deal?: Deal;
    contacts: { id: number; name: string }[];
    companies: { id: number; name: string }[];
    teamMembers: { id: number; name: string }[];
    stages: string[];
}

export default function DealForm({ deal, contacts, companies, teamMembers, stages }: Props) {
    const isEdit = !!deal?.id;
    const { data, setData, post, put, processing, errors } = useForm({
        title:               deal?.title ?? '',
        value:               deal?.value ?? '0',
        currency:            deal?.currency ?? 'KES',
        stage:               deal?.stage ?? 'new',
        expected_close_date: deal?.expected_close_date ?? '',
        notes:               deal?.notes ?? '',
        contact_id:          deal?.contact_id ? String(deal.contact_id) : '',
        company_id:          deal?.company_id ? String(deal.company_id) : '',
        owner_id:            deal?.owner_id ? String(deal.owner_id) : '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        isEdit ? put(`/crm/deals/${deal!.id}`) : post('/crm/deals');
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
            <Head title={isEdit ? 'Edit Deal' : 'New Deal'} />
            <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/crm/deals" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={20} /></Link>
                    <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Deal' : 'New Deal'}</h1>
                </div>
                <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <Field label="Deal Title *" error={errors.title}>
                        <input className={inputCls} value={data.title} onChange={e => setData('title', e.target.value)} placeholder="e.g. ABC Ltd — Annual Software License" />
                    </Field>

                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2">
                            <Field label="Value (KES) *" error={errors.value}>
                                <input type="number" min="0" step="0.01" className={inputCls} value={data.value} onChange={e => setData('value', e.target.value)} />
                            </Field>
                        </div>
                        <Field label="Stage *" error={errors.stage}>
                            <select className={inputCls} value={data.stage} onChange={e => setData('stage', e.target.value)}>
                                {stages.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Contact" error={errors.contact_id}>
                            <select className={inputCls} value={data.contact_id} onChange={e => setData('contact_id', e.target.value)}>
                                <option value="">No contact</option>
                                {contacts.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                        <Field label="Company" error={errors.company_id}>
                            <select className={inputCls} value={data.company_id} onChange={e => setData('company_id', e.target.value)}>
                                <option value="">No company</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Expected Close Date" error={errors.expected_close_date}>
                            <input type="date" className={inputCls} value={data.expected_close_date} onChange={e => setData('expected_close_date', e.target.value)} />
                        </Field>
                        <Field label="Assigned To" error={errors.owner_id}>
                            <select className={inputCls} value={data.owner_id} onChange={e => setData('owner_id', e.target.value)}>
                                <option value="">Assign to me</option>
                                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                            </select>
                        </Field>
                    </div>

                    <Field label="Notes" error={errors.notes}>
                        <textarea className={inputCls} rows={3} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </Field>

                    <div className="flex gap-3 pt-2">
                        <button type="submit" disabled={processing} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                            {processing ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Deal'}
                        </button>
                        <Link href="/crm/deals" className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
