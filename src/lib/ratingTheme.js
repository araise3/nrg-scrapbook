/**
 * Shared palette and panel treatment for the Glicko-2 rating surfaces.
 * Kept as literals because these values are also consumed by inline SVG and
 * canvas styles that cannot resolve Tailwind tokens.
 */

export const RC = {
  panel: '#ffffff',
  elevated: '#fff5ec',
  border: '#e6ceba',
  text: '#a63a0d',
  textDim: '#85614a',
  accent: '#ce460c',
  positive: '#277552',
  warning: '#8c6416',
  grid: 'rgba(166,58,13,0.12)',
}

/**
 * The panel itself. Inline style rather than tailwind classes because the
 * padding and shadow are off-scale values that would otherwise need several
 * arbitrary Tailwind classes at every call site.
 */
export const PANEL_STYLE = {
  background: RC.panel,
  border: `1px solid ${RC.border}`,
  borderRadius: 8,
  padding: '20px 22px',
  boxShadow: '0 1px 2px rgba(65,35,12,0.08)',
}

/** Segmented-control pill, filled when selected. */
export function pillStyle(active) {
  return {
    background: active ? RC.elevated : 'transparent',
    color: active ? RC.text : RC.textDim,
    border: `1px solid ${active ? RC.border : 'transparent'}`,
  }
}
