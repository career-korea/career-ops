import { useState } from 'react';
import { ClipboardCopy, FileText, Loader2, Play, RotateCcw } from 'lucide-react';
import { postStream } from '../api';
import type { Page } from '../types';
import { Markdown, looksLikeMarkdown } from './Markdown';
import { cx } from './cx';
import { OfferCard, parseAtsSummary, stripAtsSummary } from './OfferCard';

type Section = { title: string; content: string };

function parseSections(stdout: string): Section[] {
  const parts = stdout.split(/(?=^###\s)/m).filter(Boolean);
  return parts.map((part) => {
    const lines = part.trim().split('\n');
    const title = lines[0].replace(/^###\s*/, '').trim();
    const content = lines.slice(1).join('\n').trim();
    return { title, content };
  }).filter((s) => s.title && s.content);
}

type Props = {
  model: string;
  setModel: (v: string) => void;
  setPage: (p: Page) => void;
};

export function ResumeWriterPage({ model, setModel, setPage }: Props) {
  const [jd, setJd] = useState('');
  const [original, setOriginal] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [activity, setActivity] = useState('');
  const [error, setError] = useState('');
  const [activeSection, setActiveSection] = useState(0);
  const [copied, setCopied] = useState<number | null>(null);

  // 첨삭 모드에서는 결과 맨 앞에 ```ats-summary``` 블록이 올 수 있다 — OfferCard로
  // 렌더링하고, 나머지 텍스트에서는 블록을 제거해 첫 탭에 raw 코드블록이 섞이지 않게 한다.
  const atsData = result ? parseAtsSummary(result) : null;
  const displayResult = atsData && result ? stripAtsSummary(result) : result;
  const sections = parseSections(displayResult);
  const hasSections = sections.length > 0;

  async function runJasoseo() {
    const input = [
      jd.trim() && `## 채용 공고\n${jd.trim()}`,
      original.trim() && `## 원본 자소서\n${original.trim()}`,
    ].filter(Boolean).join('\n\n');

    setResult('');
    setError('');
    setLoading(true);
    setStreaming(true);
    setActivity('');
    setActiveSection(0);

    try {
      let buffer = '';
      await postStream(
        '/api/career-ops/stream',
        { mode: 'jasoseo', input, model: model || undefined },
        (event) => {
          if (event.type === 'delta' && event.text) {
            buffer += event.text;
            setResult(buffer);
          } else if (event.type === 'status' && event.text) {
            setActivity(event.text);
          } else if (event.type === 'error') {
            throw new Error(event.message || '스트림 오류');
          }
        },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setStreaming(false);
      setActivity('');
      setLoading(false);
    }
  }

  function copySection(idx: number, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(idx);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <>
      <section className="focus-hero resume-hero">
        <div className="focus-copy">
          <span className="eyebrow"><FileText size={16} /> 맞춤 이력서 · 자기소개서</span>
          <h1>공고에 맞게, AI가 자소서를 다시 씁니다</h1>
          <p>채용 공고와 기존 자소서를 붙여넣으면, STAR 구조와 핵심 키워드로 최적화된 자소서를 생성합니다.</p>
          <div className="api-mode-strip">
            <span>STAR 구조</span>
            <span>키워드 삽입</span>
            <span>수치 중심 서술</span>
          </div>
        </div>
        <div className="focus-art resume-art" aria-hidden="true">
          <div className="resume-paper" />
          <div className="resume-lines"><i /><i /><i /><i /><i /></div>
          <div className="resume-badge"><span>BEFORE</span></div>
          <div className="resume-badge after"><span>AFTER ✓</span></div>
          <div className="resume-coral" />
        </div>
      </section>

      <section className="focus-layout resume-layout">
        {/* 입력 패널 */}
        <div className="focus-panel resume-input-panel">
          <div className="section-head">
            <div>
              <span className="kicker">입력</span>
              <h2>채용 공고와 기존 자소서를 입력하세요</h2>
            </div>
            <div className="head-controls">
              <select value={model} onChange={(e) => setModel(e.target.value)} aria-label="모델 선택">
                <option value="">기본 모델</option>
                <option value="haiku">Haiku (빠름)</option>
                <option value="sonnet">Sonnet</option>
              </select>
            </div>
          </div>

          <label className="resume-field-label">채용 공고 (URL 또는 전체 텍스트)</label>
          <textarea
            className="resume-textarea"
            rows={7}
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            placeholder="https://... 또는 JD 전체 내용 붙여넣기"
          />

          <label className="resume-field-label">기존 자소서 <span className="optional">(선택 — 없으면 cv.md 기반으로 작성)</span></label>
          <textarea
            className="resume-textarea"
            rows={9}
            value={original}
            onChange={(e) => setOriginal(e.target.value)}
            placeholder="현재 자소서 문항과 답변을 붙여넣으세요."
          />

          {activity && (
            <div className="result-activity" aria-live="polite">
              <span className="activity-dot" aria-hidden="true" />
              {activity}
            </div>
          )}

          {error && <p className="warn">{error}</p>}

          <div className="button-row">
            <button
              disabled={loading || jd.trim().length < 3}
              onClick={runJasoseo}
            >
              {loading ? <Loader2 className="spin" size={18} /> : <Play size={18} />}
              자소서 생성
            </button>
            {result && (
              <button className="secondary" onClick={() => { setResult(''); setOriginal(''); setJd(''); setError(''); }}>
                <RotateCcw size={16} /> 초기화
              </button>
            )}
          </div>
        </div>

        {/* 결과 패널 */}
        {result && (
          <div className="resume-result-panel">
            {atsData && <OfferCard data={atsData} />}
            {hasSections ? (
              <>
                <div className="resume-section-tabs">
                  {sections.map((s, i) => (
                    <button
                      key={i}
                      className={cx('resume-tab', activeSection === i && 'active')}
                      onClick={() => setActiveSection(i)}
                    >
                      {s.title.length > 20 ? s.title.slice(0, 20) + '…' : s.title}
                    </button>
                  ))}
                </div>

                <div className="resume-section-body">
                  <div className="resume-section-head">
                    <h3>{sections[activeSection].title}</h3>
                    <button
                      className={cx('copy-btn', copied === activeSection && 'copied')}
                      onClick={() => copySection(activeSection, sections[activeSection].content)}
                      aria-label="복사"
                    >
                      <ClipboardCopy size={15} />
                      {copied === activeSection ? '복사됨' : '복사'}
                    </button>
                  </div>
                  {looksLikeMarkdown(sections[activeSection].content)
                    ? <Markdown>{sections[activeSection].content}</Markdown>
                    : <pre className="resume-plain">{sections[activeSection].content}</pre>}
                </div>
              </>
            ) : (
              <div className="analysis-body" aria-live="polite">
                {looksLikeMarkdown(displayResult)
                  ? <Markdown>{displayResult}</Markdown>
                  : <pre className="result-plain">{displayResult}</pre>}
                {streaming && <span className="stream-cursor" aria-hidden="true" />}
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div className="resume-empty">
            <FileText size={32} />
            <p>왼쪽에 공고를 입력하고 생성 버튼을 누르세요.</p>
            <button className="secondary" onClick={() => setPage('offer')}>
              먼저 적합도 분석하기
            </button>
          </div>
        )}
      </section>
    </>
  );
}
