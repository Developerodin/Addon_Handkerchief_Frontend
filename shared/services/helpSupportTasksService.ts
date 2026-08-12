import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type {
  CreateTaskPayload,
  CreateTeamPayload,
  HelpSupportTask,
  HelpSupportTaskTeam,
  TaskAttachment,
  TaskStatus,
  TasksListResponse,
} from '@/shared/types/helpSupportTasks';

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || null;
  } catch {
    return null;
  }
};

class HelpSupportTasksService {
  private baseURL = `${API_BASE_URL}/help-support/tasks`;

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json();
  }

  private buildQuery(params?: Record<string, string | number | undefined>): string {
    const sp = new URLSearchParams();
    if (!params) return '';
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') sp.append(key, String(value));
    });
    const q = sp.toString();
    return q ? `?${q}` : '';
  }

  listTasks(params?: Record<string, string | number | undefined>) {
    return this.request<TasksListResponse>(this.buildQuery(params));
  }

  getTask(taskId: string) {
    return this.request<HelpSupportTask>(`/${encodeURIComponent(taskId)}`);
  }

  createTask(payload: CreateTaskPayload) {
    return this.request<HelpSupportTask>('', { method: 'POST', body: JSON.stringify(payload) });
  }

  updateStatus(taskId: string, status: TaskStatus) {
    return this.request<HelpSupportTask>(`/${encodeURIComponent(taskId)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  assignTask(taskId: string, assignees: string[]) {
    return this.request<HelpSupportTask>(`/${encodeURIComponent(taskId)}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignees }),
    });
  }

  addComment(taskId: string, body: string, attachments?: TaskAttachment[]) {
    return this.request<HelpSupportTask>(`/${encodeURIComponent(taskId)}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body, attachments }),
    });
  }

  deleteTask(taskId: string) {
    return this.request<void>(`/${encodeURIComponent(taskId)}`, { method: 'DELETE' });
  }

  listTeams(includeInactive = false) {
    const q = includeInactive ? '?includeInactive=true' : '';
    return this.request<{ results: HelpSupportTaskTeam[] }>(`/teams${q}`);
  }

  createTeam(payload: CreateTeamPayload) {
    return this.request<HelpSupportTaskTeam>('/teams', { method: 'POST', body: JSON.stringify(payload) });
  }

  updateTeam(teamId: string, payload: Partial<CreateTeamPayload>) {
    return this.request<HelpSupportTaskTeam>(`/teams/${encodeURIComponent(teamId)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }
}

export const helpSupportTasksService = new HelpSupportTasksService();
