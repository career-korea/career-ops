// Shared conservative HTML extraction for Korean job-board providers.
// This is a fallback for boards that do not expose a stable public API.

const ENTITY_MAP = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

export function decodeHtml(text = '') {
  return text
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (_, name) => ENTITY_MAP[name] || `&${name};`);
}

export function stripTags(text = '') {
  return decodeHtml(text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

export function absoluteUrl(baseUrl, href) {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return '';
  }
}

export function extractJobLinks(html, baseUrl, { include = [], exclude = [] } = {}) {
  const jobs = [];
  const seen = new Set();
  const anchorPattern = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const match of html.matchAll(anchorPattern)) {
    const href = match[1];
    const url = absoluteUrl(baseUrl, href);
    if (!url || seen.has(url)) continue;
    if (include.length > 0 && !include.some(pattern => pattern.test(url))) continue;
    if (exclude.some(pattern => pattern.test(url))) continue;

    const title = stripTags(match[2]);
    if (!title || title.length < 2) continue;
    jobs.push({ title, url });
    seen.add(url);
  }
  return jobs;
}
