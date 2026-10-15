/**
 * components/etims-badge.tsx
 *
 * Drop-in badge for invoice list/show pages.
 * Shows eTIMS submission status and, when enabled, a "Submit to eTIMS" button.
 *
 * Usage on invoices/show.tsx:
 *   import EtimsBadge from '@/components/etims-badge';
 *   <EtimsBadge invoice={invoice} onSubmitted={() => router.reload()} />
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Zap, CheckCircle2, XCircle, Clock, AlertTriangle, ExternalLink, Loader2 } from 'lucide-react';

interface InvoiceEtimsFields {
    id: number;
    etims_status: 'not_submitted' | 'pending' | 'submitted' | 'accepted' | 'rejected' | 'cancelled';
    etims_invoice_number: string | null;
    etims_cu_invoice_number: string | null;
    etims_submitted_at: string | null;
    etims_qr_url: string | null;
    buyer_kra_pin: string | null;
    buyer_name: string | null;
}

interface Props {
    invoice: InvoiceEtimsFields;
    etimsEnabled: boolean;          // from CompanySetting::current()->etims_enabled
    onSubmitted?: () => void;
    compact?: boolean;
}

const STATUS_CONFIG = {
    not_submitted: { label: 'Not Submitted', icon: AlertTriangle, color: 'text-zinc-500',    bg: 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700' },
    pending:       { label: 'Pending',        icon: Clock,         color: 'text-amber-600',   bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' },
    submitted:     { label: 'Submitted',      icon: Clock,         color: 'text-blue-600',    bg: 'bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800' },
    accepted:      { label: 'Accepted ✓',     icon: CheckCircle2,  color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' },
    rejected:      { label: 'Rejected',       icon: XCircle,       color: 'text-red-600',     bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' },
    cancelled:     { label: 'Cancelled',      icon: XCircle,       color: 'text-zinc-500',    bg: 'bg-zinc-50 border-zinc-200 dark:bg-zinc-900 dark:border-zinc-700' },
};

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function EtimsBadge({ invoice, etimsEnabled, onSubmitted, compact = false }: Props) {
    const [showForm, setShowForm]   = useState(false);
    const [buyerPin, setBuyerPin]   = useState(invoice.buyer_kra_pin ?? '');
    const [buyerName, setBuyerName] = useState(invoice.buyer_name ?? '');
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState('');

    const sc = STATUS_CONFIG[invoice.etims_status] ?? STATUS_CONFIG.not_submitted;
    const StatusIcon = sc.icon;

    if (! etimsEnabled) return null;

    async function handleSubmit() {
        setLoading(true);
        setError('');
        try {
            const res = await fetch(`/invoices/${invoice.id}/etims/submit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrfToken() },
                body: JSON.stringify({ buyer_kra_pin: buyerPin || null, buyer_name: buyerName || null }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Submission failed');
            setShowForm(false);
            onSubmitted?.();
        } catch (e: any) {
            setError(e.message ?? 'An error occurred');
        } finally {
            setLoading(false);
        }
    }

    // Compact pill-only mode (for invoice lists)
    if (compact) {
        return (
            <span className={cn('inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border', sc.bg, sc.color)}>
                <StatusIcon className="h-3 w-3" />
                {sc.label}
            </span>
        );
    }

    return (
        <div className={cn('rounded-xl border p-4 space-y-3', sc.bg)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-white/60 dark:bg-black/20 rounded-lg">
                        <Zap className="h-4 w-4 text-amber-600" />
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider">eTIMS Status</p>
                        <p className={cn('text-xs font-medium flex items-center gap-1', sc.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {sc.label}
                        </p>
                    </div>
                </div>
                {invoice.etims_status === 'not_submitted' && (
                    <Button size="sm" onClick={() => setShowForm(v => !v)}
                        className="bg-amber-500 hover:bg-amber-600 text-white text-xs gap-1.5">
                        <Zap className="h-3 w-3" />
                        Submit to eTIMS
                    </Button>
                )}
            </div>

            {/* Accepted details */}
            {['submitted', 'accepted'].includes(invoice.etims_status) && (
                <div className="grid grid-cols-2 gap-2 text-xs">
                    {invoice.etims_invoice_number && (
                        <div>
                            <p className="text-muted-foreground">eTIMS Invoice No.</p>
                            <p className="font-mono font-semibold">{invoice.etims_invoice_number}</p>
                        </div>
                    )}
                    {invoice.etims_cu_invoice_number && (
                        <div>
                            <p className="text-muted-foreground">CU Invoice No.</p>
                            <p className="font-mono font-semibold">{invoice.etims_cu_invoice_number}</p>
                        </div>
                    )}
                    {invoice.etims_submitted_at && (
                        <div>
                            <p className="text-muted-foreground">Submitted</p>
                            <p className="font-medium">{new Date(invoice.etims_submitted_at).toLocaleDateString()}</p>
                        </div>
                    )}
                    {invoice.etims_qr_url && (
                        <div>
                            <p className="text-muted-foreground">Verify</p>
                            <a href={invoice.etims_qr_url} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-1 text-blue-600 hover:underline font-medium">
                                KRA Portal <ExternalLink className="h-3 w-3" />
                            </a>
                        </div>
                    )}
                </div>
            )}

            {/* Submission form */}
            {showForm && invoice.etims_status === 'not_submitted' && (
                <div className="space-y-3 pt-2 border-t border-black/5 dark:border-white/5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        Buyer Details (B2B — optional)
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Buyer KRA PIN</label>
                            <Input value={buyerPin} onChange={e => setBuyerPin(e.target.value.toUpperCase())}
                                placeholder="P051234567Q" className="font-mono text-xs h-8" />
                        </div>
                        <div>
                            <label className="text-xs text-muted-foreground block mb-1">Buyer Name</label>
                            <Input value={buyerName} onChange={e => setBuyerName(e.target.value)}
                                placeholder="Company Ltd" className="text-xs h-8" />
                        </div>
                    </div>
                    {error && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="h-3 w-3" /> {error}
                        </p>
                    )}
                    <div className="flex gap-2">
                        <Button size="sm" onClick={handleSubmit} disabled={loading}
                            className="flex-1 bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                            {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Submitting…</> : <><Zap className="h-3.5 w-3.5" />Submit Now</>}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>
                            Cancel
                        </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                        This will submit the invoice to the KRA eTIMS system as required by Kenyan tax law.
                        Ensure all invoice details are correct before proceeding.
                    </p>
                </div>
            )}
        </div>
    );
}
