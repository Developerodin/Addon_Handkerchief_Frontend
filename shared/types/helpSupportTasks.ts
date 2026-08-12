export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskAttachment {
  fileName?: string;
  url?: string;
  key?: string;
  size?: number;
  mimeType?: string;
}

export interface TaskUser {
  id: string;
  name?: string;
  email?: string;
  role?: string;
}

export type TaskActivityType = 'created' | 'status_changed' | 'teams_assigned' | 'comment' | 'updated';

export interface TaskActivityEntry {
  id?: string;
  type: TaskActivityType;
  actor?: TaskUser | string;
  actorName?: string;
  message?: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  teams?: string[];
  createdAt?: string;
}

export interface TaskComment {
  id?: string;
  author?: TaskUser | string;
  body: string;
  attachments?: TaskAttachment[];
  createdAt?: string;
}

export interface HelpSupportTaskTeam {
  id: string;
  slug: string;
  name: string;
  description?: string;
  roles?: string[];
  isActive?: boolean;
  sortOrder?: number;
}

export interface HelpSupportTask {
  id: string;
  taskNumber: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string | null;
  createdBy?: TaskUser | string;
  assignees?: (TaskUser | string)[];
  assignedTeams?: string[];
  attachments?: TaskAttachment[];
  comments?: TaskComment[];
  activityLog?: TaskActivityEntry[];
  createdAt: string;
  updatedAt: string;
}

export interface TasksListResponse {
  results: HelpSupportTask[];
  page: number;
  limit: number;
  totalPages: number;
  totalResults: number;
}

export interface CreateTaskPayload {
  title: string;
  description?: string;
  priority?: TaskPriority;
  dueDate?: string | null;
  assignedTeams: string[];
  assignees?: string[];
  attachments?: TaskAttachment[];
}

export interface CreateTeamPayload {
  slug?: string;
  name: string;
  description?: string;
  roles?: string[];
  sortOrder?: number;
  isActive?: boolean;
}
