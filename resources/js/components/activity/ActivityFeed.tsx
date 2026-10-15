import { ActivityLog } from "@/types";
import { useActivityFeed } from "@/hooks/use-activity-feed";
import { useState } from "react";

export default function ActivityFeed() {
    const [feed, setFeed] = useState<ActivityLog[]>([]);

    useActivityFeed((activity) => {
        setFeed((prev) => [activity, ...prev]);
    });

    return (
        <div className="space-y-4">
            {feed.map((item) => (
                <div
                    key={item.id}
                    className="p-3 rounded-lg border bg-card shadow-sm"
                >
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                        {new Date(item.created_at).toLocaleString()}
                    </p>
                </div>
            ))}
        </div>
    );
}
