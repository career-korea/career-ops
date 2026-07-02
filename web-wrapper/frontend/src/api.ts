const API = import.meta.env.VITE_API_URL ?? '';

// Error that preserves the HTTP status and parsed `detail` so callers can branch
// on it (e.g. 401 → login, 402 → paywall). The base Error message stays
// human-readable for generic display.
export class ApiError extends Error {
  status: number;
  detail: unknown;
  constructor(status: number, detail: unknown, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.detail = detail;
  }
}

async function toApiError(res: Response): Promise<ApiError> {
  const text = await res.text();
  let detail: unknown = text;
  let message = text;
  try {
    const parsed = JSON.parse(text);
    detail = parsed.detail ?? parsed;
    if (typeof detail === 'string') {
      message = detail;
    } else if (detail && typeof detail === 'object' && 'message' in detail) {
      message = String((detail as { message: unknown }).message);
    }
  } catch {
    // non-JSON body; keep the raw text
  }
  return new ApiError(res.status, detail, message);
}

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
  throw await toApiError(res);
}

export type StreamEvent = {
  type: 'delta' | 'status' | 'done' | 'error';
  text?: string;
  result?: unknown;
  message?: string;
};

// POST that consumes a Server-Sent Events stream. Pre-stream failures (401/402
// from the auth/quota gates) arrive as a JSON error body, so we throw ApiError
// the same way `handle` does — callers keep their existing status branching.
export async function postStream(
  path: string,
  body: unknown,
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  if (!res.ok || !res.body) throw await toApiError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sep: number;
    while ((sep = buffer.indexOf('\n\n')) !== -1) {
      const frame = buffer.slice(0, sep);
      buffer = buffer.slice(sep + 2);
      const dataLine = frame.split('\n').find((line) => line.startsWith('data:'));
      if (!dataLine) continue;
      try {
        onEvent(JSON.parse(dataLine.slice(5).trim()) as StreamEvent);
      } catch {
        // ignore malformed frame
      }
    }
  }
}

export async function post<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return handle<T>(res);
}

export async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { credentials: 'include' });
  return handle<T>(res);
}

export async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, { method: 'DELETE', credentials: 'include' });
  return handle<T>(res);
}

export async function put<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return handle<T>(res);
}
