import { Play } from 'lucide-react';
import type { CareerCommand } from '../types';
import { cx } from './cx';

type CommandGridProps = {
  commands: CareerCommand[];
  selectedMode: string;
  loading: boolean;
  onSelect: (mode: string) => void;
  onRun: (mode: string) => void;
};

export function CommandGrid({ commands, selectedMode, loading, onSelect, onRun }: CommandGridProps) {
  if (!commands.length) return <p className="muted">Backend command registry is empty or still loading.</p>;

  return (
    <div className="command-grid">
      {commands.map((item) => (
        <article
          key={item.mode}
          className={cx('command-card', selectedMode === item.mode && 'selected')}
          onClick={() => onSelect(item.mode)}
        >
          <div>
            <strong className="command-index">{item.mode.slice(0, 2).toUpperCase()}</strong>
            <span className="endpoint-chip">{`POST /api/career-ops/${item.mode}`}</span>
            <h3>{item.command}</h3>
            <p>{item.description}</p>
          </div>
          <button
            className="secondary compact"
            disabled={loading}
            onClick={(event) => {
              event.stopPropagation();
              onRun(item.mode);
            }}
          >
            <Play size={15} />
            Run
          </button>
        </article>
      ))}
    </div>
  );
}
