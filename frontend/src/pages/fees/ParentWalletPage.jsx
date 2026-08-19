/**
 * IlmForge — Parent Wallet System
 * Planned feature: credit/advance deposits that auto-deduct from wallet
 * when fees are due.
 *
 * NOTE: The backend endpoints for this feature (/fees/wallet*) do not exist yet —
 * a wallet/ledger subsystem needs real financial design work, not a rushed patch.
 * Until that lands, this page presents an honest "coming soon" state instead of a
 * silently-broken search/deposit form.
 */
import { Wallet, Clock3 } from 'lucide-react';

export default function ParentWalletPage() {
  return (
    <div className="page-content fade-in">
      <div className="page-header-band">
        <div className="page-header-left">
          <h1 className="page-title" style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Wallet size={20} color="#7c3aed" /> Parent Wallet System
          </h1>
          <p style={{ color:'#64748b', fontSize:13, marginTop:2 }}>
            Advance / credit deposits. System auto-deducts when fees are due.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="empty-state" style={{ padding: 60 }}>
          <div className="empty-state-icon"><Clock3 size={40} style={{ opacity: 0.5 }}/></div>
          <div className="empty-state-text">Parent Wallet — Coming Soon</div>
          <div className="empty-state-sub">
            This feature is planned for a future release. A prepaid wallet with deposit and
            auto-deduction requires dedicated ledger support that isn't built yet, so it's
            disabled for now rather than shown half-working.
          </div>
        </div>
      </div>
    </div>
  );
}
