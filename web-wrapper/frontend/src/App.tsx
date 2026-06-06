import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Braces,
  BriefcaseBusiness,
  CreditCard,
  FileText,
  Layers3,
  Loader2,
  LogOut,
  MapPinned,
  Play,
  RefreshCw,
  Save,
  Search,
  Send,
  Settings,
  Sparkles,
} from 'lucide-react';
import { ApiError, get, post, put } from './api';
import { careerCommands, modeOptions, tabs } from './constants';
import { CommandGrid } from './components/CommandGrid';
import { Footer } from './components/Footer';
import { OnboardingStrip } from './components/OnboardingStrip';
import { PipelineList } from './components/PipelineList';
import { ResultPanel } from './components/ResultPanel';
import { TrackerTable } from './components/TrackerTable';
import { cx } from './components/cx';
import { TermsPage } from './legal/TermsPage';
import { PrivacyPage } from './legal/PrivacyPage';
import { RefundPage } from './legal/RefundPage';
import { PricingPage } from './legal/PricingPage';
import type { CareerCommand, CommandResult, Health, Page, PipelineItem, SetupData, Tab, TrackerRow, User } from './types';

// 해시 라우팅: 공개 페이지(약관·개인정보·환불·이용권)를 공유 가능한 URL로 노출하기 위함.
// 결제 가맹 심사 시 심사관이 로그인 없이 해당 URL에 직접 접근할 수 있어야 한다.
const PAGES: Page[] = ['workspace', 'offer', 'discover', 'api', 'setup', 'terms', 'privacy', 'refund', 'pricing'];

function pageFromHash(): Page | null {
  const raw = window.location.hash.replace(/^#\/?/, '');
  return (PAGES as string[]).includes(raw) ? (raw as Page) : null;
}

const emptySetup: SetupData = {
  cv_md: '',
  profile_yml: '',
  mode_profile_md: '',
  portals_yml: '',
  onboarding: {},
};

export function App() {
  const [page, setPage] = useState<Page>(() => pageFromHash() ?? 'workspace');
  const [tab, setTab] = useState<Tab>('evaluate');
  const [health, setHealth] = useState<Health>();
  const [user, setUser] = useState<User | null>(null);
  const [setup, setSetup] = useState<SetupData>(emptySetup);
  const [result, setResult] = useState<CommandResult>();
  const [loading, setLoading] = useState(false);
  const [jd, setJd] = useState('');
  const [mode, setMode] = useState('auto');
  const [selectedApiMode, setSelectedApiMode] = useState('auto-pipeline');
  const [commandInput, setCommandInput] = useState('');
  const [commands, setCommands] = useState<CareerCommand[]>(careerCommands);
  const [company, setCompany] = useState('');
  const [tracker, setTracker] = useState<TrackerRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [html, setHtml] = useState('<html><body><h1>Your Name</h1><p>Career-ready CV preview</p></body></html>');
  const [notice, setNotice] = useState<{ message: string; tone: 'ok' | 'warn' } | null>(null);
  const [paywallOpen, setPaywallOpen] = useState(false);

  function showNotice(message: string, tone: 'ok' | 'warn' = 'ok') {
    setNotice({ message, tone });
    window.setTimeout(() => setNotice(null), 4000);
  }

  const trackerStats = useMemo(() => {
    const stats = new Map<string, number>();
    tracker.forEach((row) => stats.set(row.status || 'Unknown', (stats.get(row.status || 'Unknown') || 0) + 1));
    return Array.from(stats.entries()).slice(0, 4);
  }, [tracker]);

  const selectedCommand = useMemo(
    () => commands.find((item) => item.mode === selectedApiMode) || careerCommands[0],
    [commands, selectedApiMode],
  );

  useEffect(() => {
    bootstrap();
  }, []);

  // 브라우저 뒤로/앞으로, 직접 해시 입력에 반응해 페이지를 동기화한다.
  useEffect(() => {
    const apply = () => {
      const next = pageFromHash();
      if (next) setPage(next);
    };
    window.addEventListener('hashchange', apply);
    return () => window.removeEventListener('hashchange', apply);
  }, []);

  // 페이지 전환 시 URL 해시를 갱신해 공유 가능한 링크를 유지한다.
  useEffect(() => {
    const target = `#/${page}`;
    if (window.location.hash !== target) {
      window.history.replaceState(null, '', target);
    }
  }, [page]);

  async function bootstrap() {
    const [me, healthData] = await Promise.all([
      get<{ user: User | null }>('/api/auth/me').catch(() => ({ user: null })),
      get<Health>('/api/health').catch((e) => ({ ok: false, error: String(e) })),
    ]);
    setUser(me.user);
    setHealth(healthData);
    await loadCommands();
    if (me.user) {
      await Promise.all([loadSetup(), loadTracker(true), loadPipeline(true)]);
    }
  }

  async function refreshHealth() {
    setHealth(await get<Health>('/api/health').catch((e) => ({ ok: false, error: String(e) })));
  }

  async function loadSetup() {
    setSetup(await get<SetupData>('/api/setup'));
  }

  async function loadTracker(authenticated = Boolean(user)) {
    if (!authenticated) return;
    const data = await get<{ rows: TrackerRow[] }>('/api/tracker');
    setTracker(data.rows);
  }

  async function loadPipeline(authenticated = Boolean(user)) {
    if (!authenticated) return;
    const data = await get<{ items: PipelineItem[] }>('/api/pipeline');
    setPipeline(data.items);
  }

  async function loadCommands() {
    try {
      const data = await get<{ commands: CareerCommand[] }>('/api/career-ops/commands');
      setCommands(data.commands.length ? data.commands : careerCommands);
    } catch {
      setCommands(careerCommands);
    }
  }

  async function run(action: () => Promise<CommandResult>) {
    if (!user) {
      showNotice('로그인이 필요합니다', 'warn');
      setPage('setup');
      return;
    }
    setLoading(true);
    setResult(undefined);
    try {
      setResult(await action());
      await Promise.all([loadTracker(), loadPipeline(), refreshHealth()]);
    } catch (e: unknown) {
      if (e instanceof ApiError) {
        if (e.status === 401) {
          showNotice('로그인이 필요합니다', 'warn');
          setPage('setup');
          return;
        }
        if (e.status === 402) {
          const code = (e.detail as { code?: string } | null)?.code;
          if (code === 'paid_quota_exceeded') {
            showNotice('오늘 한도를 모두 사용했어요. 내일 다시 이용해 주세요.', 'warn');
          } else {
            setPaywallOpen(true);
          }
          return;
        }
      }
      setResult({ ok: false, returncode: -1, stdout: '', stderr: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function saveSetup() {
    setLoading(true);
    try {
      const saved = await put<SetupData>('/api/setup', setup);
      setSetup(saved);
      await refreshHealth();
      const ob = saved.onboarding || {};
      const done = ['cv', 'profile', 'mode_profile', 'portals'].filter((key) => ob[key]).length;
      showNotice(
        done === 4 ? '필요한 문서 4개를 모두 작성했습니다 ✓' : `저장 완료 — ${done}/4개 문서 작성됨`,
        done === 4 ? 'ok' : 'warn',
      );
    } catch (e) {
      showNotice(e instanceof Error ? `저장 실패: ${e.message}` : '저장에 실패했습니다', 'warn');
    } finally {
      setLoading(false);
    }
  }

  function runCareerOps(selectedMode: string, input: string) {
    const resolvedMode = selectedMode === 'auto' ? '' : selectedMode;
    return post<CommandResult>('/api/career-ops', { mode: resolvedMode, input });
  }

  function runCareerOpsMode(selectedMode: string, input: string) {
    return post<CommandResult>(`/api/career-ops/${selectedMode}`, { input });
  }

  async function logout() {
    await post('/api/auth/logout');
    setUser(null);
    setSetup(emptySetup);
    setResult(undefined);
    setPage('workspace');
    await refreshHealth();
  }

  return (
    <main className={`page-${page}`}>
      {notice && <div className={cx('toast-notice', notice.tone)} role="status">{notice.message}</div>}
      {paywallOpen && (
        <div className="paywall-backdrop" role="dialog" aria-modal="true" aria-labelledby="paywall-title" onClick={() => setPaywallOpen(false)}>
          <div className="paywall-modal" onClick={(e) => e.stopPropagation()}>
            <h3 id="paywall-title">오늘 무료 한도를 다 쓰셨어요</h3>
            <p>무료 이용량을 모두 사용했어요. 계속하려면 이용권을 확인해 주세요.</p>
            <div className="paywall-actions">
              <button onClick={() => { setPaywallOpen(false); setPage('pricing'); }}>
                <CreditCard size={16} /> 이용권 보기
              </button>
              <button className="secondary" onClick={() => setPaywallOpen(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}
      <header className="app-nav">
        <div className="brand-mark" aria-label="career-ops brand">
          <BriefcaseBusiness size={17} />
          <span>career-ops</span>
        </div>
        <nav className="page-switcher" aria-label="Primary navigation">
          <button className={page === 'workspace' ? 'active' : ''} onClick={() => setPage('workspace')}><Sparkles size={16} />워크스페이스</button>
          <button className={page === 'offer' ? 'active' : ''} onClick={() => setPage('offer')}><Activity size={16} />적합도 분석</button>
          <button className={page === 'discover' ? 'active' : ''} onClick={() => setPage('discover')}><Search size={16} />공고 탐색</button>
          <button className={page === 'api' ? 'active' : ''} onClick={() => setPage('api')}><Layers3 size={16} />API 모드</button>
          <button className={page === 'pricing' ? 'active' : ''} onClick={() => setPage('pricing')}><CreditCard size={16} />이용권</button>
          <button className={page === 'setup' ? 'active' : ''} onClick={() => setPage('setup')}><Settings size={16} />로그인</button>
        </nav>
        {user ? (
          <button className="nav-status login-action" onClick={logout} aria-label="Logout">
            <LogOut size={15} />
            로그아웃
          </button>
        ) : (
          <button className="nav-status login-action" onClick={() => setPage('setup')} aria-label="Login">
            <span className="connection offline" />
            로그인
          </button>
        )}
      </header>

      {page === 'workspace' && (
        <WorkspacePage
          tab={tab}
          setTab={setTab}
          health={health}
          result={result}
          loading={loading}
          jd={jd}
          setJd={setJd}
          mode={mode}
          setMode={setMode}
          commands={commands}
          pipeline={pipeline}
          tracker={tracker}
          trackerStats={trackerStats}
          company={company}
          setCompany={setCompany}
          html={html}
          setHtml={setHtml}
          setPage={setPage}
          run={run}
          runCareerOps={runCareerOps}
          loadPipeline={loadPipeline}
          loadTracker={loadTracker}
        />
      )}

      {page === 'offer' && (
        <OfferFitPage
          health={health}
          result={result}
          loading={loading}
          jd={jd}
          setJd={setJd}
          mode={mode}
          setMode={setMode}
          commands={commands}
          pipeline={pipeline}
          tracker={tracker}
          run={run}
          runCareerOps={runCareerOps}
        />
      )}

      {page === 'discover' && (
        <DiscoverPage
          health={health}
          result={result}
          loading={loading}
          company={company}
          setCompany={setCompany}
          commands={commands}
          pipeline={pipeline}
          tracker={tracker}
          loadPipeline={loadPipeline}
          run={run}
        />
      )}

      {page === 'api' && (
        <ApiModesPage
          health={health}
          result={result}
          loading={loading}
          commands={commands}
          selectedApiMode={selectedApiMode}
          setSelectedApiMode={setSelectedApiMode}
          selectedCommand={selectedCommand}
          commandInput={commandInput}
          setCommandInput={setCommandInput}
          run={run}
          runCareerOpsMode={runCareerOpsMode}
          loadCommands={loadCommands}
        />
      )}

      {page === 'setup' && (
        user
          ? <SetupPage setup={setup} setSetup={setSetup} loading={loading} onSave={saveSetup} />
          : <AuthPage onDone={bootstrap} health={health} onNotice={showNotice} />
      )}

      {page === 'terms' && <TermsPage />}
      {page === 'privacy' && <PrivacyPage />}
      {page === 'refund' && <RefundPage />}
      {page === 'pricing' && <PricingPage setPage={setPage} />}

      <Footer setPage={setPage} />
    </main>
  );
}

function AuthPage({ onDone, health, onNotice }: { onDone: () => Promise<void>; health?: Health; onNotice: (message: string, tone?: 'ok' | 'warn') => void }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);
    setError('');
    try {
      await post(isRegister ? '/api/auth/register' : '/api/auth/login', { email, password });
      onNotice(isRegister ? '가입이 완료되었습니다 ✓ 이제 문서를 작성해 보세요.' : '로그인되었습니다 ✓');
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page-workspace">
      <section className="auth-shell">
        <div className="auth-copy">
          <span className="eyebrow"><BriefcaseBusiness size={16} /> career-ops</span>
          <h1>개인 데이터를 저장하고 기존 `/career-ops` 모드를 실행하세요.</h1>
          <p>CV, 프로필, 모드 오버라이드, 포털 설정을 사용자별로 저장한 뒤 API가 실행 시 repo 파일로 동기화합니다.</p>
          <div className="api-mode-strip">
            <span>로그인</span>
            <span>사용자별 설정</span>
            <span>{health?.ok ? '백엔드 연결됨' : '백엔드 확인 필요'}</span>
          </div>
        </div>
        <div className="auth-panel">
          <h2>{isRegister ? '회원가입' : '로그인'}</h2>
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@example.com" />
          <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="비밀번호 8자 이상" type="password" />
          {error && <div className="warn">{error}</div>}
          <button disabled={loading || !email || password.length < 8} onClick={submit}>
            {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
            {isRegister ? '계정 만들기' : '로그인'}
          </button>
          <button className="secondary" onClick={() => setIsRegister(!isRegister)}>
            {isRegister ? '이미 계정이 있어요' : '새 계정 만들기'}
          </button>
        </div>
      </section>
    </main>
  );
}

function SetupPage({
  setup,
  setSetup,
  loading,
  onSave,
}: {
  setup: SetupData;
  setSetup: (setup: SetupData) => void;
  loading: boolean;
  onSave: () => Promise<void>;
}) {
  const fields = [
    ['cv_md', 'cv.md', 'Summary, Experience, Projects, Education, Skills 형식의 CV 마크다운'],
    ['profile_yml', 'config/profile.yml', '이름, 이메일, 위치, 목표 역할, 연봉 범위 등 YAML'],
    ['mode_profile_md', 'modes/_profile.md', '개인화된 평가 기준, 선호/비선호, 서사 오버라이드'],
    ['portals_yml', 'portals.yml', '스캔할 회사/포털과 title_filter 설정'],
  ] as const;

  return (
    <section className="setup-editor">
      <div className="section-head">
        <div>
          <span className="kicker">사용자 데이터</span>
          <h2>기존 `/career-ops`가 읽는 네 파일을 계정별로 저장합니다.</h2>
        </div>
        <button disabled={loading} onClick={onSave}>
          {loading ? <Loader2 className="spin" size={18} /> : <Save size={18} />}
          저장
        </button>
      </div>
      <div className="setup-grid">
        {fields.map(([key, label, hint]) => (
          <label key={key} className="setup-field">
            <span>{label}</span>
            <small>{hint}</small>
            <textarea rows={10} value={setup[key]} onChange={(e) => setSetup({ ...setup, [key]: e.target.value })} />
          </label>
        ))}
      </div>
    </section>
  );
}

type WorkspacePageProps = {
  tab: Tab;
  setTab: (tab: Tab) => void;
  health: Health | undefined;
  result: CommandResult | undefined;
  loading: boolean;
  jd: string;
  setJd: (value: string) => void;
  mode: string;
  setMode: (value: string) => void;
  commands: CareerCommand[];
  pipeline: PipelineItem[];
  tracker: TrackerRow[];
  trackerStats: [string, number][];
  company: string;
  setCompany: (value: string) => void;
  html: string;
  setHtml: (value: string) => void;
  setPage: (page: Page) => void;
  run: (action: () => Promise<CommandResult>) => Promise<void>;
  runCareerOps: (selectedMode: string, input: string) => Promise<CommandResult>;
  loadPipeline: () => Promise<void>;
  loadTracker: () => Promise<void>;
};

function WorkspacePage({
  tab,
  setTab,
  health,
  result,
  loading,
  jd,
  setJd,
  mode,
  setMode,
  commands,
  pipeline,
  tracker,
  trackerStats,
  company,
  setCompany,
  html,
  setHtml,
  setPage,
  run,
  runCareerOps,
  loadPipeline,
  loadTracker,
}: WorkspacePageProps) {
  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><BriefcaseBusiness size={16} /> Career-Ops 커맨드 센터</span>
          <h1>취업 성공 60% 증가</h1>
          <p>백엔드 커리어 모드 실행, 직무 평가, 포털 스캔, 파이프라인 관리를 한 곳에서.</p>
          <div className="hero-actions">
            <button onClick={() => setPage('api')}><Layers3 size={18} /> API 모드 열기</button>
            <button onClick={() => setTab('evaluate')}><Sparkles size={18} /> 직무 평가</button>
            <button className="secondary" onClick={() => setTab('scan')}><Search size={18} /> 공고 찾기</button>
          </div>
        </div>

        <div className="hero-visual editorial-collage" aria-label="Career ops editorial workspace artwork">
          <div className="paper-arch" />
          <div className="coral-slab" />
          <div className="teal-window" />
          <div className="stone-form" />
          <div className="folio-sheet"><span>01</span><strong>적합도 점수</strong><small>A-G 평가</small></div>
          <div className="folio-sheet offset"><span>02</span><strong>CV 맞춤화</strong><small>직무 서사</small></div>
          <div className="yellow-dot" />
          <div className="visual-overlay" aria-label="Career ops overview">
            <span><Activity size={15} /> 라이브 워크스페이스</span>
            <div><strong>{commands.length}</strong><small>라우터 모드</small></div>
            <div><strong>{pipeline.length}</strong><small>인박스</small></div>
            <div><strong>{tracker.length}</strong><small>추적 중</small></div>
          </div>
        </div>
      </section>

      <StatusAndMetrics health={health} commands={commands} pipeline={pipeline} tracker={tracker} />

      <section className="product-shell">
        <nav className="tabs" aria-label="Workspace navigation">
          {tabs.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? 'active' : ''}><Icon size={16} />{item.label}</button>;
          })}
        </nav>

        <section className="workspace">
          <div className="tool-surface">
            {tab === 'evaluate' && (
              <>
                <div className="section-head">
                  <div><span className="kicker">직무 인텔리전스</span><h2>채용 공고를 평가하거나 career-ops 모드를 실행하세요.</h2></div>
                  <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Career ops mode">
                    {modeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <textarea rows={13} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="직무 URL, 전체 JD, 또는 지시사항을 붙여넣으세요." />
                <div className="button-row">
                  <button disabled={loading || jd.trim().length < 3} onClick={() => run(() => runCareerOps(mode, jd))}>{loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}에이전트 실행</button>
                  <button className="secondary" disabled={loading} onClick={() => run(() => runCareerOps('', ''))}><MapPinned size={18} />명령어 보기</button>
                </div>
              </>
            )}

            {tab === 'scan' && (
              <>
                <div className="section-head"><div><span className="kicker">기회 발굴</span><h2>타겟 포털을 스캔하고 관련 직무를 인박스에 추가하세요.</h2></div></div>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사 필터 (선택), 예: OpenAI" />
                <div className="button-row">
                  <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: true, company: company || null }))}><Search size={18} />스캔 미리보기</button>
                  <button className="secondary" disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: false, company: company || null }))}><Send size={18} />매칭 저장</button>
                </div>
              </>
            )}

            {tab === 'pipeline' && (
              <>
                <div className="section-head"><div><span className="kicker">공고 인박스</span><h2>평가 대기 중인 직무를 확인하세요.</h2></div><button className="icon-button" onClick={loadPipeline} aria-label="Refresh pipeline"><RefreshCw size={17} /></button></div>
                <PipelineList items={pipeline} />
              </>
            )}

            {tab === 'tracker' && (
              <>
                <div className="section-head"><div><span className="kicker">지원 파이프라인</span><h2>평가, 지원, 대기 상태를 확인하세요.</h2></div><button className="icon-button" onClick={loadTracker} aria-label="Refresh tracker"><RefreshCw size={17} /></button></div>
                <div className="stat-row">
                  <div><strong>{tracker.length}</strong><span>전체</span></div>
                  {trackerStats.map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}
                </div>
                <TrackerTable rows={tracker} />
              </>
            )}

            {tab === 'pdf' && (
              <>
                <div className="section-head"><div><span className="kicker">CV 패키징</span><h2>HTML CV 미리보기에서 PDF를 생성하세요.</h2></div></div>
                <textarea rows={13} value={html} onChange={(e) => setHtml(e.target.value)} />
                <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/pdf', { html, filename: 'career-ops-cv', format: 'a4' }))}><FileText size={18} />PDF 생성</button>
              </>
            )}
          </div>

          <ResultPanel result={result} />
        </section>
      </section>
    </>
  );
}

type OfferFitPageProps = {
  health: Health | undefined;
  result: CommandResult | undefined;
  loading: boolean;
  jd: string;
  setJd: (value: string) => void;
  mode: string;
  setMode: (value: string) => void;
  commands: CareerCommand[];
  pipeline: PipelineItem[];
  tracker: TrackerRow[];
  run: (action: () => Promise<CommandResult>) => Promise<void>;
  runCareerOps: (selectedMode: string, input: string) => Promise<CommandResult>;
};

function OfferFitPage({ health, result, loading, jd, setJd, mode, setMode, commands, pipeline, tracker, run, runCareerOps }: OfferFitPageProps) {
  return (
    <>
      <section className="focus-hero offer-hero">
        <div className="focus-copy">
          <span className="eyebrow"><Activity size={16} /> 적합도 분석</span>
          <h1>채용공고, 기업별 맞춤설계</h1>
          <p>채용 공고나 URL을 붙여넣으면 career-ops가 적합도, 리스크, 신뢰성, 서사, 다음 액션을 평가합니다.</p>
          <div className="api-mode-strip"><span>A-G 점수</span><span>CV 시그널</span><span>트래커 연동</span></div>
        </div>
        <div className="focus-art offer-art" aria-label="Offer fit collage">
          <div className="fit-orbit" />
          <div className="fit-card primary"><span>적합도</span><strong>4.2</strong><small>지원 신호</small></div>
          <div className="fit-card secondary"><span>리스크</span><strong>B</strong><small>역할 명확도</small></div>
          <div className="fit-document"><i /><i /><i /><i /></div>
          <div className="fit-ruler" />
          <div className="fit-coral" />
          <div className="fit-yellow" />
        </div>
      </section>

      <StatusAndMetrics health={health} commands={commands} pipeline={pipeline} tracker={tracker} compact />

      <section className="focus-layout">
        <div className="focus-panel">
          <div className="section-head">
            <div><span className="kicker">직무 인텔리전스</span><h2>채용 공고를 평가하거나 career-ops 모드를 실행하세요.</h2></div>
            <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Career ops mode">
              {modeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <textarea rows={13} value={jd} onChange={(e) => setJd(e.target.value)} placeholder="직무 URL, 전체 JD, 또는 지시사항을 붙여넣으세요." />
          <div className="button-row">
            <button disabled={loading || jd.trim().length < 3} onClick={() => run(() => runCareerOps(mode, jd))}>{loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}적합도 분석 실행</button>
            <button className="secondary" disabled={loading} onClick={() => run(() => runCareerOps('', ''))}><MapPinned size={18} />명령어 보기</button>
          </div>
        </div>
        <ResultPanel result={result} />
      </section>
    </>
  );
}

type DiscoverPageProps = {
  health: Health | undefined;
  result: CommandResult | undefined;
  loading: boolean;
  company: string;
  setCompany: (value: string) => void;
  commands: CareerCommand[];
  pipeline: PipelineItem[];
  tracker: TrackerRow[];
  loadPipeline: () => Promise<void>;
  run: (action: () => Promise<CommandResult>) => Promise<void>;
};

function DiscoverPage({ health, result, loading, company, setCompany, commands, pipeline, tracker, loadPipeline, run }: DiscoverPageProps) {
  return (
    <>
      <section className="focus-hero discover-hero">
        <div className="focus-copy">
          <span className="eyebrow"><Search size={16} /> 공고 탐색</span>
          <h1>관심기업 자유롭게 추가하고 분석</h1>
          <p>설정된 포털을 스캔하고, 매칭된 직무를 미리보고, 유망한 공고를 인박스에 추가하세요.</p>
          <div className="api-mode-strip"><span>포털 스캔</span><span>인박스 {pipeline.length}건</span><span>미리보기 먼저</span></div>
        </div>
        <div className="focus-art discover-art" aria-label="Discover collage">
          <div className="discover-map" />
          <div className="discover-path one" />
          <div className="discover-path two" />
          <div className="discover-card"><span>새 직무</span><strong>AI Ops</strong><small>매칭된 포털</small></div>
          <div className="discover-card alt"><span>대기열</span><strong>{pipeline.length}</strong><small>인박스 항목</small></div>
          <div className="discover-teal" />
          <div className="discover-coral" />
          <div className="discover-dot" />
        </div>
      </section>

      <StatusAndMetrics health={health} commands={commands} pipeline={pipeline} tracker={tracker} compact />

      <section className="focus-layout">
        <div className="focus-panel">
          <div className="section-head">
            <div><span className="kicker">기회 발굴</span><h2>타겟 포털을 스캔하고 관련 직무를 인박스에 추가하세요.</h2></div>
            <button className="icon-button" onClick={loadPipeline} aria-label="파이프라인 새로고침"><RefreshCw size={17} /></button>
          </div>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사 필터 (선택), 예: OpenAI" />
          <div className="button-row">
            <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: true, company: company || null }))}><Search size={18} />스캔 미리보기</button>
            <button className="secondary" disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: false, company: company || null }))}><Send size={18} />매칭 저장</button>
          </div>
          <div className="discover-inbox"><PipelineList items={pipeline} /></div>
        </div>
        <ResultPanel result={result} />
      </section>
    </>
  );
}

type ApiModesPageProps = {
  health: Health | undefined;
  result: CommandResult | undefined;
  loading: boolean;
  commands: CareerCommand[];
  selectedApiMode: string;
  setSelectedApiMode: (mode: string) => void;
  selectedCommand: CareerCommand;
  commandInput: string;
  setCommandInput: (input: string) => void;
  run: (action: () => Promise<CommandResult>) => Promise<void>;
  runCareerOpsMode: (selectedMode: string, input: string) => Promise<CommandResult>;
  loadCommands: () => Promise<void>;
};

function ApiModesPage({ health, result, loading, commands, selectedApiMode, setSelectedApiMode, selectedCommand, commandInput, setCommandInput, run, runCareerOpsMode, loadCommands }: ApiModesPageProps) {
  return (
    <>
      <section className="api-hero">
        <div className="api-hero-copy">
          <span className="eyebrow"><Braces size={16} /> 백엔드 라우터 인터페이스</span>
          <h1>API 모음</h1>
          <p>auto-pipeline, scan, batch, followup, tracker, PDF, 면접 준비까지 모든 career-ops 엔드포인트 전용 콘솔.</p>
          <div className="api-mode-strip"><span>{commands.length}개 모드</span><span>POST 라우터</span><span>{health?.ok ? '온라인' : '오프라인'}</span></div>
        </div>

        <div className="api-art api-collage" aria-label="Career ops API mode artwork">
          <div className="router-ring" />
          <div className="router-line one" />
          <div className="router-line two" />
          <div className="router-line three" />
          <div className="api-coral" />
          <div className="api-terminal"><span>POST</span><strong>/api/career-ops</strong><small>모드 라우터</small></div>
          <div className="api-node alpha" />
          <div className="api-node beta" />
          <div className="api-node gamma" />
          <div className="api-art-panel">
            <span className="endpoint-chip strong">{`POST /api/career-ops/${selectedCommand.mode}`}</span>
            <strong>{selectedCommand.command}</strong>
            <small>{selectedCommand.description}</small>
          </div>
        </div>
      </section>

      <StatusAndMetrics health={health} commands={commands} pipeline={[]} tracker={[]} compact />

      <section className="api-layout">
        <div className="api-run-card">
          <div className="section-head">
            <div><span className="kicker">백엔드 API 인터페이스</span><h2>전용 엔드포인트로 모든 career-ops 라우터 모드를 실행하세요.</h2></div>
            <button className="icon-button" onClick={loadCommands} aria-label="Refresh commands"><RefreshCw size={17} /></button>
          </div>
          <div className="mode-brief api-focus">
            <div><span className="endpoint-chip strong">{`POST /api/career-ops/${selectedCommand.mode}`}</span><h3>{selectedCommand.command}</h3><p>{selectedCommand.description}</p></div>
            <span>{commands.length}개 모드 등록됨</span>
          </div>
          <div className="api-runner">
            <div>
              <label htmlFor="api-mode">엔드포인트</label>
              <select id="api-mode" value={selectedApiMode} onChange={(e) => setSelectedApiMode(e.target.value)}>
                {commands.map((item) => <option key={item.mode} value={item.mode}>{`/api/career-ops/${item.mode}`}</option>)}
              </select>
            </div>
            <button disabled={loading} onClick={() => run(() => runCareerOpsMode(selectedApiMode, commandInput))}>{loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}엔드포인트 실행</button>
          </div>
          <textarea rows={9} value={commandInput} onChange={(e) => setCommandInput(e.target.value)} placeholder="선택된 모드의 입력값" />
        </div>
        <ResultPanel result={result} />
      </section>

      <section className="command-catalog">
        <div className="section-head"><div><span className="kicker">모드 카탈로그</span><h2>실행할 백엔드 워크플로우를 선택하세요.</h2></div></div>
        <CommandGrid commands={commands} selectedMode={selectedApiMode} loading={loading} onSelect={setSelectedApiMode} onRun={(commandMode) => run(() => runCareerOpsMode(commandMode, commandInput))} />
      </section>
    </>
  );
}

type StatusAndMetricsProps = {
  health: Health | undefined;
  commands: CareerCommand[];
  pipeline: PipelineItem[];
  tracker: TrackerRow[];
  compact?: boolean;
};

function StatusAndMetrics({ health, commands, pipeline, tracker, compact = false }: StatusAndMetricsProps) {
  return (
    <>
      {!compact && (
        <section className="metric-ribbon" aria-label="Career ops metrics">
          <div><span>라우터 모드</span><strong>{commands.length}</strong></div>
          <div><span>인박스 항목</span><strong>{pipeline.length}</strong></div>
          <div><span>추적 중인 지원</span><strong>{tracker.length}</strong></div>
          <div><span>백엔드</span><strong>{health?.ok ? '온라인' : '오프라인'}</strong></div>
        </section>
      )}
      <section className={cx('topbar', compact && 'compact-status')}>
        <div>
          <span className={cx('connection', health?.ok ? 'online' : 'offline')} />
          {health?.ok ? '백엔드 연결됨' : '백엔드 오프라인'}
          {health?.career_ops_root && <small>{health.career_ops_root}</small>}
        </div>
        <OnboardingStrip health={health} />
      </section>
      {health && !health.ok && <div className="warn">백엔드에서 CAREER_OPS_ROOT를 찾을 수 없습니다: {health.error}</div>}
    </>
  );
}
