/** Messenger Shell — any-role standalone chat screen (portals se accessible) */
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/auth.store';
import ChatPage from './ChatPage';
import { IlmForgeLogo } from '../../components/brand/Brand';
import { ChevronLeft } from 'lucide-react';

const ROLE_PORTALS = { admin: '/dashboard', super_admin: '/dashboard', teacher: '/teacher-portal', parent: '/parent-portal', student: '/student-portal', accountant: '/accountant-portal', gatekeeper: '/gatekeeper-portal' };

export default function MessengerShell() {
  const nav = useNavigate();
  const { user } = useAuthStore();
  return (
    <div className="min-h-screen" style={{ background: '#F6F8FB' }}>
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-20">
        <button onClick={() => nav(ROLE_PORTALS[user?.role] || '/dashboard')}
          className="flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-teal-600 border border-slate-200 rounded-xl px-3 py-2 transition">
          <ChevronLeft className="w-4 h-4" /> Portal
        </button>
        <IlmForgeLogo size={32} />
        <span className="ml-auto text-[11px] font-bold text-slate-400">{user?.name}</span>
      </div>
      <div className="max-w-5xl mx-auto p-4"><ChatPage /></div>
    </div>
  );
}
