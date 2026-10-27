import { createInertiaApp } from '@inertiajs/react';
import { initializeTheme } from '@/hooks/use-appearance';
import {
    getInertiaLayout,
    inertiaPageTitle,
    resolveInertiaPage,
} from '@/lib/inertia-config';
import { wrapInertiaApp } from '@/lib/inertia-app-wrapper';

void createInertiaApp({
    resolve: resolveInertiaPage,
    title: inertiaPageTitle,
    layout: getInertiaLayout,
    strictMode: true,
    withApp: wrapInertiaApp,
    progress: {
        color: '#4B5563',
    },
});

// This will set light / dark mode on load...
initializeTheme();
