import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from '@inertiajs/react';
import {
    CreditCard, DollarSign, Calendar, Hash,
    CheckCircle2, Clock, XCircle, RefreshCw,
} from 'lucide-react';

export interface Payment {
    id: number;
    invoice_id: number;
    amount: string | number;
    currency: string;
    method?: string | null;
    payment_method?: string | null;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    transaction_id?: string | null;
    reference?: string | null;
    paid_at?: string | null;
    notes?: string | null;
    invoice?: {
        id: number;
        invoice_number?: string;
        client?: { id: number; name: string };
    } | null;
}

const statusConfig: Record<string, { label: string; colour: string; icon: React.ReactNode }> = {
    pending:   { label: 'Pending',   colour: 'bg-amber-100 text-amber-700',  icon: <Clock className="w-3.5 h-3.5" /> },
    completed: { label: 'Completed', colour: 'bg-green-100 text-green-700',  icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
    failed:    { label: 'Failed',    colour: 'bg-red-100 text-red-700',      icon: <XCircle className="w-3.5 h-3.5" /> },
    refunded:  { label: 'Refunded',  colour: 'bg-gray-100 text-gray-700',    icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

const methodLabel = (method?: string | null): string => {
    if (!method) return 'Unknown';
    return {
        card: 'Card', bank_transfer: 'Bank Transfer', cash: 'Cash',
        cheque: 'Cheque', paypal: 'PayPal', stripe: 'Stripe',
    }[method] ?? method.replace('_', ' ');
};

const fmt = (amount: string | number, currency = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(Number(amount));

export default function PaymentCard({ payment }: { payment: Payment }) {
    const cfg = statusConfig[payment.status] ?? statusConfig.pending;

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="pt-4 pb-4">
                <div className="flex items-start justify-between gap-4">
                    {/* Left — amount + method */}
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-green-50 flex items-center justify-center shrink-0">
                            <DollarSign className="h-5 w-5 text-green-600" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-xl font-bold text-gray-900 truncate">
                                {fmt(payment.amount, payment.currency)}
                            </p>
                            {payment.invoice && (
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Invoice{' '}
                                    <Link
                                        href={`/invoices/${payment.invoice.id}`}
                                        className="text-primary hover:underline font-medium"
                                    >
                                        {payment.invoice.invoice_number ?? `#${payment.invoice.id}`}
                                    </Link>
                                    {payment.invoice.client && ` · ${payment.invoice.client.name}`}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* Right — status badge */}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shrink-0 ${cfg.colour}`}>
                        {cfg.icon}{cfg.label}
                    </span>
                </div>

                {/* Meta row */}
                <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                    {payment.payment_method && (
                        <span className="flex items-center gap-1.5">
                            <CreditCard className="h-3.5 w-3.5" />
                            {methodLabel(payment.payment_method)}
                        </span>
                    )}
                    {payment.transaction_id && (
                        <span className="flex items-center gap-1.5 font-mono text-xs">
                            <Hash className="h-3.5 w-3.5" />
                            {payment.transaction_id}
                        </span>
                    )}
                    {payment.paid_at && (
                        <span className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(payment.paid_at).toLocaleDateString('en-US', {
                                day: 'numeric', month: 'short', year: 'numeric',
                            })}
                        </span>
                    )}
                </div>

                {/* Notes */}
                {payment.notes && (
                    <p className="mt-2 text-sm text-muted-foreground italic border-l-2 border-muted pl-2">
                        {payment.notes}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}