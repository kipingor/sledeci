import { useState, useEffect } from 'react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import CashflowForecast from '@/components/cashflow-forecast';
import {
    Globe, Smartphone, AlertTriangle, RefreshCw, TrendingUp, TrendingDown,
} from 'lucide-react';

interface ForecastPeriod { label: string; inflows: number; outflows: number; net: number }
interface ForecastData {
    periods: ForecastPeriod[];
    opening_balance: number;
    currency: string;
    overdue_receivables: number;
    overdue_payables: number;
    collection_rate_pct: number;
}
interface CurrencyExposure { currency: string; total: number; rate: number; converted: number; functional: string }
interface MultiCurrency { functional_currency: string; total: number; by_currency: CurrencyExposure[] }
interface ChannelStat { channel: string; count: number; total: number }
interface MobileMoneyData { by_channel: ChannelStat[]; unmatched_count: number; period_days: number }

interface FinancialPulseData {
    forecast: ForecastData;
    multi_currency: MultiCurrency;
    mobile_money: MobileMoneyData;
    functional_currency: string;
}

const CHANNEL_LABELS: Record<string, { label: string; icon: string; color: string }> = {
    mpesa:        { label: 'M-Pesa',       icon: '📱', color: 'text-emerald-600' },
    airtel_money: { label: 'Airtel Money', icon: '📱', color: 'text-red-600' },
    mtn_momo:     { label: 'MTN MoMo',     icon: '📱', color: 'text-amber-600' },
};

const CURRENCY_FLAGS: Record<string, string> = {
    KES: '🇰🇪', UGX: '🇺🇬', TZS: '🇹🇿', USD: '🇺🇸', EUR: '🇪🇺', GBP: '🇬🇧',
    GHS: '🇬🇭', NGN: '🇳🇬', ZAR: '🇿🇦', RWF: '🇷🇼',
};

const fmt = (n: number, c = 'KES') =>
    new Intl.NumberFormat('en-KE', { style: 'currency', currency: c, notation: 'compact', maximumFractionDigits: 1 }).format(n);

export function FinancialPulse() {
    const [data, setData] = useState<FinancialPulseData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    async function load() {
        setLoading(true);
        setError(false);
        try {
            const res = await axios.get('/api/v1/dashboard/financial-pulse');
            if (res.data.success) setData(res.data.data);
            else setError(true);
        } catch {
            setError(true);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { load(); }, []);

    if (loading) {
        return (
            <div className="bg-card border border-border rounded-xl p-8 flex items-center justify-center">
                <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="bg-card border border-border rounded-xl p-5 text-center text-sm text-muted-foreground">
                Unable to load financial data.{' '}
                <button onClick={load} className="text-primary hover:underline">Retry</button>
            </div>
        );
    }

    const { forecast, multi_currency, mobile_money, functional_currency } = data;
    const foreignExposure = multi_currency.by_currency.filter(c => c.currency !== functional_currency);
    const last30MobileTotal = mobile_money.by_channel.reduce((s, c) => s + c.total, 0);

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                    Financial Pulse
                </h2>
                <button onClick={load} className="text-muted-foreground hover:text-foreground transition-colors">
                    <RefreshCw className="h-3.5 w-3.5" />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Cash flow forecast — spans 2 cols */}
                <div className="lg:col-span-2">
                    <CashflowForecast forecast={forecast} />
                </div>

                {/* Right column: forex exposure + mobile money */}
                <div className="space-y-4">

                    {/* Multi-currency exposure */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                            <Globe className="h-4 w-4 text-blue-500" />
                            <p className="text-sm font-semibold">Currency Exposure</p>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between p-2.5 bg-muted/30 rounded-lg">
                                <span className="text-xs text-muted-foreground">Total (in {functional_currency})</span>
                                <span className="text-sm font-bold">{fmt(multi_currency.total, functional_currency)}</span>
                            </div>
                            {foreignExposure.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">
                                    All invoices in {functional_currency} — no FX exposure
                                </p>
                            ) : (
                                foreignExposure.map(c => (
                                    <div key={c.currency} className="flex items-center justify-between text-xs">
                                        <span className="flex items-center gap-1.5">
                                            <span>{CURRENCY_FLAGS[c.currency] ?? '🌍'}</span>
                                            {c.currency}
                                        </span>
                                        <div className="text-right">
                                            <span className="font-medium">{fmt(c.total, c.currency)}</span>
                                            <span className="text-muted-foreground ml-1.5">
                                                ≈ {fmt(c.converted, functional_currency)}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Mobile money collections */}
                    <div className="bg-card border border-border rounded-xl overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-border flex items-center gap-2">
                            <Smartphone className="h-4 w-4 text-emerald-500" />
                            <p className="text-sm font-semibold">Mobile Money (30d)</p>
                        </div>
                        <div className="p-5 space-y-3">
                            <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg dark:bg-emerald-950/20">
                                <span className="text-xs text-emerald-700 dark:text-emerald-400">Total collected</span>
                                <span className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
                                    {fmt(last30MobileTotal, functional_currency)}
                                </span>
                            </div>
                            {mobile_money.by_channel.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-2">No mobile money payments yet</p>
                            ) : (
                                mobile_money.by_channel.map(ch => {
                                    const cfg = CHANNEL_LABELS[ch.channel] ?? { label: ch.channel, icon: '📱', color: 'text-muted-foreground' };
                                    return (
                                        <div key={ch.channel} className="flex items-center justify-between text-xs">
                                            <span className="flex items-center gap-1.5">
                                                {cfg.icon} {cfg.label}
                                                <span className="text-muted-foreground">({ch.count})</span>
                                            </span>
                                            <span className={cn('font-medium', cfg.color)}>
                                                {fmt(ch.total, functional_currency)}
                                            </span>
                                        </div>
                                    );
                                })
                            )}

                            {mobile_money.unmatched_count > 0 && (
                                <a href="/payments?reconciliation_status=unmatched"
                                    className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800 hover:bg-amber-100 transition-colors">
                                    <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                                    <span className="text-xs text-amber-800 dark:text-amber-300">
                                        <strong>{mobile_money.unmatched_count}</strong> unmatched payment{mobile_money.unmatched_count !== 1 ? 's' : ''} — review now
                                    </span>
                                </a>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
