import { useEffect } from "react";
import { echo } from "@/lib/echo";
import { ActivityLog } from "@/types";

export function useActivityFeed(onNewActivity: (activity: ActivityLog) => void) {
    useEffect(() => {
        const echoClient = echo;
        if (!echoClient) return;

        const channel = echoClient.channel("activity");

        channel.listen(".activity.created", (payload: any) => {
            onNewActivity(payload);
        });

        return () => echoClient.leaveChannel("activity");
    }, [onNewActivity]);
}
