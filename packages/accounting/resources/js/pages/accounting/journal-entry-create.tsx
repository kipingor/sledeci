/**
 * accounting/journal-entry-create.tsx — Amber Obsidian redesign
 * All form state, validation, and router.post() preserved exactly.
 * The live balance indicator and addLine/removeLine logic are unchanged.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2, CheckCircle2, AlertTriangle, Loader2, BookOpen, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting',       href: '/accounting' },
    { title: 'Journal Entries',  href: '/accounting/journal' },
    { title: 'New Manual Entry', href: '/accounting/journal/create' },
];

interface Account { id: number; code: string; name: string; type: string; normal_balance: string }
interface Period   { id: number; name: string; starts_on: string; ends_on: string }
interface Project  { id: number; name: string }
interface Line { account_id: string; type: 'debit' | 'credit'; amount: string; description: string; project_id: string }

const emptyLine = (): Line => ({ account_id: '', type: 'debit', amount: '', description: '', project_id: '' });

export default function JournalEntryCreate({ accounts, periods, projects }: {
    accounts: Account[]; periods: Period[]; projects: Project[];
}) {
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [form, setForm] = useState({
        period_id:  periods[0]?.id.toString() ?? '',
        entry_date: new Date().toISOString().slice(0, 10),
        memo:       '',
        notes:      '',
        lines:      [emptyLine(), emptyLine()],
    });

    function updateLine(i: number, field: keyof Line, value: string) {
        const lines = [...form.lines];
        lines[i] = { ...lines[i], [field]: value };
        setForm({ ...form, lines });
    }
    function addLine()      { setForm({ ...form, lines: [...form.lines, emptyLine()] }); }
    function removeLine(i: number) {
        if (form.lines.length <= 2) return;
        setForm({ ...form, lines: form.lines.filter((_, idx) => idx !== i) });
    }

    const totalDebits  = form.lines.filter(l => l.type === 'debit').reduce((s, l)  => s + (parseFloat(l.amount) || 0), 0);
    const totalCredits = form.lines.filter(l => l.type === 'credit').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0);
    const diff         = Math.abs(totalDebits - totalCredits);
    const isBalanced   = diff < 0.005 && totalDebits > 0;

    function submit() {
        const e: Record<string, string> = {};
        if (!form.period_id)    e.period_id  = 'Required';
        if (!form.entry_date)   e.entry_date  = 'Required';
        if (!form.memo.trim())  e.memo        = 'Required';
        form.lines.forEach((l, i) => {
            if (!l.account_id)                       e[`lines.${i}.account_id`] = 'Select account';
            if (!l.amount || parseFloat(l.amount) <= 0) e[`lines.${i}.amount`] = 'Enter amount';
        });
        if (!isBalanced) e.balance = 'Debits must equal credits';
        if (Object.keys(e).length) { setErrors(e); return; }

        setSaving(true);
        router.post('/accounting/journal', {
            ...form,
            lines: form.lines.map(l => ({ ...l, amount: parseFloat(l.amount) })),
        }, {
            onFinish: () => setSaving(false),
            onError:  (err) => setErrors(err as any),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Journal Entry" />
            <div className="flex flex-col h-full">

                {/* SF header */}
                <div className="bg-card border-b border-border px-6 py-4">
                    <div className="flex items-center gap-3">
                        <nav className="flex items-center gap-1.5 text-sm">
                            <a href="/accounting/journal" className="text-muted-foreground hover:text-foreground transition-colors">Journal Entries</a>
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                            <span className="font-semibold">New Manual Entry</span>
                        </nav>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <BookOpen className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">New Manual Journal Entry</h1>
                            <p className="text-sm text-muted-foreground mt-0.5">Double-entry bookkeeping — debits must equal credits</p>
                        </div>
                    </div>
                </div>

                {/* Form body */}
                <div className="flex-1 overflow-auto bg-background p-6 space-y-5">
                    <div className="max-w-4xl mx-auto space-y-5">

                        {/* Header fields */}
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                                <p className="text-sm font-semibold">Entry Details</p>
                            </div>
                            <div className="p-5 space-y-4">
                                <div className="grid sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Accounting Period *
                                        </Label>
                                        <select className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                                            value={form.period_id} onChange={e => setForm({ ...form, period_id: e.target.value })}>
                                            <option value="">Select period…</option>
                                            {periods.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                        {errors.period_id && <p className="text-xs text-destructive">{errors.period_id}</p>}
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                            Entry Date *
                                        </Label>
                                        <Input type="date" value={form.entry_date}
                                            onChange={e => setForm({ ...form, entry_date: e.target.value })} />
                                        {errors.entry_date && <p className="text-xs text-destructive">{errors.entry_date}</p>}
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Memo / Description *
                                    </Label>
                                    <Input value={form.memo} onChange={e => setForm({ ...form, memo: e.target.value })}
                                        placeholder="e.g. Monthly accrual — December 2024 rent" />
                                    {errors.memo && <p className="text-xs text-destructive">{errors.memo}</p>}
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        Notes (optional)
                                    </Label>
                                    <textarea
                                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm min-h-16 resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                                        value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                                        placeholder="Supporting notes or references…" />
                                </div>
                            </div>
                        </div>

                        {/* Lines table */}
                        <div className="bg-card border border-border rounded-lg overflow-hidden">
                            <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-muted/30">
                                <p className="text-sm font-semibold">Journal Lines</p>
                                <div className="flex items-center gap-2">
                                    {isBalanced ? (
                                        <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Balanced
                                        </span>
                                    ) : (totalDebits > 0 || totalCredits > 0) ? (
                                        <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
                                            <AlertTriangle className="h-3.5 w-3.5" /> Difference: {diff.toFixed(2)}
                                        </span>
                                    ) : null}
                                </div>
                            </div>

                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="bg-muted/20 border-b border-border text-left">
                                        {['Account *', 'Dr / Cr', 'Amount *', 'Description', 'Project', ''].map((h, i) => (
                                            <th key={i} className={cn(
                                                'px-3 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                                                i === 1 && 'w-24', i === 2 && 'w-36', i === 4 && 'w-40', i === 5 && 'w-10'
                                            )}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/50">
                                    {form.lines.map((line, i) => (
                                        <tr key={i} className="hover:bg-muted/10 transition-colors">
                                            <td className="px-3 py-2">
                                                <select className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                                                    value={line.account_id}
                                                    onChange={e => updateLine(i, 'account_id', e.target.value)}>
                                                    <option value="">Select account…</option>
                                                    {accounts.map(a => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
                                                </select>
                                                {errors[`lines.${i}.account_id`] && (
                                                    <p className="text-[10px] text-destructive mt-0.5">{errors[`lines.${i}.account_id`]}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <select className={cn(
                                                    'w-full h-8 rounded border px-2 text-xs font-semibold',
                                                    line.type === 'debit'
                                                        ? 'border-primary/30 bg-primary/5 text-primary'
                                                        : 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                                )}
                                                    value={line.type} onChange={e => updateLine(i, 'type', e.target.value)}>
                                                    <option value="debit">Debit</option>
                                                    <option value="credit">Credit</option>
                                                </select>
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input className="h-8 text-right tabular-nums text-sm" type="number" step="0.01" min="0"
                                                    value={line.amount} onChange={e => updateLine(i, 'amount', e.target.value)}
                                                    placeholder="0.00" />
                                                {errors[`lines.${i}.amount`] && (
                                                    <p className="text-[10px] text-destructive mt-0.5">{errors[`lines.${i}.amount`]}</p>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <Input className="h-8 text-sm" value={line.description}
                                                    onChange={e => updateLine(i, 'description', e.target.value)}
                                                    placeholder="Optional…" />
                                            </td>
                                            <td className="px-3 py-2">
                                                <select className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                                                    value={line.project_id} onChange={e => updateLine(i, 'project_id', e.target.value)}>
                                                    <option value="">No project</option>
                                                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 text-center">
                                                {form.lines.length > 2 && (
                                                    <button onClick={() => removeLine(i)}
                                                        className="text-muted-foreground hover:text-destructive transition-colors p-1">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-muted/20 border-t border-border">
                                        <td className="px-3 py-2">
                                            <button onClick={addLine}
                                                className="flex items-center gap-1.5 text-xs text-primary hover:underline font-medium">
                                                <Plus className="h-3 w-3" /> Add line
                                            </button>
                                        </td>
                                        <td className="px-3 py-2 text-xs font-semibold text-muted-foreground">Totals</td>
                                        <td className="px-3 py-2 text-right">
                                            <div className={cn('text-xs tabular-nums', totalDebits > 0 ? 'text-primary font-semibold' : 'text-muted-foreground')}>
                                                Dr {totalDebits.toFixed(2)}
                                            </div>
                                            <div className={cn('text-xs tabular-nums', totalCredits > 0 ? 'text-emerald-600 font-semibold' : 'text-muted-foreground')}>
                                                Cr {totalCredits.toFixed(2)}
                                            </div>
                                        </td>
                                        <td colSpan={3} />
                                    </tr>
                                </tfoot>
                            </table>
                        </div>

                        {errors.balance && (
                            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2.5">
                                <AlertTriangle className="h-4 w-4 shrink-0" /> {errors.balance}
                            </div>
                        )}
                    </div>
                </div>

                {/* Sticky footer */}
                <div className="sticky bottom-0 bg-card border-t border-border px-6 py-3 flex items-center gap-3">
                    <Button onClick={submit} disabled={saving || !isBalanced} className="gap-2">
                        {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Save as Draft
                    </Button>
                    <Button variant="outline" onClick={() => router.visit('/accounting/journal')}>Cancel</Button>
                    {!isBalanced && totalDebits > 0 && (
                        <span className="text-xs text-muted-foreground ml-2">
                            Balance the entry before saving
                        </span>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}