/**
 * IlmForge — Brand Components
 * ═══════════════════════════════
 * <IlmForgeLogo />  — professional logo: open-book flame forge mark + wordmark
 * <RoboBuddyMascot /> — friendly robot holding Pakistan flag 🇵🇰
 * Pure SVG — crisp at any size, no assets needed.
 */

/* ─────────── PROFESSIONAL LOGO — Circular Emblem (EduDigitize-style) ─────────── */
export function IlmForgeLogo({ size = 40, showText = true, light = false, className = '' }) {
  const text1 = light ? '#FFFFFF' : '#0F172A';
  const text2 = light ? 'rgba(255,255,255,0.75)' : '#0D9488';
  return (
    <div className={`flex items-center gap-2.5 ${className}`} style={{ lineHeight: 1 }}>
      <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
        <defs>
          <linearGradient id="ifc-ring" x1="0" y1="0" x2="100" y2="100">
            <stop offset="0%" stopColor="#0F766E" /><stop offset="100%" stopColor="#14B8A6" />
          </linearGradient>
          <linearGradient id="ifc-inner" x1="20" y1="15" x2="85" y2="90">
            <stop offset="0%" stopColor="#0D9488" /><stop offset="100%" stopColor="#0F5C55" />
          </linearGradient>
          <linearGradient id="ifc-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FBBF24" /><stop offset="100%" stopColor="#D97706" />
          </linearGradient>
          <radialGradient id="ifc-glow" cx="0.5" cy="0.35" r="0.65">
            <stop offset="0%" stopColor="#5EEAD4" stopOpacity="0.9" /><stop offset="100%" stopColor="#5EEAD4" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Outer white ring + gradient rim (circular badge) */}
        <circle cx="50" cy="50" r="49" fill="url(#ifc-ring)" />
        <circle cx="50" cy="50" r="45.5" fill="#FFFFFF" />
        <circle cx="50" cy="50" r="41" fill="url(#ifc-inner)" />

        {/* Glow behind book (ilm ki roshni) */}
        <ellipse cx="50" cy="45" rx="26" ry="20" fill="url(#ifc-glow)" />

        {/* Rising knowledge spark / flame */}
        <path d="M50 20c3.2 4.2 5.8 7.1 5.8 10.8a5.8 5.8 0 0 1-11.6 0C44.2 27.1 46.8 24.2 50 20z" fill="url(#ifc-gold)" />
        <path d="M50 25.5c1.6 2.1 2.8 3.6 2.8 5.4a2.8 2.8 0 0 1-5.6 0c0-1.8 1.2-3.3 2.8-5.4z" fill="#FFF7ED" />

        {/* Open book with glowing pages */}
        <path d="M24 44c8.5-4.6 18.5-4.8 26 0v24c-7.5-4.6-17.5-4.4-26 0V44z" fill="#FFFFFF" />
        <path d="M76 44c-8.5-4.6-18.5-4.8-26 0v24c7.5-4.6 17.5-4.4 26 0V44z" fill="#F0FDFA" />
        <path d="M50 44v24" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" />
        {/* Page lines */}
        <path d="M30 50c4.8-1.9 10.2-2 14.5 0M30 56c4.8-1.9 10.2-2 14.5 0M30 62c4.8-1.9 10.2-2 14.5 0" stroke="#0D9488" strokeWidth="1.6" strokeLinecap="round" opacity="0.6" />
        <path d="M70 50c-4.8-1.9-10.2-2-14.5 0M70 56c-4.8-1.9-10.2-2-14.5 0M70 62c-4.8-1.9-10.2-2-14.5 0" stroke="#0D9488" strokeWidth="1.6" strokeLinecap="round" opacity="0.45" />

        {/* Gold laurel arcs (bottom) */}
        <path d="M26 70c4 7 12 12 24 12s20-5 24-12" stroke="url(#ifc-gold)" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M29 74l-3.5 1.8M34 78l-2.6 2.6M40 80.6l-1.6 3.2M71 74l3.5 1.8M66 78l2.6 2.6M60 80.6l1.6 3.2" stroke="url(#ifc-gold)" strokeWidth="2.2" strokeLinecap="round" />

        {/* علم Urdu subtle at top arc */}
        <text x="50" y="16.5" textAnchor="middle" fontSize="9.5" fontWeight="700" fill="#0F766E" fontFamily="'Noto Nastaliq Urdu','Segoe UI',serif" opacity="0.85">علم</text>
      </svg>
      {showText && (
        <span style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: size * 0.5, fontWeight: 900, letterSpacing: '-0.02em', color: text1, fontFamily: "'Poppins','Inter',sans-serif" }}>
            Ilm<span style={{ color: '#D97706' }}>Forge</span>
          </span>
          <span style={{ fontSize: size * 0.19, fontWeight: 700, letterSpacing: '0.14em', color: text2, textTransform: 'uppercase' }}>
            Ilm Ko Asaan Banaye
          </span>
        </span>
      )}
    </div>
  );
}

/* ─────────── ROBOBUDDY MASCOT — Pakistan flag in hand 🇵🇰 ─────────── */
export function RoboBuddyMascot({ size = 180, waving = true, className = '' }) {
  return (
    <svg width={size} height={size * 1.1} viewBox="0 0 200 220" fill="none" className={className}>
      <defs>
        <linearGradient id="rb-body" x1="60" y1="60" x2="150" y2="190">
          <stop offset="0%" stopColor="#F8FAFC" /><stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="rb-face" x1="70" y1="40" x2="130" y2="95">
          <stop offset="0%" stopColor="#1E293B" /><stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="rb-accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0D9488" /><stop offset="100%" stopColor="#14B8A6" />
        </linearGradient>
      </defs>

      {/* Shadow */}
      <ellipse cx="100" cy="208" rx="52" ry="9" fill="#0F172A" opacity="0.08" />

      {/* ── Pakistan Flag (in right hand) ── */}
      <g transform={waving ? 'rotate(-8 168 60)' : ''}>
        {/* pole */}
        <rect x="164" y="28" width="4.5" height="118" rx="2.2" fill="#94A3B8" />
        <circle cx="166.2" cy="26" r="4" fill="#D97706" />
        {/* flag cloth — waving shape */}
        <path d="M169 34 C 190 30, 206 38, 212 35 L 212 76 C 206 79, 190 71, 169 75 Z" fill="#01411C" />
        {/* white hoist bar */}
        <path d="M169 34 C 172.5 33.4, 176 33.2, 179 33.4 L 179 74.5 C 176 74.3, 172.5 74.4, 169 75 Z" fill="#FFFFFF" />
        {/* crescent */}
        <circle cx="194" cy="54" r="9.5" fill="#FFFFFF" />
        <circle cx="197.5" cy="52.5" r="8" fill="#01411C" />
        {/* star */}
        <path d="M201.5 47.5 l1.35 2.9 3.15.36 -2.33 2.15.63 3.1 -2.8-1.56 -2.8 1.56.63-3.1 -2.33-2.15 3.15-.36z" fill="#FFFFFF" />
      </g>

      {/* ── Right arm (holding flag) ── */}
      <path d="M138 118 C 152 108, 158 92, 163 72" stroke="url(#rb-accent)" strokeWidth="13" strokeLinecap="round" />
      <circle cx="164" cy="68" r="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />

      {/* ── Left arm (waving hello) ── */}
      <path d="M62 118 C 48 112, 40 100, 38 88" stroke="url(#rb-accent)" strokeWidth="13" strokeLinecap="round" />
      <circle cx="37" cy="84" r="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2" />

      {/* ── Body ── */}
      <rect x="58" y="105" width="84" height="72" rx="24" fill="url(#rb-body)" stroke="#94A3B8" strokeWidth="2" />
      {/* Chest panel with IlmForge spark */}
      <rect x="78" y="122" width="44" height="38" rx="12" fill="#0F172A" />
      <path d="M100 128c2.6 3.4 4.9 5.9 4.9 9a4.9 4.9 0 0 1-9.8 0c0-3.1 2.3-5.6 4.9-9z" fill="#D97706" />
      <circle cx="100" cy="150" r="3" fill="#14B8A6">
        <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" />
      </circle>

      {/* ── Head ── */}
      <rect x="62" y="34" width="76" height="62" rx="22" fill="url(#rb-body)" stroke="#94A3B8" strokeWidth="2" />
      {/* Face screen */}
      <rect x="70" y="43" width="60" height="44" rx="15" fill="url(#rb-face)" />
      {/* Eyes — friendly */}
      <circle cx="88" cy="63" r="6.5" fill="#5EEAD4">
        <animate attributeName="r" values="6.5;6.5;1.2;6.5" keyTimes="0;0.92;0.96;1" dur="4.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="112" cy="63" r="6.5" fill="#5EEAD4">
        <animate attributeName="r" values="6.5;6.5;1.2;6.5" keyTimes="0;0.92;0.96;1" dur="4.5s" repeatCount="indefinite" />
      </circle>
      {/* Smile */}
      <path d="M90 75 Q 100 82 110 75" stroke="#5EEAD4" strokeWidth="3" strokeLinecap="round" fill="none" />
      {/* Antenna */}
      <line x1="100" y1="34" x2="100" y2="22" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="100" cy="18" r="5.5" fill="#D97706">
        <animate attributeName="fill" values="#D97706;#F59E0B;#D97706" dur="1.8s" repeatCount="indefinite" />
      </circle>
      {/* Ear pods */}
      <rect x="54" y="55" width="9" height="20" rx="4.5" fill="url(#rb-accent)" />
      <rect x="137" y="55" width="9" height="20" rx="4.5" fill="url(#rb-accent)" />

      {/* ── Legs ── */}
      <rect x="72" y="176" width="16" height="24" rx="8" fill="#94A3B8" />
      <rect x="112" y="176" width="16" height="24" rx="8" fill="#94A3B8" />
      <ellipse cx="80" cy="202" rx="13" ry="6.5" fill="#64748B" />
      <ellipse cx="120" cy="202" rx="13" ry="6.5" fill="#64748B" />
    </svg>
  );
}

export default IlmForgeLogo;
