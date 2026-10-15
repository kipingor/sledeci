import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { type BreadcrumbItem } from '@/types';
import { ChevronRight, Receipt, Save, WifiOff, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import ReceiptCapture, { type OcrResult } from '@/components/receipt-capture';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Expenses', href: '/expenses' },
    { title: 'New Expense', href: '/expenses/create' },
];

interface Project { id: number; name: string }
interface Props { projects: Project[] }

const CATEGORIES = [
    { value: 'travel',        label: '✈  Travel' },
    { value: 'accommodation', label: '🏨 Accommodation' },
    { value: 'software',      label: '💻 Software' },
    { value: 'hardware',      label: '🖥  Hardware' },
    { value: 'meals',         label: '🍽  Meals' },
    { value: 'supplies',      label: '📦 Supplies' },
    { value: 'marketing',     label: '📢 Marketing' },
    { value: 'utilities',     label: '💡 Utilities' },
    { value: 'fuel',          label: '⛽ Fuel / Transport' },
    { value: 'rent',          label: '🏢 Rent' },
    { value: 'other',         label: '📝 Other' },
];

const CURRENCIES = ['KES', 'UGX', 'TZS', 'USD', 'EUR', 'GBP'];

function Field({ label, required, children, ocr }: {
    label: string; required?: boolean; children: React.ReactNode; ocr?: boolean;
}) {
    return (
        <div className="space-y-1.5">
            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                {label}
                {required && <span className="text-destructive">*</span>}
                {ocr && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-1.5 py-0.5 rounded-full">
                        <Sparkles className="h-2.5 w-2.5" /> OCR
                    </span>
                )}
            </label>
            {children}
        </div>
    );
}

export default function ExpenseCreate({ projects = [] }: Props) {
    const [form, setForm] = useState({
        description: '',
        amount: '',
        currency: 'KES',
        category: 'other',
        project_id: '',
        date: new Date().toISOString().slice(0, 10),
        notes: '',
        vendor: '',
    });

    // Track which fields were auto-filled by OCR
    const [ocrFilled, setOcrFilled] = useState<Set<string>>(new Set());

    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [saving,      setSaving]      = useState(false);
    const [queued,      setQueued]      = useState(false);

    const { isOnline, enqueue } = useOfflineQueue();

    function setField(key: string, value: string, fromOcr = false) {
        setForm(p => ({ ...p, [key]: value }));
        if (fromOcr) {
            setOcrFilled(prev => new Set([...prev, key]));
        } else {
            // Clear OCR badge when user manually edits
            setOcrFilled(prev => { const n = new Set(prev); n.delete(key); return n; });
        }
    }

    function handleOcrExtracted(data: OcrResult) {
        if (data.vendor && !form.description)  setField('description', data.vendor, true);
        if (data.vendor && !form.vendor)       setField('vendor', data.vendor, true);
        if (data.amount && !form.amount)       setField('amount', String(data.amount), true);
        if (data.currency)                     setField('currency', data.currency, true);
        if (data.date && !form.date)           setField('date', data.date, true);
        if (data.category && form.category === 'other') setField('category', data.category, true);
        if (data.description && !form.description) setField('description', data.description, true);
    }

    const fmt = (n: number) =>
        new Intl.NumberFormat('en-KE', { style: 'currency', currency: form.currency || 'KES' }).format(n);

    async function submit() {
        setSaving(true);

        if (!isOnline) {
            // Compress receipt for offline storage if present
            let receiptThumbnail: string | null = null;
            if (receiptFile) {
                try {
                    receiptThumbnail = await compressImage(receiptFile);
                } catch { /* skip if compression fails */ }
            }

            await enqueue('create_expense', {
                ...form,
                receipt_thumbnail: receiptThumbnail,
                receipt_pending_upload: !!receiptFile,
                receipt_filename: receiptFile?.name ?? null,
            }, '/expenses');

            setQueued(true);
            setSaving(false);
            setTimeout(() => router.visit('/expenses'), 1500);
            return;
        }

        // Online: multipart form
        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => fd.append(k, v));
        if (receiptFile) fd.append('receipt', receiptFile);

        router.post('/expenses', fd, {
            onFinish: () => setSaving(false),
            forceFormData: true,
        });
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Expense" />

            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/expenses" className="text-muted-foreground hover:text-foreground">Expenses</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">New Expense</span>
                </nav>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                            <Receipt className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold tracking-tight">New Expense</h1>
                            <p className="text-xs text-muted-foreground">
                                Take a photo of your receipt — AI will fill in the details
                            </p>
                        </div>
                    </div>
                    {!isOnline && (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-950/30 dark:text-amber-300">
                            <WifiOff className="h-3 w-3" /> Offline — will sync later
                        </span>
                    )}
                </div>
            </div>

            <div className="p-6 max-w-lg space-y-5">

                {queued && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 dark:bg-emerald-950/20 dark:border-emerald-800 dark:text-emerald-300">
                        ✅ Expense saved locally — it'll sync automatically once you're back online.
                    </div>
                )}

                {/* Receipt capture with OCR */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-border bg-muted/30 flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <p className="text-sm font-semibold">Receipt</p>
                        <p className="text-xs text-muted-foreground ml-1">— AI extracts details automatically</p>
                    </div>
                    <div className="p-5">
                        <ReceiptCapture
                            onExtracted={handleOcrExtracted}
                            onFile={setReceiptFile}
                        />
                    </div>
                </div>

                {/* Expense details form */}
                <div className="bg-card border border-border rounded-lg p-5 space-y-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Expense Details
                        {ocrFilled.size > 0 && (
                            <span className="ml-2 text-amber-600 normal-case font-normal">
                                · {ocrFilled.size} field{ocrFilled.size !== 1 ? 's' : ''} pre-filled by AI
                            </span>
                        )}
                    </p>

                    <Field label="Description" required ocr={ocrFilled.has('description')}>
                        <Textarea
                            value={form.description}
                            onChange={e => setField('description', e.target.value)}
                            className={cn('resize-none', ocrFilled.has('description') && 'border-amber-300 dark:border-amber-700')}
                            rows={2}
                            placeholder="What was this expense for?"
                        />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Amount" required ocr={ocrFilled.has('amount')}>
                            <Input
                                type="number" step="0.01" min="0"
                                value={form.amount}
                                onChange={e => setField('amount', e.target.value)}
                                className={cn(ocrFilled.has('amount') && 'border-amber-300 dark:border-amber-700')}
                                placeholder="0.00"
                            />
                        </Field>

                        <Field label="Currency" ocr={ocrFilled.has('currency')}>
                            <select
                                value={form.currency}
                                onChange={e => setField('currency', e.target.value)}
                                className={cn(
                                    'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm',
                                    ocrFilled.has('currency') && 'border-amber-300 dark:border-amber-700'
                                )}
                            >
                                {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <Field label="Category" ocr={ocrFilled.has('category')}>
                            <select
                                value={form.category}
                                onChange={e => setField('category', e.target.value)}
                                className={cn(
                                    'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm',
                                    ocrFilled.has('category') && 'border-amber-300 dark:border-amber-700'
                                )}
                            >
                                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                            </select>
                        </Field>

                        <Field label="Date" ocr={ocrFilled.has('date')}>
                            <Input
                                type="date"
                                value={form.date}
                                onChange={e => setField('date', e.target.value)}
                                className={cn(ocrFilled.has('date') && 'border-amber-300 dark:border-amber-700')}
                            />
                        </Field>
                    </div>

                    {projects.length > 0 && (
                        <Field label="Project (optional)">
                            <select
                                value={form.project_id}
                                onChange={e => setField('project_id', e.target.value)}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                            >
                                <option value="">— None —</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </Field>
                    )}

                    <Field label="Notes">
                        <Textarea
                            value={form.notes}
                            onChange={e => setField('notes', e.target.value)}
                            rows={2}
                            className="resize-none"
                            placeholder="Additional details…"
                        />
                    </Field>

                    {form.amount && (
                        <div className="flex justify-between items-center pt-2 border-t border-border text-sm">
                            <span className="text-muted-foreground">Total</span>
                            <span className="font-bold">{fmt(parseFloat(form.amount) || 0)}</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-3">
                    <Button
                        onClick={submit}
                        disabled={saving || !form.description || !form.amount}
                        className="gap-2 bg-amber-500 hover:bg-amber-600 text-white"
                    >
                        <Save className="h-4 w-4" />
                        {saving ? 'Saving…' : !isOnline ? 'Save Offline' : 'Save Expense'}
                    </Button>
                    <Button variant="outline" onClick={() => history.back()}>Cancel</Button>
                </div>
            </div>
        </AppLayout>
    );
}

// ── Image compression helper (kept local to this file) ────────────────────────

function compressImage(file: File, maxDim = 800, quality = 0.7): Promise<string> {
    return new Promise((resolve, reject) => {
        const img    = new Image();
        const reader = new FileReader();
        reader.onload  = () => { img.src = reader.result as string; };
        reader.onerror = reject;
        img.onload = () => {
            const scale  = Math.min(1, maxDim / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width  = img.width  * scale;
            canvas.height = img.height * scale;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
            resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        reader.readAsDataURL(file);
    });
}