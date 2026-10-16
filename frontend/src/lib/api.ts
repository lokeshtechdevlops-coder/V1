const BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '');
let csrfToken = '';
export function setCsrf(token: string) { csrfToken = token; }
export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export async function api<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && options.body) headers.set('Content-Type', 'application/json');
  if (csrfToken) headers.set('X-CSRF-Token', csrfToken);
  const response = await fetch(`${BASE}/api${path}`, {...options, headers, credentials: 'include', cache: 'no-store'});
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const detail = typeof error.detail === 'string' ? error.detail : Array.isArray(error.detail)
      ? error.detail.map((item: any) => `${item.loc.slice(1).join('.')}: ${item.msg}`).join('; ')
      : 'The request could not be completed.';
    throw new ApiError(response.status, detail);
  }
  return response.json();
}
export const post = (path: string, data?: unknown) => api(path, {method:'POST', body:data === undefined ? undefined : JSON.stringify(data)});
export const patch = (path: string, data: unknown) => api(path, {method:'PATCH', body:JSON.stringify(data)});
export async function downloadDocument(id: string, filename: string) {
  const response = await fetch(`${BASE}/api/documents/${id}/download`, {credentials:'include', cache:'no-store'});
  if (!response.ok) throw new ApiError(response.status, 'This document is unavailable or access is not permitted.');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = filename; anchor.click(); URL.revokeObjectURL(url);
}
