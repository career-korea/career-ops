import { Activity } from 'lucide-react';
import type { CommandResult } from '../types';
import { cx } from './cx';

export function ResultPanel({ result }: { result?: CommandResult }) {
  if (!result) {
    return (
      <aside className="result-empty">
        <Activity size={18} />
        <div>
          <strong>Agent output</strong>
          <span>Run an evaluation or scan to see the agent output here.</span>
        </div>
      </aside>
    );
  }

  return (
    <aside className="result-panel" aria-live="polite">
      <div className="result-head">
        <span className={cx('badge', result.ok ? 'success' : 'danger')}>
          {result.ok ? 'Completed' : `Needs attention${result.returncode ? ` ${result.returncode}` : ''}`}
        </span>
        {result.mode && <span className="mode-chip">{result.mode}</span>}
      </div>
      {result.command && <div className="command-line">{result.command.join(' ')}</div>}
      {result.stdout && <pre>{result.stdout}</pre>}
      {result.stderr && <pre className="stderr">{result.stderr}</pre>}
    </aside>
  );
}
