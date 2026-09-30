/**
 * IlmForge — Health Score ring.
 *
 * The one memorable element on the admin dashboard. It is deliberately the
 * only thing on the page that animates on load.
 *
 * A score on its own is a verdict, which is not useful and not fair, so the
 * ring is always accompanied by the components that produced it: what was
 * measured, what it was measured against, and how many points it contributed.
 * The arithmetic is the server's, shown verbatim.
 */
import { useEffect, useState } from 'react';

const BAND = {
  strong:  { label: 'Strong',        color: 'var(--d-profit)' },
  steady:  { label: 'Steady',        color: 'var(--d-primary)' },
  watch:   { label: 'Needs watching', color: 'var(--d-accent)' },
  urgent:  { label: 'Needs action',  color: 'var(--d-loss)' },
  unknown: { label: 'Not enough data', color: 'var(--d-muted)' },
};

const LABELS = {
  collectionRate:  'Fee collection',
  attendanceRate:  'Student attendance',
  retention:       'Student retention',
  staffAttendance: 'Staff attendance',
  profitability:   'Profitability',
};

export default function HealthRing({ health, size = 168 }) {
  const target = health?.score ?? 0;
  const [shown, setShown] = useState(0);

  // Single entrance animation; afterwards the ring only moves when the
  // underlying score does.
  useEffect(() => {
    if (health?.score == null) { setShown(0); return; }
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    if (reduce) { setShown(target); return; }
    let raf;
    const start = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - start) / 900);
      // ease-out so it settles rather than stopping dead
      setShown(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, health?.score]);

  const band = BAND[health?.band || 'unknown'];
  const r = (size - 18) / 2;
  const circ = 2 * Math.PI * r;
  const dash = health?.score == null ? 0 : (shown / 100) * circ;

  return (
    <div style={{ display: 'flex', gap: 22, alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} role="img"
          aria-label={health?.score == null
            ? 'School health score not available yet'
            : `School health score ${health.score} out of 100, ${band.label}`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--d-line)" strokeWidth="10" />
          <circle
            cx={size / 2} cy={size / 2} r={r} fill="none"
            stroke={band.color} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        <div style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--d-font-head)', fontSize: 38, fontWeight: 600,
            lineHeight: 1, color: 'var(--d-ink)', fontVariantNumeric: 'tabular-nums',
          }}>
            {health?.score == null ? '—' : shown}
          </div>
          <div style={{ fontSize: 11.5, color: band.color, fontWeight: 600, marginTop: 4 }}>
            {band.label}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 220 }}>
        {health?.score == null ? (
          <div className="d-state-hint">
            {health?.note || 'Record fee collection, attendance and expenses and this score appears.'}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gap: 7 }}>
              {(health.components || []).map((c) => (
                <div key={c.key} style={{ display: 'grid', gap: 3 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5 }}>
                    <span style={{ color: 'var(--d-muted)' }}>{LABELS[c.key] || c.key}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums' }}>
                      <strong>{c.measured == null ? '—' : `${c.measured}%`}</strong>
                      <span style={{ color: 'var(--d-muted)' }}> of {c.target}%</span>
                    </span>
                  </div>
                  <div style={{ height: 5, background: 'var(--d-line)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{
                      // A component that scored nothing still gets a visible
                      // sliver, so "scored zero" reads differently from
                      // "not measured" - an empty track means no data.
                      width: `${Math.max(c.subScore, 2)}%`, height: '100%',
                      background: c.subScore >= 90 ? 'var(--d-profit)'
                        : c.subScore >= 60 ? 'var(--d-primary)' : 'var(--d-loss)',
                    }} />
                  </div>
                </div>
              ))}
            </div>

            {health.coverage < 100 && (
              <div className="d-state-hint" style={{ marginTop: 10, maxWidth: 'none' }}>
                Based on {health.coverage}% of the full picture — {health.missing.map(m => LABELS[m] || m).join(', ')} not recorded yet.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
