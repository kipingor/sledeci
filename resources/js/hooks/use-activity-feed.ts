import { useEffect } from "react";
import { echo } from "@/lib/echo";
import { ActivityLog } from "@/types";

export function useActivityFeed(onNewActivity: (activity: ActivityLog) => void) {
    useEffect(() => {
        if (!echo) return; // Safety check

        const channel = echo.channel("activity");

        channel.listen(".activity.created", (payload: any) => {
            onNewActivity(payload);
        });

        return () => echo.leaveChannel("activity");
    }, [onNewActivity]);
}
