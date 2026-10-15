import { useEffect } from 'react';
import { echo } from '@/lib/echo';

export function useLeadDocumentsRealtime(leadId: number | string, onUpdate: (payload: any) => void) {
    useEffect(() => {
        if (!leadId || !echo) {
            if (!echo) console.warn('Echo is not configured, skipping real-time updates');
            return;
        }

        const channel = (echo as any).private(`leads.${leadId}`);

        channel.listen('.lead.document.processed', (event: any) => {
            onUpdate(event);
        });

        return () => {
            try {
                (echo as any).leaveChannel(`private:leads.${leadId}`);
            } catch (e) {
                // ignore
            }
        };
    }, [leadId, onUpdate]);
}
