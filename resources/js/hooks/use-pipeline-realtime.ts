import { useEffect } from "react";
import { echo } from "@/lib/echo";
import { Lead } from "@/types";

export function usePipelineRealtime(onLeadMoved: (lead: Lead, from: string, to: string) => void) {
    useEffect(() => {
        if (!echo) {
            console.warn('Echo is not configured, skipping real-time updates');
            return;
        }
        
        const channel = echo.channel("pipeline");

        channel.listen(".lead.moved", (event: any) => {
            onLeadMoved(event.lead, event.fromStage, event.toStage);
        });

        return () => {
            echo.leaveChannel("pipeline");
        };
    }, [onLeadMoved]);
}
