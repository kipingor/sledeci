import AppLayout from '@/layouts/app-layout';
import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import VendorCard from '@/pages/vendors/vendor-card';
import { Store, Plus } from 'lucide-react';

export default function VendorsIndex() {
    const { props } = usePage<any>();
    const vendors = props.vendors?.data ?? [];

    return (
        <AppLayout breadcrumbs={[{ title: 'Vendors', href: '/vendors' }]}>
            <Head title="Vendors" />
            <div className="flex flex-col h-full">
                <div className="bg-card border-b border-border">
                    <div className="flex items-center justify-between px-6 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center"><Store className="h-4 w-4 text-primary" /></div>
                            <h1 className="text-base font-bold tracking-tight">Vendors</h1>
                        </div>
                        <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90" asChild>
                            <Link href="/vendors/create"><Plus className="h-3.5 w-3.5" /> New Vendor</Link>
                        </Button>
                    </div>
                </div>
                <div className="flex-1 overflow-auto bg-background p-5 space-y-3">
                    {vendors.length === 0 && (
                        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <Store className="h-10 w-10 mb-3 opacity-20" />
                            <p>No vendors yet.</p>
                        </div>
                    )}
                    {vendors.map((v: any) => <VendorCard key={v.id} vendor={v} />)}
                </div>
            </div>
        </AppLayout>
    );
}