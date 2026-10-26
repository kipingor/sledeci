import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Play, CheckCircle2, Banknote, Download, User } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface PayrollRun {
    id: number; year: number; month: number; reference: string; status: string;
    total_gross: number; total_paye: number; total_nhif: number;
    total_nssf: number; total_housing_levy: number; total_net: number;
    total_employer_nssf: number; payment_date: string | null;
}

interface Payslip {
    id: number; gross_pay: number; paye: number; nhif: number;
    nssf_employee: number; housing_levy: number; net_pay: number;
    payment_status: string;
    employee: { id: number; first_name: string; last_name: string; employee_number: string; department: string | null; job_title: string | null };
}

interface Props { run: PayrollRun; payslips: Payslip[] }

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const fmt = (n: number) => new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 }).format(n);

export default function PayrollRun({ run, payslips }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Payroll', href: '/payroll' },
        { title: `${MONTHS[run.month - 1]} ${run.year}`, href: `/payroll/runs/${run.id}` },
    ];

    const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
    const [processing, setProcessing]   = useState('');

    function act(action: string, payload: Record<string, unknown> = {}) {
        setProcessing(action);
        const url = action === 'compute'
            ? `/payroll/runs/${run.id}/compute`
            : action === 'approve'
            ? `/payroll/runs/${run.id}/approve`
            : `/payroll/runs/${run.id}/mark-paid`;

        router.post(url, payload as Parameters<typeof router.post>[1], {
            onFinish: () => setProcessing(''),
            preserveScroll: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Payroll — ${MONTHS[run.month - 1]} ${run.year}`} />
            <div className="space-y-5 p-6">

                {/* Header */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h1 className="text-lg font-bold">{MONTHS[run.month - 1]} {run.year} Payroll</h1>
                            <p className="text-xs font-mono text-muted-foreground">{run.reference}</p>
                        </div>
                        <div className="flex gap-2">
                            {run.status === 'draft' && (
                                <Button size="sm" onClick={() => act('compute')} disabled={processing === 'compute'}
                                    className="bg-blue-600 hover:bg-blue-700 text-white gap-1.5">
                                    <Play className="h-3.5 w-3.5" />
                                    {processing === 'compute' ? 'Computing…' : 'Compute Payslips'}
                                </Button>
                            )}
                            {run.status === 'draft' && payslips.length > 0 && (
                                <Button size="sm" onClick={() => act('approve')} disabled={processing === 'approve'}
                                    className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                    {processing === 'approve' ? 'Approving…' : 'Approve Run'}
                                </Button>
                            )}
                            {run.status === 'approved' && (
                                <div className="flex items-center gap-2">
                                    <Input type="date" value={paymentDate}
                                        onChange={e => setPaymentDate(e.target.value)} className="h-8 text-xs w-36" />
                                    <Button size="sm" onClick={() => act('mark-paid', { payment_date: paymentDate })}
                                        disabled={processing === 'mark-paid'}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                                        <Banknote className="h-3.5 w-3.5" />
                                        {processing === 'mark-paid' ? 'Marking…' : 'Mark as Paid'}
                                    </Button>
                                </div>
                            )}
                            <Button size="sm" variant="outline" className="gap-1.5"
                                onClick={() => window.open(`/payroll/${run.year}/p9-export`, '_blank')}>
                                <Download className="h-3.5 w-3.5" /> P9 Export
                            </Button>
                        </div>
                    </div>

                    {/* Totals strip */}
                    {payslips.length > 0 && (
                        <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-border">
                            {[
                                { label: 'Gross Pay',     value: run.total_gross,        color: '' },
                                { label: 'PAYE Tax',      value: run.total_paye,         color: 'text-red-600' },
                                { label: 'NHIF',          value: run.total_nhif,         color: 'text-red-600' },
                                { label: 'NSSF',          value: run.total_nssf,         color: 'text-red-600' },
                                { label: 'Housing Levy',  value: run.total_housing_levy, color: 'text-red-600' },
                                { label: 'Net Pay',       value: run.total_net,          color: 'text-emerald-600 font-bold' },
                            ].map(col => (
                                <div key={col.label} className="text-center p-2 bg-muted/20 rounded-lg">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{col.label}</p>
                                    <p className={cn('text-sm font-semibold tabular-nums mt-0.5', col.color)}>{fmt(col.value)}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Payslips table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center justify-between">
                        <p className="text-sm font-semibold">Employee Payslips ({payslips.length})</p>
                    </div>
                    {payslips.length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-sm">
                            <p>No payslips computed yet.</p>
                            <p className="text-xs mt-1">Click "Compute Payslips" to calculate for all active employees.</p>
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    {['Employee', 'Dept', 'Gross', 'PAYE', 'NHIF', 'NSSF', 'Housing', 'Net Pay', ''].map(h => (
                                        <th key={h} className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {payslips.map(ps => (
                                    <tr key={ps.id} className="hover:bg-muted/10">
                                        <td className="px-3 py-2.5">
                                            <p className="font-medium text-xs">{ps.employee.first_name} {ps.employee.last_name}</p>
                                            <p className="text-[10px] font-mono text-muted-foreground">{ps.employee.employee_number}</p>
                                        </td>
                                        <td className="px-3 py-2.5 text-xs text-muted-foreground">{ps.employee.department ?? '—'}</td>
                                        <td className="px-3 py-2.5 text-xs tabular-nums">{fmt(ps.gross_pay)}</td>
                                        <td className="px-3 py-2.5 text-xs tabular-nums text-red-600">{fmt(ps.paye)}</td>
                                        <td className="px-3 py-2.5 text-xs tabular-nums text-red-600">{fmt(ps.nhif)}</td>
                                        <td className="px-3 py-2.5 text-xs tabular-nums text-red-600">{fmt(ps.nssf_employee)}</td>
                                        <td className="px-3 py-2.5 text-xs tabular-nums text-red-600">{fmt(ps.housing_levy)}</td>
                                        <td className="px-3 py-2.5 text-xs font-bold tabular-nums text-emerald-600">{fmt(ps.net_pay)}</td>
                                        <td className="px-3 py-2.5">
                                            <a href={`/payroll/payslips/${ps.id}`} className="text-xs text-primary hover:underline">
                                                Slip
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}