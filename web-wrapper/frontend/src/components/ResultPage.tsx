import { Loader2, PanelLeftOpen } from 'lucide-react';
import type { CommandResult, RunDetail } from '../types';
import { cx } from './cx';
import { Markdown, looksLikeMarkdown } from './Markdown';

export function ResultPage({
  result,
  loading,
  selectedRun,
  onOpenHistory,
}: {
  result?: CommandResult;
  loading: boolean;
  selectedRun: RunDetail | null;
  onOpenHistory: () => void;
}) {
  // A selected history item takes over the view; otherwise show the live run.
  const viewing = selectedRun
    ? { stdout: selectedRun.stdout, mode: selectedRun.mode, ok: selectedRun.ok, streaming: false, activity: '', command: undefined as string[] | undefined, stderr: '' }
    : result
      ? { stdout: result.stdout || '', mode: result.mode, ok: result.ok, streaming: result.streaming, activity: result.activity, command: result.command, stderr: result.stderr }
      : null;

  const isMarkdown = looksLikeMarkdown(viewing?.stdout);

  return (
    <section className="analysis-view">
      <div className="analysis-bar">
        <button className="history-toggle" onClick={onOpenHistory} aria-label="실행 기록 열기">
          <PanelLeftOpen size={16} /> 기록
        </button>
        {viewing && (
          <>
            <span className={cx('badge', viewing.ok ? 'success' : 'danger')}>
              {viewing.ok ? '완료' : '확인 필요'}
            </span>
            {viewing.mode && <span className="mode-chip">{viewing.mode}</span>}
          </>
        )}
      </div>

      {viewing?.command && <div className="command-line">{viewing.command.join(' ')}</div>}

      {viewing?.streaming && viewing.activity && (
        <div className="result-activity" aria-live="polite">
          <span className="activity-dot" aria-hidden="true" />
          {viewing.activity}
        </div>
      )}

      {!viewing && loading && (
        <div className="result-generating">
          <Loader2 className="spin" size={18} /> 생성 중…
        </div>
      )}

      {!viewing && !loading && (
        <div className="analysis-placeholder">
          <strong>분석 결과가 여기에 표시됩니다</strong>
          <span>새 분석을 실행하거나, 상단 “기록”에서 지난 분석을 열어보세요.</span>
        </div>
      )}

      {viewing?.stdout && (
        <div className="analysis-body" aria-live="polite">
          {isMarkdown ? <Markdown>{viewing.stdout}</Markdown> : <pre className="result-plain">{viewing.stdout}</pre>}
          {viewing.streaming && <span className="stream-cursor" aria-hidden="true" />}
        </div>
      )}

      {viewing?.stderr && <pre className="stderr">{viewing.stderr}</pre>}
    </section>
  );
}
