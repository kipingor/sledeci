import { useEffect, useState } from 'react';
import { useTasks as useTasksNamed } from './use-tasks';
import type { Task as TaskType } from '@/types/task';

function groupByStatus(tasks: TaskType[] = []) {
    const map: Record<string, TaskType[]> = {};
    for (const t of tasks) {
        const status = (t as any).status ?? 'todo';
        if (!map[status]) map[status] = [];
        map[status].push(t);
    }
    return map;
}

export default function useTasks(projectId?: number | string) {
    const { tasks, loading, error, updateTaskStatus, refetch } = useTasksNamed(projectId as any);

    const [tasksByStatus, setTasksByStatus] = useState<Record<string, TaskType[]>>(groupByStatus(tasks ?? []));

    useEffect(() => {
        setTasksByStatus(groupByStatus(tasks ?? []));
    }, [tasks]);

    return {
        tasksByStatus,
        loading,
        error,
        setTasksByStatus,
        refetch,
        updateTaskStatus,
    };
}
