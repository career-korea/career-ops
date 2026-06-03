import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Braces,
  BriefcaseBusiness,
  FileText,
  Layers3,
  Loader2,
  MapPinned,
  Play,
  RefreshCw,
  Search,
  Send,
  Sparkles,
} from 'lucide-react';
import { get, post } from './api';
import { careerCommands, modeOptions, tabs } from './constants';
import { CommandGrid } from './components/CommandGrid';
import { OnboardingStrip } from './components/OnboardingStrip';
import { PipelineList } from './components/PipelineList';
import { ResultPanel } from './components/ResultPanel';
import { TrackerTable } from './components/TrackerTable';
import { cx } from './components/cx';
import type { CareerCommand, CommandResult, Health, Page, PipelineItem, Tab, TrackerRow } from './types';

export function App() {
  const [page, setPage] = useState<Page>('workspace');
  const [tab, setTab] = useState<Tab>('evaluate');
  const [health, setHealth] = useState<Health>();
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
    get<Health>('/api/health').then(setHealth).catch((e) => setHealth({ ok: false, error: String(e) }));
    loadCommands();
    loadTracker();
    loadPipeline();
  }, []);

  async function run(action: () => Promise<CommandResult>) {
    setLoading(true);
    setResult(undefined);
    try {
      setResult(await action());
      loadTracker();
      loadPipeline();
    } catch (e: unknown) {
      setResult({ ok: false, returncode: -1, stdout: '', stderr: e instanceof Error ? e.message : String(e) });
    } finally {
      setLoading(false);
    }
  }

  async function loadTracker() {
    const data = await get<{ rows: TrackerRow[] }>('/api/tracker');
    setTracker(data.rows);
  }

  async function loadPipeline() {
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

  function runCareerOps(selectedMode: string, input: string) {
    const resolvedMode = selectedMode === 'auto' ? '' : selectedMode;
    return post<CommandResult>('/api/career-ops', { mode: resolvedMode, input });
  }

  function runCareerOpsMode(selectedMode: string, input: string) {
    return post<CommandResult>(`/api/career-ops/${selectedMode}`, { input });
  }

  return (
    <main className={`page-${page}`}>
      <header className="app-nav">
        <div className="brand-mark" aria-label="career-ops brand">
          <BriefcaseBusiness size={17} />
          <span>career-ops</span>
        </div>
        <nav className="page-switcher" aria-label="Primary navigation">
          <button className={page === 'workspace' ? 'active' : ''} onClick={() => setPage('workspace')}>
            <Sparkles size={16} />
            워크스페이스
          </button>
          <button className={page === 'offer' ? 'active' : ''} onClick={() => setPage('offer')}>
            <Activity size={16} />
            적합도 분석
          </button>
          <button className={page === 'discover' ? 'active' : ''} onClick={() => setPage('discover')}>
            <Search size={16} />
            공고 탐색
          </button>
          <button className={page === 'api' ? 'active' : ''} onClick={() => setPage('api')}>
            <Layers3 size={16} />
            API 모드
          </button>
        </nav>
        <div className="nav-status">
          <span className={cx('connection', health?.ok ? 'online' : 'offline')} />
          {health?.ok ? '백엔드 연결됨' : '백엔드 오프라인'}
        </div>
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
    </main>
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
          <p>
            백엔드 커리어 모드 실행, 직무 평가, 포털 스캔, 파이프라인 관리를 한 곳에서.
          </p>
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
          <div className="folio-sheet">
            <span>01</span>
            <strong>적합도 점수</strong>
            <small>A-G 평가</small>
          </div>
          <div className="folio-sheet offset">
            <span>02</span>
            <strong>CV 맞춤화</strong>
            <small>직무 서사</small>
          </div>
          <div className="yellow-dot" />
          <div className="visual-overlay" aria-label="Career ops overview">
            <span><Activity size={15} /> 라이브 워크스페이스</span>
            <div>
              <strong>{commands.length}</strong>
              <small>라우터 모드</small>
            </div>
            <div>
              <strong>{pipeline.length}</strong>
              <small>인박스</small>
            </div>
            <div>
              <strong>{tracker.length}</strong>
              <small>추적 중</small>
            </div>
          </div>
        </div>
      </section>

      <StatusAndMetrics health={health} commands={commands} pipeline={pipeline} tracker={tracker} />

      <section className="product-shell">
        <nav className="tabs" aria-label="Workspace navigation">
          {tabs.map((item) => {
            const Icon = item.icon;
            return (
              <button key={item.id} onClick={() => setTab(item.id)} className={tab === item.id ? 'active' : ''}>
                <Icon size={16} />
                {item.label}
              </button>
            );
          })}
        </nav>

        <section className="workspace">
          <div className="tool-surface">
            {tab === 'evaluate' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">직무 인텔리전스</span>
                    <h2>채용 공고를 평가하거나 career-ops 모드를 실행하세요.</h2>
                  </div>
                  <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Career ops mode">
                    {modeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <textarea
                  rows={13}
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="직무 URL, 전체 JD, 또는 지시사항을 붙여넣으세요. 예: Anthropic 응용 AI 직무 심층 리서치..."
                />
                <div className="button-row">
                  <button disabled={loading || jd.trim().length < 3} onClick={() => run(() => runCareerOps(mode, jd))}>
                    {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
                    에이전트 실행
                  </button>
                  <button className="secondary" disabled={loading} onClick={() => run(() => runCareerOps('', ''))}>
                    <MapPinned size={18} />
                    명령어 보기
                  </button>
                </div>
              </>
            )}

            {tab === 'scan' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">기회 발굴</span>
                    <h2>타겟 포털을 스캔하고 관련 직무를 인박스에 추가하세요.</h2>
                  </div>
                </div>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사 필터 (선택), 예: OpenAI" />
                <div className="button-row">
                  <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: true, company: company || null }))}>
                    <Search size={18} />
                    스캔 미리보기
                  </button>
                  <button className="secondary" disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: false, company: company || null }))}>
                    <Send size={18} />
                    매칭 저장
                  </button>
                </div>
              </>
            )}

            {tab === 'pipeline' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">공고 인박스</span>
                    <h2>평가 대기 중인 직무를 확인하세요.</h2>
                  </div>
                  <button className="icon-button" onClick={loadPipeline} aria-label="Refresh pipeline"><RefreshCw size={17} /></button>
                </div>
                <PipelineList items={pipeline} />
              </>
            )}

            {tab === 'tracker' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">지원 파이프라인</span>
                    <h2>평가, 지원, 대기 상태를 확인하세요.</h2>
                  </div>
                  <button className="icon-button" onClick={loadTracker} aria-label="Refresh tracker"><RefreshCw size={17} /></button>
                </div>
                <div className="stat-row">
                  <div><strong>{tracker.length}</strong><span>전체</span></div>
                  {trackerStats.map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}
                </div>
                <TrackerTable rows={tracker} />
              </>
            )}

            {tab === 'pdf' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">CV 패키징</span>
                    <h2>HTML CV 미리보기에서 PDF를 생성하세요.</h2>
                  </div>
                </div>
                <textarea rows={13} value={html} onChange={(e) => setHtml(e.target.value)} />
                <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/pdf', { html, filename: 'career-ops-cv', format: 'a4' }))}>
                  <FileText size={18} />
                  PDF 생성
                </button>
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

function OfferFitPage({
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
  run,
  runCareerOps,
}: OfferFitPageProps) {
  return (
    <>
      <section className="focus-hero offer-hero">
        <div className="focus-copy">
          <span className="eyebrow"><Activity size={16} /> 적합도 분석</span>
          <h1>채용공고, 기업별 맞춤설계 </h1>
          <p>
            채용 공고나 URL을 붙여넣으면 career-ops가 적합도, 리스크, 신뢰성, 서사, 다음 액션을 평가합니다.
          </p>
          <div className="api-mode-strip">
            <span>A-G 점수</span>
            <span>CV 시그널</span>
            <span>트래커 연동</span>
          </div>
        </div>
        <div className="focus-art offer-art" aria-label="Offer fit collage">
          <div className="fit-orbit" />
          <div className="fit-card primary">
            <span>적합도</span>
            <strong>4.2</strong>
            <small>지원 신호</small>
          </div>
          <div className="fit-card secondary">
            <span>리스크</span>
            <strong>B</strong>
            <small>역할 명확도</small>
          </div>
          <div className="fit-document">
            <i />
            <i />
            <i />
            <i />
          </div>
          <div className="fit-ruler" />
          <div className="fit-coral" />
          <div className="fit-yellow" />
        </div>
      </section>

      <StatusAndMetrics health={health} commands={commands} pipeline={pipeline} tracker={tracker} compact />

      <section className="focus-layout">
        <div className="focus-panel">
          <div className="section-head">
            <div>
              <span className="kicker">직무 인텔리전스</span>
              <h2>채용 공고를 평가하거나 career-ops 모드를 실행하세요.</h2>
            </div>
            <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Career ops mode">
              {modeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <textarea
            rows={13}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="직무 URL, 전체 JD, 또는 지시사항을 붙여넣으세요. 예: 이 응용 AI 직무를 평가하고 적합도, 리스크, 다음 액션을 설명해주세요..."
          />
          <div className="button-row">
            <button disabled={loading || jd.trim().length < 3} onClick={() => run(() => runCareerOps(mode, jd))}>
              {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              적합도 분석 실행
            </button>
            <button className="secondary" disabled={loading} onClick={() => run(() => runCareerOps('', ''))}>
              <MapPinned size={18} />
              명령어 보기
            </button>
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

function DiscoverPage({
  health,
  result,
  loading,
  company,
  setCompany,
  commands,
  pipeline,
  tracker,
  loadPipeline,
  run,
}: DiscoverPageProps) {
  return (
    <>
      <section className="focus-hero discover-hero">
        <div className="focus-copy">
          <span className="eyebrow"><Search size={16} /> 공고 탐색</span>
          <h1>관심기업 자유롭게 추가하고 분석</h1>
          <p>
            설정된 포털을 스캔하고, 매칭된 직무를 미리보고, 유망한 공고를 인박스에 추가하세요.
          </p>
          <div className="api-mode-strip">
            <span>포털 스캔</span>
            <span>인박스 {pipeline.length}건</span>
            <span>미리보기 먼저</span>
          </div>
        </div>
        <div className="focus-art discover-art" aria-label="Discover collage">
          <div className="discover-map" />
          <div className="discover-path one" />
          <div className="discover-path two" />
          <div className="discover-card">
            <span>새 직무</span>
            <strong>AI Ops</strong>
            <small>매칭된 포털</small>
          </div>
          <div className="discover-card alt">
            <span>대기열</span>
            <strong>{pipeline.length}</strong>
            <small>인박스 항목</small>
          </div>
          <div className="discover-teal" />
          <div className="discover-coral" />
          <div className="discover-dot" />
        </div>
      </section>

      <StatusAndMetrics health={health} commands={commands} pipeline={pipeline} tracker={tracker} compact />

      <section className="focus-layout">
        <div className="focus-panel">
          <div className="section-head">
            <div>
              <span className="kicker">기회 발굴</span>
              <h2>타겟 포털을 스캔하고 관련 직무를 인박스에 추가하세요.</h2>
            </div>
            <button className="icon-button" onClick={loadPipeline} aria-label="파이프라인 새로고침"><RefreshCw size={17} /></button>
          </div>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="회사 필터 (선택), 예: OpenAI" />
          <div className="button-row">
            <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: true, company: company || null }))}>
              <Search size={18} />
              스캔 미리보기
            </button>
            <button className="secondary" disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: false, company: company || null }))}>
              <Send size={18} />
              매칭 저장
            </button>
          </div>
          <div className="discover-inbox">
            <PipelineList items={pipeline} />
          </div>
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

function ApiModesPage({
  health,
  result,
  loading,
  commands,
  selectedApiMode,
  setSelectedApiMode,
  selectedCommand,
  commandInput,
  setCommandInput,
  run,
  runCareerOpsMode,
  loadCommands,
}: ApiModesPageProps) {
  return (
    <>
      <section className="api-hero">
        <div className="api-hero-copy">
          <span className="eyebrow"><Braces size={16} /> 백엔드 라우터 인터페이스</span>
          <h1>API 모음</h1>
          <p>
            auto-pipeline, scan, batch, followup, tracker, PDF, 면접 준비까지 — 모든 career-ops 엔드포인트 전용 콘솔.
          </p>
          <div className="api-mode-strip">
            <span>{commands.length}개 모드</span>
            <span>POST 라우터</span>
            <span>{health?.ok ? '온라인' : '오프라인'}</span>
          </div>
        </div>

        <div className="api-art api-collage" aria-label="Career ops API mode artwork">
          <div className="router-ring" />
          <div className="router-line one" />
          <div className="router-line two" />
          <div className="router-line three" />
          <div className="api-coral" />
          <div className="api-terminal">
            <span>POST</span>
            <strong>/api/career-ops</strong>
            <small>모드 라우터</small>
          </div>
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
            <div>
              <span className="kicker">백엔드 API 인터페이스</span>
              <h2>전용 엔드포인트로 모든 career-ops 라우터 모드를 실행하세요.</h2>
            </div>
            <button className="icon-button" onClick={loadCommands} aria-label="Refresh commands"><RefreshCw size={17} /></button>
          </div>

          <div className="mode-brief api-focus">
            <div>
              <span className="endpoint-chip strong">{`POST /api/career-ops/${selectedCommand.mode}`}</span>
              <h3>{selectedCommand.command}</h3>
              <p>{selectedCommand.description}</p>
            </div>
            <span>{commands.length}개 모드 등록됨</span>
          </div>

          <div className="api-runner">
            <div>
              <label htmlFor="api-mode">엔드포인트</label>
              <select id="api-mode" value={selectedApiMode} onChange={(e) => setSelectedApiMode(e.target.value)}>
                {commands.map((item) => <option key={item.mode} value={item.mode}>{`/api/career-ops/${item.mode}`}</option>)}
              </select>
            </div>
            <button disabled={loading} onClick={() => run(() => runCareerOpsMode(selectedApiMode, commandInput))}>
              {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              엔드포인트 실행
            </button>
          </div>

          <textarea
            rows={9}
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="선택된 모드의 입력값 (선택). JD 텍스트, 회사 리서치 대상, 파이프라인 지시사항, 면접 준비 내용을 입력하거나, 상태 조회 명령어는 비워두세요."
          />
        </div>

        <ResultPanel result={result} />
      </section>

      <section className="command-catalog">
        <div className="section-head">
          <div>
            <span className="kicker">모드 카탈로그</span>
            <h2>실행할 백엔드 워크플로우를 선택하세요.</h2>
          </div>
        </div>
        <CommandGrid
          commands={commands}
          selectedMode={selectedApiMode}
          loading={loading}
          onSelect={setSelectedApiMode}
          onRun={(commandMode) => run(() => runCareerOpsMode(commandMode, commandInput))}
        />
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
          <div>
            <span>라우터 모드</span>
            <strong>{commands.length}</strong>
          </div>
          <div>
            <span>인박스 항목</span>
            <strong>{pipeline.length}</strong>
          </div>
          <div>
            <span>추적 중인 지원</span>
            <strong>{tracker.length}</strong>
          </div>
          <div>
            <span>백엔드</span>
            <strong>{health?.ok ? '온라인' : '오프라인'}</strong>
          </div>
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
