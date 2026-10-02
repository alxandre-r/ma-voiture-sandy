import type { JsonBody } from './types';

/** Reads a JSON object body; anything else (multipart upload, invalid JSON, array) becomes {}. */
export async function readJsonBody(request: Request): Promise<JsonBody> {
  if (!request.headers.get('content-type')?.includes('application/json')) return {};
  try {
    const body: unknown = await request.json();
    return body !== null && typeof body === 'object' && !Array.isArray(body)
      ? (body as JsonBody)
      : {};
  } catch {
    return {};
  }
}
