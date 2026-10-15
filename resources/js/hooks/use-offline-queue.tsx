/**
 * hooks/use-offline-queue.ts
 *
 * Service-worker-backed offline queue hook.
 *
 * When the browser is offline, any action (record payment, create invoice,
 * create expense) is saved to IndexedDB and replayed when connectivity is
 * restored. A visual indicator is shown while actions are queued.
 *
 * Usage:
 *   const { isOnline, queuedCount, enqueue } = useOfflineQueue();
 *
 *   // Instead of router.post('/invoices', data):
 *   enqueue('create_invoice', data, '/invoices');
 */
import { useState, useEffect, useCallback } from 'react';

// ── IndexedDB helpers ─────────────────────────────────────────────────────────

const DB_NAME    = 'lma_offline_queue';
const DB_VERSION = 1;
const STORE_NAME = 'actions';

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = e => {
            const db    = (e.target as IDBOpenDBRequest).result;
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
            store.createIndex('status', 'status');
        };
        req.onsuccess = e => resolve((e.target as IDBOpenDBRequest).result);
        req.onerror   = () => reject(req.error);
    });
}

async function dbPut(record: OfflineAction): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(record);
        tx.oncomplete = () => resolve();
        tx.onerror    = () => reject(tx.error);
    });
}

async function dbGetPending(): Promise<OfflineAction[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx      = db.transaction(STORE_NAME, 'readonly');
        const store   = tx.objectStore(STORE_NAME);
        const index   = store.index('status');
        const req     = index.getAll('pending');
        req.onsuccess = () => resolve(req.result ?? []);
        req.onerror   = () => reject(req.error);
    });
}

async function dbMarkDone(id: number): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
        const tx    = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req   = store.get(id);
        req.onsuccess = () => {
            const record = req.result;
            if (record) {
                record.status = 'applied';
                store.put(record);
            }
            resolve();
        };
        req.onerror = () => reject(req.error);
    });
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OfflineAction {
    id?: number;
    idempotency_key: string;
    action: string;
    payload: Record<string, unknown>;
    url: string;
    method: 'POST' | 'PATCH' | 'PUT' | 'DELETE';
    status: 'pending' | 'syncing' | 'applied' | 'failed';
    created_at: string;
    error?: string;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineQueue() {
    const [isOnline,    setIsOnline]    = useState(() =>
        typeof navigator !== 'undefined' ? navigator.onLine : true
    );
    const [queuedCount, setQueuedCount] = useState(0);
    const [syncing,     setSyncing]     = useState(false);

    // Refresh queued count
    async function refreshCount() {
        const pending = await dbGetPending();
        setQueuedCount(pending.length);
    }

    // Listen for online/offline events
    useEffect(() => {
        const handleOnline  = () => { setIsOnline(true);  syncQueue(); };
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online',  handleOnline);
        window.addEventListener('offline', handleOffline);
        refreshCount();

        return () => {
            window.removeEventListener('online',  handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    /**
     * Enqueue an action. If online, execute immediately.
     * If offline, store in IndexedDB and show a toast.
     */
    const enqueue = useCallback(async (
        action: string,
        payload: Record<string, unknown>,
        url: string,
        method: OfflineAction['method'] = 'POST',
    ): Promise<{ queued: boolean }> => {
        const key = `${action}_${Date.now()}_${Math.random().toString(36).slice(2)}`;

        if (navigator.onLine) {
            // Execute immediately — standard fetch
            const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';
            await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': csrf },
                body: JSON.stringify(payload),
            });
            return { queued: false };
        }

        // Store for later
        const record: OfflineAction = {
            idempotency_key: key,
            action,
            payload,
            url,
            method,
            status: 'pending',
            created_at: new Date().toISOString(),
        };

        await dbPut(record);
        await refreshCount();
        return { queued: true };
    }, []);

    /**
     * Replay all pending actions against the server.
     * Called automatically when coming back online.
     */
    const syncQueue = useCallback(async () => {
        const pending = await dbGetPending();
        if (pending.length === 0) return;

        setSyncing(true);
        const csrf = (document.querySelector('meta[name="csrf-token"]') as HTMLMetaElement)?.content ?? '';

        for (const action of pending) {
            try {
                const res = await fetch(action.url, {
                    method: action.method,
                    headers: {
                        'Content-Type':  'application/json',
                        'X-CSRF-TOKEN':  csrf,
                        'X-Idempotency-Key': action.idempotency_key,
                    },
                    body: JSON.stringify(action.payload),
                });

                if (res.ok || res.status === 409 /* already processed */) {
                    await dbMarkDone(action.id!);
                }
            } catch {
                // Leave as pending for next sync
            }
        }

        setSyncing(false);
        await refreshCount();
    }, []);

    return {
        isOnline,
        queuedCount,
        syncing,
        enqueue,
        syncQueue,
    };
}
