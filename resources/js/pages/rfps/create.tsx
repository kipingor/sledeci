/**
 * rfps/create.tsx — Create a new RFP or RFQ
 */
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Plus, Trash2, Save, FileText } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Procurement', href: '#' },
    { title: 'RFPs & RFQs', href: '/rfps' },
    { title: 'New', href: '/rfps/create' },
];

interface Requirement { id: string; category: string; description: string; mandatory: boolean }
interface EvalCriteria { id: string; criterion: string; weight_pct: number; description: string }

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

function Field({ label, required, error, className, children }: {
    label: string; required?: boolean; error?: string; className?: string; children: React.ReactNode
}) {
    return (
        <div className={`space-y-1.5 ${className ?? ''}`}>
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">
                {label}{required && <span className="text-destructive ml-0.5">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

const uid = () => Math.random().toString(36).slice(2, 8);

export default function RfpCreate() {
    const [form, setForm] = useState({
        type: 'rfp' as 'rfp' | 'rfq',
        title: '', reference_number: '', description: '', scope_of_work: '',
        issue_date: '', submission_deadline: '', budget: '', currency: 'KES', notes: '',
    });
    const [requirements, setRequirements]   = useState<Requirement[]>([]);
    const [evalCriteria, setEvalCriteria]   = useState<EvalCriteria[]>([]);
    const [errors, setErrors]               = useState<Record<string, string>>({});
    const [saving, setSaving]               = useState(false);

    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));

    function addRequirement() {
        setRequirements(p => [...p, { id: uid(), category: '', description: '', mandatory: true }]);
    }
    function addCriteria() {
        setEvalCriteria(p => [...p, { id: uid(), criterion: '', weight_pct: 20, description: '' }]);
    }

    const totalWeight = evalCriteria.reduce((s, c) => s + (c.weight_pct || 0), 0);

    function handleSubmit() {
        setSaving(true);
        router.post('/rfps', {
            ...form,
            requirements: JSON.stringify(requirements),
            evaluation_criteria: JSON.stringify(evalCriteria),
        }, {
            onSuccess: () => setSaving(false),
            onError: (e) => { setErrors(e as any); setSaving(false); },
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New RFP / RFQ" />
            <div className="max-w-3xl mx-auto p-6 space-y-5">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-lg font-bold">New Request</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Create an RFP or RFQ</p>
                    </div>
                    <Button size="sm" onClick={handleSubmit} disabled={saving}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving…' : 'Create'}
                    </Button>
                </div>

                {/* Type selector */}
                <div className="grid grid-cols-2 gap-3">
                    {([
                        { value: 'rfp', label: 'Request for Proposal', desc: 'Solicit detailed proposals from vendors' },
                        { value: 'rfq', label: 'Request for Quotation', desc: 'Solicit pricing quotes for goods/services' },
                    ] as const).map(t => (
                        <button key={t.value} onClick={() => set('type', t.value)}
                            className={cn(
                                'p-4 rounded-lg border text-left transition-all',
                                form.type === t.value
                                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20'
                                    : 'border-border hover:border-amber-200'
                            )}>
                            <p className={cn('text-sm font-semibold', form.type === t.value ? 'text-amber-700 dark:text-amber-300' : '')}>{t.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{t.desc}</p>
                        </button>
                    ))}
                </div>

                <Section title="Basic Information">
                    <Field label="Title" required error={errors.title}>
                        <Input value={form.title} onChange={e => set('title', e.target.value)}
                            placeholder={`${form.type.toUpperCase()} title…`} />
                    </Field>
                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Reference Number" error={errors.reference_number}>
                            <Input value={form.reference_number} onChange={e => set('reference_number', e.target.value)}
                                placeholder="RFP-2026-001" className="font-mono" />
                        </Field>
                        <Field label="Currency">
                            <select value={form.currency} onChange={e => set('currency', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm">
                                {['KES', 'USD', 'EUR', 'GBP'].map(c => <option key={c}>{c}</option>)}
                            </select>
                        </Field>
                        <Field label="Issue Date">
                            <Input type="date" value={form.issue_date} onChange={e => set('issue_date', e.target.value)} />
                        </Field>
                        <Field label="Submission Deadline">
                            <Input type="date" value={form.submission_deadline} onChange={e => set('submission_deadline', e.target.value)} />
                        </Field>
                        <Field label="Estimated Budget" className="col-span-2">
                            <Input type="number" min="0" step="0.01" value={form.budget} onChange={e => set('budget', e.target.value)}
                                placeholder="0.00" />
                        </Field>
                    </div>
                    <Field label="Description">
                        <Textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                            placeholder="Brief overview of what you're requesting…" />
                    </Field>
                    <Field label="Scope of Work">
                        <Textarea value={form.scope_of_work} onChange={e => set('scope_of_work', e.target.value)} rows={4}
                            placeholder="Detailed scope, deliverables, timelines…" />
                    </Field>
                </Section>

                <Section title="Requirements">
                    <div className="space-y-2">
                        {requirements.map((req, i) => (
                            <div key={req.id} className="grid grid-cols-[1fr_1fr_auto_auto] gap-2 items-center p-3 bg-muted/30 rounded-lg border border-border">
                                <Input placeholder="Category (e.g. Technical)" value={req.category}
                                    onChange={e => setRequirements(p => p.map((r, j) => j === i ? { ...r, category: e.target.value } : r))} />
                                <Input placeholder="Requirement description" value={req.description}
                                    onChange={e => setRequirements(p => p.map((r, j) => j === i ? { ...r, description: e.target.value } : r))} />
                                <label className="flex items-center gap-1.5 text-xs font-medium whitespace-nowrap">
                                    <input type="checkbox" checked={req.mandatory}
                                        onChange={e => setRequirements(p => p.map((r, j) => j === i ? { ...r, mandatory: e.target.checked } : r))} />
                                    Mandatory
                                </label>
                                <button onClick={() => setRequirements(p => p.filter((_, j) => j !== i))}
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addRequirement} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Requirement
                    </Button>
                </Section>

                <Section title="Evaluation Criteria">
                    {totalWeight !== 0 && totalWeight !== 100 && (
                        <div className="p-2.5 rounded bg-amber-50 border border-amber-200 text-xs text-amber-700 dark:bg-amber-950/20 dark:border-amber-800 dark:text-amber-300">
                            Weights total {totalWeight}% — should sum to 100%
                        </div>
                    )}
                    <div className="space-y-2">
                        {evalCriteria.map((ec, i) => (
                            <div key={ec.id} className="grid grid-cols-[1fr_80px_1fr_auto] gap-2 items-center p-3 bg-muted/30 rounded-lg border border-border">
                                <Input placeholder="Criterion (e.g. Technical Approach)" value={ec.criterion}
                                    onChange={e => setEvalCriteria(p => p.map((c, j) => j === i ? { ...c, criterion: e.target.value } : c))} />
                                <Input type="number" min={0} max={100} placeholder="%" value={ec.weight_pct}
                                    onChange={e => setEvalCriteria(p => p.map((c, j) => j === i ? { ...c, weight_pct: parseInt(e.target.value) } : c))} />
                                <Input placeholder="Description" value={ec.description}
                                    onChange={e => setEvalCriteria(p => p.map((c, j) => j === i ? { ...c, description: e.target.value } : c))} />
                                <button onClick={() => setEvalCriteria(p => p.filter((_, j) => j !== i))}
                                    className="p-1 text-muted-foreground hover:text-destructive transition-colors">
                                    <Trash2 className="h-3.5 w-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                    <Button variant="outline" size="sm" onClick={addCriteria} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Criterion
                    </Button>
                </Section>

                <Section title="Notes">
                    <Textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3}
                        placeholder="Internal notes, special instructions…" />
                </Section>

                <div className="flex justify-end">
                    <Button size="sm" onClick={handleSubmit} disabled={saving}
                        className="bg-amber-500 hover:bg-amber-600 text-white gap-1.5">
                        <Save className="h-3.5 w-3.5" />
                        {saving ? 'Saving…' : 'Create ' + form.type.toUpperCase()}
                    </Button>
                </div>
            </div>
        </AppLayout>
    );
}
