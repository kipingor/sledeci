import React from 'react';
import AppLayout from '@/layouts/app-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { Link, usePage } from '@inertiajs/react';
import { type BreadcrumbItem } from '@/types';
import { index } from '@/routes/settings';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function SettingsIndex() {
    const breadcrumbs: BreadcrumbItem[] = [{ title: 'Settings', href: index().url }];
    const { sections } = usePage<{ sections: Array<{ title: string; href: string; description: string }> }>().props;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <SettingsLayout>
                <div className="space-y-5">
                    <div className="pb-4 border-b border-border">
                        <h1 className="text-sm font-bold uppercase tracking-wider">Settings</h1>
                        <p className="text-xs text-muted-foreground mt-0.5">Manage your account and workspace preferences</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {sections.map((section) => (
                            <Link key={section.title} href={section.href}
                                className="group flex items-center gap-3 p-4 bg-card border border-border rounded-lg hover:border-primary/40 hover:shadow-sm transition-all">
                                <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm group-hover:text-primary transition-colors">{section.title}</p>
                                    <p className="text-xs text-muted-foreground mt-0.5 truncate">{section.description}</p>
                                </div>
                                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 shrink-0 group-hover:text-primary transition-colors" />
                            </Link>
                        ))}
                    </div>
                </div>
            </SettingsLayout>
        </AppLayout>
    );
}