import { useEffect } from "react";
import { echo } from "@/lib/echo";
import { Task } from "@/types";

export function useTaskRealtime(onTaskUpdated: (task: Task) => void) {
  useEffect(() => {
    const echoClient = echo;
    if (!echoClient) {
      console.warn('Echo is not configured, skipping real-time updates');
      return;
    }
    
    const channel = echoClient.channel("tasks");

    channel.listen(".task.updated", (event: any) => {
      onTaskUpdated(event.task);
    });

    return () => {
      echoClient.leaveChannel("tasks");
    };
  }, [onTaskUpdated]);
}
