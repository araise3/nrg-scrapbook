// Shared by the landing preview and full ratings view; no UI dependencies.
export const REGION_ORDER = ['Americas', 'EMEA', 'Pacific', 'China']

// Teams whose rating sits just past the 150 "settled" RD cutoff for a
// schedule reason rather than a real shortage of evidence -- e.g. PCIFIC
// Esports sit at RD 153.5 in 2026 despite a full 17-series season, because
// their matches land in widely spaced clusters (Jan / Apr / May / Jul-Aug)
// and the inactivity decay between those gaps keeps nudging RD back past
// the line (see PROVISIONAL_RD's own comment in teamRatings.js). Requested
// as standing exceptions, each scoped to the specific year it applies to
// (the same team can be genuinely provisional in a different year) --
// treated as fully settled everywhere `provisional` is read, not just
// exempted from the "hide provisional teams" filter: no grey rank number,
// no "prov" badge, counted in the rated/median-RD summary stats. Applied
// once, in `table` below, rather than threaded through every consumer
// individually -- that's what let the rank-number greying slip through
// uncaught the first time this was scoped to just the visibility filter.
const ALWAYS_SETTLED = new Set([
  'PCIFIC Esports|2026',
  'Apeks|2025',
  'BLEED|2024', // canonical name is bare "BLEED", not "Bleed Esports"
  'FURIA|2024',
  'DetonatioN FocusMe|2023',
])

// Applies ALWAYS_SETTLED's exceptions to a raw `run.table`. Exported so
// every consumer of a rating table -- not just this page's own `table`
// useMemo below -- applies the same exceptions; Tournaments.jsx's homepage
// region-table preview used to skip this (its own comment said a front-page
// preview wasn't worth duplicating the list for), which meant a team like
// PCIFIC Esports showed as provisional there while /ratings correctly
// treated it as settled. One shared function instead of copy-pasting the
// Set + map-over-table logic at each call site.
export function applyAlwaysSettled(table, year) {
  if (!table.some((t) => ALWAYS_SETTLED.has(`${t.team}|${year}`))) return table
  return table.map((t) => (
    ALWAYS_SETTLED.has(`${t.team}|${year}`) ? { ...t, provisional: false } : t
  ))
}
