import { API_BASE_URL } from '@/shared/data/utilities/api';
import Cookies from 'js-cookie';
import { MAX_UPLOAD_FILE_SIZE_BYTES, MAX_UPLOAD_FILE_SIZE_MB } from '@/shared/services/fileUploadService';
import {
  inferMimeFromFileName,
  normalizeDisplayFileName,
  pickBestFileName,
  splitDisplayFileName,
} from '@/shared/utils/hubFileDisplay';

export interface HubFileAttachment {
  fileName?: string;
  url?: string;
  key?: string;
  size?: number;
  mimeType?: string;
}

export interface HubFolder {
  id: string;
  type: 'folder';
  folder: {
    name: string;
    description?: string;
    parentFolder?: string | null;
    path: string;
    metadata?: Record<string, unknown>;
    createdBy?: { id: string; name?: string; email?: string; role?: string };
  };
}

export interface HubFile {
  id: string;
  type: 'file';
  file: {
    fileName: string;
    fileUrl: string;
    fileKey: string;
    fileSize?: number;
    mimeType?: string;
    metadata?: Record<string, unknown>;
    uploadedBy?: { id: string; name?: string; email?: string; role?: string };
    parentFolder?: string | null;
  };
}

export type HubItem = HubFolder | HubFile;

/** Safely read display name from a hub item (handles null nested folder/file). */
export function getHubItemName(item: Partial<HubItem> | null | undefined): string {
  if (!item) return 'Untitled';
  if (item.type === 'folder') {
    return normalizeDisplayFileName(item.folder?.name?.trim() || 'Untitled folder');
  }
  if (item.type === 'file') {
    return splitDisplayFileName(item.file?.fileName?.trim() || 'Untitled file').full;
  }
  return 'Unknown item';
}

export function getHubItemMime(item: Partial<HubItem> | null | undefined): string | undefined {
  if (item?.type !== 'file') return undefined;
  const mime = item.file?.mimeType?.trim();
  if (mime) return mime;
  return inferMimeFromFileName(item.file?.fileName);
}

export function getHubItemFileUrl(item: Partial<HubItem> | null | undefined): string {
  if (item?.type === 'file') return item.file?.fileUrl || '#';
  return '#';
}

export function getHubItemFileSize(item: Partial<HubItem> | null | undefined): number {
  if (item?.type === 'file') return item.file?.fileSize || 0;
  return 0;
}

export function isHubFolder(item: Partial<HubItem> | null | undefined): item is HubFolder {
  return Boolean(item?.type === 'folder' && item.folder);
}

export function isHubFile(item: Partial<HubItem> | null | undefined): item is HubFile {
  return Boolean(item?.type === 'file' && item.file);
}

const normalizeHubItem = (raw: unknown): HubItem | null => {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Partial<HubItem> & { id?: string; _id?: string };
  const id = item.id || (item._id ? String(item._id) : undefined);
  if (!id) return null;
  if (isHubFolder(item)) return { ...item, id, type: 'folder' } as HubFolder;
  if (isHubFile(item)) return { ...item, id, type: 'file' } as HubFile;
  return null;
};

const normalizeHubList = (results: unknown[] | undefined): HubItem[] =>
  (results || []).map(normalizeHubItem).filter(Boolean) as HubItem[];

const getAccessToken = (): string | null => {
  if (typeof document === 'undefined') return null;
  try {
    return Cookies.get('accessToken') || null;
  } catch {
    return null;
  }
};

class HelpSupportFilesService {
  private baseURL = `${API_BASE_URL}/help-support/files`;

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const response = await fetch(`${this.baseURL}${path}`, {
      ...options,
      cache: 'no-store',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
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

  async uploadToS3(file: File, onProgress?: (percent: number) => void): Promise<HubFileAttachment> {
    if (file.size > MAX_UPLOAD_FILE_SIZE_BYTES) {
      throw new Error(`File size exceeds ${MAX_UPLOAD_FILE_SIZE_MB}MB limit`);
    }

    const token = getAccessToken();
    if (!token) throw new Error('No access token found. Please login again.');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('originalFileName', file.name);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${this.baseURL}/upload`);
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable && onProgress) {
          onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          const result = JSON.parse(xhr.responseText || '{}');
          if (xhr.status < 200 || xhr.status >= 300 || !result.success) {
            reject(new Error(result.message || 'Upload failed'));
            return;
          }
          const d = result.data;
          resolve({
            fileName: pickBestFileName(file.name, d.originalName),
            url: d.url,
            key: d.key,
            size: d.size,
            mimeType: d.mimeType,
          });
        } catch {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Upload failed')));
      xhr.addEventListener('abort', () => reject(new Error('Upload cancelled')));
      xhr.send(formData);
    });
  }

  async getRootFolders() {
    const res = await this.request<{ results: HubItem[]; page: number; totalResults: number }>(
      '/root-folders?limit=100'
    );
    return { ...res, results: normalizeHubList(res.results) };
  }

  async getFolderContents(folderId: string) {
    const res = await this.request<{ folder: HubFolder; contents: { results: HubItem[] } }>(
      `/folders/${encodeURIComponent(folderId)}/contents?limit=100`
    );
    const folder = normalizeHubItem(res.folder) as HubFolder | null;
    return {
      folder: folder || res.folder,
      contents: { ...res.contents, results: normalizeHubList(res.contents?.results) },
    };
  }

  async createFolder(name: string, parentFolder?: string | null, description?: string) {
    const res = await this.request<HubFolder>('/folders', {
      method: 'POST',
      body: JSON.stringify({
        name,
        ...(description?.trim() ? { description: description.trim() } : {}),
        ...(parentFolder ? { parentFolder } : {}),
      }),
    });
    const normalized = normalizeHubItem(res);
    if (!normalized || !isHubFolder(normalized)) {
      throw new Error('Folder was created but the response was invalid');
    }
    return normalized;
  }

  async registerFile(payload: {
    fileName: string;
    fileUrl: string;
    fileKey: string;
    parentFolder?: string | null;
    fileSize?: number;
    mimeType?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.request<HubFile>('/files', { method: 'POST', body: JSON.stringify(payload) });
  }

  async getTaskDocumentsFolder() {
    const res = await this.request<HubFolder>('/task-documents-folder');
    const normalized = normalizeHubItem(res);
    if (!normalized || !isHubFolder(normalized)) {
      throw new Error('Task Documents folder unavailable');
    }
    return normalized;
  }

  async getTicketDocumentsFolder() {
    const res = await this.request<HubFolder>('/ticket-documents-folder');
    const normalized = normalizeHubItem(res);
    if (!normalized || !isHubFolder(normalized)) {
      throw new Error('Ticket Documents folder unavailable');
    }
    return normalized;
  }

  async deleteItem(itemId: string) {
    const item = await this.request<HubItem>(`/files/${encodeURIComponent(itemId)}`).catch(() => null);
    if (item?.type === 'file') {
      return this.request(`/files/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
    }
    return this.request(`/folders/${encodeURIComponent(itemId)}`, { method: 'DELETE' });
  }

  async deleteFile(fileId: string) {
    return this.request(`/files/${encodeURIComponent(fileId)}`, { method: 'DELETE' });
  }

  async deleteFolder(folderId: string) {
    return this.request(`/folders/${encodeURIComponent(folderId)}`, { method: 'DELETE' });
  }
}

export const helpSupportFilesService = new HelpSupportFilesService();
