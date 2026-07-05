/**
 * IlmForge — HubShell (Dark Navy Enterprise Theme)
 * ═══════════════════════════════════════════════════
 * Onboarding-style hub wrapper: ek page pe poora module.
 * - Hub header with title, subtitle, quick actions
 * - Tab strip with blue underline for active tab
 * - Active tab content rendered below
 * URL sync: ?tab=<id> so refresh/share works.
 */
import { useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export default function HubShell({ title, subtitle, accent = '#0073b7', tabs, quickActions = [] }) {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('tab') || tabs[0]?.id;
  const active = useMemo(() => tabs.find(t => t.id === activeId) || tabs[0], [tabs, activeId]);

  useEffect(() => { window.scrollTo(0, 0); }, [activeId]);
  const go = (id) => setParams({ tab: id }, { replace: false });

  return (
    <div className="hub-shell">

      {/* ── Hub Header ── */}
      <div className="hub-header">
        <div>
          <h1 className="hub-title">{title}</h1>
          <p className="hub-subtitle">{subtitle}</p>
        </div>
        {quickActions.length > 0 && (
          <div className="hub-actions">
            {quickActions.map((qa, i) => (
              <button key={i} onClick={() => go(qa.tab)}
                className={i === 0 ? 'btn btn-primary' : 'btn btn-outline'}>
                {qa.icon && <qa.icon style={{ width: 14, height: 14 }} />}
                {qa.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tab Strip ── */}
      <div className="tab-strip">
        {tabs.map((t) => {
          const isActive = t.id === active?.id;
          return (
            <button key={t.id} onClick={() => go(t.id)}
              className={isActive ? 'tab-btn active' : 'tab-btn'}>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* ── Breadcrumb ── */}
      <div className="content-wrapper" style={{ paddingBottom: 0, paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>{title}</span>
          <ChevronRight style={{ width: 12, height: 12 }} />
          <span style={{ color: 'var(--primary)' }}>{active?.label}</span>
          {active?.hint && (
            <>
              <ChevronRight style={{ width: 12, height: 12 }} />
              <span>{active.hint}</span>
            </>
          )}
        </div>
      </div>

      {/* ── Active Tab Content ── */}
      <div className="content-wrapper" style={{ paddingTop: 0 }}>
        <div className="hub-content">
          {active?.render()}
        </div>
      </div>

    </div>
  );
}
