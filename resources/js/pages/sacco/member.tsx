/**
 * sacco/member.tsx — Member detail: savings, loans, transaction history
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import {
    ArrowDownCircle, ArrowUpCircle, Plus, CheckCircle2,
    Banknote, TrendingDown, X, AlertTriangle,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

interface Account { id: number; type: string; balance: number; currency: string }
interface Loan {
    id: number; loan_number: string; principal: number; interest_rate: number;
    term_months: number; monthly_repayment: number; outstanding_balance: number;
    status: string; applied_date: string; disbursed_date: string | null;
}
interface Transaction {
    id: number; type: string; amount: number; balance_after: number;
    reference: string | null; notes: string | null; transacted_at: string;
}
interface Member {
    id: number; member_number: string; status: string;
    monthly_contribution: number; share_capital: number;
    user: { id: number; name: string; email: string; phone: string | null };
    accounts: Account[];
    loans: Loan[];
}

interface Props { member: Member; transactions: Transaction[]; loanLimit: number }

const fmt = (n: number) =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 2 }).format(n);

const TX_CONFIG: Record<string, { label: string; color: string; sign: string }> = {
    deposit:           { label: 'Deposit',        color: 'text-emerald-600', sign: '+' },
    withdrawal:        { label: 'Withdrawal',     color: 'text-red-600',     sign: '-' },
    loan_disbursement: { label: 'Loan Disbursed', color: 'text-blue-600',    sign: '+' },
    loan_repayment:    { label: 'Loan Repayment', color: 'text-amber-600',   sign: '-' },
    interest_credit:   { label: 'Interest',       color: 'text-emerald-600', sign: '+' },
    dividend_credit:   { label: 'Dividend',       color: 'text-emerald-600', sign: '+' },
    share_purchase:    { label: 'Share Purchase', color: 'text-blue-600',    sign: '-' },
    charge:            { label: 'Charge',         color: 'text-red-600',     sign: '-' },
};

export default function SaccoMember({ member, transactions, loanLimit }: Props) {
    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'SACCO', href: '/sacco' },
        { title: member.user.name, href: `/sacco/members/${member.id}` },
    ];

    const [modal, setModal]             = useState<'deposit' | 'withdraw' | 'loan' | 'repay' | null>(null);
    const [amount, setAmount]           = useState('');
    const [reference, setReference]     = useState('');
    const [notes, setNotes]             = useState('');
    const [loanPrincipal, setLoanPrincipal] = useState('');
    const [loanRate, setLoanRate]       = useState('12');
    const [loanMonths, setLoanMonths]   = useState('12');
    const [loanPurpose, setLoanPurpose] = useState('');
    const [selectedLoan, setSelectedLoan] = useState<number | null>(null);
    const [submitting, setSubmitting]   = useState(false);

    const savings = member.accounts.find(a => a.type === 'savings');
    const activeLoans = member.loans.filter(l => ['disbursed', 'repaying'].includes(l.status));
    const pendingLoans = member.loans.filter(l => l.status === 'pending');

    function monthlyRepaymentPreview(): number {
        const p = parseFloat(loanPrincipal) || 0;
        const r = (parseFloat(loanRate) / 100) / 12;
        const n = parseInt(loanMonths) || 1;
        if (r === 0) return p / n;
        return p * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    function submit() {
        setSubmitting(true);
        const base = { amount, reference, notes };

        const config: Record<string, { url: string; data: Record<string, string> }> = {
            deposit:  { url: `/sacco/members/${member.id}/deposit`,  data: base },
            withdraw: { url: `/sacco/members/${member.id}/withdraw`, data: base },
            loan:     { url: `/sacco/members/${member.id}/loans`,    data: { principal: loanPrincipal, interest_rate: loanRate, term_months: loanMonths, purpose: loanPurpose } },
            repay:    { url: `/sacco/loans/${selectedLoan}/repayment`, data: { amount, reference } },
        };

        if (!modal) return;
        const { url, data } = config[modal];

        router.post(url, data, {
            onSuccess: () => { setModal(null); setAmount(''); setReference(''); setNotes(''); setSubmitting(false); },
            onFinish:  () => setSubmitting(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={member.user.name} />
            <div className="space-y-5 p-6">

                {/* Member header */}
                <div className="bg-card border border-border rounded-xl p-5">
                    <div className="flex items-start justify-between">
                        <div>
                            <h1 className="text-lg font-bold">{member.user.name}</h1>
                            <p className="text-xs font-mono text-muted-foreground">{member.member_number}</p>
                            {member.user.phone && <p className="text-xs text-muted-foreground mt-0.5">{member.user.phone}</p>}
                        </div>
                        <div className="flex gap-2">
                            <Button size="sm" onClick={() => setModal('deposit')}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5">
                                <ArrowDownCircle className="h-3.5 w-3.5" /> Deposit
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => setModal('withdraw')}
                                className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50">
                                <ArrowUpCircle className="h-3.5 w-3.5" /> Withdraw
                            </Button>
                            <Button size="sm" onClick={() => setModal('loan')}
                                className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                                <Plus className="h-3.5 w-3.5" /> Apply Loan
                            </Button>
                        </div>
                    </div>

                    {/* Account balances */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border">
                        {member.accounts.map(acc => (
                            <div key={acc.id} className="bg-muted/30 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground capitalize">{acc.type.replace('_', ' ')}</p>
                                <p className="text-sm font-bold mt-0.5">{fmt(acc.balance)}</p>
                            </div>
                        ))}
                        <div className="bg-muted/30 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground">Loan Limit</p>
                            <p className="text-sm font-bold mt-0.5 text-amber-600">{fmt(loanLimit)}</p>
                        </div>
                    </div>
                </div>

                {/* Active loans */}
                {(activeLoans.length > 0 || pendingLoans.length > 0) && (
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                            <p className="text-sm font-semibold">Loans</p>
                        </div>
                        <div className="divide-y divide-border">
                            {[...pendingLoans, ...activeLoans].map(loan => (
                                <div key={loan.id} className="px-5 py-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium font-mono">{loan.loan_number}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {fmt(loan.principal)} @ {loan.interest_rate}% for {loan.term_months} months
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Monthly: {fmt(loan.monthly_repayment)}
                                        </p>
                                    </div>
                                    <div className="text-right flex items-center gap-3">
                                        <div>
                                            <p className="text-sm font-bold text-amber-600">{fmt(loan.outstanding_balance)}</p>
                                            <p className="text-xs text-muted-foreground">outstanding</p>
                                        </div>
                                        {['disbursed', 'repaying'].includes(loan.status) && (
                                            <Button size="sm" variant="outline" onClick={() => { setSelectedLoan(loan.id); setModal('repay'); }}
                                                className="text-xs">Record Repayment</Button>
                                        )}
                                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full ring-1',
                                            loan.status === 'pending'   ? 'bg-amber-50 text-amber-700 ring-amber-200' :
                                            loan.status === 'disbursed' || loan.status === 'repaying' ? 'bg-blue-50 text-blue-700 ring-blue-200' :
                                            'bg-muted text-muted-foreground ring-border')}>
                                            {loan.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Transaction history */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                        <p className="text-sm font-semibold">Transaction History (last 30)</p>
                    </div>
                    {transactions.length === 0 ? (
                        <p className="p-8 text-center text-sm text-muted-foreground">No transactions yet.</p>
                    ) : (
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border bg-muted/20">
                                    {['Date', 'Type', 'Amount', 'Balance', 'Reference'].map(h => (
                                        <th key={h} className="text-left px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                                {transactions.map(tx => {
                                    const cfg = TX_CONFIG[tx.type] ?? { label: tx.type, color: '', sign: '' };
                                    return (
                                        <tr key={tx.id} className="hover:bg-muted/10">
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(tx.transacted_at), 'MMM d, yyyy')}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs">{cfg.label}</td>
                                            <td className={cn('px-4 py-2.5 text-xs font-semibold tabular-nums', cfg.color)}>
                                                {cfg.sign}{fmt(Math.abs(tx.amount))}
                                            </td>
                                            <td className="px-4 py-2.5 text-xs font-mono">{fmt(tx.balance_after)}</td>
                                            <td className="px-4 py-2.5 text-xs text-muted-foreground">{tx.reference ?? '—'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Action modal */}
            {modal && (
                <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border rounded-2xl w-full max-w-sm shadow-xl">
                        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                            <h2 className="text-sm font-semibold capitalize">
                                {modal === 'deposit' ? 'Record Deposit' : modal === 'withdraw' ? 'Record Withdrawal' : modal === 'repay' ? 'Record Loan Repayment' : 'Apply for Loan'}
                            </h2>
                            <button onClick={() => setModal(null)}><X className="h-4 w-4 text-muted-foreground" /></button>
                        </div>
                        <div className="p-5 space-y-3">
                            {(modal === 'deposit' || modal === 'withdraw' || modal === 'repay') && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Amount (KES)</label>
                                        <Input type="number" min="1" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference</label>
                                        <Input value={reference} onChange={e => setReference(e.target.value)} placeholder="M-Pesa code, bank ref…" />
                                    </div>
                                    {modal === 'withdraw' && (
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</label>
                                            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Reason for withdrawal" />
                                        </div>
                                    )}
                                    {modal === 'withdraw' && savings && parseFloat(amount) > savings.balance && (
                                        <div className="flex items-center gap-2 p-2 bg-red-50 rounded-lg text-xs text-red-700 dark:bg-red-950/20 dark:text-red-300">
                                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                                            Exceeds savings balance of {fmt(savings.balance)}
                                        </div>
                                    )}
                                </>
                            )}
                            {modal === 'loan' && (
                                <>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Loan Amount (KES) — Limit: {fmt(loanLimit)}</label>
                                        <Input type="number" min="1000" value={loanPrincipal} onChange={e => setLoanPrincipal(e.target.value)} placeholder="0.00" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annual Rate (%)</label>
                                            <Input type="number" value={loanRate} onChange={e => setLoanRate(e.target.value)} />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Term (months)</label>
                                            <Input type="number" value={loanMonths} onChange={e => setLoanMonths(e.target.value)} />
                                        </div>
                                    </div>
                                    {loanPrincipal && (
                                        <div className="p-2.5 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-xs">
                                            Monthly repayment: <strong>{fmt(monthlyRepaymentPreview())}</strong>
                                        </div>
                                    )}
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Purpose</label>
                                        <Textarea value={loanPurpose} onChange={e => setLoanPurpose(e.target.value)} rows={2} placeholder="Purpose of loan" />
                                    </div>
                                </>
                            )}
                        </div>
                        <div className="px-5 py-4 border-t border-border flex justify-end gap-2">
                            <Button variant="outline" size="sm" onClick={() => setModal(null)}>Cancel</Button>
                            <Button size="sm" onClick={submit} disabled={submitting}
                                className="bg-amber-500 hover:bg-amber-600 text-white">
                                {submitting ? 'Saving…' : 'Confirm'}
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}