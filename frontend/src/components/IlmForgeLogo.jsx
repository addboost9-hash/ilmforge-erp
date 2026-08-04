/**
 * IlmForge Logo — Open book with glowing pages + clouds + "علم"
 * Responsive, works in all contexts: sidebar, login, PDF, header.
 */
export function IlmForgeIcon({ size = 40, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── Glow backdrop ── */}
      <circle cx="24" cy="26" r="18" fill="#0F766E" opacity="0.08"/>

      {/* ── Clouds ── */}
      <ellipse cx="12" cy="11" rx="5" ry="3.5" fill="#0D9488" opacity="0.35"/>
      <ellipse cx="15" cy="9.5" rx="4" ry="3" fill="#0D9488" opacity="0.45"/>
      <ellipse cx="36" cy="11" rx="5" ry="3.5" fill="#D97706" opacity="0.3"/>
      <ellipse cx="33" cy="9.5" rx="4" ry="3" fill="#D97706" opacity="0.4"/>

      {/* ── Book spine (center) ── */}
      <rect x="22.5" y="17" width="3" height="22" rx="1.5" fill="#0F766E"/>

      {/* ── Left page ── */}
      <path
        d="M24 18 C18 16, 8 18, 7 22 L7 37 C8 33, 18 31, 24 33 Z"
        fill="url(#leftPage)"
        stroke="#0F766E"
        strokeWidth="0.5"
      />

      {/* ── Right page ── */}
      <path
        d="M24 18 C30 16, 40 18, 41 22 L41 37 C40 33, 30 31, 24 33 Z"
        fill="url(#rightPage)"
        stroke="#D97706"
        strokeWidth="0.5"
      />

      {/* ── Page lines (left) ── */}
      <line x1="11" y1="24" x2="21" y2="23" stroke="#0F766E" strokeWidth="0.8" opacity="0.4"/>
      <line x1="10" y1="27" x2="21" y2="26" stroke="#0F766E" strokeWidth="0.8" opacity="0.35"/>
      <line x1="10" y1="30" x2="21" y2="29.5" stroke="#0F766E" strokeWidth="0.8" opacity="0.3"/>

      {/* ── Page lines (right) ── */}
      <line x1="27" y1="23" x2="37" y2="24" stroke="#D97706" strokeWidth="0.8" opacity="0.4"/>
      <line x1="27" y1="26" x2="38" y2="27" stroke="#D97706" strokeWidth="0.8" opacity="0.35"/>
      <line x1="27" y1="29.5" x2="38" y2="30" stroke="#D97706" strokeWidth="0.8" opacity="0.3"/>

      {/* ── Golden "علم" badge ── */}
      <circle cx="24" cy="14" r="6.5" fill="#D97706" opacity="0.15"/>
      <circle cx="24" cy="14" r="5.5" fill="#D97706" opacity="0.1"/>
      <text
        x="24"
        y="17"
        textAnchor="middle"
        fontSize="7"
        fontWeight="bold"
        fill="#D97706"
        fontFamily="Arial, sans-serif"
      >
        علم
      </text>

      {/* ── Radiant glow behind book ── */}
      <ellipse cx="24" cy="38" rx="13" ry="2.5" fill="#0F766E" opacity="0.12"/>

      {/* ── Gradients ── */}
      <defs>
        <linearGradient id="leftPage" x1="7" y1="18" x2="24" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#CCFBF1"/>
          <stop offset="100%" stopColor="#99F6E4"/>
        </linearGradient>
        <linearGradient id="rightPage" x1="41" y1="18" x2="24" y2="33" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FEF3C7"/>
          <stop offset="100%" stopColor="#FDE68A"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

/** Full logo: icon + wordmark + tagline */
export function IlmForgeLogo({
  size = 40,
  showTagline = false,
  dark = false,       // true = white text (for teal sidebar)
  compact = false,    // true = icon only
}) {
  const nameColor    = dark ? '#FFFFFF'  : '#0F4C45';
  const taglineColor = dark ? '#D97706'  : '#D97706';

  return (
    <div style={{ display:'flex', alignItems:'center', gap:10, userSelect:'none' }}>
      <IlmForgeIcon size={size}/>
      {!compact && (
        <div style={{ lineHeight:1.15 }}>
          <div style={{
            fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
            fontWeight: 800,
            fontSize: Math.round(size * 0.4),
            color: nameColor,
            letterSpacing: '-0.3px',
          }}>
            IlmForge
          </div>
          {showTagline && (
            <div style={{
              fontFamily: "'Poppins', 'Inter', system-ui, sans-serif",
              fontWeight: 600,
              fontSize: Math.round(size * 0.24),
              color: taglineColor,
              letterSpacing: '0.2px',
            }}>
              Ilm Ko Asaan Banaye
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact square icon for favicons / small spaces */
export function IlmForgeSquare({ size = 36 }) {
  return (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(135deg, #0F766E 0%, #0D9488 60%, #D97706 100%)',
      borderRadius: Math.round(size * 0.26),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 2px 8px rgba(15,118,110,0.35)`,
      flexShrink: 0,
    }}>
      <IlmForgeIcon size={Math.round(size * 0.7)}/>
    </div>
  );
}

export default IlmForgeLogo;
