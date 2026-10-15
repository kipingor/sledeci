import { useMemo, useState } from "react";
import {
    GanttProvider,
    GanttSidebar,
    GanttSidebarGroup,
    GanttSidebarItem,
    GanttTimeline,
    GanttHeader,
    GanttFeatureList,
    GanttFeatureListGroup,
    GanttFeatureItem,
    GanttMarker,
    GanttToday,
    GanttCreateMarkerTrigger,
} from "@/components/ui/shadcn-io/gantt/index";
import type {
    GanttFeature,
    GanttStatus,
} from "@/components/ui/shadcn-io/gantt/index";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";

import { EyeIcon, LinkIcon, TrashIcon } from "lucide-react";
import { addDays } from "date-fns";

// Define types for better type safety and to fix implicit any errors
type User = {
    name?: string;
    avatar?: string;
};

type Task = {
    id: string;
    group?: string;
    title?: string;
    name?: string;
    assigned_to?: User;
    startAt?: Date;
    endAt?: Date;
    status?: GanttStatus | string | null;
    [key: string]: any;
};

type NormalizedTask = Task & GanttFeature;

type Project = {
    tasks?: Task[];
};

const DEFAULT_STATUS: GanttStatus = {
    id: "status-default",
    name: "Planned",
    color: "#0ea5e9",
};

function groupByKey<T>(arr: T[], key: keyof T) {
    return arr.reduce<Record<string, T[]>>((acc, item) => {
        const value = String(item[key] ?? "");
        if (!acc[value]) acc[value] = [];
        acc[value].push(item);
        return acc;
    }, {});
}

const isGanttStatus = (status: unknown): status is GanttStatus => {
    if (!status || typeof status !== "object") return false;
    return "id" in status && "name" in status && "color" in status;
};

const normalizeStatus = (task: Task): GanttStatus => {
    const statusLabel =
        typeof task.status === "string" && task.status.trim().length
            ? task.status
            : task.name ?? task.title ?? DEFAULT_STATUS.name;

    if (isGanttStatus(task.status)) {
        return task.status;
    }

    return {
        ...DEFAULT_STATUS,
        id: `${DEFAULT_STATUS.id}-${task.id}`,
        name: statusLabel,
    };
};

const normalizeTask = (task: Task): NormalizedTask => {
    const startAt = task.startAt ? new Date(task.startAt) : new Date();
    const endAt = task.endAt ? new Date(task.endAt) : addDays(startAt, 1);

    return {
        ...task,
        name: task.name ?? task.title ?? "Untitled task",
        startAt,
        endAt,
        status: normalizeStatus(task),
    };
};

export default function Gantt({ project }: { project: Project }) {
    const initialTasks: Task[] = project.tasks ?? [];

    // Group tasks by category (e.g., project phase, team, etc.)
    const [features, setFeatures] = useState<Task[]>(initialTasks);
    const normalizedTasks = useMemo(
        () => features.map(normalizeTask),
        [features]
    );

    const groupedTasks = groupByKey(normalizedTasks, "group");
    const sortedGroups: Record<string, NormalizedTask[]> = Object.fromEntries(
        Object.entries(groupedTasks).sort(([a], [b]) => a.localeCompare(b))
    );

    const handleViewTask = (id: string) => console.log(`View task: ${id}`);
    const handleCopyLink = (id: string) => console.log(`Copy link: ${id}`);
    const handleRemoveTask = (id: string) =>
        setFeatures((prev: Task[]) => prev.filter((t: Task) => t.id !== id));
    const handleMoveTask = (id: string, startAt: Date, endAt: Date | null) => {
        if (!endAt) return;
        setFeatures((prev: Task[]) =>
            prev.map((t: Task) => (t.id === id ? { ...t, startAt, endAt } : t))
        );
    };

    return (
        <GanttProvider className="border" range="monthly" zoom={100}>
            {/* Sidebar with grouped tasks */}
            <GanttSidebar>
                {Object.entries(sortedGroups).map(([group, tasks]) => (
                    <GanttSidebarGroup key={group} name={group}>
                        {tasks.map((task: NormalizedTask) => (
                            <GanttSidebarItem
                                key={task.id}
                                feature={task}
                                onSelectItem={() => handleViewTask(task.id)}
                            />
                        ))}
                    </GanttSidebarGroup>
                ))}
            </GanttSidebar>

            {/* Timeline */}
            <GanttTimeline>
                <GanttHeader />
                <GanttFeatureList>
                    {Object.entries(sortedGroups).map(([group, tasks]) => (
                        <GanttFeatureListGroup key={group}>
                            {tasks.map((task: NormalizedTask) => (
                                <div key={task.id} className="flex">
                                    <ContextMenu>
                                        <ContextMenuTrigger asChild>
                                            <button type="button" onClick={() => handleViewTask(task.id)}>
                                                <GanttFeatureItem onMove={handleMoveTask} {...task}>
                                                    <p className="flex-1 truncate text-xs">{task.title}</p>
                                                    {task.assigned_to && (
                                                        <Avatar className="h-4 w-4">
                                                            <AvatarImage src={task.assigned_to.avatar} />
                                                            <AvatarFallback>
                                                                {task.assigned_to.name?.slice(0, 2)}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                    )}
                                                </GanttFeatureItem>
                                            </button>
                                        </ContextMenuTrigger>
                                        <ContextMenuContent>
                                            <ContextMenuItem onClick={() => handleViewTask(task.id)}>
                                                <EyeIcon size={16} /> View
                                            </ContextMenuItem>
                                            <ContextMenuItem onClick={() => handleCopyLink(task.id)}>
                                                <LinkIcon size={16} /> Copy link
                                            </ContextMenuItem>
                                            <ContextMenuItem
                                                className="text-destructive"
                                                onClick={() => handleRemoveTask(task.id)}
                                            >
                                                <TrashIcon size={16} /> Remove
                                            </ContextMenuItem>
                                        </ContextMenuContent>
                                    </ContextMenu>
                                </div>
                            ))}
                        </GanttFeatureListGroup>
                    ))}
                </GanttFeatureList>

                {/* Markers */}
                <GanttMarker
                    id="today"
                    date={new Date()}
                    label="Today"
                    className="bg-blue-100 text-blue-900"
                />
                <GanttToday />
                <GanttCreateMarkerTrigger onCreateMarker={(date) =>
                    console.log(`Marker created: ${date}`)
                } />
            </GanttTimeline>
        </GanttProvider>
    );
}