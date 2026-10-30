import { API_BASE_URL } from '@/shared/data/utilities/api';
import { setupCatalogAuth } from '@/shared/utils/setupAxiosAuth';
import { ParsedPackingList, parsedPackingListFromModel, parsePackingListText } from './packingListPdf';

/**
 * Sends the packing-list PDF to OpenAI and maps the returned text.
 */
export async function readPackingListPdf(file: File, millName = ''): Promise<ParsedPackingList> {
  setupCatalogAuth();
  const body = new FormData();
  body.append('file', file);
  if (millName.trim()) body.append('millName', millName.trim());
  const response = await fetch(`${API_BASE_URL}/store/packing-lists/parse`, {
    method: 'POST',
    body,
    headers: { Accept: 'application/json' },
  });
  const payload = (await response.json().catch(() => ({}))) as { message?: string; text?: string; parsed?: unknown };
  if (!response.ok) {
    throw new Error(payload.message || 'Could not read the packing list');
  }
  const parsed = parsedPackingListFromModel(payload.parsed, file.name, millName) || parsePackingListText(payload.text || '', file.name);
  if (millName.trim()) parsed.millName = millName.trim();
  return parsed;
}
