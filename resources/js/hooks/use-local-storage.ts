import { useState, useEffect, useCallback } from 'react';

/**
 * Custom hook for managing state with localStorage persistence
 * 
 * @param key - The localStorage key to use
 * @param initialValue - The initial value if no stored value exists
 * @returns [storedValue, setValue] - Similar to useState
 * 
 * @example
 * const [name, setName] = useLocalStorage('user-name', 'Guest');
 */
export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((val: T) => T)) => void] {
    // State to store our value
    // Pass initial state function to useState so logic is only executed once
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }

        try {
            // Get from local storage by key
            const item = window.localStorage.getItem(key);
            // Parse stored json or if none return initialValue
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            // If error also return initialValue
            console.error(`Error loading ${key} from localStorage:`, error);
            return initialValue;
        }
    });

    // Return a wrapped version of useState's setter function that
    // persists the new value to localStorage.
    const setValue = useCallback(
        (value: T | ((val: T) => T)) => {
            try {
                // Allow value to be a function so we have same API as useState
                const valueToStore =
                    value instanceof Function ? value(storedValue) : value;
                
                // Save state
                setStoredValue(valueToStore);
                
                // Save to local storage
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (error) {
                // A more advanced implementation would handle the error case
                console.error(`Error saving ${key} to localStorage:`, error);
            }
        },
        [key, storedValue]
    );

    return [storedValue, setValue];
}

/**
 * Hook for managing multiple related localStorage items
 * 
 * @example
 * const storage = useLocalStorageManager('app');
 * storage.set('theme', 'dark');
 * const theme = storage.get('theme', 'light');
 */
export function useLocalStorageManager(namespace: string) {
    const get = useCallback(
        <T,>(key: string, defaultValue: T): T => {
            if (typeof window === 'undefined') {
                return defaultValue;
            }

            try {
                const item = window.localStorage.getItem(`${namespace}:${key}`);
                return item ? JSON.parse(item) : defaultValue;
            } catch (error) {
                console.error(`Error loading ${namespace}:${key}:`, error);
                return defaultValue;
            }
        },
        [namespace]
    );

    const set = useCallback(
        <T,>(key: string, value: T): void => {
            if (typeof window === 'undefined') {
                return;
            }

            try {
                window.localStorage.setItem(
                    `${namespace}:${key}`,
                    JSON.stringify(value)
                );
            } catch (error) {
                console.error(`Error saving ${namespace}:${key}:`, error);
            }
        },
        [namespace]
    );

    const remove = useCallback(
        (key: string): void => {
            if (typeof window === 'undefined') {
                return;
            }

            try {
                window.localStorage.removeItem(`${namespace}:${key}`);
            } catch (error) {
                console.error(`Error removing ${namespace}:${key}:`, error);
            }
        },
        [namespace]
    );

    const clear = useCallback((): void => {
        if (typeof window === 'undefined') {
            return;
        }

        try {
            const keys = Object.keys(window.localStorage);
            keys.forEach((key) => {
                if (key.startsWith(`${namespace}:`)) {
                    window.localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.error(`Error clearing ${namespace} items:`, error);
        }
    }, [namespace]);

    return {
        get,
        set,
        remove,
        clear,
    };
}

/**
 * Hook for watching localStorage changes across tabs/windows
 * 
 * @example
 * useLocalStorageSync('theme', (newValue) => {
 *   console.log('Theme changed to:', newValue);
 * });
 */
export function useLocalStorageSync<T>(
    key: string,
    callback: (value: T | null) => void
) {
    useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    const newValue = JSON.parse(e.newValue);
                    callback(newValue);
                } catch (error) {
                    console.error('Error parsing storage event:', error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
        };
    }, [key, callback]);
}