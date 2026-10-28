import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import type {
  CheckpointItem,
  CheckpointListResponse,
  CheckpointLog,
  CheckpointModule,
  SignOffColumn,
} from '@/shared/types/checkpoint';

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    const token = Cookies.get('accessToken');
    if (token) return token;
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'accessToken') return decodeURIComponent(value);
    }
    return null;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'cookie read failed';
    throw new Error(`Could not read the access token: ${reason}`);
  }
};

/**
 * Reads an API error body and returns a message safe to show in the UI.
 * @param response - Failed fetch response
 */
async function errorMessage(response: Response): Promise<string> {
  const text = await response.text();
  if (!text) return `Request failed (${response.status})`;
  try {
    const body = JSON.parse(text) as { message?: string };
    return body.message || text;
  } catch (error) {
    const reason = error instanceof Error ? error.message : 'invalid json';
    return text || reason;
  }
}

/**
 * API client for software checkpoint modules, items, and sign-off logs.
 */
class CheckpointService {
  private baseURL = `${API_BASE_URL}/checkpoints`;

  /**
   * Authenticated JSON request.
   * @param path - Path under /checkpoints
   * @param options - Fetch options
   */
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

    if (!response.ok) throw new Error(await errorMessage(response));
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  /** Loads every module with its checkpoints. */
  async list(): Promise<CheckpointListResponse> {
    return this.request<CheckpointListResponse>('');
  }

  /**
   * Creates a module section.
   * @param name - Module name
   */
  async createModule(name: string): Promise<CheckpointModule> {
    return this.request<CheckpointModule>('/modules', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Renames a module.
   * @param moduleId - Module id
   * @param name - New name
   */
  async updateModule(moduleId: string, name: string): Promise<CheckpointModule> {
    return this.request<CheckpointModule>(`/modules/${moduleId}`, {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    });
  }

  /**
   * Deletes a module and its checkpoints.
   * @param moduleId - Module id
   */
  async deleteModule(moduleId: string): Promise<void> {
    await this.request<void>(`/modules/${moduleId}`, { method: 'DELETE' });
  }

  /**
   * Adds a checkpoint under a module.
   * @param moduleId - Parent module id
   * @param payload - Title and description
   */
  async createItem(
    moduleId: string,
    payload: { title: string; description: string }
  ): Promise<CheckpointItem> {
    return this.request<CheckpointItem>(`/modules/${moduleId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Updates a checkpoint title and description.
   * @param itemId - Checkpoint id
   * @param payload - Title and description
   */
  async updateItem(
    itemId: string,
    payload: { title: string; description: string }
  ): Promise<CheckpointItem> {
    return this.request<CheckpointItem>(`/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  /**
   * Deletes a checkpoint and its logs.
   * @param itemId - Checkpoint id
   */
  async deleteItem(itemId: string): Promise<void> {
    await this.request<void>(`/items/${itemId}`, { method: 'DELETE' });
  }

  /**
   * Flips Developer or Addon sign-off and records a log.
   * @param itemId - Checkpoint id
   * @param column - Which team is signing
   * @param checked - New switch value
   */
  async signOff(itemId: string, column: SignOffColumn, checked: boolean): Promise<CheckpointItem> {
    return this.request<CheckpointItem>(`/items/${itemId}/signoff`, {
      method: 'PATCH',
      body: JSON.stringify({ column, checked }),
    });
  }

  /**
   * Sign-off history for one checkpoint, newest first.
   * @param itemId - Checkpoint id
   */
  async listLogs(itemId: string): Promise<CheckpointLog[]> {
    return this.request<CheckpointLog[]>(`/items/${itemId}/logs`);
  }
}

const checkpointService = new CheckpointService();
export default checkpointService;
