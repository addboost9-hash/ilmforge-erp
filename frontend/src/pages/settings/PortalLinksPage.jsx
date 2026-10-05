/**
 * IlmForge — Portal Links
 *
 * Everything that belongs to this school on the web, in one place:
 *   - its public links (school page, online admission form, fee slip), each
 *     with a QR code and a printable "Admissions open" poster;
 *   - the branded sign-in link for every role;
 *   - its web name, which the school can change to something short.
 *
 * Links are built from the address this page is open on, so they are always
 * the live site's links (the server's FRONTEND_URL setting is not needed).
 */
import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import QRCode from 'qrcode';
import api from '../../api/client';
import { Link2, Copy, ExternalLink, GraduationCap, QrCode, Printer, Download, Pencil, X, Check, Globe, UserPlus, FileDown, AlertTriangle } from 'lucide-react';
import { schoolLinks, slugProblem, toSlug, rememberedSlug } from '../../utils/schoolLinks';
import { printHTML } from '../../utils/print';

const ROLES = [
  { role: 'admin',      portal: 'Admin Dashboard',   signIn: 'Email',        note: 'School owner and office administrators.' },
  { role: 'teacher',    portal: 'Teacher Portal',    signIn: 'Email',        note: 'Teaching staff: attendance, marks, timetable.' },
  { role: 'accountant', portal: 'Accountant Portal', signIn: 'Email',        note: 'Fee collection, vouchers and daily balance.' },
  { role: 'gatekeeper', portal: 'Gate Portal',       signIn: 'Email',        note: 'Gate entry and visitor records.' },
  { role: 'student',    portal: 'Student Portal',    signIn: 'Roll number',  note: 'Students sign in with their roll number.' },
  { role: 'parent',     portal: 'Parent Portal',     signIn: 'Phone number', note: 'Parents sign in with their phone number.' },
];

const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function copyText(text, label) {
  return navigator.clipboard.writeText(text)
    .then(() => toast.success(`${label} copied`))
    .catch(() => toast.error('Could not copy. Select the link and copy it manually.'));
}

function posterHTML({ school, url, qr }) {
  const contact = [school.phone, [school.address, school.city].filter(Boolean).join(', ')].filter(Boolean).map(esc).join(' &nbsp;·&nbsp; ');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Admissions open — ${esc(school.name)}</title>
  <style>
    @page { size: A4; margin: 14mm; }
    * { box-sizing: border-box; }
    body { margin: 0; font-family: 'Segoe UI', Arial, sans-serif; color: #0f172a; text-align: center; }
    .wrap { border: 3px solid #1B2F6E; border-radius: 22px; padding: 34px 28px; min-height: 255mm; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 18px; }
    .logo { width: 110px; height: 110px; border-radius: 26px; object-fit: cover; }
    .initial { width: 110px; height: 110px; border-radius: 26px; background: #1B2F6E; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 54px; font-weight: 800; }
    h1 { font-size: 34px; margin: 0; }
    .tag { display: inline-block; background: #1B2F6E; color: #fff; font-size: 30px; font-weight: 800; letter-spacing: 1px; padding: 10px 28px; border-radius: 999px; }
    .qr { width: 300px; height: 300px; }
    .scan { font-size: 22px; font-weight: 700; margin: 0; }
    .url { font-family: Consolas, monospace; font-size: 16px; color: #1B2F6E; word-break: break-all; }
    .contact { font-size: 15px; color: #475569; }
    .foot { font-size: 11px; color: #94a3b8; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style></head><body><div class="wrap">
    ${school.logoUrl ? `<img class="logo" src="${esc(school.logoUrl)}" alt="">` : `<div class="initial">${esc((school.name || 'S').charAt(0))}</div>`}
    <h1>${esc(school.name)}</h1>
    <div class="tag">ADMISSIONS OPEN</div>
    <img class="qr" src="${qr}" alt="QR code">
    <p class="scan">Scan with your phone camera to apply online</p>
    <div class="url">${esc(url)}</div>
    ${contact ? `<div class="contact">${contact}</div>` : ''}
    <div class="foot">Powered by IlmForge</div>
  </div></body></html>`;
}

function QrPanel({ url, label, school, onClose }) {
  const [qr, setQr] = useState('');
  useEffect(() => {
    let alive = true;
    QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: 'M' }).then((d) => { if (alive) setQr(d); });
    return () => { alive = false; };
  }, [url]);
  const fileName = `${toSlug(school.name) || 'school'}-${toSlug(label)}-qr.png`;
  return (
    <div className="card" style={{ marginTop: 10, padding: 16, display: 'flex', gap: 18, alignItems: 'center', flexWrap: 'wrap', background: '#F8FAFC' }}>
      {qr ? <img src={qr} alt={`QR code for ${label}`} style={{ width: 170, height: 170, borderRadius: 10, background: '#fff', border: '1px solid #E2E8F0' }} />
        : <div style={{ width: 170, height: 170 }} className="loading-center"><div className="spinner" /></div>}
      <div style={{ display: 'grid', gap: 8, minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700 }}>{label}: QR code</div>
        <div style={{ fontSize: 12.5, color: 'var(--text-muted)', maxWidth: 420 }}>
          Phones open the link when they scan this. Put it on banners, admission forms, fee vouchers and WhatsApp.
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn btn-sm btn-outline" href={qr || undefined} download={fileName} aria-disabled={!qr}>
            <Download size={13} /> Download QR
          </a>
          {label === 'Admission form' && (
            <button type="button" className="btn btn-sm btn-primary" disabled={!qr}
              onClick={() => printHTML(posterHTML({ school, url, qr }), { title: 'Admissions poster' })}>
              <Printer size={13} /> Print "Admissions open" poster
            </button>
          )}
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}><X size={13} /> Close</button>
        </div>
      </div>
    </div>
  );
}

function WebNameEditor({ current, onDone }) {
  const qc = useQueryClient();
  const [value, setValue] = useState(current);
  const problem = value === current ? null : slugProblem(value);
  const save = useMutation({
    mutationFn: () => api.put('/settings/portal-links/slug', { slug: value }),
    onSuccess: (r) => {
      const slug = r.data.data.slug;
      try { if (rememberedSlug() === current) localStorage.setItem('schoolSlug', slug); } catch { /* ignore */ }
      qc.invalidateQueries({ queryKey: ['portal-links'] });
      toast.success('Web name changed. Share the new links.');
      onDone();
    },
    onError: (e) => toast.error(e.response?.data?.message || 'Could not change the web name.'),
  });
  const preview = schoolLinks(value || current).home;
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (!problem && value !== current) save.mutate(); }}
      style={{ marginTop: 12, display: 'grid', gap: 8, maxWidth: 620 }}
    >
      <label className="form-label" htmlFor="web-name">New web name</label>
      <div style={{ display: 'flex', alignItems: 'center', gap: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--text-muted)', padding: '0 6px 0 0', fontFamily: 'monospace' }}>{window.location.host}/s/</span>
        <input id="web-name" className="form-input" style={{ flex: 1, minWidth: 180, fontFamily: 'monospace' }}
          value={value} onChange={(e) => setValue(e.target.value.toLowerCase().replace(/\s+/g, '-'))} autoFocus maxLength={40} />
      </div>
      {problem
        ? <div style={{ fontSize: 12.5, color: '#B91C1C' }}>{problem}</div>
        : <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>New school page: <span style={{ fontFamily: 'monospace' }}>{preview}</span></div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '9px 11px', fontSize: 12.5, color: '#92400E' }}>
        <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
        Links already shared with the old name (WhatsApp messages, printed banners, QR codes) will stop working. Share the new links after changing it.
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button type="submit" className="btn btn-sm btn-primary" disabled={!!problem || value === current || save.isPending}>
          <Check size={13} /> {save.isPending ? 'Saving…' : 'Save web name'}
        </button>
        <button type="button" className="btn btn-sm btn-ghost" onClick={onDone}>Cancel</button>
      </div>
    </form>
  );
}

export default function PortalLinksPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal-links'],
    queryFn: () => api.get('/settings/portal-links').then((r) => r.data.data),
  });
  const [qrFor, setQrFor] = useState(null);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <div className="loading-center"><div className="spinner" /></div>;
  if (isError || !data?.school) {
    return (
      <div className="card" style={{ padding: 28, textAlign: 'center' }}>
        <p style={{ marginBottom: 12 }}>The school's links could not be loaded.</p>
        <button className="btn btn-outline" onClick={() => refetch()}>Try again</button>
      </div>
    );
  }

  const school = data.school;
  const L = schoolLinks(school.slug);
  const PUBLIC = [
    { key: 'home', label: 'School page', Icon: Globe, url: L.home, note: 'One link for everything: apply, fee slip and sign-in. Best for banners and social media.' },
    { key: 'apply', label: 'Admission form', Icon: UserPlus, url: L.apply, note: 'Parents apply online. New applications appear in the bell and in Admission Inquiries.' },
    { key: 'fees', label: 'Fee slip', Icon: FileDown, url: L.fees, note: "Parents print the fee voucher with the student's roll number." },
  ];
  const copyAll = () => copyText(
    [school.name, '', ...PUBLIC.map((p) => `${p.label}: ${p.url}`), '', ...ROLES.map((r) => `${r.portal}: ${L.loginAs(r.role)}`)].join('\n'),
    'All links',
  );

  return (
    <div className="page">
      {/* Identity */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
          {school.logoUrl
            ? <img src={school.logoUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover' }} />
            : <GraduationCap size={24} style={{ color: 'var(--text-muted)' }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="card-title">{school.name}</div>
            <div style={{ fontSize: 12.5, color: 'var(--text-muted)' }}>
              Web name: <strong style={{ fontFamily: 'monospace', color: 'var(--text-primary)' }}>{school.slug}</strong>
              {' '}· every link below opens pages branded with your school's name and logo, and only your school's data.
            </div>
          </div>
          <button className="btn btn-sm btn-outline" onClick={copyAll}><Copy size={13} /> Copy all links</button>
          {!editing && (
            <button className="btn btn-sm btn-outline" onClick={() => setEditing(true)}><Pencil size={13} /> Change web name</button>
          )}
        </div>
        {editing && <div style={{ padding: '0 18px 16px' }}><WebNameEditor current={school.slug} onDone={() => setEditing(false)} /></div>}
      </div>

      {/* Public links */}
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-header">
          <div className="card-title">Share with families</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Anyone can open these. No sign-in needed.</div>
        </div>
        <div style={{ padding: '4px 18px 16px', display: 'grid', gap: 12 }}>
          {PUBLIC.map(({ key, label, Icon, url, note }) => (
            <div key={key} style={{ borderBottom: '1px solid #F1F5F9', paddingBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ width: 38, height: 38, borderRadius: 10, display: 'grid', placeItems: 'center', background: '#EEF2FF', color: '#1B2F6E', flexShrink: 0 }}><Icon size={18} /></span>
                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ fontWeight: 700 }}>{label}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{note}</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12.5, marginTop: 3, wordBreak: 'break-all', userSelect: 'all' }}>{url}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-outline" onClick={() => copyText(url, `${label} link`)}><Copy size={12} /> Copy</button>
                  <a className="btn btn-sm btn-outline" href={url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Open</a>
                  <button className="btn btn-sm btn-outline" aria-expanded={qrFor === key} onClick={() => setQrFor(qrFor === key ? null : key)}>
                    <QrCode size={12} /> QR code
                  </button>
                </div>
              </div>
              {qrFor === key && <QrPanel url={url} label={label} school={school} onClose={() => setQrFor(null)} />}
            </div>
          ))}
        </div>
      </div>

      {/* Sign-in links */}
      <div className="card">
        <div className="card-header">
          <div className="card-title">Sign-in links</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Each opens the sign-in page branded for your school. Share the one that matches the person's role.</div>
        </div>
        <div className="table-wrap" style={{ borderRadius: 0, border: 'none' }}>
          <table className="data-table">
            <thead>
              <tr><th>Portal</th><th>Signs in with</th><th>Link</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {ROLES.map((r) => {
                const url = L.loginAs(r.role);
                return (
                  <tr key={r.role}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{r.portal}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.note}</div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{r.signIn}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{url}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 5 }}>
                        <button className="btn btn-sm btn-outline" onClick={() => copyText(url, `${r.portal} link`)}><Copy size={12} /> Copy</button>
                        <a className="btn btn-sm btn-outline" href={url} target="_blank" rel="noreferrer"><ExternalLink size={12} /> Open</a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="card-footer" style={{ fontSize: 12, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center' }}>
          <Link2 size={13} /> A link only opens the sign-in page. Everyone still needs their own password, and what they can see is decided by the role on their account.
        </div>
      </div>
    </div>
  );
}
