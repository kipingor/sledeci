// Global test setup for Vitest
// Polyfill window.matchMedia used by layout hooks/components
if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

    // Partial Inertia mock for tests: provides lightweight `useForm`, `usePage`, `Head`, `Link`, and `router`.
    // Tests can set `global.__TEST_PAGE_PROPS = { ... }` to control `usePage().props`.
    try {
      // `vi` is available in the Vitest environment; create a module mock so imports use the partial implementation.
      // This prevents individual tests from having to mock AppLayout or Inertia helpers.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      vi.mock('@inertiajs/react', (): any => {
        return {
          Head: ({ children }: any) => null,
          Link: (props: any) => (props.children ? props.children : null),
          usePage: () => ({ props: (global as any).__TEST_PAGE_PROPS || {} }),
          useForm: (initial: Record<string, any> = {}) => {
            // Keep mutable references so tests can observe changes via the returned object
            const _initial = { ...initial };
            let data: Record<string, any> = { ..._initial };
            let errors: Record<string, any> = {};
            let processing = false;

            const setData = (keyOrObj: string | Record<string, any>, value?: any) => {
              if (typeof keyOrObj === 'string') {
                data[keyOrObj] = value;
              } else {
                data = { ...data, ...(keyOrObj as Record<string, any>) };
              }
            };

            const setError = (key: string | Record<string, any>, value?: any) => {
              if (typeof key === 'string') {
                errors[key] = value;
              } else {
                errors = { ...errors, ...(key as Record<string, any>) };
              }
            };

            const clearErrors = (keys?: string | string[]) => {
              if (!keys) {
                errors = {};
                return;
              }
              const ks = Array.isArray(keys) ? keys : [keys];
              for (const k of ks) delete errors[k];
            };

            const reset = (fields?: string[] | Record<string, any>) => {
              if (!fields) {
                data = { ..._initial };
              } else if (Array.isArray(fields)) {
                for (const f of fields) data[f] = _initial[f] ?? '';
              } else {
                // fields as object -> set those keys
                data = { ...data, ...(fields as Record<string, any>) };
              }
              errors = {};
            };

            const transform = (fn: (d: Record<string, any>) => Record<string, any>) => {
              data = fn({ ...data });
            };

            const post = vi.fn(() => Promise.resolve({}));
            const put = vi.fn(() => Promise.resolve({}));
            const del = vi.fn(() => Promise.resolve({}));

            return {
              // reactive-ish references that tests/readers can use
              get data() {
                return data;
              },
              setData,
              post,
              put,
              delete: del,
              get processing() {
                return processing;
              },
              setProcessing: (v: boolean) => (processing = v),
              get errors() {
                return errors;
              },
              setError,
              clearErrors,
              reset,
              transform,
            };
          },
          router: {
            post: vi.fn(),
            put: vi.fn(),
            delete: vi.fn(),
            get: vi.fn(),
            visit: vi.fn(),
          },
        };
      });
    } catch (e) {
      // If `vi` is not available (non-test environments), silently ignore.
    }

// AppLayout renders GlobalSearch, which needs a React Query provider the page tests don't supply.
vi.mock('@/components/global-search', () => ({ GlobalSearch: () => null }));
