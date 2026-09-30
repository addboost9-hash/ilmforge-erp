/**
 * IlmForge — "Why this result?" drivers.
 *
 * A diverging bar per driver: gains right of the centre line, losses left,
 * scaled against the largest absolute impact so the biggest cause is
 * immediately obvious without reading any numbers.
 *
 * The footer restates the arithmetic — every bar added together equals the
 * change being explained. The engine guarantees that exactly; showing it is
 * what makes the breakdown trustworthy rather than merely decorative.
 */
import { moneyShort } from '../../utils/currency';

export default function DriverBars({ explanation }) {
  if (!explanation) return null;

  const drivers = (explanation.drivers || []).filter(d => d.impact !== 0);
  if (!drivers.length) {
    return (
      <div className="d-state-hint" style={{ padding: '8px 0' }}>
        Nothing changed between {explanation.from} and {explanation.to}.
      </div>
    );
  }

  const max = Math.max(...drivers.map(d => Math.abs(d.impact))) || 1;
  const total = drivers.reduce((t, d) => t + d.impact, 0);
  const up = explanation.netChange >= 0;

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
        <span className={up ? 'd-metric d-profit' : 'd-metric d-loss'} style={{ fontSize: 21 }}>
          {up ? '+' : ''}{moneyShort(explanation.netChange)}
        </span>
        <span className="d-panel-sub">
          {explanation.from} → {explanation.to}, result {explanation.direction}
        </span>
      </div>

      <div style={{ display: 'grid', gap: 9 }}>
        {drivers.map((d) => {
          const positive = d.impact >= 0;
          const w = (Math.abs(d.impact) / max) * 50; // half the width each side
          return (
            <div key={d.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, marginBottom: 3 }}>
                <span style={{ color: 'var(--d-muted)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {d.label}
                  {d.detail && <span style={{ opacity: .75 }}> · {d.detail}</span>}
                </span>
                <span style={{
                  fontVariantNumeric: 'tabular-nums', fontWeight: 600, flexShrink: 0,
                  color: positive ? 'var(--d-profit)' : 'var(--d-loss)',
                }}>
                  {positive ? '+' : '−'}{moneyShort(Math.abs(d.impact))}
                </span>
              </div>
              {/* Centre line with the bar growing outward from it. */}
              <div style={{ position: 'relative', height: 8, background: 'var(--d-line)', borderRadius: 4 }}>
                <div style={{
                  position: 'absolute', left: '50%', top: 0, bottom: 0,
                  width: 1, background: 'var(--d-muted)', opacity: .4,
                }} />
                <div style={{
                  position: 'absolute', top: 0, bottom: 0, borderRadius: 4,
                  background: positive ? 'var(--d-profit)' : 'var(--d-loss)',
                  ...(positive ? { left: '50%', width: `${w}%` } : { right: '50%', width: `${w}%` }),
                }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="d-state-hint" style={{ marginTop: 12, maxWidth: 'none', textAlign: 'left' }}>
        These add up to {moneyShort(total)} — the whole of the change, with nothing unexplained.
      </div>
    </div>
  );
}
