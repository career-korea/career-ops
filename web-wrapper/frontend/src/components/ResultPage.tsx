import { Loader2 } from 'lucide-react';
import type { CommandResult, RunDetail, RunMeta } from '../types';
import { cx } from './cx';
import { Markdown, looksLikeMarkdown } from './Markdown';
import { HistorySidebar } from './HistorySidebar';

export function ResultPage({
  result,
  loading,
  runs,
  activeId,
  selectedRun,
  onSelectRun,
  onDeleteRun,
  onNew,
}: {
  result?: CommandResult;
  loading: boolean;
  runs: RunMeta[];
  activeId: number | null;
  selectedRun: RunDetail | null;
  onSelectRun: (id: number) => void;
  onDeleteRun: (id: number) => void;
  onNew: () => void;
}) {
  // A selected history item takes over the main view; otherwise show the live run.
  const viewing = selectedRun
    ? { stdout: selectedRun.stdout, mode: selectedRun.mode, ok: selectedRun.ok, streaming: false, activity: '', command: undefined as string[] | undefined, stderr: '' }
    : result
      ? { stdout: result.stdout || '', mode: result.mode, ok: result.ok, streaming: result.streaming, activity: result.activity, command: result.command, stderr: result.stderr }
      : null;

  const isMarkdown = looksLikeMarkdown(viewing?.stdout);

  return (
    <section className="analysis-layout">
      <HistorySidebar
        runs={runs}
        activeId={activeId}
        onSelect={onSelectRun}
        onDelete={onDeleteRun}
        onNew={onNew}
      />

      <div className="analysis-main">
        {viewing && (
          <div className="analysis-head">
            <span className={cx('badge', viewing.ok ? 'success' : 'danger')}>
              {viewing.ok ? '완료' : '확인 필요'}
            </span>
            {viewing.mode && <span className="mode-chip">{viewing.mode}</span>}
            {viewing.command && <span className="command-line">{viewing.command.join(' ')}</span>}
          </div>
        )}

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
            <span>왼쪽에서 지난 기록을 열거나, 새 분석을 실행해 보세요.</span>
          </div>
        )}

        {viewing?.stdout && (
          <div className="analysis-body" aria-live="polite">
            {isMarkdown ? <Markdown>{viewing.stdout}</Markdown> : <pre className="result-plain">{viewing.stdout}</pre>}
            {viewing.streaming && <span className="stream-cursor" aria-hidden="true" />}
          </div>
        )}

        {viewing?.stderr && <pre className="stderr">{viewing.stderr}</pre>}
      </div>
    </section>
  );
}
