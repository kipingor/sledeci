import { useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { echo } from "@/lib/echo";
import { Task } from "@/types";

const EMPTY_TASKS: Task[] = [];

export function useTasks(projectId?: number | string) {
    const queryClient = useQueryClient();
    const projectIdNum = projectId ? Number(projectId) : undefined;

    /** ──────── Fetch tasks ──────── **/
    const {
        data,
        isLoading,
        isError,
        refetch,
    } = useQuery<Task[]>({        
        queryKey: ["tasks", projectIdNum],
        queryFn: async () => {
            if (!projectIdNum) return [];
            try {
                const response = await api.get(`/projects/${projectIdNum}/tasks`);
                return response.data.data || response.data;
            } catch (err: any) {
                if (err?.response?.status === 404) return [];
                throw err;
            }
        },
        enabled: !!projectIdNum,
        retry: false,
        refetchOnWindowFocus: false,
    });

    const tasks = data ?? EMPTY_TASKS;

    /** ──────── Update status (Optimistic UI) ──────── **/
    const updateTaskStatus = useMutation({
        mutationFn: async ({ taskId, newStatus }: { taskId: number; newStatus: string }) => {
            await api.put(`/tasks/${taskId}`, { status: newStatus });
        },
        onMutate: async ({ taskId, newStatus }: { taskId: number; newStatus: string }) => {
            await queryClient.cancelQueries({ queryKey: ["tasks", projectIdNum] });
            const previousTasks = queryClient.getQueryData<Task[]>(["tasks", projectIdNum]);
            queryClient.setQueryData<Task[]>(["tasks", projectIdNum], (old = []) =>
                (old as Task[]).map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
            );
            return { previousTasks };
        },
        onError: (_err: unknown, _variables: unknown, context: { previousTasks?: Task[] } | undefined) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(["tasks", projectIdNum], context.previousTasks);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", projectIdNum] });
        },
    });

    /** ──────── Real-time Echo updates ──────── **/
    useEffect(() => {
        if (!(echo as any) || typeof (echo as any).channel !== 'function') return;
        if (!projectIdNum) return; 

        const channel = (echo as any).channel(`projects.${projectIdNum}.tasks`);

        const onCreated = (task: Task) => {
            queryClient.setQueryData<Task[]>(["tasks", projectIdNum], (old = []) => [task, ...old]);
        };
        const onUpdated = (updated: Task) => {
            queryClient.setQueryData<Task[]>(["tasks", projectIdNum], (old = []) =>
                (old as Task[]).map((t) => (t.id === updated.id ? updated : t))
            );
        };
        const onDeleted = (deleted: Task) => {
            queryClient.setQueryData<Task[]>(["tasks", projectIdNum], (old = []) =>
                (old as Task[]).filter((t) => t.id !== deleted.id)
            );
        };

        channel.listen(".task.created", onCreated);
        channel.listen(".task.updated", onUpdated);
        channel.listen(".task.deleted", onDeleted);

        return () => {
            try {
                channel.stopListening(".task.created");
                channel.stopListening(".task.updated");
                channel.stopListening(".task.deleted");
            } catch (_) {
                // ignore any errors during cleanup
            }
        };
    }, [projectIdNum, queryClient]);

    return {
        tasks,
        loading: isLoading,
        error: isError,
        updateTaskStatus: updateTaskStatus.mutateAsync,
        refetch,
    };
}