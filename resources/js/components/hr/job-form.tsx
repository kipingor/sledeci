import { router } from '@inertiajs/react';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export interface JobFormValues {
    title: string;
    department: string;
    location: string;
    is_remote: boolean;
    employment_type: string;
    experience_level: string;
    summary: string;
    description: string;
    responsibilities: string;
    requirements: string;
    benefits: string;
    salary_min: string;
    salary_max: string;
    salary_currency: string;
    closes_at: string;
}

interface Props {
    initial?: Partial<Record<keyof JobFormValues, string | number | boolean | null>>;
    employmentTypes: Record<string, string>;
    experienceLevels: Record<string, string>;
    /** Where to send the form, and with which method. */
    action: { url: string; method: 'post' | 'put' };
    submitLabel: string;
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-1.5">
            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
            {children}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    );
}

const selectClass = 'h-9 w-full rounded-md border border-input bg-background px-3 text-sm';

export default function JobForm({ initial = {}, employmentTypes, experienceLevels, action, submitLabel }: Props) {
    const str = (v: unknown, fallback = '') => (v === null || v === undefined ? fallback : String(v));

    const [data, setData] = useState<JobFormValues>({
        title: str(initial.title),
        department: str(initial.department),
        location: str(initial.location),
        is_remote: Boolean(initial.is_remote),
        employment_type: str(initial.employment_type, 'full_time'),
        experience_level: str(initial.experience_level),
        summary: str(initial.summary),
        description: str(initial.description),
        responsibilities: str(initial.responsibilities),
        requirements: str(initial.requirements),
        benefits: str(initial.benefits),
        salary_min: str(initial.salary_min),
        salary_max: str(initial.salary_max),
        salary_currency: str(initial.salary_currency, 'KES'),
        closes_at: str(initial.closes_at).slice(0, 10),
    });
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    const set =
        (key: keyof JobFormValues) =>
        (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
            setData((d) => ({ ...d, [key]: e.target.value }));

    function submit() {
        setSaving(true);
        const payload = {
            ...data,
            salary_min: data.salary_min === '' ? null : data.salary_min,
            salary_max: data.salary_max === '' ? null : data.salary_max,
            experience_level: data.experience_level === '' ? null : data.experience_level,
            closes_at: data.closes_at === '' ? null : data.closes_at,
        };
        router[action.method](action.url, payload, {
            preserveScroll: true,
            onError: (e) => setErrors(e as Record<string, string>),
            onSuccess: () => setErrors({}),
            onFinish: () => setSaving(false),
        });
    }

    return (
        <div className="space-y-5">
            <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-2">
                <div className="sm:col-span-2">
                    <Field label="Job title" error={errors.title}>
                        <Input value={data.title} onChange={set('title')} placeholder="e.g. Senior Accountant" />
                    </Field>
                </div>
                <Field label="Department" error={errors.department}>
                    <Input value={data.department} onChange={set('department')} placeholder="e.g. Finance" />
                </Field>
                <Field label="Location" error={errors.location}>
                    <Input value={data.location} onChange={set('location')} placeholder="e.g. Nairobi" />
                </Field>
                <Field label="Employment type" error={errors.employment_type}>
                    <select className={selectClass} value={data.employment_type} onChange={set('employment_type')}>
                        {Object.entries(employmentTypes).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>
                <Field label="Experience level" error={errors.experience_level}>
                    <select className={selectClass} value={data.experience_level} onChange={set('experience_level')}>
                        <option value="">Not specified</option>
                        {Object.entries(experienceLevels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                </Field>
                <label className="flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={data.is_remote} onChange={(e) => setData((d) => ({ ...d, is_remote: e.target.checked }))} />
                    This role can be done remotely
                </label>
            </div>

            <div className="grid gap-4 rounded-lg border border-border bg-card p-5 sm:grid-cols-3">
                <Field label="Salary from (per month)" error={errors.salary_min}>
                    <Input type="number" min="0" value={data.salary_min} onChange={set('salary_min')} />
                </Field>
                <Field label="Salary to (per month)" error={errors.salary_max}>
                    <Input type="number" min="0" value={data.salary_max} onChange={set('salary_max')} />
                </Field>
                <Field label="Currency" error={errors.salary_currency}>
                    <Input maxLength={3} value={data.salary_currency} onChange={set('salary_currency')} />
                </Field>
                <div className="sm:col-span-3">
                    <Field label="Applications close on" error={errors.closes_at} hint="Optional. The role disappears from the careers page after this date.">
                        <Input type="date" value={data.closes_at} onChange={set('closes_at')} className="max-w-xs" />
                    </Field>
                </div>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-card p-5">
                <Field label="Short summary" error={errors.summary} hint="Shown on the careers list and in the LinkedIn post (max 500 characters).">
                    <Textarea rows={2} value={data.summary} onChange={set('summary')} />
                </Field>
                <Field label="About the role" error={errors.description}>
                    <Textarea rows={6} value={data.description} onChange={set('description')} />
                </Field>
                <Field label="Responsibilities" error={errors.responsibilities}>
                    <Textarea rows={5} value={data.responsibilities} onChange={set('responsibilities')} />
                </Field>
                <Field label="Requirements" error={errors.requirements}>
                    <Textarea rows={5} value={data.requirements} onChange={set('requirements')} />
                </Field>
                <Field label="Benefits" error={errors.benefits}>
                    <Textarea rows={4} value={data.benefits} onChange={set('benefits')} />
                </Field>
            </div>

            <div className="flex justify-end">
                <Button type="button" onClick={submit} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? 'Saving…' : submitLabel}
                </Button>
            </div>
        </div>
    );
}
