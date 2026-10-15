/**
 * components/cashflow-forecast.tsx
 *
 * 30 / 60 / 90-day cash flow forecast widget for the dashboard.
 *
 * Data comes from the server via the dashboard controller.
 * The widget renders a simple bar chart using SVG so it works without
 * any chart library dependency.
 *
 * Props shape (from DashboardController):
 *   forecast: {
 *     periods: [
 *       { label: 'Next 30 days', inflows: 420000, outflows: 310000, net: 110000 },
 *       { label: 'Next 60 days', inflows: 780000, outflows: 540000, net: 240000 },
 *       { label: 'Next 90 days', inflows: 1100000, outflows: 700000, net: 400000 },
 *     ],
 *     opening_balance: 85000,
 *     currency: 'KES',
 *     overdue_receivables: 95000,
 *     overdue_payables: 40000,
 *   }
 */
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, AlertTriangle, Info } from 'lucide-react';

interface Period {
    label:    string;
    inflows:  number;
    outflows: number;
    net:      number;
}

interface ForecastData {
    periods:              Period[];
    opening_balance:      number;
    currency:             string;
    overdue_receivables:  number;
    overdue_payables:     number;
}

interface Props { forecast: ForecastData }

const fmt = (n: number, cur = 'KES') =>
    new Intl.NumberFormat('en-KE', {
        style: 'currency', currency: cur, notation: 'compact', maximumFractionDigits: 1,
    }).format(n);

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
    const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 4;
    return (
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
        </div>
    );
}

export default function CashflowForecast({ forecast }: Props) {
    const { periods, opening_balance, currency, overdue_receivables, overdue_payables } = forecast;

    // Max value for bar normalisation
    const maxValue = Math.max(...periods.flatMap(p => [p.inflows, p.outflows]));

    const projected90 = opening_balance + (periods[2]?.net ?? 0);
    const net90Positive = projected90 >= 0;

    return (
        <div className="bg-card border border-border rounded-xl overflow-hidden">
            {/* Header */}
            <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <div>
                    <p className="text-sm font-semibold">Cash Flow Forecast</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Based on outstanding invoices, scheduled expenses, and payment history
                    </p>
                </div>
                <span className={cn(
                    'text-xs font-semibold px-2 py-0.5 rounded-full',
                    net90Positive
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'
                )}>
                    {net90Positive ? '▲' : '▼'} 90-day: {fmt(projected90, currency)}
                </span>
            </div>

            <div className="p-5 space-y-5">
                {/* Opening balance */}
                <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                    <span className="text-xs text-muted-foreground">Opening Balance (today)</span>
                    <span className="text-sm font-semibold">{fmt(opening_balance, currency)}</span>
                </div>

                {/* Period bars */}
                <div className="space-y-4">
                    {periods.map((period, i) => (
                        <div key={i} className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-muted-foreground">{period.label}</p>
                                <div className="flex items-center gap-1">
                                    {period.net >= 0
                                        ? <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                                        : <TrendingDown className="h-3.5 w-3.5 text-red-500" />
                                    }
                                    <span className={cn(
                                        'text-xs font-bold',
                                        period.net >= 0 ? 'text-emerald-600' : 'text-red-600'
                                    )}>
                                        {period.net >= 0 ? '+' : ''}{fmt(period.net, currency)}
                                    </span>
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground w-14">In</span>
                                    <Bar value={period.inflows} max={maxValue} color="bg-emerald-500" />
                                    <span className="text-[10px] font-medium text-emerald-600 w-16 text-right">
                                        {fmt(period.inflows, currency)}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-muted-foreground w-14">Out</span>
                                    <Bar value={period.outflows} max={maxValue} color="bg-red-400" />
                                    <span className="text-[10px] font-medium text-red-600 w-16 text-right">
                                        {fmt(period.outflows, currency)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Alerts */}
                <div className="space-y-2">
                    {overdue_receivables > 0 && (
                        <div className="flex items-center gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded-lg dark:bg-amber-950/20 dark:border-amber-800">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                            <span className="text-xs text-amber-800 dark:text-amber-300">
                                <strong>{fmt(overdue_receivables, currency)}</strong> in overdue receivables not included in forecast
                            </span>
                        </div>
                    )}
                    {overdue_payables > 0 && (
                        <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg dark:bg-red-950/20 dark:border-red-800">
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600 shrink-0" />
                            <span className="text-xs text-red-800 dark:text-red-300">
                                <strong>{fmt(overdue_payables, currency)}</strong> in overdue payables pending
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                        <Info className="h-3 w-3 shrink-0" />
                        Inflows = outstanding invoices due in period. Outflows = recurring expenses + POs.
                    </div>
                </div>
            </div>
        </div>
    );
}
