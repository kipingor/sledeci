/**
 * components/offline-banner.tsx
 *
 * Persistent top-of-screen banner that:
 *  1. Shows "Offline mode" when the device has no internet
 *  2. Shows sync progress when coming back online
 *  3. Shows a count of queued actions so users know their work is safe
 *
 * Add to AppLayout:
 *   import OfflineBanner from '@/components/offline-banner';
 *   // at the top of your layout, above the main content:
 *   <OfflineBanner />
 */
import { useOfflineQueue } from '@/hooks/use-offline-queue';
import { cn } from '@/lib/utils';
import { WifiOff, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export default function OfflineBanner() {
    const { isOnline, queuedCount, syncing, syncQueue } = useOfflineQueue();
    const [justCameOnline, setJustCameOnline] = useState(false);

    useEffect(() => {
        if (isOnline && queuedCount > 0) {
            setJustCameOnline(true);
            syncQueue().then(() => {
                setTimeout(() => setJustCameOnline(false), 3000);
            });
        }
    }, [isOnline]);

    // Don't show anything when online with nothing to sync
    if (isOnline && !syncing && !justCameOnline && queuedCount === 0) {
        return null;
    }

    return (
        <div className={cn(
            'w-full px-4 py-2 text-xs font-medium flex items-center gap-2 transition-all',
            !isOnline
                ? 'bg-amber-500 text-white'
                : syncing
                ? 'bg-blue-600 text-white'
                : 'bg-emerald-600 text-white'
        )}>
            {!isOnline ? (
                <>
                    <WifiOff className="h-3.5 w-3.5 shrink-0" />
                    <span>
                        You're offline. Actions are being saved locally
                        {queuedCount > 0 ? ` (${queuedCount} queued)` : ''} and will sync when reconnected.
                    </span>
                </>
            ) : syncing ? (
                <>
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
                    <span>Back online — syncing {queuedCount} queued action{queuedCount !== 1 ? 's' : ''}…</span>
                </>
            ) : (
                <>
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    <span>All offline actions synced successfully.</span>
                </>
            )}
        </div>
    );
}
