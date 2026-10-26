import type { ComponentType } from 'react';

/**
 * Every Inertia page the application can render, keyed the way
 * resolvePageComponent() expects ("./pages/<name>.tsx").
 *
 * Pages live in the host (resources/js/pages) and in module packages
 * (packages/<name>/resources/js/pages). Page names are identical either way,
 * for example "clients/index". A host page overrides a package page with the
 * same name, so a project can customise a package screen without editing it.
 *
 * import.meta.glob needs literal patterns, which is why this is its own module
 * shared by the browser entry (app.tsx) and the server-rendering entry (ssr.tsx).
 */
const hostPages = import.meta.glob<ComponentType>(['../pages/**/*.tsx', '!../pages/**/*.test.tsx', '!../pages/**/__tests__/**'], { import: 'default' });

const packagePages = import.meta.glob<ComponentType>(
    ['../../../packages/*/resources/js/pages/**/*.tsx', '!../../../packages/*/resources/js/pages/**/*.test.tsx'],
    { import: 'default' },
);

export const pages: Record<string, () => Promise<ComponentType>> = {};

for (const [path, loader] of Object.entries(packagePages)) {
    pages[`./pages/${path.split('/resources/js/pages/')[1]}`] = loader as () => Promise<ComponentType>;
}

// Host pages are added last so they win over package pages of the same name.
for (const [path, loader] of Object.entries(hostPages)) {
    pages[`./pages/${path.split('/pages/')[1]}`] = loader as () => Promise<ComponentType>;
}
