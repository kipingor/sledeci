declare module '@inertiajs/inertia' {
    export * from '@inertiajs/inertia/dist/index';
}

declare module '@inertiajs/inertia-react' {
    import * as React from 'react';

    export const Head: React.FC<any>;
    export const Link: React.FC<any>;
    export function usePage<T = any>(): { props: T };
    export default {} as any;
}
