import { useEffect } from "react";
import { echo } from "@/lib/echo";
import { useQueryClient } from "@tanstack/react-query";
import { Lead } from "@/types";

export function useLeads() {
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!echo) {
            console.warn('Echo is not configured, skipping real-time updates');
            return;
        }
        
        const channel = echo.channel("leads");

        channel.listen(".lead.created", (lead: Lead) => {
            queryClient.setQueryData(["leads"], (old: Lead[] = []) => [lead, ...old]);
        });

        channel.listen(".lead.updated", (updated: Lead) => {
            queryClient.setQueryData(["leads"], (old: Lead[] = []) =>
                old.map((l) => (l.id === updated.id ? updated : l))
            );
        });

        channel.listen(".lead.deleted", (deleted: Lead) => {
            queryClient.setQueryData(["leads"], (old: Lead[] = []) =>
                old.filter((l) => l.id !== deleted.id)
            );
        });

        return () => {
            channel.stopListening(".lead.created");
            channel.stopListening(".lead.updated");
            channel.stopListening(".lead.deleted");
        };
    }, [queryClient]);
}

// Default export for compatibility
export default useLeads;