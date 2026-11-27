/**
 * Fingerprint machines — set up, run and check them, organisation level.
 *
 *   Machines        each machine's state and health, the work going to it,
 *                   what the office can ask of it; connecting one; a test punch
 *   People          who is enrolled, fingerprints kept (backup, copied to the
 *                   other machines), enrolling from here, and the users on the
 *                   machines linked to students and staff (an old machine's users)
 *   Punch log       every punch, any days, filtered, CSV
 *   Staff timesheet the month against each person's shift, corrections with a reason
 *   Rules           late times, auto-absent, staff shifts, the late rule
 *
 * The machines talk to the server on their own (Cloud server / ADMS mode);
 * the Attendance Kiosk screen shows each punch with the person's photo.
 * Step-by-step guide: /guides/IlmForge-Attendance-Devices-Guide.pdf
 */
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Fingerprint, BookOpen, ScanLine } from 'lucide-react';
import { useIsAdmin } from './devices/shared';
import MachinesView from './devices/MachinesView';
import PeopleView from './devices/PeopleView';
import PunchLogView from './devices/PunchLogView';
import TimesheetView from './devices/TimesheetView';
import RulesView from './devices/RulesView';

const BASE = import.meta.env.BASE_URL || '/';
const GUIDE = `${BASE}guides/IlmForge-Attendance-Devices-Guide.pdf`;

const VIEWS = [
  { id: 'machines', label: 'Machines' },
  { id: 'people', label: 'People & fingers' },
  { id: 'punches', label: 'Punch log' },
  { id: 'timesheet', label: 'Staff timesheet', admin: true },
  { id: 'rules', label: 'Rules' },
];

export default function AttendanceDevicesPage() {
  const isAdmin = useIsAdmin();
  const [params, setParams] = useSearchParams();
  const views = VIEWS.filter((v) => !v.admin || isAdmin);
  const view = views.find((v) => v.id === params.get('view'))?.id || 'machines';
  const go = (id) => { const next = new URLSearchParams(params); next.set('view', id); setParams(next, { replace: true }); };
  const { data: classes = [] } = useQuery({ queryKey: ['classes'], queryFn: () => api.get('/classes').then((r) => r.data.data || []) });
  const { data: devices = [] } = useQuery({ queryKey: ['bio-devices'], queryFn: () => api.get('/biometric/devices').then((r) => r.data.data || []), refetchInterval: 5000 });
  const offline = devices.filter((d) => d.isActive && d.lastSeen && !d.online).length;
  const notLinked = devices.reduce((n, d) => n + (d.notLinkedToday || 0), 0);

  return (
    <div className="page-content fade-in" style={{ maxWidth: 1240, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ minWidth: 0 }}>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}><Fingerprint size={24} color="#0D9488" /> Fingerprint Machines</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Students and staff mark attendance with a finger, a face or an ID card. Every punch is saved in the attendance register.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn-outline" href={GUIDE} target="_blank" rel="noreferrer"><BookOpen size={15} /> Setup guide (PDF)</a>
          <Link className="btn btn-teal" to="/attendance/barcode"><ScanLine size={15} /> Open Attendance Kiosk</Link>
        </div>
      </div>

      <div role="tablist" aria-label="Fingerprint machines" style={{ display: 'flex', gap: 4, flexWrap: 'wrap', borderBottom: '1px solid #E2E8F0', marginBottom: 16 }}>
        {views.map((v) => {
          const badge = v.id === 'machines' ? offline : v.id === 'people' ? notLinked : 0;
          return (
            <button key={v.id} type="button" role="tab" aria-selected={view === v.id} onClick={() => go(v.id)}
              style={{ padding: '9px 14px', border: 0, borderBottom: `3px solid ${view === v.id ? '#0D9488' : 'transparent'}`, background: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13.5, color: view === v.id ? '#0F766E' : '#475569', display: 'inline-flex', gap: 6, alignItems: 'center' }}>
              {v.label}
              {badge > 0 && <span className="badge badge-red" title={v.id === 'machines' ? 'Machines not connected' : 'Punches today from people not linked'}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {view === 'machines' && <MachinesView isAdmin={isAdmin} classes={classes} />}
      {view === 'people' && <PeopleView isAdmin={isAdmin} classes={classes} />}
      {view === 'punches' && <PunchLogView />}
      {view === 'timesheet' && isAdmin && <TimesheetView />}
      {view === 'rules' && <RulesView isAdmin={isAdmin} classes={classes} />}
    </div>
  );
}
