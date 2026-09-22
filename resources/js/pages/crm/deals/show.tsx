import React, { useState } from 'react';
import { Head, Link, useForm, router } from '@inertiajs/react';
import AppLayout from '@/components/AppLayout';
import { ArrowLeft, Edit, Trash2, Plus, CheckCircle2, Circle, TrendingUp, Calendar } from 'lucide-react';

interface Activity {
    id: number; type: string; subject: string; body: string | null;
    due_at: string | null; done_at: string | null;
    owner: { id: number; name: string } | null; created_at: string;
}

interface Deal {
    id: number; title: string; value: string; currency: string; stage: string;
    expected_close_date: string | null; closed_at: string | null; notes: string | null;
    contact: { id: number; first_name: string; last_name: string | null } | null;
    company: { id: number; name: string } | null;
    owner: { id: number; name: string } | null;
    activities: Activity[];
}

interface Props { deal: Deal; stages: string[]; activityTypes: string[]; }

const STAGE_BADGE: Record<string, string> = {
    new: 'bg-gray-100 text-gray-700', qualified: 'bg-blue-100 text-blue-700',
    proposal: 'bg-purple-100 text-purple-700', negotiation: 'bg-orange-100 text-orange-700',
    won: 'bg-green-100 text-green-700', lost: 'bg-red-100 text-red-700',
};
const TYPE_COLORS: Record<string, string> = {
    call: 'bg-purple-100 text-purple-700', email: 'bg-blue-100 text-blue-700',
    meeting: 'bg-orange-100 text-orange-700', note: 'bg-gray-100 text-gray-700', task: 'bg-pink-100 text-pink-700',
};

export default function DealShow({ deal, stages, activityTypes }: Props) {
    const [showActivityForm, setShowActivityForm] = useState(false);
    const { data, setData, post, processing, reset, errors } = useForm({ type: 'note', subject: '', body: '', due_at: '' });

    const logActivity = (e: React.FormEvent) => {
        e.preventDefault();
        post(`/crm/activities?for=deal,${deal.id}`, { onSuccess: () => { reset(); setShowActivityForm(false); } });
    };

    const moveStage = (stage: string) => router.put(`/crm/deals/${deal.id}`, { ...deal, stage });
    const markDone = (id: number) => router.patch(`/crm/activities/${id}/done`);
    const deleteActivity = (id: number) => { if (confirm('Delete activity?')) router.delete(`/crm/activities/${id}`); };
    const deleteDeal = () => { if (confirm('Delete this deal?')) router.delete(`/crm/deals/${deal.id}`); };

    const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500';

    return (
        <AppLayout>
            <Head title={deal.title} />
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link href="/crm/deals" className="text-gray-500 hover:text-gray-800"><ArrowLeft size={20} /></Link>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{deal.title}</h1>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-lg font-semibold text-indigo-600">
                                    {deal.currency} {Number(deal.value).toLocaleString()}
                                </span>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STAGE_BADGE[deal.stage]}`}>{deal.stage}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Link href={`/crm/deals/${deal.id}/edit`} className="flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"><Edit size={14} /> Edit</Link>
                        <button onClick={deleteDeal} className="flex items-center gap-1 rounded-lg border border-red-200 px-3 py-2 text-sm text-red-600 hover:bg-red-50"><Trash2 size={14} /> Delete</button>
                    </div>
                </div>

                {/* Stage pipeline progress */}
                <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <p className="text-xs font-medium text-gray-500 mb-3">MOVE STAGE</p>
                    <div className="flex gap-2 flex-wrap">
                        {stages.map(s => (
                            <button key={s} onClick={() => moveStage(s)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${s === deal.stage ? STAGE_BADGE[s] + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'}`}>
                                {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-6">
                    <div className="space-y-4">
                        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
                            <h2 className="font-semibold text-gray-800">Details</h2>
                            {deal.contact && (
                                <div className="text-sm text-gray-600">
                                    Contact: <Link href={`/crm/contacts/${deal.contact.id}`} className="text-indigo-600 hover:underline">
                                        {deal.contact.first_name} {deal.contact.last_name}
                                    </Link>
                                </div>
                            )}
                            {deal.company && (
                                <div className="text-sm text-gray-600">
                                    Company: <Link href={`/crm/companies/${deal.company.id}`} className="text-indigo-600 hover:underline">{deal.company.name}</Link>
                                </div>
                            )}
                            {deal.expected_close_date && (
                                <div className="flex items-center gap-2 text-sm text-gray-600">
                                    <Calendar size={14} /> Close: {new Date(deal.expected_close_date).toLocaleDateString('en-KE')}
                                </div>
                            )}
                            {deal.owner && <div className="text-sm text-gray-600">Owner: {deal.owner.name}</div>}
                        </div>
                        {deal.notes && (
                            <div className="bg-white rounded-xl border border-gray-200 p-5">
                                <h2 className="font-semibold text-gray-800 mb-2">Notes</h2>
                                <p className="text-sm text-gray-600 whitespace-pre-wrap">{deal.notes}</p>
                            </div>
                        )}
                    </div>

                    <div className="col-span-2 space-y-4">
                        <div className="flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800">Activity</h2>
                            <button onClick={() => setShowActivityForm(v => !v)} className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800">
                                <Plus size={14} /> Log Activity
                            </button>
                        </div>

                        {showActivityForm && (
                            <form onSubmit={logActivity} className="bg-white rounded-xl border border-indigo-200 p-4 space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <select className={inputCls} value={data.type} onChange={e => setData('type', e.target.value)}>
                                        {activityTypes.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                                    </select>
                                    <input className={inputCls} placeholder="Subject *" value={data.subject} onChange={e => setData('subject', e.target.value)} />
                                </div>
                                {errors.subject && <p className="text-xs text-red-600">{errors.subject}</p>}
                                <textarea className={inputCls} rows={2} placeholder="Notes (optional)" value={data.body} onChange={e => setData('body', e.target.value)} />
                                <input type="datetime-local" className={inputCls} value={data.due_at} onChange={e => setData('due_at', e.target.value)} />
                                <div className="flex gap-2">
                                    <button type="submit" disabled={processing} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50">
                                        {processing ? 'Saving…' : 'Log Activity'}
                                    </button>
                                    <button type="button" onClick={() => setShowActivityForm(false)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
                                </div>
                            </form>
                        )}

                        <div className="space-y-3">
                            {deal.activities.length === 0 && !showActivityForm && (
                                <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-gray-200">No activities yet.</div>
                            )}
                            {deal.activities.map(a => (
                                <div key={a.id} className="bg-white rounded-xl border border-gray-200 p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <button onClick={() => !a.done_at && markDone(a.id)} className="mt-0.5">
                                                {a.done_at ? <CheckCircle2 size={18} className="text-green-500" /> : <Circle size={18} className="text-gray-300 hover:text-indigo-500" />}
                                            </button>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLORS[a.type]}`}>{a.type}</span>
                                                    <span className={`text-sm font-medium ${a.done_at ? 'line-through text-gray-400' : 'text-gray-800'}`}>{a.subject}</span>
                                                </div>
                                                {a.body && <p className="text-sm text-gray-500 mt-1">{a.body}</p>}
                                                <div className="text-xs text-gray-400 mt-1">{a.owner?.name} · {new Date(a.created_at).toLocaleDateString()}</div>
                                            </div>
                                        </div>
                                        <button onClick={() => deleteActivity(a.id)} className="text-gray-300 hover:text-red-500"><Trash2 size={14} /></button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
