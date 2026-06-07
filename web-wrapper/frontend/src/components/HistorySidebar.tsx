import { Plus, Trash2 } from 'lucide-react';
import type { RunMeta } from '../types';
import { cx } from './cx';

function relativeTime(iso: string): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '방금';
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}일 전`;
  return new Date(iso).toLocaleDateString('ko-KR', { month: 'numeric', day: 'numeric' });
}

export function HistorySidebar({
  runs,
  activeId,
  onSelect,
  onDelete,
  onNew,
}: {
  runs: RunMeta[];
  activeId: number | null;
  onSelect: (id: number) => void;
  onDelete: (id: number) => void;
  onNew: () => void;
}) {
  return (
    <aside className="history-sidebar">
      <button className="history-new" onClick={onNew}>
        <Plus size={16} /> 새 분석
      </button>

      {runs.length === 0 ? (
        <p className="history-empty">아직 기록이 없어요.<br />분석을 실행하면 여기에 쌓여요.</p>
      ) : (
        <ul className="history-list">
          {runs.map((run) => (
            <li key={run.id} className={cx('history-item', run.id === activeId && 'active')}>
              <button className="history-open" onClick={() => onSelect(run.id)} title={run.title}>
                <span className="history-title">{run.title || '제목 없음'}</span>
                <span className="history-meta">
                  {run.mode && <span className="history-mode">{run.mode}</span>}
                  <span className="history-time">{relativeTime(run.created_at)}</span>
                </span>
              </button>
              <button
                className="history-del"
                onClick={() => onDelete(run.id)}
                aria-label="기록 삭제"
                title="삭제"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
