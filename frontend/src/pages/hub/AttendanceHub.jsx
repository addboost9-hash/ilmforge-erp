/** Attendance Hub — flow, barcode, reports, awards */
import { lazy, Suspense } from 'react';
import HubShell from './HubShell';
import { UserCheck, ScanLine } from 'lucide-react';

const AttendanceFlow   = lazy(() => import('../attendance/AttendanceFlowPage'));
const AttendancePage   = lazy(() => import('../attendance/AttendancePage'));
const BarcodeScan      = lazy(() => import('../attendance/BarcodeScanPage'));
const AttendanceReport = lazy(() => import('../attendance/AttendanceReportPage'));
const AttendanceAwards = lazy(() => import('../attendance/AttendanceAwardsPage'));
const BiometricPage    = lazy(() => import('../attendance/BiometricAttendancePage'));
const FacePage         = lazy(() => import('../attendance/FaceAttendancePage'));

const L = (C) => () => (
  <Suspense fallback={<div className="empty-state"><span className="spinner" /></div>}>
    <C />
  </Suspense>
);

export default function AttendanceHub() {
  return (
    <HubShell
      title="Attendance Hub"
      subtitle="One-tap marking, barcode scan, reports — absent parents ko auto SMS"
      accent="#00a65a"
      quickActions={[
        { label: 'Mark Now (3-step)', tab: 'flow', icon: UserCheck },
        { label: 'Barcode Scan', tab: 'barcode', icon: ScanLine },
      ]}
      tabs={[
        { id: 'flow',      label: 'Mark Attendance',   hint: '3-step + auto SMS',       render: L(AttendanceFlow) },
        { id: 'classic',   label: 'Register View',     hint: 'Classic grid',            render: L(AttendancePage) },
        { id: 'barcode',   label: 'Barcode Scan',      hint: 'ID card scanning',        render: L(BarcodeScan) },
        { id: 'reports',   label: 'Reports',           hint: 'Monthly summaries',       render: L(AttendanceReport) },
        { id: 'awards',    label: 'Awards',            hint: '100% attendance',         render: L(AttendanceAwards) },
        { id: 'biometric', label: 'Thumb Device',      hint: 'ZKTeco + live punches',   render: L(BiometricPage) },
        { id: 'face',      label: 'Face Recognition',  hint: 'Webcam kiosk',            render: L(FacePage) },
      ]}
    />
  );
}
