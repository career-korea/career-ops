/**
 * liveness-api.mjs — zero-token ATS API liveness rung.
 *
 * Shared by check-liveness.mjs (CLI tool) and scan.mjs (--verify flag) as the
 * first, free rung: known ATS platforms (Greenhouse, Lever) expose a public
 * per-posting JSON endpoint that answers active/expired without a browser.
 * Anything that isn't a recognized ATS URL, or whose API call doesn't land on
 * a clean 404/410/200, returns null so the caller falls through to Playwright.
 */

const FETCH_TIMEOUT_MS = 8_000;

/**
 * Map a job-posting URL to its ATS per-job API URL, with no network access.
 * Pure and synchronous so it's trivially unit-testable and safe to call before
 * deciding whether a Playwright fallback is even needed.
 *
 * SSRF guard: only https URLs are accepted, and each ATS's path must match its
 * known posting-page shape exactly (e.g. a numeric Greenhouse job id) — a
 * malformed or unexpected path returns null rather than guessing a URL.
 *
 * @param {string} url
 * @returns {{ ats: string, apiUrl: string } | null}
 */
export function resolveAtsApi(url) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== 'https:') return null;

  if (parsed.hostname === 'boards.greenhouse.io' || parsed.hostname === 'job-boards.greenhouse.io') {
    const match = parsed.pathname.match(/^\/([^/]+)\/jobs\/(\d+)$/);
    if (!match) return null;
    const [, company, jobId] = match;
    return { ats: 'greenhouse', apiUrl: `https://boards-api.greenhouse.io/v1/boards/${company}/jobs/${jobId}` };
  }

  if (parsed.hostname === 'jobs.lever.co') {
    const match = parsed.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    if (!match) return null;
    const [, company, postingId] = match;
    return { ats: 'lever', apiUrl: `https://api.lever.co/v0/postings/${company}/${postingId}` };
  }

  return null;
}

/**
 * Zero-token liveness check via the posting's ATS API, if one is known.
 *
 * Conservative by construction: only a clean 404/410 (expired) or 200 (active)
 * from the ATS API is trusted. A non-ATS URL, a network error, or any other
 * status (403, 5xx, timeout, ...) returns null so the caller falls back to the
 * Playwright rung instead of guessing.
 *
 * @param {string} url
 * @returns {Promise<{ result: 'active' | 'expired', reason: string } | null>}
 */
export async function checkLivenessViaApi(url) {
  const resolved = resolveAtsApi(url);
  if (!resolved) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(resolved.apiUrl, { redirect: 'error', signal: controller.signal });
    if (res.status === 404 || res.status === 410) {
      return { result: 'expired', reason: `HTTP ${res.status} from ${resolved.ats} API` };
    }
    if (res.status === 200) {
      return { result: 'active', reason: `HTTP 200 from ${resolved.ats} API` };
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
