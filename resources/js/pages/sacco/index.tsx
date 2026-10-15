import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Users, Banknote, TrendingDown, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'SACCO', href: '/sacco' }];

interface Member {
    id: number; member_number: string; status: string;
    monthly_contribution: number;
    user: { id: number; name: string; email: string };
    savings_account: { balance: number } | null;
}

interface Props {
    members: { data: Member[]; total: number; links: any[] };
    totalSavings: number;
    totalLoansOutstanding: number;
    activeMembers: number;
}

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export default function SaccoIndex({ members, totalSavings, totalLoansOutstanding, activeMembers }: Props) {
    const [enrollOpen, setEnrollOpen] = useState(false);
    const [enrollForm, setEnrollForm] = useState({ user_id: '', monthly_contribution: '', share_capital: '', joined_date: new Date().toISOString().slice(0, 10) });
    const [enrolling, setEnrolling]   = useState(false);

    function enroll() {
        setEnrolling(true);
        router.post('/sacco/members', enrollForm, {
            onSuccess: () => { setEnrollOpen(false); setEnrolling(false); },
            onFinish:  () => setEnrolling(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="SACCO" />
            <div className="space-y-5 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">SACCO</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Savings & Credit Cooperative</p>
                    </div>
                    <Button size="sm" onClick={() => setEnrollOpen(true)}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Enroll Member
                    </Button>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Active Members',      value: activeMembers,           icon: Users,       color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/30' },
                        { label: 'Total Savings',        value: fmt(totalSavings),       icon: Banknote,    color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' },
                        { label: 'Loans Outstanding',   value: fmt(totalLoansOutstanding), icon: TrendingDown, color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' },
                    ].map(card => (
                        <div key={card.label} className="bg-card border border-border rounded-xl p-4">
                            <div className={cn('inline-flex p-1.5 rounded-lg mb-2', card.color)}>
                                <card.icon className="h-4 w-4" />
                            </div>
                            <p className="text-xl font-bold tabular-nums">{card.value}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{card.label}</p>
                        </div>
                    ))}
                </div>

                {/* Members table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Members ({members.total})</p>
                    </div>
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-border bg-muted/20">
                                {['Member', 'Number', 'Monthly Contrib.', 'Savings Balance', 'Status', ''].map(h => (
                                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {members.data.map(m => (
                                <tr key={m.id} className="hover:bg-muted/20">
                                    <td className="px-4 py-3">
                                        <p className="font-medium">{m.user.name}</p>
                                        <p className="text-xs text-muted-foreground">{m.user.email}</p>
                                    </td>
                                    <td className="px-4 py-3 text-xs font-mono text-muted-foreground">{m.member_number}</td>
                                    <td className="px-4 py-3 text-sm">{fmt(m.monthly_contribution)}</td>
                                    <td className="px-4 py-3 text-sm font-semibold text-emerald-600">
                                        {fmt(m.savings_account?.balance ?? 0)}
                                    </td>
                                    <td className="px-4 py-3">
                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full',
                                            m.status === 'active'
                                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                                                : 'bg-zinc-50 text-zinc-500 ring-1 ring-zinc-200')}>
                                            {m.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3">
                                        <Link href={`/sacco/members/${m.id}`}
                                            className="text-xs text-primary hover:underline">
                                            View
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Enroll modal */}
            {enrollOpen && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Enroll New Member</h2>
                            <button onClick={() => setEnrollOpen(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            {[
                                { key: 'user_id',              label: 'User ID',              type: 'number', placeholder: 'System user ID' },
                                { key: 'monthly_contribution', label: 'Monthly Contribution (KES)', type: 'number', placeholder: '0.00' },
                                { key: 'share_capital',        label: 'Share Capital (KES)',  type: 'number', placeholder: '0.00' },
                                { key: 'joined_date',          label: 'Joined Date',          type: 'date',   placeholder: '' },
                            ].map(f => (
                                <div key={f.key} className="space-y-1.5">
                                    <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{f.label}</label>
                                    <Input type={f.type} placeholder={f.placeholder}
                                        value={enrollForm[f.key as keyof typeof enrollForm]}
                                        onChange={e => setEnrollForm(p => ({ ...p, [f.key]: e.target.value }))} />
                                </div>
                            ))}
                        </div>
                        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setEnrollOpen(false)}>Cancel</Button>
                            <Button size="sm" onClick={enroll} disabled={enrolling || !enrollForm.user_id}
                                className="bg-amber-500 hover:bg-amber-600 text-white">
                                {enrolling ? 'Enrolling…' : 'Enroll'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}