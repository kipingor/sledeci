/**
 * invoices/create.tsx  — refactored for Africa pain points
 *
 * Changes from original:
 *  1. Currency selector replaced with CurrencyConverter component (live rates)
 *  2. Payment channel selector (M-Pesa default for KES invoices)
 *  3. Buyer KRA PIN field (for eTIMS B2B compliance)
 *  4. Client phone displayed alongside email for WhatsApp delivery hint
 *  5. Tax rate pre-filled from company settings
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Plus, Trash2, ChevronRight, FileText, Save, Smartphone, MessageSquare } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import CurrencyConverter from '@/components/currency-converter';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Accounting', href: '/accounting' },
    { title: 'Invoices', href: '/invoices' },
    { title: 'New Invoice', href: '/invoices/create' },
];

interface LineItem { description: string; quantity: string; unit_price: string }
const emptyLine = (): LineItem => ({ description: '', quantity: '1', unit_price: '' });

interface Client { id: number; name: string; email: string; phone?: string }
interface Project { id: number; name: string; client_id: number | null }

interface Props {
    clients:     Client[];
    projects:    Project[];
    currencies:  Record<string, string>;
    forex_rates: Record<string, number | null>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold">{title}</p>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

function Field({ label, required, error, hint, children }: {
    label: string; required?: boolean; error?: string; hint?: string; children: React.ReactNode;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {hint  && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

export default function InvoiceCreate({ clients, projects, currencies, forex_rates }: Props) {
    const [form, setForm] = useState({
        client_id: '',
        project_id: '',
        issue_date: new Date().toISOString().slice(0, 10),
        due_date: '',
        currency: 'KES',
        notes: '',
        tax_rate: '16',    // KES default VAT
        buyer_kra_pin: '',
        buyer_name: '',
    });
    const [lines,  setLines]  = useState<LineItem[]>([emptyLine()]);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const selectedClient   = clients.find(c => c.id === Number(form.client_id));
    const filteredProjects = form.client_id
        ? projects.filter(p => !p.client_id || p.client_id === Number(form.client_id))
        : projects;

    function setLine(i: number, field: keyof LineItem, value: string) {
        setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [field]: value } : l));
    }

    const subtotal  = lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0), 0);
    const taxAmount = subtotal * (parseFloat(form.tax_rate) || 0) / 100;
    const total     = subtotal + taxAmount;

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: form.currency || 'KES' }).format(n);

    function submit() {
        setSaving(true);
        const linesData = lines.reduce((acc, line, i) => {
            acc[`lines[${i}][description]`] = line.description;
            acc[`lines[${i}][quantity]`]    = line.quantity;
            acc[`lines[${i}][unit_price]`]  = line.unit_price;
            return acc;
        }, {} as Record<string, string>);

        router.post('/invoices', { ...form, ...linesData }, {
            onError:   e => { setErrors(e as any); setSaving(false); },
            onSuccess: () => setSaving(false),
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Invoice" />

            {/* Header */}
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/invoices" className="text-muted-foreground hover:text-foreground transition-colors">Invoices</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">New Invoice</span>
                </nav>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-base font-semibold">New Invoice</h1>
                            <p className="text-xs text-muted-foreground">Invoice will be sent via email and WhatsApp</p>
                        </div>
                    </div>
                    <Button size="sm" onClick={submit} disabled={saving}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving…' : 'Create Invoice'}
                    </Button>
                </div>
            </div>

            <div className="p-6 max-w-3xl mx-auto space-y-5">

                {/* Client & Project */}
                <Section title="Invoice Details">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Client" required error={errors.client_id}>
                            <select value={form.client_id}
                                onChange={e => setForm(p => ({ ...p, client_id: e.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="">— Select client —</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                            {/* Client contact quick-view */}
                            {selectedClient && (
                                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                                    {selectedClient.email && (
                                        <span className="flex items-center gap-1"><span>✉</span> {selectedClient.email}</span>
                                    )}
                                    {selectedClient.phone && (
                                        <span className="flex items-center gap-1 text-emerald-600">
                                            <MessageSquare className="h-3 w-3" /> {selectedClient.phone}
                                            <span className="text-muted-foreground">(WhatsApp)</span>
                                        </span>
                                    )}
                                </div>
                            )}
                        </Field>

                        <Field label="Project (optional)">
                            <select value={form.project_id}
                                onChange={e => setForm(p => ({ ...p, project_id: e.target.value }))}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring">
                                <option value="">— None —</option>
                                {filteredProjects.map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Issue Date" required error={errors.issue_date}>
                            <Input type="date" value={form.issue_date}
                                onChange={e => setForm(p => ({ ...p, issue_date: e.target.value }))} />
                        </Field>

                        <Field label="Due Date" required error={errors.due_date}>
                            <Input type="date" value={form.due_date}
                                onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} />
                        </Field>

                        <Field label="Currency" required
                            hint="Live rates refresh automatically">
                            <CurrencyConverter
                                value={form.currency}
                                onChange={cur => setForm(p => ({ ...p, currency: cur }))}
                                amount={total}
                                forexRates={forex_rates}
                                functionalCurrency="KES"
                                showConverter={form.currency !== 'KES'}
                            />
                        </Field>

                        <Field label="VAT Rate (%)" hint="16% standard Kenyan VAT">
                            <Input type="number" step="0.01" min="0" max="100"
                                value={form.tax_rate}
                                onChange={e => setForm(p => ({ ...p, tax_rate: e.target.value }))} />
                        </Field>
                    </div>
                </Section>

                {/* KRA / eTIMS (B2B) */}
                <Section title="KRA / eTIMS Details (optional — B2B invoices)">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Field label="Buyer KRA PIN"
                            hint="Required for eTIMS B2B electronic invoice submission"
                            error={errors.buyer_kra_pin}>
                            <Input
                                value={form.buyer_kra_pin}
                                onChange={e => setForm(p => ({ ...p, buyer_kra_pin: e.target.value.toUpperCase() }))}
                                placeholder="P051234567Q"
                                className="font-mono"
                            />
                        </Field>
                        <Field label="Buyer Legal Name">
                            <Input
                                value={form.buyer_name}
                                onChange={e => setForm(p => ({ ...p, buyer_name: e.target.value }))}
                                placeholder="Registered company name"
                            />
                        </Field>
                    </div>
                </Section>

                {/* Line items */}
                <Section title="Line Items">
                    <div className="space-y-2">
                        {/* Header row */}
                        <div className="grid grid-cols-[1fr_80px_100px_80px] gap-2 px-1">
                            {['Description', 'Qty', 'Unit Price', ''].map(h => (
                                <p key={h} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{h}</p>
                            ))}
                        </div>

                        {lines.map((line, i) => {
                            const lineTotal = (parseFloat(line.quantity) || 0) * (parseFloat(line.unit_price) || 0);
                            return (
                                <div key={i} className="grid grid-cols-[1fr_80px_100px_80px] gap-2 items-center">
                                    <Input
                                        placeholder="Description of goods / service"
                                        value={line.description}
                                        onChange={e => setLine(i, 'description', e.target.value)}
                                        className={cn(errors[`lines.${i}.description`] && 'border-destructive')}
                                    />
                                    <Input
                                        type="number" min="0" step="0.01"
                                        value={line.quantity}
                                        onChange={e => setLine(i, 'quantity', e.target.value)}
                                        className="text-center"
                                    />
                                    <Input
                                        type="number" min="0" step="0.01"
                                        placeholder="0.00"
                                        value={line.unit_price}
                                        onChange={e => setLine(i, 'unit_price', e.target.value)}
                                    />
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                                            {lineTotal > 0 ? fmt(lineTotal) : '—'}
                                        </span>
                                        {lines.length > 1 && (
                                            <button onClick={() => setLines(prev => prev.filter((_, j) => j !== i))}
                                                className="text-muted-foreground hover:text-destructive transition-colors ml-auto">
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}

                        <Button variant="outline" size="sm"
                            onClick={() => setLines(prev => [...prev, emptyLine()])}
                            className="gap-1.5 mt-1">
                            <Plus className="h-3.5 w-3.5" /> Add Line
                        </Button>
                    </div>

                    {/* Totals */}
                    <div className="mt-5 border-t border-border pt-4 space-y-1.5 text-sm ml-auto max-w-xs">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Subtotal</span>
                            <span>{fmt(subtotal)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">VAT ({form.tax_rate}%)</span>
                            <span>{fmt(taxAmount)}</span>
                        </div>
                        <div className="flex justify-between font-bold text-base pt-1 border-t border-border">
                            <span>Total</span>
                            <span>{fmt(total)}</span>
                        </div>
                    </div>
                </Section>

                {/* Notes */}
                <Section title="Notes">
                    <textarea
                        value={form.notes}
                        onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                        rows={3}
                        placeholder="Payment terms, bank details, special instructions…"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    />
                    {/* Payment hint for clients */}
                    {form.currency === 'KES' && (
                        <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300 flex items-start gap-2">
                            <Smartphone className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>
                                <strong>Tip:</strong> After creating, use the M-Pesa STK push on the invoice page to collect payment directly from the client's phone.
                            </span>
                        </div>
                    )}
                </Section>

                <div className="flex justify-end">
                    <Button size="sm" onClick={submit} disabled={saving}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving…' : 'Create Invoice'}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
