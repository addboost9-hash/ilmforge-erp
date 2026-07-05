import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Dark navy header strip */}
      <div
        style={{
          background: 'var(--navy, #0f172a)',
          padding: '1rem 2rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
        }}
      >
        <span
          style={{
            color: '#fff',
            fontWeight: 700,
            fontSize: '1.25rem',
            letterSpacing: '0.02em',
          }}
        >
          IlmForge
        </span>
        <span
          style={{
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.875rem',
          }}
        >
          School Management System
        </span>
      </div>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg, #f8fafc)',
          padding: '3rem 1.5rem',
          textAlign: 'center',
        }}
      >
        {/* 404 number */}
        <div
          style={{
            fontSize: 'clamp(6rem, 20vw, 10rem)',
            fontWeight: 800,
            lineHeight: 1,
            color: 'var(--muted, #cbd5e1)',
            letterSpacing: '-0.04em',
            userSelect: 'none',
          }}
        >
          404
        </div>

        {/* Title */}
        <h1
          style={{
            marginTop: '1rem',
            marginBottom: '0.5rem',
            fontSize: '1.75rem',
            fontWeight: 700,
            color: 'var(--navy, #0f172a)',
          }}
        >
          Page Not Found
        </h1>

        {/* Description */}
        <p
          style={{
            marginBottom: '2.5rem',
            color: 'var(--text-muted, #64748b)',
            fontSize: '1rem',
            maxWidth: '36rem',
          }}
        >
          The page you are looking for does not exist. It may have been moved,
          deleted, or you may have followed an incorrect link.
        </p>

        {/* Action buttons */}
        <div
          style={{
            display: 'flex',
            gap: '1rem',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            className="btn-primary"
            onClick={() => navigate(-1)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span aria-hidden="true">&larr;</span> Go Back
          </button>

          <a
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '0.625rem 1.25rem',
              borderRadius: '0.375rem',
              border: '1px solid var(--navy, #0f172a)',
              color: 'var(--navy, #0f172a)',
              fontWeight: 600,
              fontSize: '0.875rem',
              textDecoration: 'none',
              transition: 'background 0.15s, color 0.15s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--navy, #0f172a)';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'var(--navy, #0f172a)';
            }}
          >
            Go to Dashboard
          </a>
        </div>
      </div>

      {/* Footer strip */}
      <div
        style={{
          background: 'var(--navy, #0f172a)',
          padding: '0.75rem 2rem',
          textAlign: 'center',
          color: 'rgba(255,255,255,0.35)',
          fontSize: '0.75rem',
        }}
      >
        IlmForge v3.3 &mdash; School Management System
      </div>
    </div>
  );
}
