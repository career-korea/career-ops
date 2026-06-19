// Landing.tsx — 시네마틱 랜딩 페이지.
//
// lazy 청크: three + gsap 은 이 청크에만 존재한다 — 앱 번들은 그대로.
// 다섯 개의 챕터가 하나의 스크롤 위에서 이어지고, 색 지휘자(mix)가
// 챕터 경계마다 페이지 배경과 셰이더 팔레트를 함께 섞어 "블록의 나열"이
// 아니라 한 편의 흐름으로 읽히게 한다.
import { useLayoutEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import {
  ArrowRight,
  BookOpenText,
  Ghost,
  ListChecks,
  Radar,
  ScanSearch,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import type { Page } from '../types';
import { getLenis } from '../smooth';
import { FluidBackground } from './FluidBackground';
import './landing.css';

gsap.registerPlugin(ScrollTrigger);

// 챕터 색 대본: 페이지 배경(bg) + 셰이더 팔레트(a/b/c) + 다크 여부
const CHAPTERS = [
  { bg: '#fafafa', a: '#fafafa', b: '#ededf6', c: '#c7c7ee', dark: 0 }, // 00 선언
  { bg: '#f2f2fa', a: '#f2f2fa', b: '#e2e2f4', c: '#b4b4ea', dark: 0 }, // 01 평가
  { bg: '#eef2f6', a: '#eef2f6', b: '#dce6ef', c: '#a8c6e6', dark: 0 }, // 02 탐색
  { bg: '#0e0e13', a: '#0e0e13', b: '#16161f', c: '#39396b', dark: 1 }, // 03 실행
  { bg: '#fafafa', a: '#fafafa', b: '#eaf0ec', c: '#bcd9c9', dark: 0 }, // 04 시작
];

export default function Landing({
  setPage,
  modeCount,
}: {
  setPage: (page: Page) => void;
  modeCount: number;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // 사이드 레일 패딩 제거 + 풀블리드 브레이크아웃 (landing.css 참조)
    document.body.classList.add('landing-active');

    let fluid: FluidBackground | null = null;
    if (canvasRef.current) {
      try {
        fluid = new FluidBackground(canvasRef.current);
      } catch {
        fluid = null; // WebGL 미지원 — CSS 배경색 전환만으로 동작
      }
    }

    const lenis = getLenis();
    const sync = () => ScrollTrigger.update();
    lenis?.on('scroll', sync);
    if (lenis) lenis.scrollTo(0, { immediate: true });
    else window.scrollTo(0, 0);

    // 색 지휘자 — 챕터 i → i+1 진행도 t 에서 배경과 셰이더 팔레트를 보간
    const mix = (i: number, t: number) => {
      const from = CHAPTERS[i];
      const to = CHAPTERS[Math.min(i + 1, CHAPTERS.length - 1)];
      const lerp = (x: string, y: string) => gsap.utils.interpolate(x, y)(t);
      root.style.setProperty('--landing-bg', lerp(from.bg, to.bg));
      fluid?.setColors(
        lerp(from.a, to.a),
        lerp(from.b, to.b),
        lerp(from.c, to.c),
        gsap.utils.interpolate(from.dark, to.dark)(t),
      );
    };

    const mm = gsap.matchMedia(root);

    mm.add('(prefers-reduced-motion: no-preference)', () => {
      const sections = Array.from(root.querySelectorAll<HTMLElement>('.landing-chapter'));

      // 챕터 경계 스크럽 — 다음 섹션 상단이 86% → 38% 지점을 지나는 동안 색이 섞인다
      mix(0, 0);
      sections.forEach((sec, idx) => {
        if (idx === 0) return;
        ScrollTrigger.create({
          trigger: sec,
          start: 'top 86%',
          end: 'top 38%',
          scrub: true,
          onUpdate: (self) => mix(idx - 1, self.progress),
        });
      });

      // Chapter 00 — 등장
      gsap
        .timeline({ defaults: { ease: 'power4.out' } })
        .from('.landing-eyebrow', { y: 18, opacity: 0, duration: 0.7 }, 0.05)
        .from('.landing-line > span', { yPercent: 118, duration: 1.05, stagger: 0.1 }, 0.12)
        .from('.landing-sub', { y: 22, opacity: 0, duration: 0.8 }, 0.5)
        .from('.landing-cta-row > *', { y: 16, opacity: 0, duration: 0.6, stagger: 0.08 }, 0.62)
        .from('.landing-trust', { opacity: 0, duration: 0.8 }, 0.86)
        .from('.landing-mock', { y: 56, opacity: 0, scale: 0.965, duration: 1.25, ease: 'power3.out' }, 0.4)
        .from('.landing-cue', { opacity: 0, duration: 0.8 }, 1.15);

      // 히어로를 떠날 때 — 카피는 위로 흘러가고 목업이 천천히 따라온다
      gsap.to('.landing-hero .landing-copy', {
        yPercent: -10,
        opacity: 0.3,
        ease: 'none',
        scrollTrigger: { trigger: sections[0], start: 'top top', end: 'bottom 35%', scrub: true },
      });
      gsap.to('.landing-mock', {
        yPercent: -6,
        ease: 'none',
        scrollTrigger: { trigger: sections[0], start: 'top top', end: 'bottom top', scrub: true },
      });
      gsap.to('.landing-cue', {
        opacity: 0,
        ease: 'none',
        scrollTrigger: { trigger: sections[0], start: '4% top', end: '14% top', scrub: true },
      });

      // Chapter 01–04 — 장면 등장 + 유령 숫자 패럴랙스
      sections.slice(1).forEach((sec) => {
        const rises = sec.querySelectorAll('[data-rise]');
        if (rises.length) {
          gsap.from(rises, {
            y: 44,
            opacity: 0,
            duration: 1,
            ease: 'power3.out',
            stagger: 0.09,
            scrollTrigger: { trigger: sec, start: 'top 70%', toggleActions: 'play none none reverse' },
          });
        }
        const num = sec.querySelector('.landing-num');
        if (num) {
          gsap.fromTo(
            num,
            { yPercent: 24 },
            {
              yPercent: -16,
              ease: 'none',
              scrollTrigger: { trigger: sec, start: 'top bottom', end: 'bottom top', scrub: true },
            },
          );
        }
      });

      // 터미널 라인은 한 줄씩 흘러나온다
      gsap.from('.landing-term-line', {
        y: 12,
        opacity: 0,
        duration: 0.55,
        ease: 'power2.out',
        stagger: 0.16,
        scrollTrigger: { trigger: '.landing-terminal', start: 'top 72%', toggleActions: 'play none none reverse' },
      });
    });

    // 미세 패럴랙스 — 데스크톱에서만 (모바일은 정적으로 두어 성능 확보)
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 821px)', () => {
      Array.from(root.querySelectorAll<HTMLElement>('[data-depth]')).forEach((el) => {
        const depth = parseFloat(el.dataset.depth || '0.2');
        gsap.fromTo(
          el,
          { y: 60 * depth },
          {
            y: -90 * depth,
            ease: 'none',
            scrollTrigger: {
              trigger: el.closest('.landing-chapter') || el,
              start: 'top bottom',
              end: 'bottom top',
              scrub: true,
            },
          },
        );
      });
    });

    // 웹폰트 적용으로 레이아웃이 바뀌면 트리거 좌표 재계산
    document.fonts.ready.then(() => ScrollTrigger.refresh()).catch(() => {});

    return () => {
      lenis?.off('scroll', sync);
      mm.revert();
      fluid?.dispose();
      document.body.classList.remove('landing-active');
      window.scrollTo(0, 0); // 긴 랜딩 → 앱 페이지 전환 시 상단에서 시작
    };
  }, []);

  return (
    <div className="landing" ref={rootRef}>
      <canvas ref={canvasRef} className="landing-canvas" aria-hidden="true" />

      {/* ── Chapter 00 — 선언 ─────────────────────────────────────────── */}
      <section className="landing-chapter landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">AI Career Operations</p>
          <h1 className="landing-headline">
            <span className="landing-line"><span>지원하지 말고,</span></span>
            <span className="landing-line"><span>운영하세요.</span></span>
          </h1>
          <p className="landing-sub">
            career-ops는 채용 공고 평가부터 맞춤 CV, 지원 실행, 후속 관리까지 —
            구직의 전 과정을 하나의 운영 체계로 바꾸는 AI 커리어 에이전트입니다.
          </p>
          <div className="landing-cta-row">
            <button className="landing-btn primary" onClick={() => setPage('signup')}>
              무료로 시작하기 <ArrowRight size={17} />
            </button>
            <button className="landing-btn ghost" onClick={() => setPage('workspace')}>
              워크스페이스 둘러보기
            </button>
          </div>
          <p className="landing-trust">{modeCount}개 운영 모드 · A–G 평가 루브릭 · 고스트 공고 감지</p>
        </div>

        <div className="landing-mock" aria-hidden="true">
          <div className="landing-glow" data-depth="0.08" />
          <div className="landing-frame">
            <div className="landing-frame-bar"><i /><span>career-ops — 적합도 분석</span></div>
            <div className="landing-frame-body">
              <div className="landing-frame-doc">
                <b style={{ width: '46%' }} />
                <b style={{ width: '88%' }} />
                <b className="hl" style={{ width: '72%' }} />
                <b style={{ width: '64%' }} />
                <b style={{ width: '78%' }} />
              </div>
              <div className="landing-frame-score">
                <div className="landing-ring" />
                <strong>A−</strong>
                <small>종합 적합도</small>
              </div>
            </div>
          </div>
          <div className="landing-chip one" data-depth="0.3"><span>RISK</span><strong>B</strong><small>역할 명확도</small></div>
          <div className="landing-chip two" data-depth="0.22"><span>NEXT</span><strong>지원</strong><small>맞춤 CV 준비됨</small></div>
        </div>

        <div className="landing-cue" aria-hidden="true"><i /><span>Scroll</span></div>
      </section>

      {/* ── Chapter 01 — 평가 ─────────────────────────────────────────── */}
      <section className="landing-chapter">
        <span className="landing-num" aria-hidden="true">01</span>
        <p className="landing-kicker" data-rise>Chapter 01 — 평가</p>
        <h2 data-rise>모든 공고를,<br />같은 잣대로.</h2>
        <p className="landing-sub" data-rise>
          붙여넣은 채용 공고를 A–G 루브릭으로 구조화해 평가합니다.
          적합도·리스크·신뢰성·성장 신호·다음 액션까지 — 감이 아니라 기준으로 판단하세요.
        </p>
        <div className="landing-cards">
          <article className="landing-card" data-rise data-depth="0.16">
            <Sparkles size={18} />
            <h3>적합도</h3>
            <p>요구 역량과 내 프로필의 정렬을 점수로. 부족한 부분은 보완 전략까지 제시합니다.</p>
          </article>
          <article className="landing-card" data-rise data-depth="0.26">
            <ShieldAlert size={18} />
            <h3>리스크</h3>
            <p>역할 모호성, 조직 신호, 공고 속 빨간 깃발을 지원 전에 미리 표시합니다.</p>
          </article>
          <article className="landing-card" data-rise data-depth="0.2">
            <BookOpenText size={18} />
            <h3>서사</h3>
            <p>이 공고가 내 커리어 스토리와 어떻게 연결되는지, 어떤 문장으로 말할지 정리합니다.</p>
          </article>
          <article className="landing-card" data-rise data-depth="0.3">
            <ListChecks size={18} />
            <h3>다음 액션</h3>
            <p>지원, 보류, 회피 — 결론과 함께 바로 실행할 수 있는 다음 단계를 제안합니다.</p>
          </article>
        </div>
        <button className="landing-link" onClick={() => setPage('offer')}>적합도 분석 열기 <ArrowRight size={15} /></button>
      </section>

      {/* ── Chapter 02 — 탐색 ─────────────────────────────────────────── */}
      <section className="landing-chapter">
        <span className="landing-num" aria-hidden="true">02</span>
        <p className="landing-kicker" data-rise>Chapter 02 — 탐색</p>
        <h2 data-rise>진짜 기회만<br />흐르게.</h2>
        <p className="landing-sub" data-rise>
          설정한 포털을 스캔해 매칭 공고를 인박스로 모읍니다. 오래 방치됐거나
          신뢰 신호가 약한 고스트 공고는 자동으로 걸러냅니다.
        </p>
        <div className="landing-stream">
          <div className="landing-job" data-rise data-depth="0.14">
            <span className="ok" />
            <div><strong>ML Platform Engineer</strong><small>매칭 — 인박스 추가</small></div>
            <Radar size={16} />
          </div>
          <div className="landing-job" data-rise data-depth="0.24">
            <span className="ok" />
            <div><strong>AI Product Manager</strong><small>매칭 — 평가 대기</small></div>
            <ScanSearch size={16} />
          </div>
          <div className="landing-job ghosted" data-rise data-depth="0.34">
            <span className="no" />
            <div><strong>Senior Everything Ninja</strong><small>고스트 의심 — 제외됨</small></div>
            <Ghost size={16} />
          </div>
        </div>
        <button className="landing-link" onClick={() => setPage('discover')}>공고 탐색 열기 <ArrowRight size={15} /></button>
      </section>

      {/* ── Chapter 03 — 실행 (다크) ──────────────────────────────────── */}
      <section className="landing-chapter landing-dark">
        <span className="landing-num" aria-hidden="true">03</span>
        <p className="landing-kicker" data-rise>Chapter 03 — 실행</p>
        <h2 data-rise>평가에서 지원서까지,<br />한 흐름으로.</h2>
        <p className="landing-sub" data-rise>
          공고별 맞춤 CV 생성, PDF 패키징, 지원 실행, 후속 연락, 트래커 기록 —
          {modeCount}개 운영 모드가 하나의 파이프라인으로 이어집니다.
        </p>
        <div className="landing-terminal" data-rise>
          <div className="landing-term-bar"><i /></div>
          <p className="landing-term-line"><span className="m">POST</span> /api/career-ops/auto-pipeline</p>
          <p className="landing-term-line"><span className="ok">✓</span> 공고 평가 완료 — A–G 리포트 생성</p>
          <p className="landing-term-line"><span className="ok">✓</span> CV 맞춤화 — PDF 패키징</p>
          <p className="landing-term-line"><span className="ok">✓</span> 트래커 기록 — 후속 일정 등록</p>
          <p className="landing-term-line"><span className="landing-caret" /></p>
        </div>
        <div className="landing-steps" data-rise>
          <span>평가</span><i /><span>CV</span><i /><span>지원</span><i /><span>추적</span>
        </div>
      </section>

      {/* ── Chapter 04 — 시작 ─────────────────────────────────────────── */}
      <section className="landing-chapter landing-final">
        <p className="landing-kicker" data-rise>Chapter 04 — 시작</p>
        <h2 data-rise>이제, 당신의 커리어를<br />운영할 차례입니다.</h2>
        <p className="landing-sub" data-rise>가입 후 바로 — CV 한 장과 공고 하나면 충분합니다.</p>
        <div className="landing-cta-row" data-rise>
          <button className="landing-btn primary" onClick={() => setPage('signup')}>
            무료로 시작하기 <ArrowRight size={17} />
          </button>
          <button className="landing-btn ghost" onClick={() => setPage('offer')}>
            적합도 분석 먼저 보기
          </button>
        </div>
        <div className="landing-meta" data-rise>
          <div><strong>{modeCount}</strong><span>운영 모드</span></div>
          <div><strong>A–G</strong><span>평가 루브릭</span></div>
          <div><strong>Block G</strong><span>고스트 공고 감지</span></div>
        </div>
      </section>
    </div>
  );
}
