import { Head } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Printer, MessageSquare, CheckCircle2 } from 'lucide-react';

interface SaleItem {
    id: number; product_name: string; quantity: number;
    unit_price: number; discount: number; line_total: number;
}

interface Sale {
    id: number; receipt_number: string;
    subtotal: number; tax: number; discount: number; total: number; currency: string;
    payment_channel: string; mobile_money_code: string | null;
    amount_tendered: number | null; change_given: number | null;
    created_at: string;
    cashier: { name: string };
    client: { name: string } | null;
    items: SaleItem[];
}

interface Props { sale: Sale }

const fmt = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c }).format(n);

const CHANNEL_LABEL: Record<string, string> = {
    cash: 'Cash', mpesa: 'M-Pesa', airtel_money: 'Airtel Money',
    mtn_momo: 'MTN MoMo', card: 'Card', split: 'Split Payment',
};

export default function PosReceipt({ sale }: Props) {
    function shareWhatsApp() {
        const lines = [
            `Receipt ${sale.receipt_number}`,
            ...sale.items.map(i => `${i.quantity}x ${i.product_name} - ${fmt(i.line_total, sale.currency)}`),
            `Total: ${fmt(sale.total, sale.currency)}`,
            `Paid via ${CHANNEL_LABEL[sale.payment_channel]}`,
        ].join('\n');
        window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, '_blank');
    }

    return (
        <>
            <Head title={`Receipt ${sale.receipt_number}`} />
            <div className="min-h-screen bg-muted/30 flex flex-col items-center py-8 px-4 print:p-0 print:bg-white">
                <div className="w-full max-w-sm flex gap-2 mb-4 print:hidden">
                    <Button size="sm" variant="outline" onClick={() => window.print()} className="flex-1 gap-1.5">
                        <Printer className="h-3.5 w-3.5" /> Print
                    </Button>
                    <Button size="sm" variant="outline" onClick={shareWhatsApp} className="flex-1 gap-1.5">
                        <MessageSquare className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp
                    </Button>
                </div>

                <div className="w-full max-w-sm bg-white text-black rounded-lg shadow-lg print:shadow-none print:rounded-none font-mono text-xs p-5 space-y-3">
                    <div className="text-center space-y-1">
                        <CheckCircle2 className="h-8 w-8 mx-auto text-emerald-600 print:hidden" />
                        <p className="font-bold text-sm uppercase tracking-wide">Sale Receipt</p>
                        <p className="text-[10px] text-zinc-500">{new Date(sale.created_at).toLocaleString('en-KE')}</p>
                    </div>

                    <div className="border-t border-dashed border-zinc-300 pt-2 space-y-0.5">
                        <p>Receipt #: <strong>{sale.receipt_number}</strong></p>
                        <p>Cashier: {sale.cashier.name}</p>
                        {sale.client && <p>Customer: {sale.client.name}</p>}
                    </div>

                    <div className="border-t border-dashed border-zinc-300 pt-2">
                        {sale.items.map(item => (
                            <div key={item.id} className="flex justify-between py-0.5">
                                <span className="flex-1">{item.quantity}x {item.product_name}</span>
                                <span>{fmt(item.line_total, sale.currency)}</span>
                            </div>
                        ))}
                    </div>

                    <div className="border-t border-dashed border-zinc-300 pt-2 space-y-0.5">
                        <div className="flex justify-between"><span>Subtotal</span><span>{fmt(sale.subtotal, sale.currency)}</span></div>
                        {sale.tax > 0 && <div className="flex justify-between"><span>VAT</span><span>{fmt(sale.tax, sale.currency)}</span></div>}
                        {sale.discount > 0 && <div className="flex justify-between"><span>Discount</span><span>-{fmt(sale.discount, sale.currency)}</span></div>}
                        <div className="flex justify-between font-bold text-sm pt-1 border-t border-zinc-300">
                            <span>TOTAL</span><span>{fmt(sale.total, sale.currency)}</span>
                        </div>
                    </div>

                    <div className="border-t border-dashed border-zinc-300 pt-2 space-y-0.5">
                        <p>Paid via: <strong>{CHANNEL_LABEL[sale.payment_channel]}</strong></p>
                        {sale.mobile_money_code && <p>Ref: {sale.mobile_money_code}</p>}
                        {sale.amount_tendered != null && (
                            <>
                                <div className="flex justify-between"><span>Tendered</span><span>{fmt(sale.amount_tendered, sale.currency)}</span></div>
                                <div className="flex justify-between"><span>Change</span><span>{fmt(sale.change_given ?? 0, sale.currency)}</span></div>
                            </>
                        )}
                    </div>

                    <p className="text-center text-[10px] text-zinc-400 pt-2 border-t border-dashed border-zinc-300">
                        Thank you for your business!
                    </p>
                </div>
            </div>
        </>
    );
}
