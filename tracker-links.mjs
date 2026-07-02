/**
 * tracker-links.mjs — normalize `reports/...` markdown links to be relative
 * to wherever the tracker file actually lives.
 *
 * The TSV convention (see CLAUDE.md) always carries a root-relative
 * `[num](reports/...)` link, since batch/tracker-additions/*.tsv doesn't know
 * where the tracker will end up. `data/applications.md` needs `../reports/...`
 * to resolve; a root-level `applications.md` needs `reports/...` unchanged.
 * Shared by merge-tracker.mjs (every merge + `--migrate`) and used as the
 * spec for followup-cadence.mjs's own reverse resolution (see #760, #1126).
 */

import { join, relative } from 'path';

// `[label](reports/...)` or an already-normalized `[label](../reports/...)`.
// Requires the path to start with `reports/` (after stripping any leading
// `../` segments) immediately after the opening paren, so external URLs that
// merely contain an embedded "/reports/" segment never match.
const REPORT_LINK_PATTERN = /(\[[^\]]*\]\()((?:\.\.\/)*reports\/[^)]+)(\))/g;

/**
 * Rewrite every report link found in `text` so it resolves from `trackerDir`.
 * Non-report links (including external URLs) are left untouched. Idempotent —
 * re-running on an already-normalized link reproduces the same output, since
 * any existing `../` prefix is stripped back to the canonical `reports/...`
 * suffix before recomputing.
 *
 * @param {string} text - A markdown link, or a larger string (e.g. a full
 *   tracker table row) that may contain one.
 * @param {string} trackerDir - Absolute directory containing the tracker file.
 * @param {string} repoRoot - Absolute repo root (`reports/` lives directly under it).
 * @returns {string}
 */
export function normalizeReportLink(text, trackerDir, repoRoot) {
  return text.replace(REPORT_LINK_PATTERN, (_match, prefix, path, suffix) => {
    const canonical = path.replace(/^(?:\.\.\/)+/, '');
    const absoluteTarget = join(repoRoot, canonical);
    const rel = relative(trackerDir, absoluteTarget).split('\\').join('/');
    return `${prefix}${rel}${suffix}`;
  });
}
