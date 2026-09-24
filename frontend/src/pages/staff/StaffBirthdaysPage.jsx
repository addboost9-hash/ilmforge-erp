/**
 * Staff Birthdays — upcoming birthdays grouped by month.
 *
 * /staff/birthdays previously rendered the generic staff list. Staff.dob has
 * always been captured on the staff form; this surfaces it so the office can
 * actually act on it (the birthday-wishes cron already messages students —
 * staff birthdays were only ever visible by opening records one by one).
 */
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import { Cake, Phone, Building2 } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

const ordinal = (n) => {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export default function StaffBirthdaysPage() {
  const today = new Date();
  const [monthFilter, setMonthFilter] = useState(String(today.getMonth() + 1));

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ['staff-birthdays'],
    // limit=500 — the staff list is paginated at 25 by default, which would
    // silently hide most birthdays.
    queryFn: () => api.get('/staff', { params: { limit: 500 } }).then(r => r.data.data || []),
  });

  const withBirthdays = useMemo(
    () => staff
      .filter(s => s.dob)
      .map(s => {
        const d = new Date(s.dob);
        return { ...s, _month: d.getMonth() + 1, _day: d.getDate() };
      })
      .sort((a, b) => a._month - b._month || a._day - b._day),
    [staff]
  );

  const shown = monthFilter === 'all'
    ? withBirthdays
    : withBirthdays.filter(s => s._month === parseInt(monthFilter));

  const isToday = (s) => s._month === today.getMonth() + 1 && s._day === today.getDate();
  const todayCount = withBirthdays.filter(isToday).length;
  const missingDob = staff.length - withBirthdays.length;

  return (
    <div className="page-content fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 className="page-title">Staff Birthdays</h1>
          <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
            {todayCount > 0
              ? `🎉 ${todayCount} birthday${todayCount === 1 ? '' : 's'} today`
              : 'Upcoming staff birthdays by month'}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <label className="form-label" style={{ margin: 0 }} htmlFor="bday-month">Month</label>
          <select
            id="bday-month"
            className="form-select"
            style={{ width: 170 }}
            value={monthFilter}
            onChange={e => setMonthFilter(e.target.value)}
          >
            <option value="all">All months</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1E3A5F' }}>
            {monthFilter === 'all' ? 'All Birthdays' : `${MONTHS[parseInt(monthFilter) - 1]} Birthdays`}
          </h3>
          <span style={{ fontSize: 12, color: '#64748B' }}>{shown.length} staff</span>
        </div>

        <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Name</th>
                <th>Birthday</th>
                <th>Designation</th>
                <th>Department</th>
                <th>Phone</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={6} style={{ padding: 24, textAlign: 'center', color: '#94A3B8' }}>Loading…</td></tr>
              ) : shown.length === 0 ? (
                <tr><td colSpan={6}>
                  <div className="empty-state">
                    <div className="empty-state-icon">🎂</div>
                    <div className="empty-state-text">
                      {withBirthdays.length === 0
                        ? 'No staff have a date of birth recorded yet — add one on the staff form'
                        : 'No birthdays in the selected month'}
                    </div>
                  </div>
                </td></tr>
              ) : shown.map((s, i) => (
                <tr key={s.id} style={isToday(s) ? { background: '#FFFBEB' } : undefined}>
                  <td style={{ color: '#94A3B8' }}>{i + 1}</td>
                  <td style={{ fontWeight: 600, color: '#1E3A5F' }}>
                    {isToday(s) && <Cake size={14} color="#D97706" style={{ verticalAlign: -2, marginRight: 6 }} />}
                    {s.name}
                  </td>
                  <td>{MONTHS[s._month - 1]} {ordinal(s._day)}</td>
                  <td style={{ color: '#475569' }}>{s.designation || '—'}</td>
                  <td>
                    {s.department?.name
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#475569' }}>
                          <Building2 size={13} color="#94A3B8" /> {s.department.name}
                        </span>
                      : <span style={{ color: '#94A3B8' }}>—</span>}
                  </td>
                  <td>
                    {s.user?.phone
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#475569' }}>
                          <Phone size={13} color="#94A3B8" /> {s.user.phone}
                        </span>
                      : <span style={{ color: '#94A3B8' }}>—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {missingDob > 0 && (
        <div style={{ marginTop: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8, fontSize: 12.5, color: '#64748B' }}>
          {missingDob} staff member{missingDob === 1 ? ' has' : 's have'} no date of birth recorded and {missingDob === 1 ? 'is' : 'are'} not listed here.
        </div>
      )}
    </div>
  );
}
