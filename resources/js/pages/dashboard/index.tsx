import { Head } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import { Dashboard } from '@/components/dashboard';
import { LayoutGrid } from 'lucide-react';
import { type BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [{ title: 'Dashboard', href: '/dashboard' }];

export default function DashboardPage() {
    return (
        <>
            <Head title="Dashboard" />
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="flex flex-col h-full">

                    {/* ── SF-style record header ── */}
                    <div className="bg-card border-b border-border">
                        <div className="flex items-center gap-3 px-6 py-3.5">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                                <LayoutGrid className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold tracking-tight">Dashboard</h1>
                                <p className="text-xs text-muted-foreground">Pipeline overview &amp; key metrics</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto p-6">
                        <Dashboard />
                    </div>
                </div>
            </AppLayout>
        </>
    );
}