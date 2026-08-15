/**
 * Thin native-fetch wrapper for the REST surface. Live values arrive over the
 * socket; the GET reads exist only to bootstrap a fresh page load, because the
 * gateway's on-connect burst can land before React has subscribed.
 */

export class ApiError extends Error {
  /** Parsed `message` field from a JSON error body, when available. */
  readonly detail: string | undefined
  constructor(message: string, detail?: string) {
    super(message)
    this.detail = detail
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    let detail: string | undefined
    try {
      const parsed = JSON.parse(text) as { message?: unknown }
      if (typeof parsed.message === 'string') detail = parsed.message
    } catch {
      /* not JSON */
    }
    throw new ApiError(`${method} ${path} failed: ${response.status} ${text}`, detail)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body ?? {})
}

export function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}

export function apiDelete(path: string): Promise<void> {
  return request<void>('DELETE', path)
}
