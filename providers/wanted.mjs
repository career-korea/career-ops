// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { extractJobLinks } from './_korean-html.mjs';

const DEFAULT_API = 'https://www.wanted.co.kr/api/v4/jobs?country=kr&locations=all&years=-1&limit=20&offset=0&job_sort=job.latest_order&job_category_id=518';

function isWantedUrl(url = '') {
  try {
    return new URL(url).hostname.endsWith('wanted.co.kr');
  } catch {
    return false;
  }
}

function normalizeApiJob(job, entry) {
  return {
    title: job.position || job.title || job.name || '',
    url: job.url || job.link || (job.id ? `https://www.wanted.co.kr/wd/${job.id}` : ''),
    company: job.company?.name || job.company_name || entry.name,
    location: job.address?.location || job.address?.full_location || job.location || job.region || '',
  };
}

/** @type {Provider} */
export default {
  id: 'wanted',

  detect(entry) {
    return isWantedUrl(entry.careers_url) ? { url: entry.careers_url } : null;
  },

  async fetch(entry, ctx) {
    const api = entry.api || DEFAULT_API;
    if (api) {
      const json = await ctx.fetchJson(api);
      const jobs = Array.isArray(json) ? json : (json?.data || json?.jobs || json?.results || []);
      const normalized = jobs.map(job => normalizeApiJob(job, entry)).filter(job => job.title && job.url);
      if (normalized.length > 0 || entry.api) return normalized;
    }

    const url = entry.careers_url;
    const html = await ctx.fetchText(url);
    return extractJobLinks(html, url, {
      include: [/wanted\.co\.kr\/wd\//, /wanted\.co\.kr\/company\/\d+\/jobs/],
    }).map(job => ({
      ...job,
      company: entry.name,
      location: 'Korea',
    }));
  },
};
