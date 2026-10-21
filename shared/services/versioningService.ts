import { API_BASE_URL } from '@/shared/data/utilities/api';
import { getValidAccessToken } from '@/shared/utils/authToken';

export interface RevisionReview {
  id: string;
  scopeId: string;
  status: string;
  reason?: string;
  expectedLockVersion: number;
}

/**
 * Loads change requests that are waiting for review.
 * @returns Review rows from the versioning API
 */
export async function listRevisionReviews(): Promise<RevisionReview[]> {
  const token = await getValidAccessToken();
  const response = await fetch(`${API_BASE_URL}/versioning/reviews`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Revision reviews failed (${response.status})`);
  }
  const body = (await response.json()) as { results?: RevisionReview[] };
  return body.results || [];
}
