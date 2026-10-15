import AppLayout from '@/layouts/app-layout';
import { Head, Link, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import {
    Users, Plus, Play, CheckCircle2, Banknote,
    Calculator, ChevronDown, ChevronUp, RefreshCw,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Payroll', href: '/payroll' }];

interface PayrollRun {
    id: number; year: number; month: number; reference: string; status: string;
    total_gross: number; total_net: number; total_paye: number;
    payment_date: string | null; created_at: string;
    creator: { name: string };
}

interface Props {
    runs: { data: PayrollRun[]; total: number };
    latestRun: PayrollRun | null;
    employeeCount: number;
}

const STATUS_CONFIG: Record<string, { label: string; pill: string }> = {
    draft:      { label: 'Draft',      pill: 'bg-zinc-50 text-zinc-600 ring-zinc-200' },
    processing: { label: 'Processing', pill: 'bg-blue-50 text-blue-700 ring-blue-200' },
    approved:   { label: 'Approved',   pill: 'bg-amber-50 text-amber-700 ring-amber-200' },
    paid:       { label: 'Paid',       pill: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    cancelled:  { label: 'Cancelled',  pill: 'bg-red-50 text-red-600 ring-red-200' },
};

const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayrollIndex({ runs, latestRun, employeeCount }: Props) {
    // New run form
    const [showNewRun, setShowNewRun] = useState(false);
    const [runYear, setRunYear]   = useState(String(new Date().getFullYear()));
    const [runMonth, setRunMonth] = useState(String(new Date().getMonth() + 1));
    const [creating, setCreating] = useState(false);

    // Live pay calculator
    const [showCalc, setShowCalc] = useState(false);
    const [calcForm, setCalcForm] = useState({ basic_salary: '', house_allowance: '', transport_allowance: '', other_allowances: '', helb_deduction: '', other_deductions: '' });
    const [calcResult, setCalcResult] = useState<Record<string, number> | null>(null);
    const [calcLoading, setCalcLoading] = useState(false);

    function setCalc(k: string, v: string) { setCalcForm(p => ({ ...p, [k]: v })); }

    function createRun() {
        setCreating(true);
        router.post('/payroll/runs', { year: runYear, month: runMonth }, {
            onSuccess: () => { setShowNewRun(false); setCreating(false); },
            onFinish:  () => setCreating(false),
        });
    }

    async function calculate() {
        setCalcLoading(true);
        const res  = await fetch('/payroll/calculate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '' },
            body: JSON.stringify(calcForm),
        });
        const data = await res.json();
        setCalcResult(data);
        setCalcLoading(false);
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Payroll" />
            <div className="space-y-5 p-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">Payroll</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">{employeeCount} active employees</p>
                    </div>
                    <div className="flex gap-2">
                        <Link href="/payroll/employees">
                            <Button size="sm" variant="outline" className="gap-1.5">
                                <Users className="h-3.5 w-3.5" /> Employees
                            </Button>
                        </Link>
                        <Button size="sm" onClick={() => setShowCalc(v => !v)} variant="outline" className="gap-1.5">
                            <Calculator className="h-3.5 w-3.5" /> Pay Calculator
                        </Button>
                        <Button size="sm" onClick={() => setShowNewRun(v => !v)}
                            className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                            <Plus className="h-3.5 w-3.5" /> New Payroll Run
                        </Button>
                    </div>
                </div>

                {/* New run panel */}
                {showNewRun && (
                    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
                        <p className="text-sm font-semibold">Create Payroll Run</p>
                        <div className="flex gap-3 items-end">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Year</label>
                                <Input type="number" min="2020" max="2099" value={runYear}
                                    onChange={e => setRunYear(e.target.value)} className="w-24" />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Month</label>
                                <select value={runMonth} onChange={e => setRunMonth(e.target.value)}
                                    className="flex h-9 rounded-md border border-input bg-background px-3 text-sm">
                                    {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                                </select>
                            </div>
                            <Button onClick={createRun} disabled={creating}
                                className="bg-amber-500 hover:bg-amber-600 text-white">
                                {creating ? 'Creating…' : 'Create Run'}
                            </Button>
                            <Button variant="outline" onClick={() => setShowNewRun(false)}>Cancel</Button>
                        </div>
                    </div>
                )}

                {/* Pay calculator */}
                {showCalc && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
                            <Calculator className="h-4 w-4 text-amber-500" />
                            <p className="text-sm font-semibold">Live Pay Calculator (Kenya statutory rates)</p>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-3">
                                {[
                                    { key: 'basic_salary',        label: 'Basic Salary' },
                                    { key: 'house_allowance',     label: 'House Allowance' },
                                    { key: 'transport_allowance', label: 'Transport Allowance' },
                                    { key: 'other_allowances',    label: 'Other Allowances' },
                                    { key: 'helb_deduction',      label: 'HELB Deduction' },
                                    { key: 'other_deductions',    label: 'Other Deductions (SACCO/Loans)' },
                                ].map(f => (
                                    <div key={f.key} className="flex items-center gap-3">
                                        <label className="text-xs text-muted-foreground w-44 shrink-0">{f.label}</label>
                                        <Input type="number" min="0" value={calcForm[f.key as keyof typeof calcForm]}
                                            onChange={e => setCalc(f.key, e.target.value)}
                                            placeholder="0" className="text-right" />
                                    </div>
                                ))}
                                <Button onClick={calculate} disabled={calcLoading || !calcForm.basic_salary}
                                    className="w-full bg-amber-500 hover:bg-amber-600 text-white gap-2">
                                    {calcLoading ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Calculating…</> : 'Calculate'}
                                </Button>
                            </div>

                            {calcResult && (
                                <div className="bg-muted/30 rounded-xl p-4 space-y-2 text-sm">
                                    <p className="font-semibold text-xs uppercase tracking-wider text-muted-foreground mb-3">Results (KES)</p>
                                    {[
                                        { label: 'Gross Pay',       value: calcResult.gross_pay,       bold: true },
                                        { label: 'PAYE Tax',        value: -calcResult.paye,           color: 'text-red-600' },
                                        { label: 'NHIF',            value: -calcResult.nhif,           color: 'text-red-600' },
                                        { label: 'NSSF (Employee)', value: -calcResult.nssf_employee,  color: 'text-red-600' },
                                        { label: 'Housing Levy',    value: -calcResult.housing_levy,   color: 'text-red-600' },
                                        ...(calcResult.helb > 0 ? [{ label: 'HELB', value: -calcResult.helb, color: 'text-red-600' }] : []),
                                        { label: 'Total Deductions',value: -calcResult.total_deductions,bold: true, color: 'text-red-600' },
                                        { label: '──────────────', value: null },
                                        { label: 'NET PAY',         value: calcResult.net_pay,         bold: true, color: 'text-emerald-600' },
                                        { label: 'Employer NSSF',   value: calcResult.nssf_employer,   color: 'text-muted-foreground' },
                                        { label: 'Employer Housing Levy', value: calcResult.housing_levy_employer, color: 'text-muted-foreground' },
                                    ].map((row, i) => row.value === null ? (
                                        <hr key={i} className="border-border my-1" />
                                    ) : (
                                        <div key={i} className={cn('flex justify-between', row.bold && 'font-bold')}>
                                            <span className="text-muted-foreground text-xs">{row.label}</span>
                                            <span className={cn('tabular-nums text-xs', row.color)}>
                                                {fmt(Math.abs(row.value))}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Runs list */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Payroll Runs</p>
                    </div>
                    {runs.data.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No payroll runs yet. Create one above.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    {['Period', 'Employees', 'Gross Pay', 'Total Deductions', 'Net Pay', 'Status', ''].map(h => (
                                        <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {runs.data.map(run => {
                                    const sc = STATUS_CONFIG[run.status] ?? STATUS_CONFIG.draft;
                                    const totalDeds = run.total_gross - run.total_net;
                                    return (
                                        <tr key={run.id} className="hover:bg-muted/20">
                                            <td className="px-4 py-3 font-medium">{MONTHS[run.month - 1]} {run.year}</td>
                                            <td className="px-4 py-3 text-xs text-muted-foreground font-mono">{run.reference}</td>
                                            <td className="px-4 py-3 font-semibold">{fmt(run.total_gross)}</td>
                                            <td className="px-4 py-3 text-red-600">{fmt(totalDeds)}</td>
                                            <td className="px-4 py-3 font-bold text-emerald-600">{fmt(run.total_net)}</td>
                                            <td className="px-4 py-3">
                                                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1', sc.pill)}>
                                                    {sc.label}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <Link href={`/payroll/runs/${run.id}`} className="text-xs text-primary hover:underline">
                                                    View
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}