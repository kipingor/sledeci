/**
 * tenders/create.tsx — Amber Obsidian redesign
 * All useForm, post(), progress, pickFile, and forceFormData logic preserved exactly.
 */
import AppLayout from '@/layouts/app-layout';
import { Head, useForm } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Upload, FileText, Sparkles, Calendar, DollarSign, Building2, ChevronRight } from 'lucide-react';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Tenders', href: '/tenders' },
    { title: 'Upload Tender', href: '/tenders/create' },
];

function Section({ icon: Icon, title, description, children, highlight }: {
    icon: React.ComponentType<{className?: string}>; title: string; description: string; children: React.ReactNode; highlight?: boolean;
}) {
    return (
        <div className={cn('border rounded-lg overflow-hidden', highlight ? 'border-primary/30 bg-primary/5' : 'border-border bg-card')}>
            <div className={cn('flex items-start gap-3 px-5 py-3.5 border-b', highlight ? 'border-primary/20 bg-primary/5' : 'border-border bg-muted/30')}>
                <div className={cn('h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', highlight ? 'bg-primary/20' : 'bg-primary/10')}>
                    <Icon className="h-3.5 w-3.5 text-primary" />
                </div>
                <div>
                    <p className="text-sm font-semibold">{title}</p>
                    <p className="text-xs text-muted-foreground">{description}</p>
                </div>
            </div>
            <div className="p-5">{children}</div>
        </div>
    );
}

export default function TenderCreate() {
    const fileRef = useRef<HTMLInputElement>(null);
    const { data, setData, post, processing, errors, progress } = useForm<any>({
        title: '', issuer: '', reference_number: '', submission_deadline: '',
        estimated_value: '', currency: 'USD', notes: '', document: null,
    });

    function pickFile(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        if (!file) return;
        setData('document', file);
        if (!data.title) setData('title', file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '));
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Upload Tender" />

            {/* SF header */}
            <div className="bg-card border-b border-border px-6 py-4">
                <nav className="flex items-center gap-1.5 text-sm mb-3">
                    <a href="/tenders" className="text-muted-foreground hover:text-foreground transition-colors">Tenders</a>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
                    <span className="font-semibold">Upload Tender</span>
                </nav>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight">Upload Tender / RFP</h1>
                        <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Sparkles className="h-3.5 w-3.5 text-primary" />
                            AI will analyse the document, extract requirements, and guide you through the application
                        </p>
                    </div>
                </div>
            </div>

            <div className="p-6 max-w-2xl">
                <form onSubmit={e => { e.preventDefault(); post('/tenders', { forceFormData: true }); }} className="space-y-5" encType="multipart/form-data">

                    {/* Document upload */}
                    <Section icon={Upload} title="Tender Document" description="Upload the RFP, tender notice, or bid document. AI will read and analyse it." highlight>
                        <div
                            className={cn(
                                'border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors',
                                data.document ? 'border-primary/50 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/5'
                            )}
                            onClick={() => fileRef.current?.click()}
                        >
                            <input ref={fileRef} type="file" accept=".pdf,.doc,.docx,.txt,.md" onChange={pickFile} className="hidden" name="document" />
                            {data.document ? (
                                <div className="flex items-center justify-center gap-3">
                                    <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                                    <div className="text-left">
                                        <p className="font-semibold text-sm text-primary">{data.document.name}</p>
                                        <p className="text-xs text-muted-foreground">{(data.document.size / 1024 / 1024).toFixed(1)} MB — Click to change</p>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                                    <p className="text-sm font-medium text-muted-foreground">Click to upload or drag and drop</p>
                                    <p className="text-xs text-muted-foreground/60 mt-1">PDF, DOC, DOCX, TXT up to 20MB</p>
                                </>
                            )}
                        </div>
                        {progress && (
                            <div className="mt-3">
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress.percentage ?? 0}%` }} />
                                </div>
                            </div>
                        )}
                    </Section>

                    {/* Tender details */}
                    <Section icon={FileText} title="Tender Details" description="Provide what you know — AI will fill in the rest from the document.">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="col-span-2 space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tender Title *</Label>
                                <Input value={data.title} onChange={e => setData('title', e.target.value)} placeholder="Provision of IT Services 2026"
                                    className={errors.title ? 'border-destructive' : ''} />
                                {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Issuing Organisation</Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input value={data.issuer} onChange={e => setData('issuer', e.target.value)} placeholder="Ministry of Finance" className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reference / Tender No.</Label>
                                <Input value={data.reference_number} onChange={e => setData('reference_number', e.target.value)} placeholder="MOF/2026/IT/001" className="font-mono" />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submission Deadline</Label>
                                <div className="relative">
                                    <Calendar className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input type="date" value={data.submission_deadline} onChange={e => setData('submission_deadline', e.target.value)} className="pl-9" />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estimated Value</Label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                    <Input type="number" value={data.estimated_value} onChange={e => setData('estimated_value', e.target.value)} placeholder="500000" className="pl-9" />
                                </div>
                            </div>
                        </div>
                    </Section>

                    <div className="bg-card border border-border rounded-lg p-5">
                        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block mb-2">Notes (optional)</Label>
                        <Textarea value={data.notes} onChange={e => setData('notes', e.target.value)}
                            placeholder="Any initial thoughts, constraints, or context about this bid…" rows={3} className="resize-none" />
                    </div>

                    <div className="flex justify-end gap-3 pt-1">
                        <Button type="button" variant="outline" onClick={() => history.back()}>Cancel</Button>
                        <Button type="submit" disabled={processing} className="gap-2 min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90">
                            {processing
                                ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" /> Analysing document…</>
                                : <><Sparkles className="h-4 w-4" /> Create &amp; Analyse</>}
                        </Button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}