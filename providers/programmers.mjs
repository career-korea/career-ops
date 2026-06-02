// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

import { extractJobLinks } from './_korean-html.mjs';

function isProgrammersUrl(url = '') {
  try {
    return new URL(url).hostname === 'career.programmers.co.kr';
  } catch {
    return false;
  }
}

function normalizeApiJob(job, entry) {
  return {
    title: job.title || job.position || job.name || '',
    url: job.url || job.link || (job.id ? `https://career.programmers.co.kr/job_positions/${job.id}` : ''),
    company: job.companyName || job.company_name || job.company?.name || entry.name,
    location: job.location || job.address || '',
  };
}

/** @type {Provider} */
export default {
  id: 'programmers',

  detect(entry) {
    return isProgrammersUrl(entry.careers_url) ? { url: entry.careers_url } : null;
  },

  async fetch(entry, ctx) {
    if (entry.api) {
      const json = await ctx.fetchJson(entry.api);
      const jobs = Array.isArray(json) ? json : (json?.data || json?.jobs || json?.results || []);
      return jobs.map(job => normalizeApiJob(job, entry)).filter(job => job.title && job.url);
    }

    const url = entry.careers_url;
    let html = '';
    try {
      html = await ctx.fetchText(url);
    } catch (err) {
      // The legacy Programmers career host is intermittently unavailable from
      // Node/DNS. Do not make the whole portal scan fail when this source is down.
      return [];
    }
    return extractJobLinks(html, url, {
      include: [/career\.programmers\.co\.kr\/job_positions\/\d+/],
    }).map(job => ({
      ...job,
      company: entry.name,
      location: 'Korea',
    }));
  },
};
