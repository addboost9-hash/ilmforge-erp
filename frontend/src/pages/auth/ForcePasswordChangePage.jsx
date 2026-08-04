/**
 * IlmForge — Forced Password Change
 * Shown whenever the logged-in account has mustChangePassword=true
 * (default-password staff/portal accounts, or after an admin reset).
 * Blocks the rest of the app until a new password is set.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Loader2, ShieldCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../../api/client';
import useAuthStore from '../../store/auth.store';

const ROLE_PORTALS = {
  parent: '/parent-portal',
  student: '/student-portal',
  teacher: '/teacher-portal',
  accountant: '/accountant-portal',
  gatekeeper: '/gatekeeper-portal',
};

export default function ForcePasswordChangePage() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuthStore();
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.currentPassword || !form.newPassword) return toast.error('Please fill all fields');
    if (form.newPassword.length < 8) return toast.error('New password must be at least 8 characters');
    if (form.newPassword !== form.confirmPassword) return toast.error('Passwords do not match');

    setLoading(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      updateUser({ ...user, mustChangePassword: false });
      toast.success('Password changed. Welcome!');
      navigate(ROLE_PORTALS[user?.role] || '/dashboard', { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', fontFamily: "'Inter',system-ui,sans-serif", padding: 20 }}>
      <div style={{ width: '100%', maxWidth: 420, background: '#fff', borderRadius: 16, boxShadow: '0 10px 40px rgba(0,0,0,0.08)', padding: '36px 32px' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, background: '#F0FDFA', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
            <ShieldCheck size={28} color="#0F766E" />
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>Set a new password</h2>
          <p style={{ marginTop: 6, fontSize: 13.5, color: '#6B7280' }}>
            For your account's security, you must set a new password before continuing.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Current (temporary) password</label>
            <input
              type="password"
              value={form.currentPassword}
              onChange={(e) => setForm((f) => ({ ...f, currentPassword: e.target.value }))}
              autoFocus
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>New password</label>
            <input
              type="password"
              value={form.newPassword}
              onChange={(e) => setForm((f) => ({ ...f, newPassword: e.target.value }))}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14 }}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Confirm new password</label>
            <input
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))}
              style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14 }}
            />
          </div>
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: loading ? '#0F766E88' : '#0F766E', color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            {loading ? <><Loader2 size={17} style={{ animation: 'spin .8s linear infinite' }} /> Updating…</> : <><Lock size={16} /> Update Password</>}
          </button>
        </form>
      </div>
    </div>
  );
}
