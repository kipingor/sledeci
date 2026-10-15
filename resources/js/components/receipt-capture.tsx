import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, ImagePlus, X, Sparkles, CheckCircle2, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface OcrResult {
    vendor: string | null;
    amount: number | null;
    currency: string | null;
    date: string | null;
    category: string | null;
    description: string | null;
    vat: number | null;
    confidence: 'high' | 'medium' | 'low';
}

interface Props {
    onExtracted?: (data: OcrResult) => void;
    onFile?: (file: File) => void;
    className?: string;
}

function csrfToken() {
    return (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
}

export default function ReceiptCapture({ onExtracted, onFile, className }: Props) {
    const [preview,   setPreview]   = useState<string | null>(null);
    const [file,      setFile]      = useState<File | null>(null);
    const [scanning,  setScanning]  = useState(false);
    const [result,    setResult]    = useState<OcrResult | null>(null);
    const [error,     setError]     = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    function handleFile(f: File) {
        setFile(f);
        setResult(null);
        setError(null);

        const reader = new FileReader();
        reader.onload = () => setPreview(reader.result as string);
        reader.readAsDataURL(f);

        onFile?.(f);
    }

    function clearReceipt() {
        setFile(null);
        setPreview(null);
        setResult(null);
        setError(null);
        if (fileInputRef.current)   fileInputRef.current.value   = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    }

    async function runOcr() {
        if (!preview) return;
        setScanning(true);
        setError(null);

        try {
            const res = await fetch('/expenses/ocr', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': csrfToken(),
                },
                body: JSON.stringify({ image_data: preview }),
            });

            const json = await res.json();

            if (!res.ok) {
                setError(json.error ?? 'OCR extraction failed.');
                return;
            }

            const data: OcrResult = json.data;
            setResult(data);
            onExtracted?.(data);
        } catch (e) {
            setError('Network error — could not reach OCR service.');
        } finally {
            setScanning(false);
        }
    }

    const confidenceConfig = {
        high:   { label: 'High confidence', color: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800' },
        medium: { label: 'Medium confidence', color: 'text-amber-600', bg: 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800' },
        low:    { label: 'Low confidence — please verify', color: 'text-red-600', bg: 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800' },
    };

    return (
        <div className={cn('space-y-3', className)}>
            {/* Receipt preview */}
            {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-border bg-muted/20">
                    <img src={preview} alt="Receipt" className="w-full max-h-64 object-contain" />
                    <button onClick={clearReceipt}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/80 rounded-full text-white transition-colors">
                        <X className="h-3.5 w-3.5" />
                    </button>
                </div>
            ) : (
                /* Capture buttons */
                <div className="grid grid-cols-2 gap-2">
                    {/* Camera button — opens device camera directly on mobile */}
                    <label className={cn(
                        'flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed',
                        'border-border hover:border-amber-300 cursor-pointer transition-colors bg-card'
                    )}>
                        <Camera className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Take Photo</span>
                        <input
                            ref={cameraInputRef}
                            type="file" accept="image/*"
                            capture="environment"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                            className="sr-only"
                        />
                    </label>

                    {/* Gallery / file picker */}
                    <label className={cn(
                        'flex flex-col items-center justify-center gap-2 h-24 rounded-xl border-2 border-dashed',
                        'border-border hover:border-amber-300 cursor-pointer transition-colors bg-card'
                    )}>
                        <ImagePlus className="h-6 w-6 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">Choose Photo</span>
                        <input
                            ref={fileInputRef}
                            type="file" accept="image/*"
                            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                            className="sr-only"
                        />
                    </label>
                </div>
            )}

            {/* OCR button */}
            {preview && !result && (
                <Button onClick={runOcr} disabled={scanning} size="sm"
                    className="w-full gap-2 bg-amber-500 hover:bg-amber-600 text-white">
                    {scanning
                        ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Reading receipt…</>
                        : <><Sparkles className="h-3.5 w-3.5" /> Extract with AI</>
                    }
                </Button>
            )}

            {/* Error */}
            {error && (
                <div className="flex items-start gap-2 p-2.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg text-xs text-red-700 dark:text-red-300">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" /> {error}
                </div>
            )}

            {/* OCR result summary */}
            {result && (
                <div className={cn(
                    'rounded-xl border p-3.5 space-y-2 text-xs',
                    confidenceConfig[result.confidence].bg
                )}>
                    <div className="flex items-center gap-1.5">
                        <CheckCircle2 className={cn('h-3.5 w-3.5', confidenceConfig[result.confidence].color)} />
                        <p className={cn('font-semibold', confidenceConfig[result.confidence].color)}>
                            Receipt extracted · {confidenceConfig[result.confidence].label}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                        {[
                            { label: 'Vendor',      value: result.vendor },
                            { label: 'Amount',      value: result.amount != null ? `${result.currency ?? ''} ${result.amount}`.trim() : null },
                            { label: 'Date',        value: result.date },
                            { label: 'Category',    value: result.category },
                            { label: 'Description', value: result.description },
                            { label: 'VAT',         value: result.vat != null ? `${result.currency ?? ''} ${result.vat}`.trim() : null },
                        ].filter(r => r.value).map(row => (
                            <div key={row.label}>
                                <span className="text-muted-foreground">{row.label}: </span>
                                <span className="font-medium">{row.value}</span>
                            </div>
                        ))}
                    </div>
                    <p className="text-muted-foreground">Form fields have been pre-filled. Please review before saving.</p>
                </div>
            )}
        </div>
    );
}