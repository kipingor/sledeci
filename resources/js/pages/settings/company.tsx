/**
 * settings/company.tsx
 * Company-wide settings: identity, KRA/eTIMS, maker-checker workflow
 */
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Head, router, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import {
    Building2, Shield, Zap, GitBranch, Bell,
    CheckCircle2, XCircle, Loader2, ChevronRight,
} from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings' },
    { title: 'Company', href: '/settings/company' },
];

interface CompanySettings {
    company_name: string | null;
    company_email: string | null;
    company_phone: string | null;
    company_address: string | null;
    company_city: string | null;
    company_country: string;
    kra_pin: string | null;
    kra_branch_name: string | null;
    kra_branch_id: string | null;
    vat_number: string | null;
    default_vat_rate: string;
    vat_registered: boolean;
    etims_enabled: boolean;
    etims_environment: 'sandbox' | 'production';
    etims_device_serial: string | null;
    etims_branch_id: string | null;
    etims_taxpayer_pin: string | null;
    etims_auto_submit: boolean;
    etims_invoice_prefix: string;
    default_currency: string;
    maker_checker_enabled: boolean;
    maker_checker_tenders: boolean;
    maker_checker_rfp: boolean;
    maker_checker_invoices: boolean;
    maker_checker_purchase_orders: boolean;
    maker_checker_min_approvals: number;
    notify_on_approval_request: boolean;
    notify_on_approval_decision: boolean;
    notify_on_etims_failure: boolean;
}

interface Props { settings: CompanySettings }

type Tab = 'identity' | 'tax' | 'etims' | 'workflow' | 'notifications';

const TABS: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'identity',      label: 'Company',       icon: Building2  },
    { id: 'tax',           label: 'Tax & KRA',     icon: Shield     },
    { id: 'etims',         label: 'eTIMS',         icon: Zap        },
    { id: 'workflow',      label: 'Maker-Checker', icon: GitBranch  },
    { id: 'notifications', label: 'Notifications', icon: Bell       },
];

function Field({ label, required, error, hint, className, children }: {
    label: string; required?: boolean; error?: string; hint?: string; className?: string; children: React.ReactNode;
}) {
    return (
        <div className={`space-y-1.5 ${className ?? ''}`}>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {hint  && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

function Toggle({ checked, onChange, label, description }: {
    checked: boolean; onChange: (v: boolean) => void; label: string; description?: string;
}) {
    return (
        <label className="flex items-start gap-3 cursor-pointer group">
            <div className="relative mt-0.5 shrink-0">
                <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="sr-only peer" />
                <div className={cn(
                    'w-9 h-5 rounded-full transition-colors border',
                    checked ? 'bg-amber-500 border-amber-500' : 'bg-muted border-border'
                )}>
                    <div className={cn(
                        'absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform',
                        checked ? 'translate-x-4' : 'translate-x-0'
                    )} />
                </div>
            </div>
            <div>
                <p className="text-sm font-medium">{label}</p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
        </label>
    );
}

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
    return (
        <div className="bg-card border border-border rounded-lg overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border bg-muted/30">
                <p className="text-sm font-semibold">{title}</p>
                {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
            </div>
            <div className="p-5 space-y-4">{children}</div>
        </div>
    );
}

export default function CompanySettings({ settings }: Props) {
    const [tab, setTab]         = useState<Tab>('identity');
    const [form, setForm]       = useState<CompanySettings>(settings);
    const [saving, setSaving]   = useState(false);
    const [errors, setErrors]   = useState<Record<string, string>>({});
    const [etimsTest, setEtimsTest] = useState<{ loading: boolean; result?: { success: boolean; message: string } }>({ loading: false });

    const set = (key: keyof CompanySettings, value: unknown) => setForm(prev => ({ ...prev, [key]: value }));

    function handleSave() {
        setSaving(true);
        router.patch('/settings/company', form as any, {
            onSuccess: () => setSaving(false),
            onError: (e) => { setErrors(e as any); setSaving(false); },
        });
    }

    async function handleTestEtims() {
        setEtimsTest({ loading: true });
        const res  = await fetch('/settings/company/test-etims');
        const data = await res.json();
        setEtimsTest({ loading: false, result: data });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Company Settings" />
            <SettingsLayout>
                <div className="space-y-5">
                    <div className="flex items-center justify-between pb-4 border-b border-border">
                        <div>
                            <h1 className="text-sm font-bold uppercase tracking-wider">Company Settings</h1>
                            <p className="text-xs text-muted-foreground mt-0.5">Configure your organisation, KRA compliance, and workflow controls</p>
                        </div>
                        <Button size="sm" onClick={handleSave} disabled={saving}
                            className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>

                    {/* Tab bar */}
                    <div className="flex gap-1 bg-muted/40 p-1 rounded-lg border border-border overflow-x-auto">
                        {TABS.map(t => (
                            <button key={t.id} onClick={() => setTab(t.id)}
                                className={cn(
                                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors',
                                    tab === t.id
                                        ? 'bg-background text-foreground shadow-sm border border-border'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}>
                                <t.icon className="h-3.5 w-3.5" />
                                {t.label}
                            </button>
                        ))}
                    </div>

                    {/* ── Company Identity ── */}
                    {tab === 'identity' && (
                        <div className="space-y-4">
                            <Section title="Company Profile">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="Company Name" required error={errors.company_name}>
                                        <Input value={form.company_name ?? ''} onChange={e => set('company_name', e.target.value)} placeholder="Acme Ltd" />
                                    </Field>
                                    <Field label="Company Email" error={errors.company_email}>
                                        <Input type="email" value={form.company_email ?? ''} onChange={e => set('company_email', e.target.value)} placeholder="info@company.co.ke" />
                                    </Field>
                                    <Field label="Phone" error={errors.company_phone}>
                                        <Input value={form.company_phone ?? ''} onChange={e => set('company_phone', e.target.value)} placeholder="+254 700 000 000" />
                                    </Field>
                                    <Field label="Default Currency" error={errors.default_currency}>
                                        <select value={form.default_currency} onChange={e => set('default_currency', e.target.value)}
                                            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm">
                                            {['KES','USD','EUR','GBP','UGX','TZS'].map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </Field>
                                    <Field label="Address" error={errors.company_address} className="col-span-2">
                                        <Input value={form.company_address ?? ''} onChange={e => set('company_address', e.target.value)} placeholder="Street, PO Box" />
                                    </Field>
                                    <Field label="City">
                                        <Input value={form.company_city ?? ''} onChange={e => set('company_city', e.target.value)} placeholder="Nairobi" />
                                    </Field>
                                    <Field label="Country">
                                        <Input value={form.company_country} onChange={e => set('company_country', e.target.value)} placeholder="KE" maxLength={2} />
                                    </Field>
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* ── Tax & KRA ── */}
                    {tab === 'tax' && (
                        <div className="space-y-4">
                            <Section title="KRA Registration" description="Your Kenya Revenue Authority registration details">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Field label="KRA PIN" hint="Format: P051234567Q" error={errors.kra_pin}>
                                        <Input value={form.kra_pin ?? ''} onChange={e => set('kra_pin', e.target.value.toUpperCase())}
                                            placeholder="P051234567Q" className="font-mono" />
                                    </Field>
                                    <Field label="VAT Number" error={errors.vat_number}>
                                        <Input value={form.vat_number ?? ''} onChange={e => set('vat_number', e.target.value)} placeholder="Optional" />
                                    </Field>
                                    <Field label="Branch Name" error={errors.kra_branch_name}>
                                        <Input value={form.kra_branch_name ?? ''} onChange={e => set('kra_branch_name', e.target.value)} placeholder="Head Office" />
                                    </Field>
                                    <Field label="KRA Branch ID" hint="Assigned by KRA" error={errors.kra_branch_id}>
                                        <Input value={form.kra_branch_id ?? ''} onChange={e => set('kra_branch_id', e.target.value)}
                                            placeholder="00" className="font-mono" />
                                    </Field>
                                    <Field label="Default VAT Rate (%)" error={errors.default_vat_rate}>
                                        <Input type="number" step="0.01" min="0" max="100"
                                            value={form.default_vat_rate}
                                            onChange={e => set('default_vat_rate', e.target.value)} />
                                    </Field>
                                </div>
                                <Toggle checked={form.vat_registered} onChange={v => set('vat_registered', v)}
                                    label="VAT Registered" description="Enable VAT calculations on invoices" />
                            </Section>
                        </div>
                    )}

                    {/* ── eTIMS ── */}
                    {tab === 'etims' && (
                        <div className="space-y-4">
                            <Section title="eTIMS Integration"
                                description="Kenya Revenue Authority Electronic Tax Invoice Management System">

                                <Toggle checked={form.etims_enabled} onChange={v => set('etims_enabled', v)}
                                    label="Enable eTIMS Integration"
                                    description="Submit invoices to KRA in real-time as required by law" />

                                {form.etims_enabled && (
                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            {(['sandbox', 'production'] as const).map(env => (
                                                <button key={env} onClick={() => set('etims_environment', env)}
                                                    className={cn(
                                                        'flex items-center justify-center gap-2 p-3 rounded-lg border text-sm font-medium transition-all',
                                                        form.etims_environment === env
                                                            ? 'bg-amber-50 border-amber-400 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300'
                                                            : 'bg-background border-border text-muted-foreground hover:border-border/80'
                                                    )}>
                                                    {form.etims_environment === env && <CheckCircle2 className="h-3.5 w-3.5" />}
                                                    {env.charAt(0).toUpperCase() + env.slice(1)}
                                                </button>
                                            ))}
                                        </div>

                                        {form.etims_environment === 'production' && (
                                            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 dark:bg-amber-950/20 dark:border-amber-800">
                                                <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">⚠ Production Mode</p>
                                                <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                                                    Invoices will be submitted to the live KRA eTIMS system. Ensure your credentials are correct.
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <Field label="Taxpayer PIN" hint="Same as KRA PIN" error={errors.etims_taxpayer_pin}>
                                                <Input value={form.etims_taxpayer_pin ?? ''} onChange={e => set('etims_taxpayer_pin', e.target.value.toUpperCase())}
                                                    placeholder="P051234567Q" className="font-mono" />
                                            </Field>
                                            <Field label="Device Serial (OSCU/VSCU)" error={errors.etims_device_serial}
                                                hint="Your KRA-registered control unit serial">
                                                <Input value={form.etims_device_serial ?? ''} onChange={e => set('etims_device_serial', e.target.value)}
                                                    className="font-mono" />
                                            </Field>
                                            <Field label="Branch ID" hint="KRA-assigned branch (e.g. 00)" error={errors.etims_branch_id}>
                                                <Input value={form.etims_branch_id ?? ''} onChange={e => set('etims_branch_id', e.target.value)}
                                                    placeholder="00" className="font-mono" />
                                            </Field>
                                            <Field label="Invoice Prefix" hint="Series prefix on eTIMS invoices">
                                                <Input value={form.etims_invoice_prefix} onChange={e => set('etims_invoice_prefix', e.target.value.toUpperCase())}
                                                    placeholder="INV" maxLength={10} className="font-mono" />
                                            </Field>
                                        </div>

                                        <Toggle checked={form.etims_auto_submit} onChange={v => set('etims_auto_submit', v)}
                                            label="Auto-submit on Invoice Send"
                                            description="Automatically submit invoices to eTIMS when they are sent to clients" />

                                        {/* Test connection button */}
                                        <div className="pt-2 flex items-center gap-3">
                                            <Button variant="outline" size="sm" onClick={handleTestEtims}
                                                disabled={etimsTest.loading} className="gap-2">
                                                {etimsTest.loading
                                                    ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Testing…</>
                                                    : 'Test Connection'
                                                }
                                            </Button>
                                            {etimsTest.result && (
                                                <div className={cn(
                                                    'flex items-center gap-1.5 text-sm',
                                                    etimsTest.result.success ? 'text-emerald-600' : 'text-destructive'
                                                )}>
                                                    {etimsTest.result.success
                                                        ? <CheckCircle2 className="h-4 w-4" />
                                                        : <XCircle className="h-4 w-4" />
                                                    }
                                                    {etimsTest.result.message}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </Section>
                        </div>
                    )}

                    {/* ── Maker-Checker Workflow ── */}
                    {tab === 'workflow' && (
                        <div className="space-y-4">
                            <Section title="Maker-Checker Controls"
                                description="Require a second person to approve key actions before they take effect">

                                <Toggle checked={form.maker_checker_enabled} onChange={v => set('maker_checker_enabled', v)}
                                    label="Enable Maker-Checker Workflow"
                                    description="Master switch — turn this on first, then configure per module below" />

                                {form.maker_checker_enabled && (
                                    <div className="space-y-4 pt-2 border-t border-border">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Module Controls</p>
                                        <div className="grid gap-3">
                                            {[
                                                { key: 'maker_checker_tenders', label: 'Tenders', desc: 'Require approval before submitting a tender to an issuer' },
                                                { key: 'maker_checker_rfp',     label: 'RFP / RFQ', desc: 'Require approval before publishing an RFP or RFQ' },
                                                { key: 'maker_checker_invoices', label: 'Invoices', desc: 'Require approval before sending an invoice to a client' },
                                                { key: 'maker_checker_purchase_orders', label: 'Purchase Orders', desc: 'Require approval before sending a PO to a supplier' },
                                            ].map(({ key, label, desc }) => (
                                                <div key={key} className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border border-border">
                                                    <Toggle
                                                        checked={form[key as keyof CompanySettings] as boolean}
                                                        onChange={v => set(key as keyof CompanySettings, v)}
                                                        label={label}
                                                        description={desc}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <Field label="Minimum Approvals Required"
                                            hint="How many approvers must approve before the action proceeds">
                                            <Input type="number" min={1} max={10}
                                                value={form.maker_checker_min_approvals}
                                                onChange={e => set('maker_checker_min_approvals', parseInt(e.target.value))}
                                                className="w-24" />
                                        </Field>

                                        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800">
                                            <p className="text-xs font-semibold text-blue-800 dark:text-blue-300">Approver Roles</p>
                                            <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                                                By default, users with the <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">admin</code> or{' '}
                                                <code className="font-mono bg-blue-100 dark:bg-blue-900 px-1 rounded">manager</code> roles can approve.
                                                Configure role assignments in User Management.
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </Section>
                        </div>
                    )}

                    {/* ── Notifications ── */}
                    {tab === 'notifications' && (
                        <div className="space-y-4">
                            <Section title="System Notifications">
                                <div className="space-y-3">
                                    <Toggle checked={form.notify_on_approval_request} onChange={v => set('notify_on_approval_request', v)}
                                        label="Approval Requested"
                                        description="Notify approvers when a new maker-checker approval is requested" />
                                    <Toggle checked={form.notify_on_approval_decision} onChange={v => set('notify_on_approval_decision', v)}
                                        label="Approval Decision"
                                        description="Notify the requester when their approval is approved or rejected" />
                                    <Toggle checked={form.notify_on_etims_failure} onChange={v => set('notify_on_etims_failure', v)}
                                        label="eTIMS Submission Failures"
                                        description="Alert admins if an eTIMS submission fails" />
                                </div>
                            </Section>
                        </div>
                    )}

                    {/* Save footer */}
                    <div className="flex justify-end pt-2">
                        <Button size="sm" onClick={handleSave} disabled={saving}
                            className="bg-amber-500 hover:bg-amber-600 text-white gap-2">
                            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}
