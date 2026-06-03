import type { TrackerRow } from '../types';

export function TrackerTable({ rows }: { rows: TrackerRow[] }) {
  if (!rows.length) return <p className="muted">No applications in the tracker yet.</p>;

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Date</th>
            <th>Company</th>
            <th>Role</th>
            <th>Score</th>
            <th>Status</th>
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
              <td><span className="status-dot">{r.status || 'Unknown'}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
