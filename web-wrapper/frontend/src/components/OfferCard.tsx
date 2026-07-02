import { AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';

export type AtsData = {
  score: number;
  grade: string;
  legitimacy: string;
  archetype: string;
  matchKeywords: string[];
  missingKeywords: string[];
  highlightSkills: string[];
  deductions: { label: string; points: number }[];
  summary: string;
  hooks: string[];
};

const ATS_FIELD_KEYS = [
  'score', 'grade', 'legitimacy', 'archetype', 'match_keywords',
  'missing_keywords', 'highlight_skills', 'deductions', 'summary', 'hooks',
] as const;

// 에이전트가 지시받은 ```ats-summary``` 코드펜스를 매번 정확히 지키는 건 아니다 —
// 값은 맞게 계산해놓고 펜스만 빼먹고 `score: 64\ngrade: ...`처럼 그냥 텍스트로
// 찍는 경우가 있다. 펜스가 있으면 그걸 쓰고, 없으면 응답 앞부분(전문 앞의 잡담을
// 감안해 첫 2000자 이내)에서 `score:`로 시작하는 연속된 필드 줄 블록을 찾아 대체
// 파싱한다. 둘 다 없으면 null.
function extractAtsBlock(stdout: string): { raw: string; fullMatch: string } | null {
  const fenced = stdout.match(/```ats-summary\n([\s\S]*?)```/);
  if (fenced) return { raw: fenced[1], fullMatch: fenced[0] };

  const idx = stdout.search(/^score:\s*\d+/m);
  if (idx === -1 || idx > 2000) return null;
  const fieldLine = new RegExp(`^(?:${ATS_FIELD_KEYS.join('|')}):.*$`);
  const lines = stdout.slice(idx).split('\n');
  const blockLines: string[] = [];
  for (const line of lines) {
    if (!fieldLine.test(line)) break;
    blockLines.push(line);
  }
  if (blockLines.length === 0) return null;
  const raw = blockLines.join('\n');
  return { raw, fullMatch: stdout.slice(idx, idx + raw.length) };
}

// ats-summary 블록(펜스형 또는 평문형)을 파싱해 AtsData로 변환한다.
// 블록이 없거나 필수 필드(score)가 없으면 null 반환.
export function parseAtsSummary(stdout: string): AtsData | null {
  const block = extractAtsBlock(stdout);
  if (!block) return null;
  const raw = block.raw;
  const get = (key: string) => {
    const m = raw.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
    return m ? m[1].trim() : '';
  };
  const score = parseInt(get('score'), 10);
  if (isNaN(score)) return null;

  const splitPipe = (s: string) => s ? s.split('|').map((x) => x.trim()).filter(Boolean) : [];
  const splitComma = (s: string) => s ? s.split(',').map((x) => x.trim()).filter(Boolean) : [];

  const deductionRaw = splitPipe(get('deductions'));
  const deductions = deductionRaw.map((d) => {
    const m = d.match(/\[(-?\d+)점\]\s*(.*)/);
    return m ? { points: parseInt(m[1], 10), label: m[2].trim() } : { points: 0, label: d };
  });

  return {
    score,
    grade: get('grade'),
    legitimacy: get('legitimacy'),
    archetype: get('archetype'),
    matchKeywords: splitComma(get('match_keywords')),
    missingKeywords: splitComma(get('missing_keywords')),
    highlightSkills: splitComma(get('highlight_skills')),
    deductions,
    summary: get('summary'),
    hooks: splitPipe(get('hooks')),
  };
}

// stdout에서 ats-summary 블록(펜스형 또는 평문형)을 제거한 나머지 텍스트 반환
export function stripAtsSummary(stdout: string): string {
  const block = extractAtsBlock(stdout);
  if (!block) return stdout;
  return stdout.replace(block.fullMatch, '').trimStart();
}

function gradeColor(score: number): string {
  if (score >= 90) return '#22c55e';
  if (score >= 80) return '#84cc16';
  if (score >= 70) return '#eab308';
  if (score >= 60) return '#f97316';
  if (score >= 50) return '#ef4444';
  return '#dc2626';
}

function gradeRisk(score: number): 'safe' | 'warn' | 'danger' {
  if (score >= 80) return 'safe';
  if (score >= 60) return 'warn';
  return 'danger';
}

function LegitimacyBadge({ value }: { value: string }) {
  if (value === 'High Confidence') return <span className="legit-badge safe"><CheckCircle2 size={13} /> 공고 신뢰도 높음</span>;
  if (value === 'Suspicious') return <span className="legit-badge danger"><XCircle size={13} /> 공고 의심 신호</span>;
  return <span className="legit-badge warn"><AlertTriangle size={13} /> 주의 필요</span>;
}

export function OfferCard({ data }: { data: AtsData }) {
  const color = gradeColor(data.score);
  const risk = gradeRisk(data.score);
  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - data.score / 100);

  return (
    <div className="offer-card">
      {/* 상단: 점수 + 요약 */}
      <div className="offer-card-top">
        <div className="offer-score-wrap">
          <svg className="offer-gauge" viewBox="0 0 120 120" aria-hidden="true">
            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--surface-2)" strokeWidth="10" />
            <circle
              cx="60" cy="60" r="54"
              fill="none"
              stroke={color}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              transform="rotate(-90 60 60)"
            />
          </svg>
          <div className="offer-score-inner">
            <strong style={{ color }}>{data.score}</strong>
            <span>/100</span>
          </div>
        </div>

        <div className="offer-card-meta">
          <div className="offer-grade-row">
            <span className={`offer-grade ${risk}`}>{data.grade}</span>
            <LegitimacyBadge value={data.legitimacy} />
          </div>
          {data.archetype && <p className="offer-archetype">{data.archetype}</p>}
          {data.summary && <p className="offer-summary">{data.summary}</p>}
        </div>
      </div>

      {/* 키워드 */}
      <div className="offer-keywords">
        <div className="keyword-group">
          <span className="keyword-label match">일치 키워드</span>
          <div className="keyword-tags">
            {data.matchKeywords.map((k) => <span key={k} className="kw-tag match">{k}</span>)}
            {data.matchKeywords.length === 0 && <span className="kw-empty">없음</span>}
          </div>
        </div>
        <div className="keyword-group">
          <span className="keyword-label missing">누락 키워드</span>
          <div className="keyword-tags">
            {data.missingKeywords.map((k) => <span key={k} className="kw-tag missing">{k}</span>)}
            {data.missingKeywords.length === 0 && <span className="kw-empty">없음</span>}
          </div>
        </div>
        {data.highlightSkills.length > 0 && (
          <div className="keyword-group">
            <span className="keyword-label highlight">강조할 스킬</span>
            <div className="keyword-tags">
              {data.highlightSkills.map((k) => <span key={k} className="kw-tag highlight">{k}</span>)}
            </div>
          </div>
        )}
      </div>

      {/* 감점 요인 */}
      {data.deductions.length > 0 && (
        <div className="offer-deductions">
          <span className="section-label">감점 요인</span>
          <ul>
            {data.deductions.map((d, i) => (
              <li key={i}>
                <span className="deduct-points">{d.points}점</span>
                <span className="deduct-label">{d.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 첫 문장 훅 */}
      {data.hooks.length > 0 && (
        <div className="offer-hooks">
          <span className="section-label">첫 문장 훅 제안</span>
          <ol>
            {data.hooks.map((h, i) => <li key={i}>{h}</li>)}
          </ol>
        </div>
      )}
    </div>
  );
}
