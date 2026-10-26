import { usePage } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import type { SharedData } from '@/types';

/**
 * Shows the server's flash messages (->with('success' | 'error', ...)) as toasts.
 * Call once per layout; the shared `flash` prop is provided by HandleInertiaRequests.
 */
export function useFlashToast(): void {
    const { flash } = usePage<SharedData>().props;

    useEffect(() => {
        if (flash?.success) {
            toast.success(flash.success);
        }
    }, [flash?.success]);

    useEffect(() => {
        if (flash?.error) {
            toast.error(flash.error);
        }
    }, [flash?.error]);
}
