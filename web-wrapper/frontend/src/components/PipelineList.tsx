import type { PipelineItem } from '../types';
import { cx } from './cx';

export function PipelineList({ items }: { items: PipelineItem[] }) {
  if (!items.length) return <p className="muted">인박스에 대기 중인 직무가 없습니다.</p>;

  return (
    <div className="pipeline-list">
      {items.map((item, i) => (
        <article className="job-item" key={`${item.url}-${i}`}>
          <div>
            <span className={cx('badge', item.checked ? 'neutral' : 'accent')}>
              {item.checked ? '처리됨' : '대기 중'}
            </span>
            <h3>{item.title || '제목 없는 직무'}</h3>
            <p>{item.company || '회사 미설정'}</p>
          </div>
          <a href={item.url} target="_blank" rel="noreferrer">열기</a>
        </article>
      ))}
    </div>
  );
}
