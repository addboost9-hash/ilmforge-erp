/**
 * IlmForge — EMI / Instalment Plans
 * Planned feature: create instalment plans per student, track payment per instalment.
 *
 * NOTE: The backend endpoints for this feature (/fees/emi-plans*) do not exist yet —
 * building a correct EMI ledger needs real schema/design work, not a rushed patch.
 * Until that lands, this page presents an honest "coming soon" state instead of a
 * silently-broken form.
 */
import { CreditCard, Clock3 } from 'lucide-react';

export default function EmiPlansPage() {
  return (
    <div className="page-content fade-in">
      {/* Page header */}
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={20} color="#0073b7"/> EMI / Instalment Plans
          </h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            Create monthly instalment plans and track payment per instalment
          </p>
        </div>
      </div>

      <div className="card">
        <div className="empty-state">
          <div className="empty-state-icon"><Clock3 size={40} style={{ opacity: 0.5 }}/></div>
          <div className="empty-state-text">EMI / Instalment Plans — Coming Soon</div>
          <div className="empty-state-sub">
            This feature is planned for a future release. Splitting fees into tracked instalments
            needs dedicated ledger support that isn't built yet, so it's disabled for now rather
            than shown half-working. Nothing you enter here today would be saved.
          </div>
        </div>
      </div>
    </div>
  );
}
