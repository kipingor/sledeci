import { createInertiaApp } from '@inertiajs/react';
import createServer from '@inertiajs/react/server';
import ReactDOMServer from 'react-dom/server';
import {
    getInertiaLayout,
    inertiaPageTitle,
    resolveInertiaPage,
} from '@/lib/inertia-config';
import { wrapInertiaApp } from '@/lib/inertia-app-wrapper';

createServer((page) =>
    createInertiaApp({
        page,
        render: ReactDOMServer.renderToString,
        title: inertiaPageTitle,
        resolve: resolveInertiaPage,
        layout: getInertiaLayout,
        setup: ({ App, props }) => wrapInertiaApp(<App {...props} />),
    }),
);
