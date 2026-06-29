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
    // 직무 키워드 및 점핏 태그 매핑 테이블
    const JUMPIT_MAP = {
      'back-end': 1, 'backend': 1, '서버': 1,
      'front-end': 2, 'frontend': 2, '웹': 2,
      'devops': 3, 'infra': 3, 'system': 3,
      'machine-learning': 14, 'ai': 14, 'deep-learning': 14,
      'data': 10, '데이터': 10, 'pm': 18, 'product-manager': 18
    };

    const roles = ctx?.targetRoles || [];
    const tags = [];
    
    roles.forEach(role => {
      const lower = role.toLowerCase();
      Object.keys(JUMPIT_MAP).forEach(keyword => {
        if (lower.includes(keyword)) tags.push(JUMPIT_MAP[keyword]);
      });
    });

    const finalTags = [...new Set(tags)];
    const tagQuery = finalTags.length > 0 ? '&' + finalTags.map(t => `tag=${t}`).join('&') : '';
    const apiBase = entry.api || 'https://jumpit-api.saramin.co.kr/api/positions?sort=reg_dt&page=1';
    
    try {
      const json = await ctx.fetchJson(`${apiBase}${tagQuery}`, {
        headers: {
          accept: 'application/json,text/plain,*/*',
          origin: 'https://jumpit.saramin.co.kr',
          referer: 'https://jumpit.saramin.co.kr/jobs',
        },
      });
      const jobs = Array.isArray(json) ? json : (json?.result?.positions || json?.data || json?.jobs || json?.results || []);
      const normalized = jobs.map(job => normalizeApiJob(job, entry)).filter(job => job.title && job.url);
      if (normalized.length > 0) return normalized;
    } catch (e) {
      console.warn('⚠️ 점핏 API 동적 호출 실패. HTML 스크래핑 폴백 기동.');
    }

    // HTML 크롤링 폴백
    const url = entry.careers_url;
    const html = await ctx.fetchText(url);
    return extractJobLinks(html, url, {
      include: [/jumpit\.saramin\.co\.kr\/position\//, /jumpit\.saramin\.co\.kr\/jobs/],
    }).map(job => ({ ...job, company: entry.name, location: 'Korea' }));
  },
};
