import { ArrowLeft, Loader2 } from 'lucide-react';
import type { CommandResult } from '../types';
import { cx } from './cx';
import { Markdown, looksLikeMarkdown } from './Markdown';

export function ResultPage({
  result,
  loading,
  onBack,
}: {
  result?: CommandResult;
  loading: boolean;
  onBack: () => void;
}) {
  const isMarkdown = looksLikeMarkdown(result?.stdout);

  return (
    <section className="result-page">
      <div className="result-page-head">
        <button className="result-back" onClick={onBack} aria-label="돌아가기">
          <ArrowLeft size={16} /> 돌아가기
        </button>
        {result && (
          <div className="result-head">
            <span className={cx('badge', result.ok ? 'success' : 'danger')}>
              {result.ok ? '완료' : `확인 필요${result.returncode ? ` ${result.returncode}` : ''}`}
            </span>
            {result.mode && <span className="mode-chip">{result.mode}</span>}
          </div>
        )}
      </div>

      {result?.command && <div className="command-line">{result.command.join(' ')}</div>}

      {result?.streaming && result.activity && (
        <div className="result-activity" aria-live="polite">
          <span className="activity-dot" aria-hidden="true" />
          {result.activity}
        </div>
      )}

      {!result && loading && (
        <div className="result-generating">
          <Loader2 className="spin" size={18} /> 생성 중…
        </div>
      )}

      {result?.stdout && (
        <div className="result-body" aria-live="polite">
          {isMarkdown ? <Markdown>{result.stdout}</Markdown> : <pre className="result-plain">{result.stdout}</pre>}
          {result.streaming && <span className="stream-cursor" aria-hidden="true" />}
        </div>
      )}

      {result?.stderr && <pre className="stderr">{result.stderr}</pre>}
    </section>
  );
}
