/**
 * IlmForge — Reusable loading-skeleton building blocks
 * Composable placeholders that mirror real table rows, stat cards, and
 * text blocks so a page's loading state resembles the content that will
 * replace it, instead of a bare spinner or blank space.
 *
 * Relies on the shared `.skeleton` shimmer class and `fadeIn` keyframe
 * already defined in index.css, plus a few small layout classes appended
 * at the end of that file (`.skeleton-card-box`, `.skeleton-text-block`,
 * `.skeleton-content-fade`).
 */

/* A single shimmering placeholder bar. */
function Bar({ width = '100%', height = 12, style }) {
  return <div className="skeleton" style={{ width, height, borderRadius: 4, ...style }} />;
}

/**
 * SkeletonRow — one placeholder <tr> for a data table. Render several of
 * these inside a real <tbody> while the table's query is loading.
 *
 * @param {number} cols - number of columns to render
 * @param {(string|number)[]} widths - optional per-column width hints
 *   (defaults to a natural first-wide/last-narrow pattern)
 * @param {object} cellStyle - extra style merged onto every <td>
 */
export function SkeletonRow({ cols = 5, widths, cellStyle }) {
  const colWidths = widths || Array.from({ length: cols }, (_, i) =>
    i === 0 ? '55%' : i === cols - 1 ? '38%' : '75%'
  );
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: '11px 14px', ...cellStyle }}>
          <Bar width={colWidths[i] ?? '70%'} />
        </td>
      ))}
    </tr>
  );
}

/**
 * SkeletonRows — convenience wrapper that renders several SkeletonRow
 * <tr>s at once, e.g. <tbody>{isLoading ? <SkeletonRows cols={6}/> : ...}</tbody>
 *
 * @param {number} rows - how many placeholder rows to render (default 6)
 */
export function SkeletonRows({ rows = 6, cols = 5, widths }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <SkeletonRow key={r} cols={cols} widths={widths} />
      ))}
    </>
  );
}

/**
 * SkeletonCard — placeholder for a stat card / grid tile. Matches the
 * common "small label + big number" stat-card shape used across the app.
 */
export function SkeletonCard({ lines = 2 }) {
  return (
    <div className="skeleton-card-box">
      <Bar width="45%" height={11} />
      <Bar width="60%" height={24} />
      {lines > 2 && <Bar width="50%" height={11} />}
    </div>
  );
}

/**
 * SkeletonText — a stack of placeholder text lines, for blurbs, list items
 * or detail panels that aren't tabular.
 */
export function SkeletonText({ lines = 3, widths }) {
  return (
    <div className="skeleton-text-block">
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} width={widths?.[i] ?? (i === lines - 1 ? '55%' : '92%')} height={12} />
      ))}
    </div>
  );
}

export default { SkeletonRow, SkeletonRows, SkeletonCard, SkeletonText };
