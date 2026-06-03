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
            Workspace
          </button>
          <button className={page === 'offer' ? 'active' : ''} onClick={() => setPage('offer')}>
            <Activity size={16} />
            Offer Fit
          </button>
          <button className={page === 'discover' ? 'active' : ''} onClick={() => setPage('discover')}>
            <Search size={16} />
            Discover
          </button>
          <button className={page === 'api' ? 'active' : ''} onClick={() => setPage('api')}>
            <Layers3 size={16} />
            API Modes
          </button>
        </nav>
        <div className="nav-status">
          <span className={cx('connection', health?.ok ? 'online' : 'offline')} />
          {health?.ok ? 'Backend connected' : 'Backend offline'}
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
          <span className="eyebrow"><BriefcaseBusiness size={16} /> Career-Ops Command Center</span>
          <h1>Job search control room.</h1>
          <p>
            Run every backend career mode, evaluate roles, scan portals, and keep your pipeline moving from one workspace.
          </p>
          <div className="hero-actions">
            <button onClick={() => setPage('api')}><Layers3 size={18} /> Open API modes</button>
            <button onClick={() => setTab('evaluate')}><Sparkles size={18} /> Evaluate a role</button>
            <button className="secondary" onClick={() => setTab('scan')}><Search size={18} /> Find openings</button>
          </div>
        </div>

        <div className="hero-visual editorial-collage" aria-label="Career ops editorial workspace artwork">
          <div className="paper-arch" />
          <div className="coral-slab" />
          <div className="teal-window" />
          <div className="stone-form" />
          <div className="folio-sheet">
            <span>01</span>
            <strong>Score fit</strong>
            <small>A-G evaluation</small>
          </div>
          <div className="folio-sheet offset">
            <span>02</span>
            <strong>Tailor CV</strong>
            <small>Role narrative</small>
          </div>
          <div className="yellow-dot" />
          <div className="visual-overlay" aria-label="Career ops overview">
            <span><Activity size={15} /> Live workspace</span>
            <div>
              <strong>{commands.length}</strong>
              <small>router modes</small>
            </div>
            <div>
              <strong>{pipeline.length}</strong>
              <small>inbox</small>
            </div>
            <div>
              <strong>{tracker.length}</strong>
              <small>tracked</small>
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
                    <span className="kicker">Role intelligence</span>
                    <h2>Evaluate a job description or run any career-ops mode.</h2>
                  </div>
                  <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Career ops mode">
                    {modeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </div>
                <textarea
                  rows={13}
                  value={jd}
                  onChange={(e) => setJd(e.target.value)}
                  placeholder="Paste a job URL, full JD, or instructions like: deep research on Anthropic for an applied AI role..."
                />
                <div className="button-row">
                  <button disabled={loading || jd.trim().length < 3} onClick={() => run(() => runCareerOps(mode, jd))}>
                    {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
                    Run agent
                  </button>
                  <button className="secondary" disabled={loading} onClick={() => run(() => runCareerOps('', ''))}>
                    <MapPinned size={18} />
                    Show commands
                  </button>
                </div>
              </>
            )}

            {tab === 'scan' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">Opportunity discovery</span>
                    <h2>Scan target portals and add relevant roles to your inbox.</h2>
                  </div>
                </div>
                <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional company filter, e.g. OpenAI" />
                <div className="button-row">
                  <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: true, company: company || null }))}>
                    <Search size={18} />
                    Preview scan
                  </button>
                  <button className="secondary" disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: false, company: company || null }))}>
                    <Send size={18} />
                    Save matches
                  </button>
                </div>
              </>
            )}

            {tab === 'pipeline' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">Offer inbox</span>
                    <h2>Review roles waiting for evaluation.</h2>
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
                    <span className="kicker">Application pipeline</span>
                    <h2>See what is evaluated, applied, and waiting.</h2>
                  </div>
                  <button className="icon-button" onClick={loadTracker} aria-label="Refresh tracker"><RefreshCw size={17} /></button>
                </div>
                <div className="stat-row">
                  <div><strong>{tracker.length}</strong><span>Total</span></div>
                  {trackerStats.map(([label, count]) => <div key={label}><strong>{count}</strong><span>{label}</span></div>)}
                </div>
                <TrackerTable rows={tracker} />
              </>
            )}

            {tab === 'pdf' && (
              <>
                <div className="section-head">
                  <div>
                    <span className="kicker">CV packaging</span>
                    <h2>Generate a PDF from an HTML CV preview.</h2>
                  </div>
                </div>
                <textarea rows={13} value={html} onChange={(e) => setHtml(e.target.value)} />
                <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/pdf', { html, filename: 'career-ops-cv', format: 'a4' }))}>
                  <FileText size={18} />
                  Generate PDF
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
          <span className="eyebrow"><Activity size={16} /> Offer Fit</span>
          <h1>Read the role before it reads you.</h1>
          <p>
            Paste a job description or URL and let career-ops grade fit, risks, legitimacy, narrative, and next actions.
          </p>
          <div className="api-mode-strip">
            <span>A-G scoring</span>
            <span>CV signals</span>
            <span>tracker ready</span>
          </div>
        </div>
        <div className="focus-art offer-art" aria-label="Offer fit collage">
          <div className="fit-orbit" />
          <div className="fit-card primary">
            <span>fit</span>
            <strong>4.2</strong>
            <small>apply signal</small>
          </div>
          <div className="fit-card secondary">
            <span>risk</span>
            <strong>B</strong>
            <small>role clarity</small>
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
              <span className="kicker">Role intelligence</span>
              <h2>Evaluate a job description or run any career-ops mode.</h2>
            </div>
            <select value={mode} onChange={(e) => setMode(e.target.value)} aria-label="Career ops mode">
              {modeOptions.map((option) => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
          <textarea
            rows={13}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="Paste a job URL, full JD, or instructions like: evaluate this applied AI role and explain fit, risks, and next actions..."
          />
          <div className="button-row">
            <button disabled={loading || jd.trim().length < 3} onClick={() => run(() => runCareerOps(mode, jd))}>
              {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              Run fit review
            </button>
            <button className="secondary" disabled={loading} onClick={() => run(() => runCareerOps('', ''))}>
              <MapPinned size={18} />
              Show commands
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
          <span className="eyebrow"><Search size={16} /> Discover</span>
          <h1>Find roles worth a second look.</h1>
          <p>
            Scan configured portals, preview matches, and move promising jobs into the inbox without turning search into noise.
          </p>
          <div className="api-mode-strip">
            <span>portal scan</span>
            <span>{pipeline.length} inbox</span>
            <span>dry-run first</span>
          </div>
        </div>
        <div className="focus-art discover-art" aria-label="Discover collage">
          <div className="discover-map" />
          <div className="discover-path one" />
          <div className="discover-path two" />
          <div className="discover-card">
            <span>new role</span>
            <strong>AI Ops</strong>
            <small>matched portal</small>
          </div>
          <div className="discover-card alt">
            <span>queue</span>
            <strong>{pipeline.length}</strong>
            <small>inbox items</small>
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
              <span className="kicker">Opportunity discovery</span>
              <h2>Scan target portals and add relevant roles to your inbox.</h2>
            </div>
            <button className="icon-button" onClick={loadPipeline} aria-label="Refresh pipeline"><RefreshCw size={17} /></button>
          </div>
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Optional company filter, e.g. OpenAI" />
          <div className="button-row">
            <button disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: true, company: company || null }))}>
              <Search size={18} />
              Preview scan
            </button>
            <button className="secondary" disabled={loading} onClick={() => run(() => post<CommandResult>('/api/scan', { dry_run: false, company: company || null }))}>
              <Send size={18} />
              Save matches
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
          <span className="eyebrow"><Braces size={16} /> Backend router surface</span>
          <h1>API Modes</h1>
          <p>
            A dedicated console for every career-ops endpoint: auto-pipeline, scan, batch, followup, tracker, PDF, and interview prep.
          </p>
          <div className="api-mode-strip">
            <span>{commands.length} modes</span>
            <span>POST router</span>
            <span>{health?.ok ? 'online' : 'offline'}</span>
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
            <small>mode router</small>
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
              <span className="kicker">Backend API surface</span>
              <h2>Run every career-ops router mode through its own endpoint.</h2>
            </div>
            <button className="icon-button" onClick={loadCommands} aria-label="Refresh commands"><RefreshCw size={17} /></button>
          </div>

          <div className="mode-brief api-focus">
            <div>
              <span className="endpoint-chip strong">{`POST /api/career-ops/${selectedCommand.mode}`}</span>
              <h3>{selectedCommand.command}</h3>
              <p>{selectedCommand.description}</p>
            </div>
            <span>{commands.length} modes registered</span>
          </div>

          <div className="api-runner">
            <div>
              <label htmlFor="api-mode">Endpoint</label>
              <select id="api-mode" value={selectedApiMode} onChange={(e) => setSelectedApiMode(e.target.value)}>
                {commands.map((item) => <option key={item.mode} value={item.mode}>{`/api/career-ops/${item.mode}`}</option>)}
              </select>
            </div>
            <button disabled={loading} onClick={() => run(() => runCareerOpsMode(selectedApiMode, commandInput))}>
              {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              Run endpoint
            </button>
          </div>

          <textarea
            rows={9}
            value={commandInput}
            onChange={(e) => setCommandInput(e.target.value)}
            placeholder="Optional input for the selected mode. Paste JD text, company research target, pipeline instructions, interview prep context, or leave blank for status-style commands."
          />
        </div>

        <ResultPanel result={result} />
      </section>

      <section className="command-catalog">
        <div className="section-head">
          <div>
            <span className="kicker">Mode catalog</span>
            <h2>Choose the exact workflow you want the backend to execute.</h2>
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
            <span>Router modes</span>
            <strong>{commands.length}</strong>
          </div>
          <div>
            <span>Inbox items</span>
            <strong>{pipeline.length}</strong>
          </div>
          <div>
            <span>Tracked applications</span>
            <strong>{tracker.length}</strong>
          </div>
          <div>
            <span>Backend</span>
            <strong>{health?.ok ? 'Online' : 'Offline'}</strong>
          </div>
        </section>
      )}

      <section className={cx('topbar', compact && 'compact-status')}>
        <div>
          <span className={cx('connection', health?.ok ? 'online' : 'offline')} />
          {health?.ok ? 'Backend connected' : 'Backend offline'}
          {health?.career_ops_root && <small>{health.career_ops_root}</small>}
        </div>
        <OnboardingStrip health={health} />
      </section>

      {health && !health.ok && <div className="warn">Backend cannot find CAREER_OPS_ROOT: {health.error}</div>}
    </>
  );
}
