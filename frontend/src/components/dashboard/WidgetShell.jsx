/**
 * IlmForge — WidgetShell.
 *
 * Wraps every dashboard widget so loading, error and empty states exist once
 * rather than being reinvented (or forgotten) per widget. The rules it
 * enforces:
 *
 *   loading  a skeleton shaped roughly like the content, not a spinner
 *   error    says what failed AND what to do about it, with a retry
 *   empty    says what to do next, never just "no data"
 *   needs    a school with too little history is told how much more is
 *            needed and when the feature will switch itself on
 */
import { AlertCircle, RefreshCw, CalendarClock } from 'lucide-react';

export function Skeleton({ h = 14, w = '100%', style }) {
  return <div className="d-skel" style={{ height: h, width: w, ...style }} />;
}

export default function WidgetShell({
  title,
  subtitle,
  actions,
  loading,
  error,
  onRetry,
  empty,
  emptyTitle = 'Nothing here yet',
  emptyHint,
  emptyAction,
  /** { missing, need, have, what } — too little history to be honest */
  needsData,
  skeletonRows = 3,
  children,
  className = '',
  style,
}) {
  const body = () => {
    if (loading) {
      return (
        <div style={{ display: 'grid', gap: 10, padding: '4px 0' }}>
          {Array.from({ length: skeletonRows }).map((_, i) => (
            <Skeleton key={i} h={i === 0 ? 22 : 14} w={i === 0 ? '55%' : `${92 - i * 11}%`} />
          ))}
        </div>
      );
    }

    if (error) {
      // What broke and what to do, not a bare "Error".
      const msg = typeof error === 'string' ? error : (error?.message || 'Could not load this section.');
      return (
        <div className="d-state" role="alert">
          <AlertCircle size={19} style={{ color: 'var(--d-loss)' }} />
          <div className="d-state-title">This section did not load</div>
          <div className="d-state-hint">{msg}</div>
          {onRetry && (
            <button className="d-btn" onClick={onRetry} style={{ marginTop: 4 }}>
              <RefreshCw size={13} /> Try again
            </button>
          )}
        </div>
      );
    }

    if (needsData && !needsData.available) {
      const n = needsData.missing;
      return (
        <div className="d-state">
          <CalendarClock size={19} style={{ color: 'var(--d-accent)' }} />
          <div className="d-state-title">
            {n === 1 ? '1 more month of data needed' : `${n} more months of data needed`}
          </div>
          <div className="d-state-hint">
            {needsData.what || 'This needs a longer history before it can say anything useful.'}
            {' '}You have {needsData.have} {needsData.have === 1 ? 'month' : 'months'} recorded;
            it turns on automatically at {needsData.need}.
          </div>
        </div>
      );
    }

    if (empty) {
      return (
        <div className="d-state">
          <div className="d-state-title">{emptyTitle}</div>
          {emptyHint && <div className="d-state-hint">{emptyHint}</div>}
          {emptyAction}
        </div>
      );
    }

    return children;
  };

  return (
    <section className={`d-panel ${className}`} style={style} aria-busy={loading ? 'true' : undefined}>
      {(title || actions) && (
        <header className="d-panel-head">
          <div style={{ minWidth: 0 }}>
            {title && <h3 className="d-panel-title">{title}</h3>}
            {subtitle && <div className="d-panel-sub">{subtitle}</div>}
          </div>
          {actions && <div className="d-no-print" style={{ display: 'flex', gap: 6, flexShrink: 0 }}>{actions}</div>}
        </header>
      )}
      {body()}
    </section>
  );
}
