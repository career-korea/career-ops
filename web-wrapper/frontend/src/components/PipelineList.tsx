import type { PipelineItem } from '../types';
import { cx } from './cx';

export function PipelineList({ items }: { items: PipelineItem[] }) {
  if (!items.length) return <p className="muted">No pending roles in the inbox yet.</p>;

  return (
    <div className="pipeline-list">
      {items.map((item, i) => (
        <article className="job-item" key={`${item.url}-${i}`}>
          <div>
            <span className={cx('badge', item.checked ? 'neutral' : 'accent')}>
              {item.checked ? 'Processed' : 'Pending'}
            </span>
            <h3>{item.title || 'Untitled role'}</h3>
            <p>{item.company || 'Company not set'}</p>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer">Open</a>
        </article>
      ))}
    </div>
  );
}
