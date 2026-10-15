import { Clock } from 'lucide-react';

export interface TimeLogItem {
    id: number;
    started_at: string;
    ended_at?: string | null;
    duration_minutes?: number | null;
    hours?: number | string | null;
    notes?: string | null;
    user?: { id: number; name: string } | null;
    project?: { id: number; name: string } | null;
    task?: { id: number; title: string } | null;
}

export function formatMinutes(total: number | null | undefined): string {
    const m = Math.max(0, Math.round(Number(total ?? 0)));
    const h = Math.floor(m / 60);
    const r = m % 60;
    return h > 0 ? `${h}h ${r.toString().padStart(2, '0')}m` : `${r}m`;
}

export default function TimeLogCard({ log }: { log: TimeLogItem }) {
    const started = new Date(log.started_at);
    return (
        <div className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4">
            <div className="min-w-0 space-y-0.5">
                <div className="truncate text-sm font-medium">{log.task?.title ?? 'Untitled task'}</div>
                <div className="truncate text-xs text-muted-foreground">
                    {[log.project?.name, log.user?.name].filter(Boolean).join(' · ') || '—'}
                </div>
                {log.notes && <p className="pt-1 text-sm text-muted-foreground">{log.notes}</p>}
            </div>
            <div className="shrink-0 text-right">
                <div className="flex items-center justify-end gap-1.5 text-sm font-semibold">
                    <Clock className="h-3.5 w-3.5 text-primary" />
                    {formatMinutes(log.duration_minutes)}
                </div>
                <div className="text-xs text-muted-foreground">{isNaN(started.getTime()) ? '' : started.toLocaleDateString()}</div>
            </div>
        </div>
    );
}
