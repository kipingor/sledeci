import {
    KanbanBoard,
    KanbanCard,
    KanbanCards,
    KanbanHeader,
    KanbanProvider,
} from '@/components/ui/shadcn-io/kanban/index';
import { AnimatePresence, motion } from 'framer-motion';
import React, { useMemo, useState, useRef, useEffect } from 'react';
import api from '@/lib/axios';
import useTaskMutations from '@/hooks/use-task-mutations';
import { useTasks } from '@/hooks/use-tasks';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────

type User = { id: number; name: string; email?: string; avatar?: string };

type Comment = {
    id: number;
    body: string;
    type: 'comment' | 'note' | 'mitigation';
    user: User | null;
    created_at: string;
};

type Task = {
    id?: string | number;
    title?: string;
    description?: string;
    assignee?: User | null;
    assigned_to?: string | number | null;
    labels?: string[];
    endAt?: string | null;
    priority?: string;
    status?: string;
    delay_reason?: string | null;
    mitigation?: string | null;
    comments?: Comment[];
    [key: string]: any;
};

// ── Helpers ───────────────────────────────────────────────────────────────

const fmt = (d?: string | null) => {
    if (!d) return '';
    const date = new Date(d);
    return isNaN(date.getTime()) ? String(d) : date.toLocaleDateString();
};

const initials = (name?: string) =>
    (name || 'U').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

const PRIORITY_COLORS: Record<string, string> = {
    high:   'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low:    'bg-green-100 text-green-700',
};

const COLUMN_LABELS: Record<string, string> = {
    todo:        'To Do',
    in_progress: 'In Progress',
    review:      'Review',
    done:        'Done',
};

// ── Task Detail Modal ─────────────────────────────────────────────────────

const TaskModal: React.FC<{
    task: Task;
    teamMembers: User[];
    onClose: () => void;
    onUpdated: (updated: Task) => void;
    onDeleted: (id: string | number) => void;
}> = ({ task, teamMembers, onClose, onUpdated, onDeleted }) => {
    const [form, setForm] = useState({
        title:        task.title ?? '',
        description:  task.description ?? '',
        status:       task.status ?? 'todo',
        priority:     task.priority ?? 'medium',
        assigned_to:  task.assigned_to ?? task.assignee?.id ?? '',
        endAt:        task.endAt?.slice(0, 10) ?? '',
        delay_reason: task.delay_reason ?? '',
        mitigation:   task.mitigation ?? '',
    });
    const [saving, setSaving] = useState(false);
    const [comments, setComments] = useState<Comment[]>(task.comments ?? []);
    const [newComment, setNewComment] = useState('');
    const [commentType, setCommentType] = useState<'comment' | 'note' | 'mitigation'>('comment');
    const [postingComment, setPostingComment] = useState(false);

    const isOverdue = form.endAt && new Date(form.endAt) < new Date() && form.status !== 'done';

    async function save() {
        setSaving(true);
        try {
            const res = await api.put(`/tasks/${task.id}`, {
                ...form,
                assigned_to: form.assigned_to || null,
            });
            const updated = res.data?.task ?? res.data;
            onUpdated(updated);
            toast.success('Task saved');
        } catch (e: any) {
            toast.error(e?.response?.data?.message ?? 'Failed to save task');
        } finally {
            setSaving(false);
        }
    }

    async function deleteTask() {
        if (!confirm('Delete this task?')) return;
        try {
            await api.delete(`/tasks/${task.id}`);
            onDeleted(task.id!);
            onClose();
            toast.success('Task deleted');
        } catch {
            toast.error('Failed to delete task');
        }
    }

    async function postComment() {
        if (!newComment.trim()) return;
        setPostingComment(true);
        try {
            const res = await api.post(`/tasks/${task.id}/comments`, {
                body: newComment.trim(),
                type: commentType,
            });
            const comment = res.data?.comment ?? res.data;
            setComments(c => [...c, comment]);
            setNewComment('');
            // If mitigation, sync the form field
            if (commentType === 'mitigation') {
                setForm(f => ({ ...f, mitigation: newComment.trim() }));
            }
            toast.success('Comment added');
        } catch {
            toast.error('Failed to post comment');
        } finally {
            setPostingComment(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
             onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-background rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b">
                    <h2 className="text-base font-semibold">Task Details</h2>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl">×</button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Title */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Title</label>
                        <input className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Description</label>
                        <textarea className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[72px] resize-y"
                            value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                    </div>

                    {/* Status / Priority / Due / Assignee row */}
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Status</label>
                            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                                {['todo', 'in_progress', 'review', 'done'].map(s =>
                                    <option key={s} value={s}>{COLUMN_LABELS[s] ?? s}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Priority</label>
                            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                                {['low', 'medium', 'high'].map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Due Date</label>
                            <input type="date" className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                value={form.endAt} onChange={e => setForm(f => ({ ...f, endAt: e.target.value }))} />
                        </div>
                        <div>
                            <label className="text-xs font-medium text-muted-foreground uppercase mb-1.5 block">Assigned To</label>
                            <select className="w-full h-9 rounded-md border bg-background px-3 text-sm"
                                value={String(form.assigned_to)} onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value ? Number(e.target.value) : '' }))}>
                                <option value="">Unassigned</option>
                                {teamMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Delay section — shown when overdue or already has delay info */}
                    {(isOverdue || form.delay_reason || form.mitigation) && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 space-y-3">
                            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">
                                {isOverdue ? '⚠ Task is overdue' : 'Delay information'}
                            </p>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Delay Reason</label>
                                <textarea className="w-full rounded-md border bg-white px-3 py-2 text-sm min-h-[60px] resize-y"
                                    placeholder="What caused the delay?"
                                    value={form.delay_reason} onChange={e => setForm(f => ({ ...f, delay_reason: e.target.value }))} />
                            </div>
                            <div>
                                <label className="text-xs font-medium text-muted-foreground mb-1 block">Mitigation / Resolution</label>
                                <textarea className="w-full rounded-md border bg-white px-3 py-2 text-sm min-h-[60px] resize-y"
                                    placeholder="How is this being addressed?"
                                    value={form.mitigation} onChange={e => setForm(f => ({ ...f, mitigation: e.target.value }))} />
                            </div>
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex items-center gap-3 pt-1">
                        <button onClick={save} disabled={saving}
                            className="px-4 py-2 rounded-md bg-primary text-white text-sm font-medium disabled:opacity-60">
                            {saving ? 'Saving…' : 'Save Changes'}
                        </button>
                        <button onClick={onClose} className="px-4 py-2 rounded-md border text-sm">Cancel</button>
                        <button onClick={deleteTask}
                            className="ml-auto px-3 py-2 rounded-md text-sm text-red-600 hover:bg-red-50">Delete</button>
                    </div>

                    {/* Comments */}
                    <div className="border-t pt-5">
                        <h3 className="text-sm font-semibold mb-3">Comments & Notes</h3>

                        {comments.length === 0 && (
                            <p className="text-xs text-muted-foreground mb-3">No comments yet.</p>
                        )}

                        <div className="space-y-3 mb-4">
                            {comments.map(c => (
                                <div key={c.id} className={`rounded-md p-3 text-sm ${
                                    c.type === 'mitigation' ? 'bg-green-50 border border-green-200'
                                    : c.type === 'note' ? 'bg-blue-50 border border-blue-200'
                                    : 'bg-muted/40 border'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-xs">{c.user?.name ?? 'Unknown'}</span>
                                        <span className="text-muted-foreground text-xs">{fmt(c.created_at)}</span>
                                        {c.type !== 'comment' && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${
                                                c.type === 'mitigation' ? 'bg-green-100 text-green-700'
                                                : 'bg-blue-100 text-blue-700'}`}>
                                                {c.type}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-foreground whitespace-pre-line">{c.body}</p>
                                </div>
                            ))}
                        </div>

                        {/* Add comment */}
                        <div className="space-y-2">
                            <textarea
                                className="w-full rounded-md border bg-background px-3 py-2 text-sm min-h-[64px] resize-none"
                                placeholder="Add a comment, note, or mitigation…"
                                value={newComment}
                                onChange={e => setNewComment(e.target.value)}
                            />
                            <div className="flex items-center gap-2">
                                <select className="h-8 rounded-md border bg-background px-2 text-xs"
                                    value={commentType} onChange={e => setCommentType(e.target.value as any)}>
                                    <option value="comment">Comment</option>
                                    <option value="note">Note</option>
                                    <option value="mitigation">Mitigation</option>
                                </select>
                                <button onClick={postComment} disabled={postingComment || !newComment.trim()}
                                    className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium disabled:opacity-60">
                                    {postingComment ? 'Posting…' : 'Post'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── New Task Form ─────────────────────────────────────────────────────────

const NewTaskForm: React.FC<{
    columnId: string;
    teamMembers: User[];
    onCreate: (payload: Partial<Task>) => Promise<void> | void;
    onClose?: () => void;
}> = ({ columnId, teamMembers, onCreate, onClose }) => {
    const [title, setTitle] = useState('');
    const [assignedTo, setAssignedTo] = useState<string>('');
    const [priority, setPriority] = useState('medium');
    const [endAt, setEndAt] = useState('');
    const [loading, setLoading] = useState(false);

    async function submit(e?: React.FormEvent) {
        if (e) e.preventDefault();
        if (!title.trim()) return;
        setLoading(true);
        try {
            await onCreate({
                title: title.trim(),
                priority,
                status: columnId,
                assigned_to: assignedTo ? Number(assignedTo) : undefined,
                endAt: endAt || undefined,
            });
            setTitle(''); setAssignedTo(''); setPriority('medium'); setEndAt('');
            onClose?.();
        } catch {
            toast.error('Failed to create task');
        } finally {
            setLoading(false);
        }
    }

    return (
        <form className="space-y-2 p-3 bg-muted/20 rounded-md" onSubmit={submit}>
            <input className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                placeholder="Task title *" value={title} onChange={e => setTitle(e.target.value)} autoFocus />
            <div className="grid grid-cols-2 gap-2">
                <select className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={assignedTo} onChange={e => setAssignedTo(e.target.value)}>
                    <option value="">Unassigned</option>
                    {teamMembers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
                <select className="h-8 rounded-md border bg-background px-2 text-sm"
                    value={priority} onChange={e => setPriority(e.target.value)}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                </select>
            </div>
            <input type="date" className="w-full h-8 rounded-md border bg-background px-2 text-sm"
                value={endAt} onChange={e => setEndAt(e.target.value)} placeholder="Due date" />
            <div className="flex gap-2">
                <button type="submit" disabled={loading || !title.trim()}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-medium disabled:opacity-60">
                    {loading ? 'Creating…' : 'Create'}
                </button>
                <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-md border text-xs">Cancel</button>
            </div>
        </form>
    );
};

// ── Task Card ─────────────────────────────────────────────────────────────

const TaskCard: React.FC<{ item: any; onClick: () => void }> = ({ item, onClick }) => {
    const task = item.task as Task;
    const isOverdue = task.endAt && new Date(task.endAt) < new Date() && task.status !== 'done';
    const hasDelay = task.delay_reason || task.mitigation;

    return (
        <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className={`rounded-md bg-background border p-3 shadow-sm cursor-pointer hover:shadow-md transition-shadow ${isOverdue ? 'border-amber-400' : ''}`}
            onClick={onClick}>
            <div className="flex items-start gap-2.5">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold shrink-0">
                    {task.assignee?.avatar
                        ? <img src={task.assignee.avatar} className="h-8 w-8 rounded-full object-cover" alt="" />
                        : <span>{initials(task.assignee?.name ?? task.title)}</span>}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight truncate">{task.title ?? `#${item.id}`}</p>
                    {task.assignee?.name && (
                        <p className="text-xs text-muted-foreground mt-0.5">{task.assignee.name}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        {task.priority && (
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority] ?? 'bg-gray-100 text-gray-600'}`}>
                                {task.priority}
                            </span>
                        )}
                        {task.endAt && (
                            <span className={`text-xs ${isOverdue ? 'text-amber-600 font-semibold' : 'text-muted-foreground'}`}>
                                {isOverdue ? '⚠ ' : ''}{fmt(task.endAt)}
                            </span>
                        )}
                        {hasDelay && (
                            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">mitigated</span>
                        )}
                        {(task.comments?.length ?? 0) > 0 && (
                            <span className="text-xs text-muted-foreground">💬 {task.comments!.length}</span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

// ── Complete Project Banner ───────────────────────────────────────────────

const CompleteBanner: React.FC<{
    projectId: number | string;
    onComplete: () => void;
    onAddMore: () => void;
}> = ({ projectId, onComplete, onAddMore }) => {
    const [loading, setLoading] = useState(false);

    async function markComplete() {
        setLoading(true);
        try {
            await api.post(`/projects/${projectId}/complete`, { status: 'completed' });
            toast.success('Project marked as complete!');
            onComplete();
        } catch {
            toast.error('Failed to update project status');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="mb-4 rounded-lg border border-green-300 bg-green-50 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
                <span className="text-2xl">🎉</span>
                <div>
                    <p className="font-semibold text-green-800">All tasks are done!</p>
                    <p className="text-sm text-green-600">You can mark the project complete or add more tasks.</p>
                </div>
            </div>
            <div className="flex gap-2 shrink-0">
                <button onClick={markComplete} disabled={loading}
                    className="px-4 py-2 rounded-md bg-green-600 text-white text-sm font-medium disabled:opacity-60">
                    {loading ? 'Saving…' : 'Mark Complete'}
                </button>
                <button onClick={onAddMore} className="px-4 py-2 rounded-md border bg-white text-sm font-medium">
                    Add More Tasks
                </button>
            </div>
        </div>
    );
};

// ── Main Board ────────────────────────────────────────────────────────────

export default function TaskBoard({
    projectId,
    teamMembers = [],
    projectStatus,
    onProjectCompleted,
}: {
    projectId: number | string;
    teamMembers?: User[];
    projectStatus?: string;
    onProjectCompleted?: () => void;
}) {
    const { tasks, loading, error, updateTaskStatus, refetch } = useTasks(projectId);
    const [tasksByStatus, setTasksByStatus] = React.useState<Record<string, Task[]>>({});
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [openNewFor, setOpenNewFor] = useState<string | null>(null);
    const [search, setSearch] = useState('');
    const [assigneeFilter, setAssigneeFilter] = useState<string | null>(null);
    const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
    const [showBanner, setShowBanner] = useState(false);

    React.useEffect(() => {
        const grouped = (tasks ?? []).reduce<Record<string, Task[]>>((acc, task) => {
            const s = (task.status ?? 'todo').toLowerCase();
            if (!acc[s]) acc[s] = [];
            acc[s].push(task);
            return acc;
        }, {});
        setTasksByStatus(grouped);
    }, [tasks]);

    // Show complete banner when every task is done
    React.useEffect(() => {
        const total = tasks?.length ?? 0;
        const done  = tasks?.filter((t: any) => t.status === 'done').length ?? 0;
        setShowBanner(total > 0 && done === total && projectStatus !== 'completed');
    }, [tasks, projectStatus]);

    const { updateTask, createTask } = useTaskMutations(tasksByStatus, setTasksByStatus);

    const DEFAULT_STATUSES = ['todo', 'in_progress', 'review', 'done'];

    const kanbanColumns = useMemo(() => {
        const keys = Object.keys(tasksByStatus);
        const statuses = keys.length ? [...new Set([...DEFAULT_STATUSES, ...keys])] : DEFAULT_STATUSES;
        return statuses.map(id => ({ id, name: COLUMN_LABELS[id] ?? id }));
    }, [tasksByStatus]);

    const kanbanData = useMemo(() =>
        Object.entries(tasksByStatus ?? {}).flatMap(([status, tasks]: any[]) =>
            (tasks ?? []).map((t: any) => ({
                id: String(t.id),
                name: t.title ?? t.id,
                column: status,
                task: t,
            }))),
    [tasksByStatus]);

    const filteredFor = (colId: string) => kanbanData
        .filter(x => x.column === colId)
        .filter(x => {
            const t = x.task as Task;
            if (search) {
                const hay = `${t.title ?? ''} ${t.description ?? ''} ${t.assignee?.name ?? ''}`.toLowerCase();
                if (!hay.includes(search.toLowerCase())) return false;
            }
            if (assigneeFilter && t.assignee?.name !== assigneeFilter) return false;
            if (priorityFilter && t.priority !== priorityFilter) return false;
            return true;
        });

    const dragStartRef = useRef<{ cardId: string; column: string } | null>(null);

    const handleDragStart = (event: any) => {
        const card = kanbanData.find(x => x.id === String(event.active?.id));
        if (card) dragStartRef.current = { cardId: card.id, column: card.column };
    };

    const handleDragEnd = async (event: any) => {
        const { active } = event;
        if (!active || !dragStartRef.current) return;
        const originalColumn = dragStartRef.current.column;
        const movedCard = kanbanData.find(x => x.id === String(active.id));
        const newColumn = movedCard?.column;
        dragStartRef.current = null;
        if (!newColumn || newColumn === originalColumn) return;
        try {
            await updateTaskStatus({ taskId: Number(active.id), newStatus: newColumn });
        } catch {
            refetch();
        }
    };

    const handleCreateTask = async (payload: Partial<Task>) => {
        await createTask({ ...payload, project_id: projectId });
        refetch();
        toast.success('Task created');
    };

    // When a task is updated in the modal, sync back into tasksByStatus
    const handleTaskUpdated = (updated: Task) => {
        setTasksByStatus(prev => {
            const next: Record<string, Task[]> = {};
            for (const [col, tasks] of Object.entries(prev)) {
                next[col] = tasks.filter(t => String(t.id) !== String(updated.id));
            }
            const newCol = (updated.status ?? 'todo').toLowerCase();
            if (!next[newCol]) next[newCol] = [];
            next[newCol] = [updated, ...next[newCol]];
            return next;
        });
        setSelectedTask(null);
    };

    const handleTaskDeleted = (id: string | number) => {
        setTasksByStatus(prev => {
            const next: Record<string, Task[]> = {};
            for (const [col, tasks] of Object.entries(prev)) {
                next[col] = tasks.filter(t => String(t.id) !== String(id));
            }
            return next;
        });
    };

    const allAssignees = [...new Set(kanbanData.map(d => d.task.assignee?.name).filter(Boolean))];

    if (loading) return <div className="p-6 text-muted-foreground">Loading tasks…</div>;
    if (error)   return <div className="p-6 text-destructive">Failed to load tasks.</div>;

    return (
        <div>
            {showBanner && (
                <CompleteBanner
                    projectId={projectId}
                    onComplete={() => { setShowBanner(false); onProjectCompleted?.(); }}
                    onAddMore={() => setShowBanner(false)}
                />
            )}

            {/* Controls */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
                <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search tasks…"
                    className="h-9 rounded-md border bg-background px-3 text-sm w-48" />
                <select value={assigneeFilter ?? ''} onChange={e => setAssigneeFilter(e.target.value || null)}
                    className="h-9 rounded-md border bg-background px-2 text-sm">
                    <option value="">All assignees</option>
                    {allAssignees.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
                <select value={priorityFilter ?? ''} onChange={e => setPriorityFilter(e.target.value || null)}
                    className="h-9 rounded-md border bg-background px-2 text-sm">
                    <option value="">All priorities</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
            </div>

            {/* Kanban */}
            <KanbanProvider columns={kanbanColumns} data={kanbanData}
                onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
                {column => {
                    const visible = filteredFor(column.id);
                    const all = kanbanData.filter(x => x.column === column.id);

                    return (
                        <KanbanBoard id={column.id} key={column.id} className="min-w-[240px]">
                            <KanbanHeader className="flex items-center justify-between px-1">
                                <span className="font-medium text-sm">
                                    {column.name}
                                    <span className="ml-1.5 text-xs text-muted-foreground">({all.length})</span>
                                </span>
                                <button
                                    onClick={() => setOpenNewFor(openNewFor === column.id ? null : column.id)}
                                    className="text-xs px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20">
                                    + Task
                                </button>
                            </KanbanHeader>

                            {openNewFor === column.id && (
                                <div className="px-2 pb-2">
                                    <NewTaskForm columnId={column.id} teamMembers={teamMembers}
                                        onCreate={handleCreateTask} onClose={() => setOpenNewFor(null)} />
                                </div>
                            )}

                            <div className="space-y-2 p-2">
                                <AnimatePresence initial={false}>
                                    {visible.map(item => (
                                        <motion.div key={item.id} layout
                                            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                                            <KanbanCard id={item.id} name={item.name} column={item.column} task={item.task}>
                                                <TaskCard item={item} onClick={() => setSelectedTask(item.task)} />
                                            </KanbanCard>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>

                            {/* Hidden KanbanCards required by provider */}
                            <KanbanCards id={column.id} className="hidden">{() => null}</KanbanCards>
                        </KanbanBoard>
                    );
                }}
            </KanbanProvider>

            {/* Task Detail Modal */}
            {selectedTask && (
                <TaskModal
                    task={selectedTask}
                    teamMembers={teamMembers}
                    onClose={() => setSelectedTask(null)}
                    onUpdated={handleTaskUpdated}
                    onDeleted={handleTaskDeleted}
                />
            )}
        </div>
    );
}