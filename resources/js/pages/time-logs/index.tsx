import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import TimeLogCard, { formatMinutes, type TimeLogItem } from '@/pages/time-logs/time-log-card';
import { Button } from '@/components/ui/button';
import { type BreadcrumbItem } from '@/types';
import { Clock, Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Time Logs', href: '/time-logs' }];

export default function TimeLogsIndex() {
    const { props } = usePage<any>();
    // The controller sends `logs` (paginator) and `totals` (minutes for today / this week)
    const logs: TimeLogItem[] = props.logs?.data ?? [];
    const totals: { today: number; week: number } = props.totals ?? { today: 0, week: 0 };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Time Logs" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center"><Clock className="h-4 w-4 text-primary" /></div>
                            <h1 className="text-base font-bold tracking-tight">Time Logs</h1>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/time-logs/create"><Plus className="h-3.5 w-3.5" /> Log Time</Link>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-5 space-y-3">
                    <div className="flex gap-6 text-sm text-muted-foreground">
                        <span>Today: <strong className="text-foreground">{formatMinutes(totals.today)}</strong></span>
                        <span>This week: <strong className="text-foreground">{formatMinutes(totals.week)}</strong></span>
                    </div>
                    {logs.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Clock className="h-10 w-10 mb-3 opacity-20" />
                            <p>No time logs yet.</p>
                        </div>
                    )}
                    {logs.map((l) => <TimeLogCard key={l.id} log={l} />)}
                </div>
            </div>
        </AppLayout>
    );
}