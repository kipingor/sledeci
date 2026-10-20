// Auto-generated shims to silence TypeScript module not found errors during CI checks
declare var toast: ((opts: { title: string; description?: string; variant?: string }) => void) | undefined;

declare interface Window {
    toast?: (opts: { title: string; description?: string; variant?: string }) => void;
}

// Ziggy / route() helper (some files rely on route() being global)
declare const route: typeof import('ziggy-js').route;

// Jest / testing globals used in tests
declare function beforeAll(fn: () => void | Promise<void>): void;
declare function afterAll(fn: () => void | Promise<void>): void;
declare function beforeEach(fn: () => void | Promise<void>): void;
declare function afterEach(fn: () => void | Promise<void>): void;
declare function describe(name: string, fn: () => void): void;
declare function it(name: string, fn: () => void | Promise<void>): void;
declare function test(name: string, fn: () => void | Promise<void>): void;
declare function expect(value: any): any;
declare const vi: any;

// Allow importing non-TS assets
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';
declare module '*.css';