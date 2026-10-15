// resources/js/types/project.types.ts

export interface Project {
  id: number;
  name: string;
  description: string | null;
  opportunity_id: number | null;
  client_id: number | null;
  owner_id: number | null;
  status: ProjectStatus;
  start_date: string | null;
  end_date: string | null;
  budget: number | null;
  currency: string;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  
  // Relationships
  opportunity?: Opportunity;
  client?: User;
  owner?: User;
  tasks?: Task[];
  milestones?: Milestone[];
  team_members?: ProjectTeamMember[];
}

export type ProjectStatus = 
  | 'planning'
  | 'active'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export interface ProjectWithProgress extends Project {
  progress: ProjectProgress;
  phase: string | null;
  tasksCount: number;
  completedTasksCount: number;
  teamMembersCount: number;
  overdue: boolean;
}

export interface ProjectProgress {
  overall: number;
  tasks: {
    total: number;
    completed: number;
    progress: number;
  };
  milestones: {
    total: number;
    completed: number;
    progress: number;
  };
}

export interface ProjectTeamMember {
  id: number;
  project_id: number;
  user_id: number;
  role: string | null;
  allocation_percentage: number | null;
  joined_at: string;
  user: User;
}

export interface Task {
  id: number;
  project_id: number;
  milestone_id: number | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to: number | null;
  due_date: string | null;
  completed_at: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  // DB columns present in the migration that were missing from this type:
  spent_hours?: number;
  startAt?: string | null;
  endAt?: string | null;
  group?: string;         // default 'None' in DB — optional here since backend may omit it
  metadata?: Record<string, unknown> | null;
  order: number;
  created_at: string;
  updated_at: string;
  
  // Relationships
  assignee?: User;
  milestone?: Milestone;
  project?: Project;
}

export type TaskStatus = 
  | 'todo'
  | 'in_progress'
  | 'review'
  | 'done'
  | 'blocked';

export type TaskPriority = 
  | 'low'
  | 'medium'
  | 'high'
  | 'urgent';

export interface Milestone {
  id: number;
  project_id: number;
  title: string;
  description: string | null;
  due_date: string;
  completed_at: string | null;
  order: number;
  created_at: string;
  updated_at: string;
  
  // Relationships
  project?: Project;
  tasks?: Task[];
}

export interface User {
  id: number;
  name: string;
  email: string;
  avatar?: string | null;
}

export interface Opportunity {
  id: number;
  title: string;
  value: number | null;
  stage: string;
}

export interface ProjectStatistics {
  total: number;
  by_status: {
    planning: number;
    active: number;
    on_hold: number;
    completed: number;
    cancelled: number;
  };
  at_risk: number;
  overdue: number;
  total_budget: number;
  average_completion_time: number;
}

export interface ProjectTimeline {
  items: TimelineItem[];
  start_date: string | null;
  end_date: string | null;
  current_date: string;
}

export interface TimelineItem {
  id: number;
  title: string;
  due_date: string;
  completed: boolean;
  completed_at: string | null;
  type: 'milestone' | 'task';
}

export interface BudgetUtilization {
  budget: number;
  spent: number;
  remaining: number;
  utilization: number;
  /** 'hours' = derived from task time-tracking; 'monetary' = budget field only */
  mode?: 'hours' | 'monetary';
}

export interface ProjectFilters {
  status?: ProjectStatus | 'all';
  phase?: string;
  search?: string;
  owner_id?: number;
  client_id?: number;
  start_date?: string;
  end_date?: string;
  overdue?: boolean;
}

export interface ProjectFormData {
  name: string;
  description?: string;
  opportunity_id?: number;
  client_id?: number;
  owner_id?: number;
  status: ProjectStatus;
  start_date?: string;
  end_date?: string;
  budget?: number;
  currency: string;
  metadata?: Record<string, any>;
}

export interface TaskFormData {
  title: string;
  description?: string;
  milestone_id?: number;
  status: TaskStatus;
  priority: TaskPriority;
  assigned_to?: number;
  due_date?: string;
  estimated_hours?: number;
}

export interface MilestoneFormData {
  title: string;
  description?: string;
  due_date: string;
}

export interface ProjectDashboard {
  project: ProjectWithProgress;
  recentTasks: Task[];
  upcomingMilestones: Milestone[];
  teamActivity: TeamActivity[];
  budgetStatus: BudgetUtilization;
}

export interface TeamActivity {
  id: number;
  user: User;
  action: string;
  target: string;
  timestamp: string;
}

// Props interfaces for pages
export interface ProjectsIndexProps {
  projects: {
    data: ProjectWithProgress[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
  filters: ProjectFilters;
  statistics: ProjectStatistics;
}

export interface ActivityLogEntry {
  id: number;
  event: string;
  description: string;
  user: { id: number; name: string; avatar?: string } | null;
  created_at: string;
  new_values?: Record<string, unknown>;
}

export interface ProjectShowProps {
  project: ProjectWithProgress;
  progress: ProjectProgress;
  timeline: ProjectTimeline;
  isAtRisk: boolean;
  budget: BudgetUtilization;
  recentActivity: ActivityLogEntry[];
  availableUsers: User[];
  canManage: boolean;
}

export interface ProjectFormProps {
  project?: Project;
  opportunities: Array<{ id: number; title: string }>;
  clients: Array<{ id: number; name: string }>;
  owners: Array<{ id: number; name: string }>;
  statusOptions: ProjectStatus[];
  currencyOptions: string[];
}

// Utility types
export type ProjectViewMode = 'grid' | 'list' | 'timeline';
export type TaskBoardColumn = 'todo' | 'in_progress' | 'review' | 'done';

// Status configurations
export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, {
  label: string;
  color: string;
  bgColor: string;
  textColor: string;
}> = {
  planning: {
    label: 'Planning',
    color: 'blue',
    bgColor: 'bg-blue-100',
    textColor: 'text-blue-800',
  },
  active: {
    label: 'Active',
    color: 'green',
    bgColor: 'bg-green-100',
    textColor: 'text-green-800',
  },
  on_hold: {
    label: 'On Hold',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
  },
  completed: {
    label: 'Completed',
    color: 'gray',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
  },
  cancelled: {
    label: 'Cancelled',
    color: 'red',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
  },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  color: string;
}> = {
  todo: {
    label: 'To Do',
    color: '#6b7280',
  },
  in_progress: {
    label: 'In Progress',
    color: '#3b82f6',
  },
  review: {
    label: 'Review',
    color: '#f59e0b',
  },
  done: {
    label: 'Done',
    color: '#10b981',
  },
  blocked: {
    label: 'Blocked',
    color: '#ef4444',
  },
};

export const TASK_PRIORITY_CONFIG: Record<TaskPriority, {
  label: string;
  color: string;
  icon: string;
}> = {
  low: {
    label: 'Low',
    color: 'text-gray-500',
    icon: '↓',
  },
  medium: {
    label: 'Medium',
    color: 'text-blue-500',
    icon: '→',
  },
  high: {
    label: 'High',
    color: 'text-orange-500',
    icon: '↑',
  },
  urgent: {
    label: 'Urgent',
    color: 'text-red-500',
    icon: '⚠',
  },
};