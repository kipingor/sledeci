// Compatibility shim so imports from '@/types/task' resolve to the central types
import type { Task as _Task } from './types';
export type Task = _Task;

export {};
