const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

async function handle<T>(res: Response): Promise<T> {
  if (res.ok) return res.json() as Promise<T>;
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
  throw new ApiError(res.status, detail, message);
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

export async function put<T>(path: string, body: unknown = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'include',
  });
  return handle<T>(res);
}
