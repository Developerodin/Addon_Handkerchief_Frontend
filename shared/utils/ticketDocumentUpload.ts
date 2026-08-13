import { helpSupportFilesService } from '@/shared/services/helpSupportFilesService';
import type { TicketAttachment } from '@/shared/types/helpSupport';

let cachedFolderId: string | null = null;

async function getTicketDocumentsFolderId(): Promise<string> {
  if (cachedFolderId) return cachedFolderId;
  const folder = await helpSupportFilesService.getTicketDocumentsFolder();
  cachedFolderId = folder.id;
  return folder.id;
}

/**
 * Upload one or more files into the protected Ticket Documents folder and return ticket attachment refs.
 */
export async function uploadTicketDocuments(
  files: File[],
  ticketId: string,
  ticketNumber: string,
  onProgress?: (fileName: string, percent: number) => void
): Promise<TicketAttachment[]> {
  if (!files.length) return [];

  const folderId = await getTicketDocumentsFolderId();
  const attachments: TicketAttachment[] = [];

  for (const file of files) {
    const uploaded = await helpSupportFilesService.uploadToS3(file, (percent) => {
      onProgress?.(file.name, percent);
    });

    const displayName = `${ticketNumber} — ${uploaded.fileName || file.name}`;

    await helpSupportFilesService.registerFile({
      fileName: displayName,
      fileUrl: uploaded.url || '',
      fileKey: uploaded.key || '',
      parentFolder: folderId,
      fileSize: uploaded.size,
      mimeType: uploaded.mimeType,
      metadata: {
        isTicketDocument: true,
        ticketId,
        ticketNumber,
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

export function getHubFileTicketNumber(item: {
  type?: string;
  file?: { metadata?: { ticketNumber?: string }; fileName?: string };
}): string | null {
  if (item.type !== 'file' || !item.file) return null;
  if (item.file.metadata?.ticketNumber) return item.file.metadata.ticketNumber;
  const match = item.file.fileName?.match(/^(HS-\d{4}-\d{6})/);
  return match ? match[1] : null;
}
