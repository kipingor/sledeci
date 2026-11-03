import { Head, router, useForm, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { type BreadcrumbItem } from '@/types';
import { Brain, Check, ExternalLink, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Settings', href: '/settings/profile' },
    { title: 'AI', href: '/settings/ai' },
];

interface Provider {
    id: string;
    label: string;
    description: string;
    docs_url?: string;
    free_tier: boolean;
    configured: boolean;
    source: string;
}

interface Plan {
    name: string;
    price_monthly: number;
    features: string[];
}

interface Props {
    providers: Provider[];
    plans: Record<string, Plan>;
    settings: {
        ai_provider: string;
        ai_plan: string;
        ai_subscription_status: string | null;
        ai_subscription_ends_at: string | null;
        has_gemini_key: boolean;
        has_openai_key: boolean;
        has_anthropic_key: boolean;
    };
    stripe_enabled: boolean;
}

export default function AiSettings({ providers, plans, settings, stripe_enabled }: Props) {
    const form = useForm({
        ai_provider: settings.ai_provider || 'auto',
        ai_gemini_key: '',
        ai_openai_key: '',
        ai_anthropic_key: '',
        clear_gemini_key: false,
        clear_openai_key: false,
        clear_anthropic_key: false,
    });

    const subscribe = (plan: string) => {
        router.post('/settings/ai/subscribe', { plan });
    };

    const cancel = () => {
        if (confirm('Cancel AI subscription? You can still use your own API keys.')) {
            router.post('/settings/ai/cancel');
        }
    };

    return (
        <>
            <Head title="AI settings" />
            <div className="mx-auto max-w-3xl space-y-5">
                <div>
                    <h1 className="text-lg font-bold flex items-center gap-2">
                        <Brain className="h-5 w-5 text-violet-500" />
                        AI settings
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Choose a provider, add your own keys (BYOK), or subscribe for platform access.
                    </p>
                </div>

                {/* Provider choice */}
                <section className="rounded-xl border bg-card p-5 space-y-4">
                    <h2 className="text-sm font-semibold">Active provider</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {[
                            { id: 'auto', label: 'Auto', description: 'First available: Gemini → OpenAI → Claude' },
                            ...providers.map((p) => ({
                                id: p.id,
                                label: p.label,
                                description: p.description,
                            })),
                        ].map((p) => (
                            <button
                                key={p.id}
                                type="button"
                                onClick={() => form.setData('ai_provider', p.id)}
                                className={cn(
                                    'text-left rounded-lg border p-3 transition-colors',
                                    form.data.ai_provider === p.id
                                        ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/30'
                                        : 'hover:bg-muted/50',
                                )}
                            >
                                <div className="flex items-center gap-2 font-medium text-sm">
                                    {form.data.ai_provider === p.id && <Check className="h-4 w-4 text-violet-600" />}
                                    {p.label}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                            </button>
                        ))}
                    </div>
                </section>

                {/* BYOK */}
                <section className="rounded-xl border bg-card p-5 space-y-4">
                    <h2 className="text-sm font-semibold">Your API keys (BYOK)</h2>
                    <p className="text-xs text-muted-foreground">
                        Keys are stored encrypted. Leave blank to keep the current key.
                    </p>
                    {(
                        [
                            ['gemini', 'Gemini API key', settings.has_gemini_key, 'https://aistudio.google.com/apikey'],
                            ['openai', 'OpenAI API key', settings.has_openai_key, 'https://platform.openai.com/api-keys'],
                            ['anthropic', 'Anthropic API key', settings.has_anthropic_key, 'https://console.anthropic.com/'],
                        ] as const
                    ).map(([id, label, has, docs]) => (
                        <div key={id} className="space-y-1">
                            <div className="flex items-center justify-between">
                                <label className="text-sm font-medium">{label}</label>
                                <a href={docs} target="_blank" rel="noreferrer" className="text-xs text-primary inline-flex items-center gap-1">
                                    Get key <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                            <Input
                                type="password"
                                placeholder={has ? '•••••••• (saved)' : 'Paste key…'}
                                value={(form.data as any)[`ai_${id}_key`]}
                                onChange={(e) => form.setData(`ai_${id}_key` as any, e.target.value)}
                            />
                            {has && (
                                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <input
                                        type="checkbox"
                                        checked={(form.data as any)[`clear_${id}_key`]}
                                        onChange={(e) => form.setData(`clear_${id}_key` as any, e.target.checked)}
                                    />
                                    Remove saved key
                                </label>
                            )}
                        </div>
                    ))}
                    <Button
                        disabled={form.processing}
                        onClick={() => form.patch('/settings/ai')}
                    >
                        Save AI settings
                    </Button>
                </section>

                {/* Subscription plans */}
                <section className="rounded-xl border bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <h2 className="text-sm font-semibold">AI subscription</h2>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Current plan: <strong>{settings.ai_plan}</strong>
                        {settings.ai_subscription_status && <> · {settings.ai_subscription_status}</>}
                        {!stripe_enabled && (
                            <> · Stripe not configured (local activation only)</>
                        )}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-3">
                        {Object.entries(plans).map(([id, plan]) => (
                            <div key={id} className="rounded-lg border p-4 flex flex-col">
                                <p className="font-semibold text-sm">{plan.name}</p>
                                <p className="text-2xl font-bold mt-1">
                                    ${plan.price_monthly}
                                    <span className="text-xs font-normal text-muted-foreground">/mo</span>
                                </p>
                                <ul className="mt-3 space-y-1 text-xs text-muted-foreground flex-1">
                                    {(plan.features || []).map((f) => (
                                        <li key={f}>• {f}</li>
                                    ))}
                                </ul>
                                {id === 'free' ? (
                                    settings.ai_plan !== 'free' ? (
                                        <Button variant="outline" className="mt-4" onClick={cancel}>
                                            Switch to free
                                        </Button>
                                    ) : (
                                        <Button variant="outline" className="mt-4" disabled>
                                            Current
                                        </Button>
                                    )
                                ) : settings.ai_plan === id ? (
                                    <Button variant="outline" className="mt-4" onClick={cancel}>
                                        Cancel
                                    </Button>
                                ) : (
                                    <Button className="mt-4" onClick={() => subscribe(id)}>
                                        {stripe_enabled ? 'Subscribe' : 'Activate'}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </>
    );
}
