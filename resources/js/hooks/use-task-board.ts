import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/axios";
import { Task } from "@/types";

export function useUpdateTask() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (task: Partial<Task>) => {
            const { data } = await api.put(`/api/tasks/${task.id}`, task);
            return data;
        },
        onMutate: async (task) => {
            await queryClient.cancelQueries({ queryKey: ["tasks"] });
            const previousTasks = queryClient.getQueryData<Task[]>(["tasks"]);

            queryClient.setQueryData<Task[]>(["tasks"], (old = []) =>
                old.map((t) => (t.id === task.id ? { ...t, ...task } : t))
            );

            return { previousTasks };
        },
        onError: (_err, _vars, context) => {
            if (context?.previousTasks) {
                queryClient.setQueryData(["tasks"], context.previousTasks);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
        },
    });
}
