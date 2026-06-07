import type { TrackerRow } from '../types';

export function TrackerTable({ rows }: { rows: TrackerRow[] }) {
  if (!rows.length) return <p className="muted">트래커에 지원 내역이 없습니다.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>날짜</th>
            <th>회사</th>
            <th>직무</th>
            <th>점수</th>
            <th>상태</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.index}-${i}`}>
              <td>{r.index}</td>
              <td>{r.date}</td>
              <td>{r.company}</td>
              <td>{r.role}</td>
              <td>{r.score}</td>
              <td><span className="status-dot">{r.status || '미확인'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
