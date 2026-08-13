import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';

export interface TaskCreatedNotification {
  id: string;
  type: 'task_created';
  taskId: string;
  taskNumber: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assignedTeams?: string[];
  createdBy?: { id: string; name?: string; email?: string };
  createdAt: string;
}

export interface TicketAssignedNotification {
  id: string;
  type: 'ticket_assigned';
  ticketId: string;
  ticketNumber: string;
  title: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  recipientUser?: string;
  createdBy?: { id: string; name?: string; email?: string };
  createdAt: string;
}

export type HubNotification = TaskCreatedNotification | TicketAssignedNotification;

export interface HubNotificationsResponse {
  results: HubNotification[];
  unreadCount: number;
  lastSeenAt?: string | null;
}

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || null;
  } catch {
    return null;
  }
};

class HelpSupportNotificationService {
  private baseURL = `${API_BASE_URL}/help-support/notifications`;

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

  list(limit = 20) {
    return this.request<HubNotificationsResponse>(`?limit=${limit}`);
  }

  markRead() {
    return this.request<{ lastSeenAt: string }>('/read', { method: 'PATCH' });
  }
}

export const helpSupportNotificationService = new HelpSupportNotificationService();
