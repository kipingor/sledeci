/**
 * components/currency-converter.tsx
 *
 * Drop-in multi-currency selector + live converter widget.
 * Used on invoice create/edit forms and the dashboard.
 *
 * Props:
 *   value       — currently selected currency code
 *   onChange    — called with new currency code
 *   amount      — optional amount to convert (shows conversion hint)
 *   forexRates  — { USD: 135.4, EUR: 147.2, ... } (base = KES)
 *   functionalCurrency — company functional currency (default 'KES')
 *   showConverter — whether to show the conversion hint below the select
 */
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Globe, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';

const CURRENCY_FLAGS: Record<string, string> = {
    KES: '🇰🇪', UGX: '🇺🇬', TZS: '🇹🇿', RWF: '🇷🇼',
    ETB: '🇪🇹', GHS: '🇬🇭', NGN: '🇳🇬', ZAR: '🇿🇦',
    EGP: '🇪🇬', MAD: '🇲🇦', XOF: '🌍', XAF: '🌍',
    USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧',
    AED: '🇦🇪', CNY: '🇨🇳',
};

const CURRENCY_NAMES: Record<string, string> = {
    KES: 'Kenyan Shilling',   UGX: 'Ugandan Shilling',  TZS: 'Tanzanian Shilling',
    RWF: 'Rwandan Franc',     ETB: 'Ethiopian Birr',    GHS: 'Ghanaian Cedi',
    NGN: 'Nigerian Naira',    ZAR: 'South African Rand',EGP: 'Egyptian Pound',
    MAD: 'Moroccan Dirham',   XOF: 'West African CFA',  XAF: 'Central African CFA',
    USD: 'US Dollar',         EUR: 'Euro',               GBP: 'British Pound',
    AED: 'UAE Dirham',        CNY: 'Chinese Yuan',
};

interface Props {
    value: string;
    onChange: (currency: string) => void;
    amount?: number;
    forexRates?: Record<string, number | null>;
    functionalCurrency?: string;
    showConverter?: boolean;
    className?: string;
    disabled?: boolean;
}

export default function CurrencyConverter({
    value,
    onChange,
    amount = 0,
    forexRates = {},
    functionalCurrency = 'KES',
    showConverter = true,
    className,
    disabled,
}: Props) {
    const [liveRates, setLiveRates]   = useState<Record<string, number>>(
        Object.fromEntries(Object.entries(forexRates).filter(([, v]) => v !== null)) as Record<string, number>
    );
    const [fetching,  setFetching]    = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const currencies = Object.keys({ ...CURRENCY_NAMES, ...forexRates });

    // Rate from selected currency → functional currency
    const rate = value === functionalCurrency
        ? 1
        : (liveRates[value] ?? null);

    const convertedAmount = rate !== null && amount > 0
        ? amount * rate
        : null;

    // Refresh rates from the server
    async function refreshRates() {
        setFetching(true);
        try {
            const res  = await fetch(`/invoices/forex-rates?base=${functionalCurrency}`);
            const data = await res.json();
            if (data.rates) {
                setLiveRates(data.rates);
                setLastUpdate(new Date());
            }
        } catch { /* silently ignore — use stale rates */ }
        finally { setFetching(false); }
    }

    const fmt = (n: number, cur: string) =>
        new Intl.NumberFormat('en-KE', {
            style: 'currency', currency: cur,
            maximumFractionDigits: 2,
        }).format(n);

    return (
        <div className={cn('space-y-1.5', className)}>
            {/* Currency select */}
            <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-base pointer-events-none select-none">
                    {CURRENCY_FLAGS[value] ?? <Globe className="h-4 w-4 text-muted-foreground" />}
                </div>
                <select
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    disabled={disabled}
                    className={cn(
                        'flex h-9 w-full rounded-md border border-input bg-background pl-9 pr-9 text-sm',
                        'focus:outline-none focus:ring-1 focus:ring-ring',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                    )}
                >
                    {currencies.map(cur => (
                        <option key={cur} value={cur}>
                            {cur} — {CURRENCY_NAMES[cur] ?? cur}
                        </option>
                    ))}
                </select>
                {/* Refresh button */}
                <button
                    type="button"
                    onClick={refreshRates}
                    disabled={fetching}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    title="Refresh live rates"
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', fetching && 'animate-spin')} />
                </button>
            </div>

            {/* Conversion hint */}
            {showConverter && value !== functionalCurrency && (
                <div className={cn(
                    'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs',
                    rate !== null
                        ? 'bg-blue-50 text-blue-700 border border-blue-200 dark:bg-blue-950/20 dark:border-blue-800 dark:text-blue-300'
                        : 'bg-muted text-muted-foreground'
                )}>
                    <Globe className="h-3 w-3 shrink-0" />
                    {rate !== null ? (
                        <span>
                            1 {value} = <strong>{rate.toFixed(4)}</strong> {functionalCurrency}
                            {convertedAmount !== null && amount > 0 && (
                                <> · <strong>{fmt(convertedAmount, functionalCurrency)}</strong></>
                            )}
                        </span>
                    ) : (
                        <span>Rate not available — <button type="button" onClick={refreshRates} className="underline">refresh</button></span>
                    )}
                    {lastUpdate && (
                        <span className="ml-auto opacity-60">
                            {lastUpdate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}
