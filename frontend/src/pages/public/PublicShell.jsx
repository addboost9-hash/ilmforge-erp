/**
 * The frame every public school page shares: the school's own name, logo
 * and colours across the top, IlmForge credited once at the bottom.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Search } from 'lucide-react';
import { toSlug } from '../../utils/schoolLinks';
import './public-pages.css';

export function PublicShell({ school, title, back, children, narrow }) {
  const primary = school?.brand?.primary || '#1B2F6E';
  const secondary = school?.brand?.secondary || '#0073b7';
  return (
    <div className="ps-page" style={{ '--ps-primary': primary, '--ps-secondary': secondary }}>
      <header className="ps-bar" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <Link to={school ? `/s/${encodeURIComponent(school.slug)}` : '/'} className="ps-bar-id">
          <span className="ps-bar-logo">
            {school?.logoUrl ? <img src={school.logoUrl} alt="" /> : <span>{(school?.name || 'S').charAt(0)}</span>}
          </span>
          <span className="ps-bar-text">
            <strong>{school?.name || 'School'}</strong>
            {title && <small>{title}</small>}
          </span>
        </Link>
        {back && (
          <Link to={back.to} className="ps-bar-back"><ArrowLeft size={14} /> {back.label}</Link>
        )}
      </header>
      <main className={`ps-main ${narrow ? 'is-narrow' : ''}`}>{children}</main>
      <footer className="ps-foot">Powered by IlmForge · School management for Pakistan</footer>
    </div>
  );
}

export function SchoolLoading() {
  return (
    <div className="ps-page">
      <div className="ps-center" role="status" aria-live="polite">
        <div className="ps-spinner" aria-hidden="true" />
        <p>Loading…</p>
      </div>
    </div>
  );
}

/* Shown when a link has no school in it, or names one that does not exist.
   The page never guesses: an application sent to the wrong school is worse
   than one not sent. */
export function SchoolNotFound({ missing = false, then = '' }) {
  const navigate = useNavigate();
  const [value, setValue] = useState('');
  const go = (e) => {
    e.preventDefault();
    // Accept a pasted link as well as a bare name: …/s/future-foundation/apply
    const m = /\/s\/([a-z0-9-]+)/i.exec(value);
    const slug = m ? m[1].toLowerCase() : toSlug(value);
    if (slug) navigate(`/s/${slug}${then}`);
  };
  return (
    <div className="ps-page">
      <div className="ps-center">
        <div className="ps-card ps-notfound">
          <h1>{missing ? 'Which school?' : 'School not found'}</h1>
          <p>
            {missing
              ? 'This page needs your school’s own link. Please open the link your school shared with you, or type the school’s web name below.'
              : 'We could not find a school at this link. Please check the link your school shared with you.'}
          </p>
          <form onSubmit={go} className="ps-find">
            <label htmlFor="ps-find-input" className="ps-label">School web name or link</label>
            <div className="ps-find-row">
              <input
                id="ps-find-input"
                className="ps-input"
                placeholder="e.g. future-foundation-school"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                autoComplete="off"
              />
              <button type="submit" className="ps-btn"><Search size={15} /> Open</button>
            </div>
          </form>
          <Link to="/login" className="ps-link">Go to sign in</Link>
        </div>
      </div>
    </div>
  );
}
