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
    // 직무 키워드 및 원티드 카테고리 매핑 테이블
    const WANTED_MAP = {
      'back-end': 872, 'backend': 872, '서버': 872,
      'front-end': 873, 'frontend': 873, '웹': 873,
      'machine-learning': 1025, 'machine learning': 1025, 'ai': 1025, '인공지능': 1025,
      'data': 893, '데이터': 893, 'devops': 876, 'infra': 876,
      'pm': 939, 'product-manager': 939, '기획': 939
    };

    const roles = ctx?.targetRoles || [];
    const categoryIds = [];
    
    roles.forEach(role => {
      const lower = role.toLowerCase();
      Object.keys(WANTED_MAP).forEach(keyword => {
        if (lower.includes(keyword)) categoryIds.push(WANTED_MAP[keyword]);
      });
    });

    // 매칭 카테고리가 없는 경우 소프트웨어 개발 전체(518)로 조회
    const finalIds = categoryIds.length > 0 ? [...new Set(categoryIds)] : [518];
    const categoryQuery = finalIds.map(id => `job_category_ids=${id}`).join('&');
    const apiBase = entry.api || 'https://www.wanted.co.kr/api/v4/jobs?country=kr&locations=all&years=-1&limit=30&offset=0&job_sort=job.latest_order';
    
    try {
      const json = await ctx.fetchJson(`${apiBase}&${categoryQuery}`);
      const jobs = Array.isArray(json) ? json : (json?.data || json?.jobs || json?.results || []);
      const normalized = jobs.map(job => normalizeApiJob(job, entry)).filter(job => job.title && job.url);
      if (normalized.length > 0) return normalized;
    } catch (e) {
      console.warn('⚠️ 원티드 API 동적 호출 실패. HTML 스크래핑 폴백 기동.');
    }

    // HTML 크롤링 폴백
    const url = entry.careers_url;
    const html = await ctx.fetchText(url);
    return extractJobLinks(html, url, {
      include: [/wanted\.co\.kr\/wd\//, /wanted\.co\.kr\/company\/\d+\/jobs/],
    }).map(job => ({ ...job, company: entry.name, location: 'Korea' }));
  },
};
