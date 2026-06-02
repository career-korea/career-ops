// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { extractJobLinks } from './_korean-html.mjs';

const DEFAULT_API = 'https://jumpit-api.saramin.co.kr/api/positions?sort=reg_dt&page=1';

function isJumpitUrl(url = '') {
  try {
    const host = new URL(url).hostname;
    return host === 'jumpit.saramin.co.kr' || host.endsWith('.jumpit.saramin.co.kr');
  } catch {
    return false;
  }
}

function normalizeApiJob(job, entry) {
  return {
    title: job.title || job.position || job.name || '',
    url: job.url || job.link || (job.id ? `https://jumpit.saramin.co.kr/position/${job.id}` : ''),
    company: job.companyName || job.company_name || job.company?.name || entry.name,
    location: Array.isArray(job.locations) ? job.locations.join(', ') : (job.location || job.workPlace || job.address || ''),
  };
}

/** @type {Provider} */
export default {
  id: 'jumpit',

  detect(entry) {
    return isJumpitUrl(entry.careers_url) ? { url: entry.careers_url } : null;
  },

  async fetch(entry, ctx) {
    const api = entry.api || DEFAULT_API;
    if (api) {
      const json = await ctx.fetchJson(api, {
        headers: {
          accept: 'application/json,text/plain,*/*',
          origin: 'https://jumpit.saramin.co.kr',
          referer: 'https://jumpit.saramin.co.kr/jobs',
        },
      });
      const jobs = Array.isArray(json)
        ? json
        : (json?.result?.positions || json?.data || json?.jobs || json?.results || []);
      const normalized = jobs.map(job => normalizeApiJob(job, entry)).filter(job => job.title && job.url);
      if (normalized.length > 0 || entry.api) return normalized;
    }

    const url = entry.careers_url;
    const html = await ctx.fetchText(url);
    return extractJobLinks(html, url, {
      include: [/jumpit\.saramin\.co\.kr\/position\//, /jumpit\.saramin\.co\.kr\/jobs/],
    }).map(job => ({
      ...job,
      company: entry.name,
      location: 'Korea',
    }));
  },
};
