
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Play, RefreshCw, FileText, Search, Table2 } from 'lucide-react';
import './style.css';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000';

type CommandResult = { ok:boolean; command:string[]; cwd:string; returncode:number; stdout:string; stderr:string };
type TrackerRow = { index:string; date:string; company:string; role:string; score:string; status:string; pdf:string; report:string };
type PipelineItem = { checked:boolean; url:string; company:string; title:string; raw:string };

async function post<T>(path:string, body:any = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
async function get<T>(path:string): Promise<T> {
  const res = await fetch(`${API}${path}`);
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

function Output({result}:{result?: CommandResult | any}) {
  if (!result) return null;
  const r = 'result' in result ? result.result : result;
  return <div className="output">
    <div className={r.ok ? 'pill ok' : 'pill bad'}>{r.ok ? 'OK' : `ERROR ${r.returncode}`}</div>
    {r.command && <div className="cmd">{r.command.join(' ')}</div>}
    {result.pdf_path && <div className="path">PDF: {result.pdf_path}</div>}
    {r.stdout && <pre>{r.stdout}</pre>}
    {r.stderr && <pre className="stderr">{r.stderr}</pre>}
  </div>
}

function App() {
  const [tab, setTab] = useState<'evaluate'|'scan'|'tracker'|'pipeline'|'pdf'>('evaluate');
  const [health, setHealth] = useState<any>();
  const [result, setResult] = useState<any>();
  const [loading, setLoading] = useState(false);
  const [jd, setJd] = useState('');
  const [company, setCompany] = useState('');
  const [tracker, setTracker] = useState<TrackerRow[]>([]);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [html, setHtml] = useState('<html><body><h1>Jinuk Lee</h1><p>Career Ops PDF test</p></body></html>');

  useEffect(()=>{ get('/api/health').then(setHealth).catch(e=>setHealth({ok:false,error:String(e)})); }, []);

  async function run(action:()=>Promise<any>) {
    setLoading(true); setResult(undefined);
    try { setResult(await action()); }
    catch(e:any) { setResult({ok:false, returncode:-1, stdout:'', stderr:String(e), command:[]}); }
    finally { setLoading(false); }
  }

  async function loadTracker() {
    const data = await get<{rows:TrackerRow[]}>('/api/tracker');
    setTracker(data.rows);
  }
  async function loadPipeline() {
    const data = await get<{items:PipelineItem[]}>('/api/pipeline');
    setPipeline(data.items);
  }

  return <main>
    <header>
      <div>
        <h1>career-ops web</h1>
        <p>FastAPI wrapper + TypeScript UI for the original .mjs pipeline</p>
      </div>
      <div className={health?.ok ? 'status good' : 'status fail'}>{health?.ok ? 'connected' : 'not connected'}</div>
    </header>

    {health && !health.ok && <div className="warn">Backend cannot find CAREER_OPS_ROOT: {health.error}</div>}
    {health?.ok && <div className="root">Root: {health.career_ops_root}</div>}

    <nav>
      <button onClick={()=>setTab('evaluate')} className={tab==='evaluate'?'active':''}><FileText size={16}/> Evaluate JD</button>
      <button onClick={()=>setTab('scan')} className={tab==='scan'?'active':''}><Search size={16}/> Scan Portals</button>
      <button onClick={()=>{setTab('tracker'); loadTracker();}} className={tab==='tracker'?'active':''}><Table2 size={16}/> Tracker</button>
      <button onClick={()=>{setTab('pipeline'); loadPipeline();}} className={tab==='pipeline'?'active':''}><RefreshCw size={16}/> Pipeline</button>
      <button onClick={()=>setTab('pdf')} className={tab==='pdf'?'active':''}><FileText size={16}/> PDF</button>
    </nav>

    <section className="card">
      {tab === 'evaluate' && <>
        <h2>Evaluate JD</h2>
        <p>Paste a job description. Backend calls <code>gemini-eval.mjs</code>.</p>
        <textarea rows={12} value={jd} onChange={e=>setJd(e.target.value)} placeholder="Paste Job Description here..." />
        <button disabled={loading || jd.length < 10} onClick={()=>run(()=>post('/api/evaluate', {jd_text: jd}))}><Play size={16}/> Run evaluation</button>
      </>}

      {tab === 'scan' && <>
        <h2>Scan Portals</h2>
        <p>Uses <code>portals.yml</code> in the original repo and calls <code>scan.mjs</code>.</p>
        <input value={company} onChange={e=>setCompany(e.target.value)} placeholder="Optional company filter, e.g. OpenAI" />
        <div className="row">
          <button disabled={loading} onClick={()=>run(()=>post('/api/scan', {dry_run:true, company: company || null}))}>Dry run</button>
          <button disabled={loading} onClick={()=>run(()=>post('/api/scan', {dry_run:false, company: company || null}))}>Save to pipeline</button>
        </div>
      </>}

      {tab === 'tracker' && <>
        <h2>Tracker</h2>
        <button onClick={loadTracker}>Refresh</button>
        <table><thead><tr><th>#</th><th>Date</th><th>Company</th><th>Role</th><th>Score</th><th>Status</th></tr></thead><tbody>
          {tracker.map((r,i)=><tr key={i}><td>{r.index}</td><td>{r.date}</td><td>{r.company}</td><td>{r.role}</td><td>{r.score}</td><td>{r.status}</td></tr>)}
        </tbody></table>
      </>}

      {tab === 'pipeline' && <>
        <h2>Pipeline</h2>
        <button onClick={loadPipeline}>Refresh</button>
        <table><thead><tr><th>Done</th><th>Company</th><th>Title</th><th>URL</th></tr></thead><tbody>
          {pipeline.map((p,i)=><tr key={i}><td>{p.checked ? 'yes' : 'no'}</td><td>{p.company}</td><td>{p.title}</td><td><a href={p.url} target="_blank">link</a></td></tr>)}
        </tbody></table>
      </>}

      {tab === 'pdf' && <>
        <h2>PDF from HTML</h2>
        <p>Calls <code>generate-pdf.mjs</code>. This is a low-level test endpoint.</p>
        <textarea rows={12} value={html} onChange={e=>setHtml(e.target.value)} />
        <button disabled={loading} onClick={()=>run(()=>post('/api/pdf', {html, filename:'web-test', format:'a4'}))}>Generate PDF</button>
      </>}
    </section>

    {loading && <div className="loading">Running...</div>}
    <Output result={result}/>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />);
