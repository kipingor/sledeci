import AppLayout from '@/layouts/app-layout';
import { Head, router, useForm } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Lock, Layers, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Chart of Accounts', href: '/accounting/chart' },
];

const TYPE_PILL: Record<string, string> = {
    asset:         'bg-sky-50 text-sky-700 ring-sky-200',
    liability:     'bg-orange-50 text-orange-700 ring-orange-200',
    equity:        'bg-violet-50 text-violet-700 ring-violet-200',
    revenue:       'bg-emerald-50 text-emerald-700 ring-emerald-200',
    expense:       'bg-red-50 text-red-700 ring-red-200',
    cogs:          'bg-amber-50 text-amber-700 ring-amber-200',
    other_income:  'bg-teal-50 text-teal-700 ring-teal-200',
    other_expense: 'bg-pink-50 text-pink-700 ring-pink-200',
};

const TYPE_ORDER = ['asset', 'liability', 'equity', 'revenue', 'cogs', 'expense', 'other_income', 'other_expense'];

interface Account {
    id: number; code: string; name: string; type: string; sub_type: string;
    normal_balance: string; parent_code: string | null;
    is_bank: boolean; is_ar: boolean; is_system: boolean; is_active: boolean;
}

export default function ChartOfAccounts({ accounts, types }: { accounts: Account[]; types: string[] }) {
    const [showForm, setShowForm] = useState(false);
    const [filter,   setFilter]   = useState('');
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const { data, setData, post, processing, errors, reset } = useForm({
        code: '', name: '', type: 'asset', sub_type: 'other',
        normal_balance: 'debit', description: '', parent_id: '',
    });

    const filtered = accounts.filter(a =>
        filter === '' ||
        a.code.toLowerCase().includes(filter.toLowerCase()) ||
        a.name.toLowerCase().includes(filter.toLowerCase())
    );

    const grouped = TYPE_ORDER.reduce((acc, t) => {
        const items = filtered.filter(a => a.type === t);
        if (items.length) acc[t] = items;
        return acc;
    }, {} as Record<string, Account[]>);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Chart of Accounts" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5 border-b border-border/60">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <Layers className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Chart of Accounts</h1>
                                <p className="text-xs text-muted-foreground">{accounts.length} accounts · IFRS-aligned</p>
                            </div>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                            onClick={() => setShowForm(!showForm)}>
                            <Plus className="h-3.5 w-3.5" /> Add Account
                        </Button>
                    </div>
                    <div className="px-4 py-2">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                            <Input placeholder="Filter by code or name…" className="pl-8 h-7 text-xs" value={filter} onChange={e => setFilter(e.target.value)} />
                        </div>
                    </div>
                </div>

                {/* Add form */}
                {showForm && (
                    <div className="bg-primary/5 border-b border-primary/20 px-6 py-4 shrink-0">
                        <h3 className="text-sm font-semibold mb-3">New Account</h3>
                        <div className="grid sm:grid-cols-4 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Code *</Label>
                                <Input value={data.code} onChange={e => setData('code', e.target.value)} placeholder="e.g. 8905" className="h-8 text-sm" />
                                {errors.code && <p className="text-xs text-destructive">{errors.code}</p>}
                            </div>
                            <div className="space-y-1 sm:col-span-2">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Name *</Label>
                                <Input value={data.name} onChange={e => setData('name', e.target.value)} placeholder="e.g. Training Expenses" className="h-8 text-sm" />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type *</Label>
                                <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={data.type} onChange={e => setData('type', e.target.value)}>
                                    {types.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>)}
                                </select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Normal Balance *</Label>
                                <select className="w-full h-8 rounded-md border border-input bg-background px-3 text-xs"
                                    value={data.normal_balance} onChange={e => setData('normal_balance', e.target.value)}>
                                    <option value="debit">Debit</option>
                                    <option value="credit">Credit</option>
                                </select>
                            </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                            <Button size="sm" onClick={() => post('/accounting/chart', { onSuccess: () => { reset(); setShowForm(false); } })} disabled={processing}>
                                Create Account
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => { reset(); setShowForm(false); }}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Grouped tables */}
                <div className="flex-1 overflow-auto bg-background">
                    {Object.entries(grouped).map(([type, accts]) => {
                        const isCollapsed = collapsed[type];
                        return (
                            <div key={type}>
                                {/* Group header */}
                                <button
                                    className="w-full flex items-center gap-3 px-5 py-2.5 bg-muted/30 border-b border-border hover:bg-muted/50 transition-colors text-left"
                                    onClick={() => setCollapsed(c => ({ ...c, [type]: !c[type] }))}
                                >
                                    <span className={cn('inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full ring-1 capitalize',
                                        TYPE_PILL[type] ?? 'bg-muted text-muted-foreground ring-border')}>
                                        {type.replace(/_/g, ' ')}
                                    </span>
                                    <span className="text-xs text-muted-foreground">{accts.length} account{accts.length !== 1 ? 's' : ''}</span>
                                    <span className="ml-auto">
                                        {isCollapsed
                                            ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                            : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
                                    </span>
                                </button>

                                {!isCollapsed && (
                                    <table className="w-full text-sm">
                                        <tbody className="divide-y divide-border/50">
                                            {accts.map(acct => (
                                                <tr key={acct.id} className={cn('hover:bg-muted/20 transition-colors', !acct.is_active && 'opacity-40')}>
                                                    <td className="px-5 py-2.5 font-mono text-xs text-muted-foreground w-20">{acct.code}</td>
                                                    <td className="px-4 py-2.5 font-medium text-sm">
                                                        {acct.parent_code && <span className="text-muted-foreground mr-2">↳</span>}
                                                        {acct.name}
                                                    </td>
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{acct.sub_type.replace(/_/g, ' ')}</td>
                                                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{acct.normal_balance}</td>
                                                    <td className="px-4 py-2.5">
                                                        <div className="flex items-center gap-1">
                                                            {acct.is_bank && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700 ring-1 ring-sky-200">Bank</span>}
                                                            {acct.is_ar   && <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">AR</span>}
                                                            {acct.is_system && <Lock className="h-3 w-3 text-muted-foreground/50" />}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        );
                    })}
                    {Object.keys(grouped).length === 0 && (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Layers className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No accounts match your filter</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}