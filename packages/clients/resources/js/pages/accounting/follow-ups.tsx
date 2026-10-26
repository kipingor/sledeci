/**
 * accounting/follow-ups.tsx — Amber Obsidian redesign
 * All router.post/delete calls and state logic preserved exactly.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Plus, Check, Trash2, Bell, AlertTriangle, Clock, Calendar } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Follow-ups', href: '/follow-ups' },
];

const TYPE_PILL: Record<string, string> = {
    call:             'bg-sky-50 text-sky-700 ring-sky-200',
    email:            'bg-violet-50 text-violet-700 ring-violet-200',
    meeting:          'bg-emerald-50 text-emerald-700 ring-emerald-200',
    check_in:         'bg-slate-50 text-slate-600 ring-slate-200',
    invoice_reminder: 'bg-amber-50 text-amber-700 ring-amber-200',
    report:           'bg-teal-50 text-teal-700 ring-teal-200',
};
const PRIORITY_COLOR: Record<string, string> = {
    low: 'text-muted-foreground', normal: '', high: 'text-red-600 font-semibold',
};

const fmtDate = (d: string) => format(new Date(d), 'MMM d, yyyy');
const isOverdue = (f: any) => !f.completed_at && f.scheduled_at && new Date(f.scheduled_at) < new Date();

interface Props {
    followUps: { data: any[]; current_page: number; last_page: number; total: number };
    counts: { pending: number; overdue: number; today: number; completed: number };
    clients: { id: number; name: string; email: string }[];
    projects: { id: number; name: string }[];
}

export default function FollowUps({ followUps, counts, clients, projects }: Props) {
    const [newOpen,       setNewOpen]       = useState(false);
    const [form,          setForm]          = useState({ client_id: '', project_id: '', type: 'call', subject: '', notes: '', scheduled_at: '', priority: 'normal' });
    const [completeModal, setCompleteModal] = useState<{ id: number; outcome: string; notes: string } | null>(null);
    const [filterStatus,  setFilterStatus]  = useState('pending');

    function createFollowUp() {
        router.post('/follow-ups', form, {
            onSuccess: () => { setNewOpen(false); setForm({ client_id: '', project_id: '', type: 'call', subject: '', notes: '', scheduled_at: '', priority: 'normal' }); },
            preserveScroll: true,
        });
    }

    function completeFollowUp() {
        if (!completeModal) return;
        router.post(`/follow-ups/${completeModal.id}/complete`, { outcome: completeModal.outcome, notes: completeModal.notes }, {
            onSuccess: () => setCompleteModal(null),
            preserveScroll: true,
        });
    }

    const statStrip = [
        { label: 'Pending',   value: counts.pending,   icon: Clock,          color: 'text-blue-600',    bg: 'bg-blue-50' },
        { label: 'Overdue',   value: counts.overdue,   icon: AlertTriangle,  color: 'text-red-600',     bg: 'bg-red-50' },
        { label: 'Today',     value: counts.today,     icon: Calendar,       color: 'text-primary',     bg: 'bg-primary/10' },
        { label: 'Completed', value: counts.completed, icon: Check,          color: 'text-emerald-600', bg: 'bg-emerald-50' },
    ];

    const statusTabs = [
        { key: 'pending',   label: 'Pending' },
        { key: 'overdue',   label: 'Overdue' },
        { key: 'completed', label: 'Completed' },
        { key: '',          label: 'All' },
    ];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Client Follow-ups" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Bell className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Client Follow-ups</h1>
                                <p className="text-xs text-muted-foreground">Track calls, emails, meetings &amp; reminders</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setNewOpen(!newOpen)}>
                            <Plus className="h-3.5 w-3.5" /> Schedule Follow-up
                        </Button>
                    </div>

                    {/* Stats strip */}
                    <div className="flex divide-x divide-border/60 border-b border-border/60">
                        {statStrip.map(s => (
                            <div key={s.label} className="flex-1 px-4 py-2.5 flex items-center gap-2.5">
                                <div className={cn('h-7 w-7 rounded-md flex items-center justify-center shrink-0', s.bg)}>
                                    <s.icon className={cn('h-3.5 w-3.5', s.color)} />
                                </div>
                                <div>
                                    <p className={cn('text-xl font-bold tabular-nums leading-none', s.color)}>{s.value}</p>
                                    <p className="text-[10px] text-muted-foreground mt-0.5">{s.label}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Status tab bar */}
                    <div className="flex items-center px-4">
                        {statusTabs.map(tab => (
                            <button key={tab.key} onClick={() => {
                                setFilterStatus(tab.key);
                                router.get('/follow-ups', tab.key ? { status: tab.key } : {}, { preserveScroll: true });
                            }}
                                className={cn('px-4 py-2.5 text-xs font-medium whitespace-nowrap transition-colors',
                                    filterStatus === tab.key ? 'sf-tab-active' : 'sf-tab-inactive')}>
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* New follow-up form */}
                {newOpen && (
                    <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 shrink-0">
                        <h3 className="text-sm font-semibold mb-3">New Follow-up</h3>
                        <div className="grid sm:grid-cols-3 gap-3 mb-3">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Client *</label>
                                <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}>
                                    <option value="">Select client…</option>
                                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Type *</label>
                                <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                                    {[['call','Phone Call'],['email','Email'],['meeting','Meeting'],['check_in','Check-in'],['invoice_reminder','Invoice Reminder'],['report','Send Report']].map(([v,l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Priority</label>
                                <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                    {['low','normal','high'].map(p => <option key={p} value={p} className="capitalize">{p}</option>)}
                                </select>
                            </div>
                            <div className="sm:col-span-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Subject *</label>
                                <Input placeholder="e.g. Follow up on invoice INV-2025-0012" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="h-8 text-sm" />
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Scheduled Date</label>
                                <Input type="datetime-local" value={form.scheduled_at} onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))} className="h-8 text-sm" />
                            </div>
                            <div className="sm:col-span-3">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label>
                                <textarea className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs resize-none"
                                    rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={createFollowUp} disabled={!form.client_id || !form.subject}>Save</Button>
                            <Button size="sm" variant="outline" onClick={() => setNewOpen(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Complete modal */}
                {completeModal && (
                    <div className="bg-emerald-50/80 border-b border-emerald-200 px-6 py-4 shrink-0">
                        <h3 className="text-sm font-semibold mb-3 text-emerald-800">Mark as Complete</h3>
                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Outcome</label>
                                <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={completeModal.outcome} onChange={e => setCompleteModal(m => m ? { ...m, outcome: e.target.value } : null)}>
                                    <option value="">Select outcome…</option>
                                    {[['interested','Interested'],['no_response','No Response'],['callback','Callback Requested'],['resolved','Resolved'],['paid','Invoice Paid'],['other','Other']].map(([v,l]) => (
                                        <option key={v} value={v}>{l}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1 block">Notes</label>
                                <Input placeholder="What happened?" value={completeModal.notes} onChange={e => setCompleteModal(m => m ? { ...m, notes: e.target.value } : null)} className="h-8 text-sm" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={completeFollowUp}>
                                <Check className="h-3.5 w-3.5 mr-1.5" /> Mark Complete
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setCompleteModal(null)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* List */}
                <div className="flex-1 overflow-auto bg-background p-5">
                    {followUps.data.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Bell className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No follow-ups found</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => setNewOpen(true)}>
                                Schedule one
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2 max-w-3xl">
                            {followUps.data.map((f: any) => {
                                const overdue = isOverdue(f);
                                return (
                                    <div key={f.id} className={cn(
                                        'bg-card border rounded-lg p-4 transition-colors',
                                        overdue ? 'border-red-200 bg-red-50/20' : 'border-border',
                                        f.completed_at && 'opacity-60'
                                    )}>
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-start gap-3 flex-1 min-w-0">
                                                <div className={cn('h-2 w-2 rounded-full mt-2 shrink-0',
                                                    f.completed_at ? 'bg-emerald-500' : overdue ? 'bg-red-500' : 'bg-amber-400')} />
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-medium text-sm">{f.subject}</p>
                                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1 capitalize',
                                                            TYPE_PILL[f.type] ?? 'bg-muted text-muted-foreground ring-border')}>
                                                            {f.type.replace(/_/g, ' ')}
                                                        </span>
                                                        {f.priority !== 'normal' && (
                                                            <span className={cn('text-xs font-semibold capitalize', PRIORITY_COLOR[f.priority])}>
                                                                {f.priority}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                                        <span>{f.client?.name}</span>
                                                        {f.project && <span>· {f.project.name}</span>}
                                                        {f.scheduled_at && <span>· {fmtDate(f.scheduled_at)}</span>}
                                                        {f.completed_at && <span className="text-emerald-600 font-medium">· Completed {fmtDate(f.completed_at)}</span>}
                                                        {f.outcome && <span className="italic">· {f.outcome.replace(/_/g, ' ')}</span>}
                                                    </div>
                                                    {f.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{f.notes}</p>}
                                                </div>
                                            </div>
                                            {!f.completed_at && (
                                                <div className="flex items-center gap-1 shrink-0">
                                                    <Button variant="ghost" size="sm" className="h-7 px-2 text-emerald-600 hover:text-emerald-700 text-xs"
                                                        onClick={() => setCompleteModal({ id: f.id, outcome: '', notes: '' })}>
                                                        <Check className="h-3.5 w-3.5 mr-1" /> Done
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                        onClick={() => { if (confirm('Delete follow-up?')) router.delete(`/follow-ups/${f.id}`, { preserveScroll: true }); }}>
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}