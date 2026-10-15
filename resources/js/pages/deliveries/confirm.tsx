/**
 * deliveries/confirm.tsx
 *
 * Public page (no auth required) accessible via a unique token link
 * embedded in the PDF QR code / confirmation URL.
 * Customers use this page to digitally confirm receipt of their delivery.
 */
import { Head, router, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CheckCircle2, Package, Truck, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface Delivery {
    id: number;
    number: string;
    status: string;
    expected_date: string | null;
    delivered_date: string | null;
    signed_by: string | null;
    signed_at: string | null;
    purchase_order: { id: number; number: string } | null;
    client: { id: number; name: string; company: string | null } | null;
}

interface Props {
    delivery: Delivery;
    token:    string;
}

export default function DeliveryConfirm({ delivery, token }: Props) {
    const { props } = usePage<any>();
    const flash = props.flash ?? {};

    const [form, setForm]   = useState({ signed_by: '', client_notes: '' });
    const [errors, setErr]  = useState<Record<string, string>>({});
    const [submitting, setSub] = useState(false);

    const alreadyConfirmed = delivery.status === 'delivered';

    function submit() {
        setSub(true);
        router.post(`/delivery-confirm/${token}`, form, {
            onError: e => { setErr(e); setSub(false); },
            onFinish: () => setSub(false),
        });
    }

    return (
        <>
            <Head title={`Confirm Delivery — ${delivery.number}`} />

            {/* Simple branded shell — no sidebar, works without auth */}
            <div className="min-h-screen bg-gray-50 flex flex-col">

                {/* Top bar */}
                <div className="bg-[#111827] border-b border-white/10 px-6 py-4">
                    <div className="max-w-lg mx-auto flex items-center gap-3">
                        <div className="h-8 w-8 rounded-md bg-amber-500 flex items-center justify-center">
                            <Truck className="h-4 w-4 text-white" />
                        </div>
                        <div>
                            <p className="text-sm font-bold text-white">Delivery Confirmation</p>
                            <p className="text-xs text-white/50">Sledeći · Secure delivery portal</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex items-start justify-center px-4 py-10">
                    <div className="w-full max-w-lg space-y-5">

                        {/* Delivery info card */}
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                            <div className="bg-amber-500 px-5 py-3.5">
                                <p className="text-sm font-bold text-white">Delivery #{delivery.number}</p>
                                {delivery.purchase_order && (
                                    <p className="text-xs text-white/80 mt-0.5">PO #{delivery.purchase_order.number}</p>
                                )}
                            </div>
                            <div className="px-5 py-4 grid grid-cols-2 gap-4 text-sm">
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Recipient</p>
                                    <p className="font-medium text-gray-900">
                                        {delivery.client?.company ?? delivery.client?.name ?? '—'}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Status</p>
                                    <span className={cn(
                                        'inline-block text-xs font-semibold px-2.5 py-1 rounded-full',
                                        alreadyConfirmed
                                            ? 'bg-emerald-100 text-emerald-700'
                                            : 'bg-amber-100 text-amber-700'
                                    )}>
                                        {alreadyConfirmed ? 'Delivered & Confirmed' : 'Pending Confirmation'}
                                    </span>
                                </div>
                                {delivery.expected_date && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Expected Date</p>
                                        <p className="text-gray-700">{new Date(delivery.expected_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                )}
                                {delivery.signed_at && (
                                    <div>
                                        <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Confirmed At</p>
                                        <p className="text-gray-700">{new Date(delivery.signed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Flash messages */}
                        {flash.success && (
                            <div className="flex gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm">
                                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600 mt-0.5" />
                                <div>
                                    <p className="font-semibold">Confirmed!</p>
                                    <p className="mt-0.5 text-emerald-700">{flash.success}</p>
                                </div>
                            </div>
                        )}

                        {flash.info && (
                            <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl text-blue-800 text-sm">
                                <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                <p>{flash.info}</p>
                            </div>
                        )}

                        {/* Already confirmed */}
                        {alreadyConfirmed ? (
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 text-center">
                                <div className="h-14 w-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                                </div>
                                <h2 className="text-lg font-bold text-gray-900">Delivery Confirmed</h2>
                                <p className="text-sm text-gray-500 mt-2">
                                    {delivery.signed_by
                                        ? <>This delivery was confirmed by <strong>{delivery.signed_by}</strong>.</>
                                        : 'This delivery has already been confirmed.'
                                    }
                                </p>
                                {delivery.signed_at && (
                                    <p className="text-xs text-gray-400 mt-1">
                                        {new Date(delivery.signed_at).toLocaleString('en-GB')}
                                    </p>
                                )}
                            </div>
                        ) : (
                            /* Confirmation form */
                            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-4 border-b border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <Package className="h-5 w-5 text-amber-500" />
                                        <div>
                                            <h2 className="text-base font-bold text-gray-900">Confirm Receipt of Goods</h2>
                                            <p className="text-sm text-gray-500">Please fill in your details to confirm you received this delivery.</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="px-6 py-5 space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                                            Your Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <Input
                                            value={form.signed_by}
                                            onChange={e => setForm(f => ({ ...f, signed_by: e.target.value }))}
                                            placeholder="e.g. Jane Wanjiku"
                                            className={cn(errors.signed_by && 'border-red-400')}
                                            autoFocus
                                        />
                                        {errors.signed_by && (
                                            <p className="text-xs text-red-600">{errors.signed_by}</p>
                                        )}
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-500 block">
                                            Notes / Comments (optional)
                                        </label>
                                        <textarea
                                            className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm min-h-[80px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
                                            value={form.client_notes}
                                            onChange={e => setForm(f => ({ ...f, client_notes: e.target.value }))}
                                            placeholder="Any issues, missing items, or notes about the delivery…"
                                        />
                                    </div>

                                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 text-sm text-amber-800">
                                        <strong>Declaration:</strong> By clicking Confirm below, I acknowledge that I have
                                        received the goods listed in this delivery in a satisfactory condition,
                                        unless otherwise noted above.
                                    </div>

                                    <Button
                                        onClick={submit}
                                        disabled={submitting || !form.signed_by}
                                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-semibold h-11 gap-2"
                                    >
                                        {submitting ? (
                                            <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                                        ) : (
                                            <CheckCircle2 className="h-4 w-4" />
                                        )}
                                        {submitting ? 'Confirming…' : 'Confirm Delivery Receipt'}
                                    </Button>
                                </div>
                            </div>
                        )}

                        <p className="text-center text-xs text-gray-400 pb-4">
                            This is a secure, one-time delivery confirmation link from Sledeći.
                        </p>
                    </div>
                </div>
            </div>
        </>
    );
}