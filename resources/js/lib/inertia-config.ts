import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import type { ComponentType } from 'react';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';
import { pages } from '@/lib/pages';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

export const resolveInertiaPage = (name: string) =>
    resolvePageComponent<ComponentType>(`./pages/${name}.tsx`, pages);

export const inertiaPageTitle = (title: string) =>
    title ? `${title} - ${appName}` : appName;

export function getInertiaLayout(name: string) {
    // Most authenticated pages render AppLayout themselves; these settings pages do not.
    switch (true) {
        case name === 'welcome' ||
            name.startsWith('site/') ||
            name.startsWith('careers/'):
            return null;
        case name.startsWith('auth/'):
            return AuthLayout;
        case name === 'settings/company' || name === 'settings/ai':
            return [AppLayout, SettingsLayout];
        case name.startsWith('settings/'):
            return null;
        default:
            return null;
    }
}
