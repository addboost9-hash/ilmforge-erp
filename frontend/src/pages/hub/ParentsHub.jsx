/** Parents & Portals Hub — accounts, credentials, complaints */
import { lazy, Suspense } from 'react';
import HubShell from './HubShell';
import { KeyRound, Users } from 'lucide-react';

const ParentsPage      = lazy(() => import('../students/ParentsPage'));
const ParentAccounts   = lazy(() => import('../students/ParentAccountsPage'));
const PortalManagement = lazy(() => import('../portal/PortalManagementPage'));
const ComplaintsPage   = lazy(() => import('../complaints/ComplaintsPage'));
const GatePassPage     = lazy(() => import('../gatepass/GatePassPage'));

const L = (C) => () => <Suspense fallback={<div className="p-10 text-center text-slate-400 text-sm">Loading…</div>}><C /></Suspense>;

export default function ParentsHub() {
  return (
    <HubShell
      title="👨‍👩‍👧 Parents & Portals Hub"
      subtitle="Parent accounts, portal credentials, password resets, complaints — sab yahan"
      accent="#F59E0B"
      quickActions={[
        { label: 'Portal Credentials', tab: 'portals', icon: KeyRound },
        { label: 'All Parents', tab: 'list', icon: Users },
      ]}
      tabs={[
        { id: 'list',       label: 'All Parents',       hint: 'Directory + children',   render: L(ParentsPage) },
        { id: 'portals',    label: 'Portal Management', hint: 'Credentials + resets',   render: L(PortalManagement) },
        { id: 'accounts',   label: 'Accounts & Wallet', hint: 'Credit + gate passes',   render: L(ParentAccounts) },
        { id: 'complaints', label: 'Complaints',        hint: 'Respond + resolve',      render: L(ComplaintsPage) },
        { id: 'gatepass',   label: 'Gate Passes 🎫',    hint: 'QR issue + verify',      render: L(GatePassPage) },
      ]}
    />
  );
}
