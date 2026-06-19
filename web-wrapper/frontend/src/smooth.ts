// smooth.ts — 사이트 전역 부드러운 스크롤 (Lenis).
//
// 순수 시각/모션 레이어: 앱 상태, 라우팅, API에 관여하지 않는다.
//  - prefers-reduced-motion 사용자는 네이티브 스크롤 그대로 둔다.
//  - 중첩 스크롤 영역(텍스트 입력, 기록 서랍, 결과 출력, 모달)은
//    prevent 콜백으로 제외해 기존 UX를 보존한다.

import Lenis from 'lenis';

let lenis: Lenis | null = null;

const NATIVE_SCROLL_ZONES =
  'textarea, select, pre, [data-lenis-prevent], .history-drawer, .paywall-backdrop';

export function initSmoothScroll(): Lenis | null {
  if (lenis) return lenis;
  if (typeof window === 'undefined') return null;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;

  lenis = new Lenis({
    autoRaf: true,
    lerp: 0.115,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
    prevent: (node) => Boolean(node.closest?.(NATIVE_SCROLL_ZONES)),
  });
  return lenis;
}

export function getLenis(): Lenis | null {
  return lenis;
}
