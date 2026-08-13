import { helpSupportFilesService } from '@/shared/services/helpSupportFilesService';
import type { TaskAttachment } from '@/shared/types/helpSupportTasks';

let cachedFolderId: string | null = null;

async function getTaskDocumentsFolderId(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;
  const folder = await helpSupportFilesService.getTaskDocumentsFolder();
  cachedFolderId = folder.id;
  return folder.id;
}

/**
 * Upload one or more files into the protected Task Documents folder and return task attachment refs.
 */
export async function uploadTaskDocuments(
  files: File[],
  taskId: string,
  taskNumber: string,
  onProgress?: (fileName: string, percent: number) => void
): Promise<TaskAttachment[]> {
  if (!files.length) return [];

  const folderId = await getTaskDocumentsFolderId();
  const attachments: TaskAttachment[] = [];

  for (const file of files) {
    const uploaded = await helpSupportFilesService.uploadToS3(file, (percent) => {
      onProgress?.(file.name, percent);
    });

    const displayName = `${taskNumber} — ${uploaded.fileName || file.name}`;

    await helpSupportFilesService.registerFile({
      fileName: displayName,
      fileUrl: uploaded.url || '',
      fileKey: uploaded.key || '',
      parentFolder: folderId,
      fileSize: uploaded.size,
      mimeType: uploaded.mimeType,
      metadata: {
        isTaskDocument: true,
        taskId,
        taskNumber,
        originalFileName: uploaded.fileName || file.name,
      },
    });

    attachments.push({
      fileName: displayName,
      url: uploaded.url,
      key: uploaded.key,
      size: uploaded.size,
      mimeType: uploaded.mimeType,
    });
  }

  return attachments;
}

export function isSystemHubFolder(item: { type?: string; folder?: { metadata?: { isSystem?: boolean; systemSlug?: string }; name?: string } }): boolean {
  if (item.type !== 'folder' || !item.folder) return false;
  return Boolean(
    item.folder.metadata?.isSystem ||
      item.folder.metadata?.systemSlug === 'task_documents' ||
      item.folder.metadata?.systemSlug === 'ticket_documents' ||
      item.folder.name === 'Task Documents' ||
      item.folder.name === 'Ticket Documents'
  );
}

export function getHubFileTaskNumber(item: { type?: string; file?: { metadata?: { taskNumber?: string }; fileName?: string } }): string | null {
  if (item.type !== 'file' || !item.file) return null;
  if (item.file.metadata?.taskNumber) return item.file.metadata.taskNumber;
  const match = item.file.fileName?.match(/^(HT-\d{4}-\d{5})/);
  return match ? match[1] : null;
}
