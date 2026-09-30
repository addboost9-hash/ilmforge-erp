/**
 * IlmForge — Portal Links
 * The sign-in link for each role, branded with the school's own name and logo.
 * Credentials are shown once when a record is created; these links are not
 * secret and can be looked up here whenever someone needs resending.
 */
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../api/client';
import { Link2, Copy, ExternalLink, GraduationCap } from 'lucide-react';

const ROLE_NOTE = {
  admin:      'School owner and office administrators.',
  teacher:    'Teaching staff — attendance, marks, timetable.',
  accountant: 'Fee collection, vouchers and daily balance.',
  gatekeeper: 'Gate entry and visitor records.',
  student:    'Students sign in with their roll number.',
  parent:     'Parents sign in with their phone number.',
};

export default function PortalLinksPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['portal-links'],
    queryFn: () => api.get('/settings/portal-links').then(r => r.data.data),
  });

  const school = data?.school;
  const links = data?.links || [];

  const copy = (text, label) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(label + ' link copied'))
      .catch(() => toast.error('Could not copy — select the link and copy manually'));
  };

  const copyAll = () => {
    const body = links
      .map(l => l.portal + ': ' + l.url)
      .join(String.fromCharCode(10));
    copy((school?.name || '') + String.fromCharCode(10) + String.fromCharCode(10) + body, 'All portal');
  };

  return (
    <div className="page">
      <div className="card" style={{ marginBottom: 16 }}>
        <div
          className="card-header"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12 }}
        >
          {school?.logoUrl
            ? <img src={school.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover' }} />
            : <GraduationCap size={22} style={{ color: 'var(--text-muted)' }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-title">{school?.name || 'Portal Links'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Each link opens the sign-in page branded for your school. Share the one
              that matches the person's role.
            </div>
          </div>
          {links.length > 0 && (
            <button className="btn btn-sm btn-outline" onClick={copyAll}>
              <Copy size={13} /> Copy all
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <div className="card">
          <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Portal</th>
                  <th>Signs in with</th>
                  <th>Link</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {links.map(l => (
                  <tr key={l.role}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{l.portal}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ROLE_NOTE[l.role]}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{l.loginIdLabel}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{l.url}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => copy(l.url, l.portal)}>
                          <Copy size={12} /> Copy
                        </button>
                        <a className="btn btn-sm btn-outline" href={l.url} target="_blank" rel="noreferrer">
                          <ExternalLink size={12} /> Open
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
                {!links.length && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: 28, color: 'var(--text-muted)' }}>
                      <Link2 size={18} style={{ opacity: 0.5 }} />
                      <div style={{ marginTop: 6 }}>No portal links available.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="card-footer" style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            A link only opens the sign-in page. Everyone still needs their own
            password, and what they can see is decided by the role on their account.
          </div>
        </div>
      )}
    </div>
  );
}
