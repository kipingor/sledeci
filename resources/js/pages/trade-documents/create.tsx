/**
 * trade-documents/create.tsx — Cross-border trade document generator
 *
 * Generates EAC/COMESA Certificates of Origin, customs declarations,
 * pro-forma invoices, and packing lists for goods crossing borders.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { Plus, Trash2, Globe, Save } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Trade Documents', href: '/trade-documents' },
    { title: 'New Document', href: '/trade-documents/create' },
];

interface TradeItem {
    description: string; hs_code: string; quantity: string; unit: string;
    gross_weight: string; net_weight: string; value: string;
}

interface InvoiceRef { id: number; number: string; total: number; currency: string; client?: { name: string; address: string } }

interface Props {
    invoice?: InvoiceRef | null;
    eacCountries: string[];
    comesaCountries: string[];
}

const DOC_TYPES = [
    { value: 'certificate_of_origin', label: 'Certificate of Origin', desc: 'Proves goods originated in your country' },
    { value: 'customs_declaration',   label: 'Customs Declaration',   desc: 'Export/import declaration for border clearance' },
    { value: 'proforma_invoice',      label: 'Pro-forma Invoice',     desc: 'Customs valuation document' },
    { value: 'packing_list',          label: 'Packing List',          desc: 'Itemised packages, weights, contents' },
];

const COUNTRIES: Record<string, string> = {
    KE: 'Kenya', UG: 'Uganda', TZ: 'Tanzania', RW: 'Rwanda', BI: 'Burundi',
    SS: 'South Sudan', CD: 'DR Congo', ET: 'Ethiopia', SO: 'Somalia',
    ZM: 'Zambia', MW: 'Malawi', ZW: 'Zimbabwe', MZ: 'Mozambique',
    NG: 'Nigeria', GH: 'Ghana', ZA: 'South Africa', EG: 'Egypt',
    US: 'United States', GB: 'United Kingdom', CN: 'China', AE: 'UAE', IN: 'India',
};

const emptyItem = (): TradeItem => ({
    description: '', hs_code: '', quantity: '1', unit: 'pcs',
    gross_weight: '', net_weight: '', value: '',
});

function Field({ label, required, children, hint }: { label: string; required?: boolean; children: React.ReactNode; hint?: string }) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold">{title}</p>
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}

export default function TradeDocumentCreate({ invoice, eacCountries, comesaCountries }: Props) {
    const [docType, setDocType] = useState('certificate_of_origin');
    const [form, setForm] = useState({
        invoice_id: invoice?.id ?? '',
        trade_direction: 'export',
        origin_country: 'KE',
        destination_country: '',
        exporter_name: '',
        exporter_address: '',
        exporter_kra_pin: '',
        importer_name: invoice?.client?.name ?? '',
        importer_address: invoice?.client?.address ?? '',
        importer_tax_id: '',
        transport_mode: 'road',
        vehicle_reg: '',
        border_post: '',
        departure_date: '',
        currency: invoice?.currency ?? 'USD',
        notes: '',
    });
    const [items, setItems] = useState<TradeItem[]>([emptyItem()]);
    const [saving, setSaving] = useState(false);

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    function setItem(i: number, field: keyof TradeItem, value: string) {
        setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [field]: value } : it));
    }

    const isEac    = eacCountries.includes(form.origin_country) && eacCountries.includes(form.destination_country);
    const isComesa = comesaCountries.includes(form.origin_country) && comesaCountries.includes(form.destination_country);

    const totalValue  = items.reduce((s, it) => s + (parseFloat(it.value) || 0), 0);
    const totalWeight = items.reduce((s, it) => s + (parseFloat(it.gross_weight) || 0), 0);

    function submit() {
        setSaving(true);
        router.post('/trade-documents', {
            ...form,
            type: docType,
            items: JSON.stringify(items),
        }, {
            onError: () => setSaving(false),
            onSuccess: () => setSaving(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Trade Document" />
            <div className="max-w-3xl mx-auto p-6 space-y-5">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">New Trade Document</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Generate cross-border export/import documentation</p>
                    </div>
                    <Button size="sm" onClick={submit} disabled={saving}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Create Document'}
                    </Button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {DOC_TYPES.map(t => (
                        <button key={t.value} onClick={() => setDocType(t.value)}
                            className={cn(
                                'p-4 rounded-lg border text-left transition-all',
                                docType === t.value ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20' : 'border-border hover:border-amber-200'
                            )}>
                            <p className={cn('text-sm font-semibold', docType === t.value && 'text-amber-700 dark:text-amber-300')}>{t.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                        </button>
                    ))}
                </div>

                <Section title="Trade Route">
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Direction">
                            <select value={form.trade_direction} onChange={e => set('trade_direction', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="export">Export</option>
                                <option value="import">Import</option>
                            </select>
                        </Field>
                        <Field label="Transport Mode">
                            <select value={form.transport_mode} onChange={e => set('transport_mode', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="road">Road</option>
                                <option value="air">Air</option>
                                <option value="sea">Sea</option>
                                <option value="rail">Rail</option>
                            </select>
                        </Field>
                        <Field label="Origin Country" required>
                            <select value={form.origin_country} onChange={e => set('origin_country', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                {Object.entries(COUNTRIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                            </select>
                        </Field>
                        <Field label="Destination Country" required>
                            <select value={form.destination_country} onChange={e => set('destination_country', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                <option value="">— Select —</option>
                                {Object.entries(COUNTRIES).map(([code, name]) => <option key={code} value={code}>{name}</option>)}
                            </select>
                        </Field>
                        {form.transport_mode === 'road' && (
                            <>
                                <Field label="Vehicle Registration">
                                    <Input value={form.vehicle_reg} onChange={e => set('vehicle_reg', e.target.value)} placeholder="KDA 123X" />
                                </Field>
                                <Field label="Border Post">
                                    <Input value={form.border_post} onChange={e => set('border_post', e.target.value)} placeholder="Malaba, Busia, Namanga…" />
                                </Field>
                            </>
                        )}
                        <Field label="Departure Date">
                            <Input type="date" value={form.departure_date} onChange={e => set('departure_date', e.target.value)} />
                        </Field>
                        <Field label="Currency">
                            <select value={form.currency} onChange={e => set('currency', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                {['USD', 'KES', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </Field>
                    </div>

                    {form.destination_country && (
                        <div className={cn('flex items-center gap-2 p-3 rounded-lg text-xs',
                            isEac || isComesa
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-300'
                                : 'bg-muted text-muted-foreground')}>
                            <Globe className="h-3.5 w-3.5 shrink-0" />
                            {isEac && <span>EAC trade route detected — eligible for EAC preferential tariff treatment.</span>}
                            {!isEac && isComesa && <span>COMESA trade route detected — eligible for COMESA preferential tariff treatment.</span>}
                            {!isEac && !isComesa && <span>Standard (non-preferential) trade route.</span>}
                        </div>
                    )}
                </Section>

                <Section title="Exporter Details">
                    <Field label="Exporter Name" required>
                        <Input value={form.exporter_name} onChange={e => set('exporter_name', e.target.value)} placeholder="Your company name" />
                    </Field>
                    <Field label="Exporter Address" required>
                        <Textarea value={form.exporter_address} onChange={e => set('exporter_address', e.target.value)} rows={2} />
                    </Field>
                    <Field label="Exporter KRA PIN" hint="Required for customs declaration">
                        <Input value={form.exporter_kra_pin} onChange={e => set('exporter_kra_pin', e.target.value.toUpperCase())}
                            placeholder="P051234567Q" className="font-mono" />
                    </Field>
                </Section>

                <Section title="Importer Details">
                    <Field label="Importer Name" required>
                        <Input value={form.importer_name} onChange={e => set('importer_name', e.target.value)} placeholder="Buyer / consignee name" />
                    </Field>
                    <Field label="Importer Address" required>
                        <Textarea value={form.importer_address} onChange={e => set('importer_address', e.target.value)} rows={2} />
                    </Field>
                    <Field label="Importer Tax ID">
                        <Input value={form.importer_tax_id} onChange={e => set('importer_tax_id', e.target.value)} placeholder="Foreign tax registration number" />
                    </Field>
                </Section>

                <Section title="Goods Declaration">
                    <div className="space-y-2">
                        {items.map((item, i) => (
                            <div key={i} className="p-3 bg-muted/30 rounded-lg border border-border space-y-2">
                                <div className="grid grid-cols-2 gap-2">
                                    <Input placeholder="Description of goods" value={item.description}
                                        onChange={e => setItem(i, 'description', e.target.value)} />
                                    <Input placeholder="HS Code (e.g. 0901.21)" value={item.hs_code}
                                        onChange={e => setItem(i, 'hs_code', e.target.value)} className="font-mono" />
                                </div>
                                <div className="grid grid-cols-5 gap-2 items-center">
                                    <Input type="number" placeholder="Qty" value={item.quantity}
                                        onChange={e => setItem(i, 'quantity', e.target.value)} />
                                    <Input placeholder="Unit" value={item.unit}
                                        onChange={e => setItem(i, 'unit', e.target.value)} />
                                    <Input type="number" placeholder="Gross kg" value={item.gross_weight}
                                        onChange={e => setItem(i, 'gross_weight', e.target.value)} />
                                    <Input type="number" placeholder="Net kg" value={item.net_weight}
                                        onChange={e => setItem(i, 'net_weight', e.target.value)} />
                                    <div className="flex gap-1">
                                        <Input type="number" placeholder="Value" value={item.value}
                                            onChange={e => setItem(i, 'value', e.target.value)} />
                                        {items.length > 1 && (
                                            <button onClick={() => setItems(p => p.filter((_, j) => j !== i))}
                                                className="text-muted-foreground hover:text-destructive shrink-0">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setItems(p => [...p, emptyItem()])} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Item
                    </Button>

                    <div className="flex justify-between pt-3 border-t border-border text-sm">
                        <span className="text-muted-foreground">Total weight: {totalWeight.toFixed(1)} kg</span>
                        <span className="font-bold">Total value: {form.currency} {totalValue.toLocaleString()}</span>
                    </div>
                </Section>

                <Section title="Notes">
                    <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2}
                        placeholder="Special handling instructions, terms of trade (Incoterms), etc." />
                </Section>

                <div className="flex justify-end">
                    <Button size="sm" onClick={submit} disabled={saving}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <Save className="h-3.5 w-3.5" /> {saving ? 'Saving…' : 'Create Document'}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
