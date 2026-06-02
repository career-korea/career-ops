
/**
 * Optional TypeScript orchestration layer.
 *
 * The production path is:
 *   React TS frontend -> FastAPI -> original career-ops .mjs scripts
 *
 * This file is intentionally small. Use it when you want a TypeScript agent/server
 * to call the FastAPI endpoints as tools. It avoids duplicating logic from backend.
 */

const API = process.env.CAREER_OPS_API || 'http://localhost:8000';

async function post(path: string, body: unknown) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

async function main() {
  const mode = process.argv[2];
  if (mode === 'scan') {
    console.log(await post('/api/scan', { dry_run: true }));
    return;
  }
  if (mode === 'evaluate') {
    const jd = process.argv.slice(3).join(' ');
    if (!jd) throw new Error('Usage: npm run dev -- evaluate "JD text"');
    console.log(await post('/api/evaluate', { jd_text: jd, no_save: true }));
    return;
  }
  console.log(`Usage:
  npm run dev -- scan
  npm run dev -- evaluate "JD text"
`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
