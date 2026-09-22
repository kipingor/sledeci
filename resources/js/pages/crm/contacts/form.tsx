import React from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft } from 'lucide-react';

interface Contact {
    id?: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    job_title: string;
    company_id: string;
    stage: string;
    source: string;
    notes: string;
    owner_id: string;
}

interface Props {
    contact?: Contact;
    companies: { id: number; name: string }[];
    teamMembers: { id: number; name: string }[];
    stages: string[];
    sources: string[];
}

export default function ContactForm({ contact, companies, teamMembers, stages, sources }: Props) {
    const isEdit = !!contact?.id;
    const { data, setData, post, put, processing, errors } = useForm<Contact>({
        first_name: contact?.first_name ?? '',
        last_name:  contact?.last_name ?? '',
        email:      contact?.email ?? '',
        phone:      contact?.phone ?? '',
        job_title:  contact?.job_title ?? '',
        company_id: contact?.company_id ? String(contact.company_id) : '',
        stage:      contact?.stage ?? 'lead',
        source:     contact?.source ?? 'other',
        notes:      contact?.notes ?? '',
        owner_id:   contact?.owner_id ? String(contact.owner_id) : '',
    });

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isEdit) {
            put(`/crm/contacts/${contact!.id}`);
        } else {
            post('/crm/contacts');
        }
    };

    const Field = ({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) => (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            {children}
            {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
        </div>
    );

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

    return (
        <AppLayout>
            <Head title={isEdit ? 'Edit Contact' : 'New Contact'} />
            <div className="max-w-2xl space-y-6">
                <div className="flex items-center gap-3">
                    <Link href="/crm/contacts" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={20} /></Link>
                    <h1 className="text-2xl font-bold text-gray-900">{isEdit ? 'Edit Contact' : 'New Contact'}</h1>
                </div>

                <form onSubmit={submit} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="First Name *" error={errors.first_name}>
                            <input className={inputCls} value={data.first_name} onChange={e => setData('first_name', e.target.value)} />
                        </Field>
                        <Field label="Last Name" error={errors.last_name}>
                            <input className={inputCls} value={data.last_name} onChange={e => setData('last_name', e.target.value)} />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Email" error={errors.email}>
                            <input type="email" className={inputCls} value={data.email} onChange={e => setData('email', e.target.value)} />
                        </Field>
                        <Field label="Phone" error={errors.phone}>
                            <input className={inputCls} value={data.phone} onChange={e => setData('phone', e.target.value)} placeholder="+254 7XX XXX XXX" />
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Job Title" error={errors.job_title}>
                            <input className={inputCls} value={data.job_title} onChange={e => setData('job_title', e.target.value)} />
                        </Field>
                        <Field label="Company" error={errors.company_id}>
                            <select className={inputCls} value={data.company_id} onChange={e => setData('company_id', e.target.value)}>
                                <option value="">No company</option>
                                {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Stage *" error={errors.stage}>
                            <select className={inputCls} value={data.stage} onChange={e => setData('stage', e.target.value)}>
                                {stages.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                        </Field>
                        <Field label="Source *" error={errors.source}>
                            <select className={inputCls} value={data.source} onChange={e => setData('source', e.target.value)}>
                                {sources.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                            </select>
                        </Field>
                    </div>

                    <Field label="Assigned To" error={errors.owner_id}>
                        <select className={inputCls} value={data.owner_id} onChange={e => setData('owner_id', e.target.value)}>
                            <option value="">Assign to me</option>
                            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </Field>

                    <Field label="Notes" error={errors.notes}>
                        <textarea className={inputCls} rows={4} value={data.notes} onChange={e => setData('notes', e.target.value)} />
                    </Field>

                    <div className="flex gap-3 pt-2">
                        <button
                            type="submit"
                            disabled={processing}
                            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                        >
                            {processing ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Contact'}
                        </button>
                        <Link href="/crm/contacts" className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                            Cancel
                        </Link>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
