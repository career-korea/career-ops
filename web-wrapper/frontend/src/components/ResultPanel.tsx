import { Activity } from 'lucide-react';
import type { CommandResult } from '../types';
import { cx } from './cx';

export function ResultPanel({ result }: { result?: CommandResult }) {
  if (!result) {
    return (
      <aside className="result-empty">
        <Activity size={18} />
        <div>
          <strong>에이전트 출력</strong>
          <span>평가 또는 스캔을 실행하면 여기에 결과가 표시됩니다.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="result-panel" aria-live="polite">
      <div className="result-head">
        <span className={cx('badge', result.ok ? 'success' : 'danger')}>
          {result.ok ? '완료' : `확인 필요${result.returncode ? ` ${result.returncode}` : ''}`}
        </span>
        {result.mode && <span className="mode-chip">{result.mode}</span>}
      </div>
      {result.command && <div className="command-line">{result.command.join(' ')}</div>}
      {result.stdout && (
        <pre>
          {result.stdout}
          {result.streaming && <span className="stream-cursor" aria-hidden="true" />}
        </pre>
      )}
      {result.stderr && <pre className="stderr">{result.stderr}</pre>}
    </aside>
  );
}
