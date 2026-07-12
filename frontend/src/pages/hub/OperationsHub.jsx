/** Operations Hub — stock/POS, transport, tasks, behaviour, tutorials, academic calendar, reports */
import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Package, Truck, CheckSquare, UserCheck, PlayCircle, BookOpen, FileText, HardDrive, Calendar, BarChart2 } from 'lucide-react';

const StockPage        = lazy(() => import('../stock/StockPage'));
const TransportPage    = lazy(() => import('../transport/TransportPage'));
const TasksPage        = lazy(() => import('../tasks/TaskManagementPage'));
const BehaviourPage    = lazy(() => import('../behaviour/BehaviourPage'));
const Tutorials        = lazy(() => import('../tutorials/VideoTutorialsPage'));
const ManualPage       = lazy(() => import('../manual/UserManualPage'));
const SOPsPage         = lazy(() => import('../sops/SOPsPage'));
const BackupPage       = lazy(() => import('../backup/BackupPage'));
const LibraryPage      = lazy(() => import('../library/LibraryPage'));
const AcalPage         = lazy(() => import('../calendar/AcademicCalendarPage'));
const ReportsHubPage   = lazy(() => import('../reports/ReportsHubPage'));

const L = (C) => () => (
  <Suspense fallback={<div style={{ padding:40, textAlign:'center', color:'#94a3b8', fontSize:13 }}>Loading…</div>}>
    <C />
  </Suspense>
);

const TABS = [
  { id: 'calendar',  label: '📅 Acad. Calendar', hint: 'Events, holidays, exams', icon: Calendar,     render: L(AcalPage) },
  { id: 'reports',   label: '📊 Reports Hub',     hint: '110+ printable reports',  icon: BarChart2,    render: L(ReportsHubPage) },
  { id: 'stock',     label: 'Stock & POS',        hint: 'Inventory + sales',       icon: Package,      render: L(StockPage) },
  { id: 'transport', label: 'Transport',          hint: 'Routes + fees',           icon: Truck,        render: L(TransportPage) },
  { id: 'tasks',     label: 'Tasks',              hint: 'Staff assignments',       icon: CheckSquare,  render: L(TasksPage) },
  { id: 'behaviour', label: 'Behaviour',          hint: 'Student records',         icon: UserCheck,    render: L(BehaviourPage) },
  { id: 'library',   label: 'Library',            hint: 'Books & resources',       icon: BookOpen,     render: L(LibraryPage) },
  { id: 'tutorials', label: 'Tutorials',          hint: 'Training videos',         icon: PlayCircle,   render: L(Tutorials) },
  { id: 'manual',    label: 'User Manual',        hint: 'How-to guide',            icon: BookOpen,     render: L(ManualPage) },
  { id: 'sops',      label: 'SOPs 📖',            hint: 'School procedures',       icon: FileText,     render: L(SOPsPage) },
  { id: 'backup',    label: 'Backups 💾',         hint: 'Full data export',        icon: HardDrive,    render: L(BackupPage) },
];

const ACCENT = '#605ca8';

export default function OperationsHub() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('tab') || TABS[0].id;
  const active = TABS.find(t => t.id === activeId) || TABS[0];
  const go = (id) => setParams({ tab: id }, { replace: false });

  return (
    <div className="hub-shell">

      {/* Hub Header */}
      <div className="hub-header" style={{ borderLeft: `4px solid ${ACCENT}` }}>
        <div>
          <div className="hub-title">
            <Package size={20} style={{ color: ACCENT }} />
            Operations Hub
          </div>
          <div className="hub-subtitle">
            Stock/POS, transport, tasks, behaviour tracking — daily operations
          </div>
        </div>
        <div className="hub-actions">
          <button className="btn btn-primary" onClick={() => go('stock')}>
            <Package size={14} /> Point of Sale
          </button>
          <button className="btn btn-outline" onClick={() => go('transport')}>
            <Truck size={14} /> Transport
          </button>
        </div>
      </div>

      {/* Tab Strip */}
      <div className="tab-strip">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={'tab-btn' + (activeId === tab.id ? ' active' : '')}
            onClick={() => go(tab.id)}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className="content-wrapper" style={{ paddingBottom: 0, paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Operations Hub</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span style={{ color: ACCENT }}>{active.label}</span>
          {active.hint && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>›</span>
              <span>{active.hint}</span>
            </>
          )}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="content-wrapper" style={{ paddingTop: 0 }}>
        <div className="hub-content">
          {active.render()}
        </div>
      </div>

    </div>
  );
}
