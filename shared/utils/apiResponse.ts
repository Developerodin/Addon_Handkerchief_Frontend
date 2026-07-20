/**
 * Parse JSON from an API response; surface HTML/404 errors clearly.
 */
export async function parseApiResponse<T = unknown>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();

  if (!contentType.includes('application/json')) {
    if (text.startsWith('<!DOCTYPE') || text.startsWith('<html')) {
      throw new Error(
        `API returned HTML instead of JSON (${response.status}). Check NEXT_PUBLIC_API_BASE_URL — backend should be running (e.g. http://localhost:5000/v1).`
      );
    }
    throw new Error(text || `Unexpected response (${response.status})`);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error('Invalid JSON response from server');
  }
}
