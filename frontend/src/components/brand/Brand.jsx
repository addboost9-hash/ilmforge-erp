/**
 * ilmفورج — Premium Brand Identity v3.0
 * ════════════════════════════════════════════════════════
 *
 *   Professional bilingual wordmark:
 *   "ilm"   → Latin  · Poppins ExtraBold · Navy
 *   "فورج"  → Urdu   · Nastaliq script   · Gold gradient
 *
 *   Variants:
 *   <IlmForgeLogo />        — Full logo (icon + wordmark)
 *   <IlmForgeIcon />        — Icon mark only (app icon, favicon)
 *   <IlmForgeWordmark />    — Text only
 *   <IlmForgeBadge />       — Pill badge (landing, cards)
 *   <RoboBuddyMascot />     — Mascot
 */

/* ── Brand tokens ─────────────────────────────────────── */
const T = {
  navy:    '#1B2F6E',
  navyLt:  '#243e8f',
  blue:    '#0073b7',
  gold:    '#F5C518',
  goldDk:  '#D97706',
  goldLt:  '#FDE68A',
  white:   '#FFFFFF',
  offWhite:'#F0F6FF',
};

/* ════════════════════════════════════════════════════════
   ICON MARK — The premium emblem
   Used standalone: favicon, PWA icon, collapsed sidebar
════════════════════════════════════════════════════════ */
export function IlmForgeIcon({ size = 44, className = '', light = false }) {
  const uid = `icon_${size}`;
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="ilmفورج"
    >
      <defs>
        <linearGradient id={`${uid}_bg`} x1="0" y1="0" x2="120" y2="120" gradientUnits="userSpaceOnUse">
          <stop offset="0%"   stopColor={light ? T.navyLt : T.navy}/>
          <stop offset="100%" stopColor={light ? T.blue   : '#0a2356'}/>
        </linearGradient>
        <linearGradient id={`${uid}_gold`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor={T.goldLt}/>
          <stop offset="60%"  stopColor={T.gold}/>
          <stop offset="100%" stopColor={T.goldDk}/>
        </linearGradient>
        <linearGradient id={`${uid}_book`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.98"/>
          <stop offset="100%" stopColor="#dbeafe" stopOpacity="0.88"/>
        </linearGradient>
        <filter id={`${uid}_glow`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.5" result="blur"/>
          <feComposite in="SourceGraphic" in2="blur" operator="over"/>
        </filter>
        <filter id={`${uid}_drop`}>
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={T.navy} floodOpacity="0.35"/>
        </filter>
      </defs>

      {/* ── Rounded square background ── */}
      <rect x="2" y="2" width="116" height="116" rx="26" fill={`url(#${uid}_bg)`} filter={`url(#${uid}_drop)`}/>

      {/* ── Subtle grid texture ── */}
      <rect x="2" y="2" width="116" height="116" rx="26"
            fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="0.8"/>

      {/* ── Inner glow ring ── */}
      <rect x="8" y="8" width="104" height="104" rx="21"
            fill="none" stroke={`url(#${uid}_gold)`} strokeWidth="1.5" opacity="0.35"/>

      {/* ── Gold flame spark (top center) ── */}
      <path d="M60 14 C 63.5 19 67 23.5 67 28.5 A 7 7 0 0 1 53 28.5 C 53 23.5 56.5 19 60 14Z"
            fill={`url(#${uid}_gold)`} filter={`url(#${uid}_glow)`}/>
      <path d="M60 18.5 C 61.8 21.5 63.5 24 63.5 27 A 3.5 3.5 0 0 1 56.5 27 C 56.5 24 58.2 21.5 60 18.5Z"
            fill="white" opacity="0.6"/>

      {/* ── Open book ── */}
      {/* Left page */}
      <path d="M22 44 C 36 38, 50 37, 60 41 L 60 88 C 50 84, 36 85, 22 91 Z"
            fill={`url(#${uid}_book)`}/>
      {/* Right page */}
      <path d="M98 44 C 84 38, 70 37, 60 41 L 60 88 C 70 84, 84 85, 98 91 Z"
            fill="white" opacity="0.82"/>
      {/* Spine */}
      <line x1="60" y1="41" x2="60" y2="88"
            stroke={`url(#${uid}_gold)`} strokeWidth="2.5" strokeLinecap="round"/>

      {/* Left lines */}
      <path d="M28 55 Q 43 52 54 54" stroke={T.navy} strokeWidth="2.2" strokeLinecap="round" opacity="0.22"/>
      <path d="M28 64 Q 43 61 54 63" stroke={T.navy} strokeWidth="2.2" strokeLinecap="round" opacity="0.17"/>
      <path d="M28 73 Q 43 70 54 72" stroke={T.navy} strokeWidth="2.2" strokeLinecap="round" opacity="0.12"/>
      {/* Right lines */}
      <path d="M92 55 Q 77 52 66 54" stroke={T.navy} strokeWidth="2.2" strokeLinecap="round" opacity="0.22"/>
      <path d="M92 64 Q 77 61 66 63" stroke={T.navy} strokeWidth="2.2" strokeLinecap="round" opacity="0.17"/>

      {/* ── "ilm" — bottom, styled ── */}
      <text x="34" y="108"
            fontFamily="'Poppins','Montserrat','Arial Black',sans-serif"
            fontSize="22" fontWeight="900" fill="white"
            letterSpacing="-0.5">
        ilm
      </text>
      {/* ── "فورج" — bottom, gold Urdu ── */}
      <text x="86" y="107"
            fontFamily="'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Arabic Typesetting',serif"
            fontSize="20" fontWeight="700"
            fill={`url(#${uid}_gold)`}
            textAnchor="middle" direction="rtl">
        فورج
      </text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   MAIN LOGO — icon + professional wordmark
════════════════════════════════════════════════════════ */
export function IlmForgeLogo({
  size      = 42,
  showText  = true,
  light     = false,
  compact   = false,
  className = '',
}) {
  const navyC  = light ? T.white   : T.navy;
  const goldC  = light ? T.gold    : T.goldDk;
  const subC   = light ? 'rgba(255,255,255,0.60)' : '#94a3b8';
  const divC   = light ? 'rgba(255,255,255,0.25)' : '#e2e8f0';

  return (
    <div
      className={className}
      style={{
        display:     'flex',
        alignItems:  'center',
        gap:          size * 0.3,
        userSelect:  'none',
      }}
    >
      <IlmForgeIcon size={size} light={light} />

      {showText && (
        <div style={{ display:'flex', flexDirection:'column', gap: compact ? 0 : 2 }}>

          {/* ── Wordmark row ── */}
          <div style={{
            display:     'flex',
            alignItems:  'baseline',
            gap:          4,
            lineHeight:   1,
          }}>
            {/* "ilm" — clean Latin */}
            <span style={{
              fontSize:    size * 0.54,
              fontWeight:  900,
              color:       navyC,
              fontFamily:  "'Poppins','Montserrat','Arial Black',sans-serif",
              letterSpacing: '-0.035em',
              lineHeight:  1,
            }}>
              ilm
            </span>

            {/* Micro divider */}
            <span style={{
              width:         1.5,
              height:        size * 0.4,
              background:    divC,
              borderRadius:  2,
              alignSelf:     'center',
              flexShrink:    0,
            }} />

            {/* "فورج" — Urdu Nastaliq, gold */}
            <span style={{
              fontSize:    size * 0.5,
              fontWeight:  700,
              color:       goldC,
              fontFamily:  "'Noto Nastaliq Urdu','Jameel Noori Nastaleeq','Arabic Typesetting',serif",
              letterSpacing: '0.01em',
              lineHeight:  1,
              direction:   'rtl',
              display:     'inline-block',
              /* Gold gradient via background-clip on modern browsers */
              background:  `linear-gradient(135deg, ${T.goldLt}, ${T.gold}, ${T.goldDk})`,
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              فورج
            </span>
          </div>

          {/* ── Tagline ── */}
          {!compact && (
            <span style={{
              fontSize:      size * 0.165,
              fontWeight:    600,
              color:         subC,
              letterSpacing: '0.13em',
              textTransform: 'uppercase',
              fontFamily:    "'Inter','Source Sans Pro',sans-serif",
              lineHeight:    1,
            }}>
              اِلم کو آسان بنائے &nbsp;🇵🇰
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   WORDMARK ONLY — large display use
════════════════════════════════════════════════════════ */
export function IlmForgeWordmark({
  fontSize  = 32,
  light     = false,
  showTagline = true,
  className = '',
}) {
  const navyC = light ? T.white   : T.navy;
  const subC  = light ? 'rgba(255,255,255,0.55)' : '#94a3b8';

  return (
    <div className={className} style={{ display:'flex', flexDirection:'column', gap:4, lineHeight:1 }}>
      <div style={{ display:'flex', alignItems:'baseline', gap:6 }}>
        {/* ilm */}
        <span style={{
          fontSize,
          fontWeight:  900,
          color:       navyC,
          fontFamily:  "'Poppins','Montserrat','Arial Black',sans-serif",
          letterSpacing: '-0.04em',
        }}>
          ilm
        </span>

        {/* divider */}
        <span style={{
          width: 2, height: fontSize * 0.75,
          background: light ? 'rgba(255,255,255,0.3)' : '#e2e8f0',
          borderRadius: 2, alignSelf:'center',
        }} />

        {/* فورج — gradient gold */}
        <span style={{
          fontSize:    fontSize * 0.92,
          fontWeight:  700,
          fontFamily:  "'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',serif",
          direction:   'rtl',
          display:     'inline-block',
          background:  `linear-gradient(135deg, ${T.goldLt}, ${T.gold} 40%, ${T.goldDk})`,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          فورج
        </span>
      </div>

      {showTagline && (
        <span style={{
          fontSize:    fontSize * 0.28,
          fontWeight:  600,
          color:       subC,
          letterSpacing:'0.15em',
          textTransform:'uppercase',
          fontFamily:  "'Inter',sans-serif",
        }}>
          اِلم کو آسان بنائے &nbsp;🇵🇰
        </span>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   BADGE — compact pill for cards, landing, nav
════════════════════════════════════════════════════════ */
export function IlmForgeBadge({ light = false, size = 'md' }) {
  const pad = size === 'sm' ? '4px 10px' : size === 'lg' ? '8px 20px' : '6px 14px';
  const fs  = size === 'sm' ? 11 : size === 'lg' ? 16 : 13;

  return (
    <div style={{
      display:        'inline-flex',
      alignItems:     'center',
      gap:             6,
      padding:         pad,
      borderRadius:    999,
      background:      light
        ? 'rgba(255,255,255,0.15)'
        : `linear-gradient(135deg, ${T.navy}, #243e8f)`,
      border:          light
        ? '1px solid rgba(255,255,255,0.25)'
        : '1px solid rgba(27,47,110,0.4)',
      backdropFilter:  'blur(8px)',
      boxShadow:       '0 2px 12px rgba(27,47,110,0.18)',
    }}>
      {/* Mini icon */}
      <span style={{ fontSize: fs + 2 }}>🎓</span>

      {/* ilm */}
      <span style={{
        fontSize,
        fontWeight:  900,
        color:       T.white,
        fontFamily:  "'Poppins',sans-serif",
        letterSpacing: '-0.02em',
        lineHeight:  1,
      }}>ilm</span>

      {/* فورج */}
      <span style={{
        fontSize:   fs * 0.92,
        fontWeight: 700,
        fontFamily: "'Noto Nastaliq Urdu',serif",
        direction:  'rtl',
        background: `linear-gradient(135deg, ${T.goldLt}, ${T.goldDk})`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor:  'transparent',
        backgroundClip: 'text',
        lineHeight: 1,
      }}>فورج</span>

      {/* PK flag */}
      <span style={{ fontSize: fs - 2 }}>🇵🇰</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
   HERO BRAND — large display for landing page
   Full SVG with premium effects
════════════════════════════════════════════════════════ */
export function IlmForgeHeroBrand({ width = 420 }) {
  const h = width * 0.28;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="hero_navy" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={T.navy}/>
          <stop offset="100%" stopColor="#243e8f"/>
        </linearGradient>
        <linearGradient id="hero_gold" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor={T.goldLt}/>
          <stop offset="50%"  stopColor={T.gold}/>
          <stop offset="100%" stopColor={T.goldDk}/>
        </linearGradient>
        <filter id="hero_glow">
          <feGaussianBlur stdDeviation="3" result="blur"/>
          <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>

      {/* "ilm" */}
      <text
        x="0" y={h * 0.82}
        fontFamily="'Poppins','Montserrat','Arial Black',sans-serif"
        fontSize={h * 0.82}
        fontWeight="900"
        fill="url(#hero_navy)"
        letterSpacing="-4"
      >ilm</text>

      {/* Vertical divider */}
      <rect x={width * 0.41} y={h * 0.1} width="3" height={h * 0.8}
            rx="1.5" fill={T.goldDk} opacity="0.5"/>

      {/* "فورج" */}
      <text
        x={width * 0.97} y={h * 0.8}
        fontFamily="'Noto Nastaliq Urdu','Jameel Noori Nastaleeq',serif"
        fontSize={h * 0.75}
        fontWeight="700"
        fill="url(#hero_gold)"
        textAnchor="end"
        direction="rtl"
        filter="url(#hero_glow)"
      >فورج</text>
    </svg>
  );
}

/* ════════════════════════════════════════════════════════
   ROBOBUDDY MASCOT — updated with new brand
════════════════════════════════════════════════════════ */
export function RoboBuddyMascot({ size = 180, waving = true, className = '' }) {
  return (
    <svg width={size} height={size * 1.12} viewBox="0 0 200 224" fill="none" className={className}>
      <defs>
        <linearGradient id="rb2_body" x1="60" y1="60" x2="150" y2="200">
          <stop offset="0%" stopColor="#F1F5F9"/><stop offset="100%" stopColor="#CBD5E1"/>
        </linearGradient>
        <linearGradient id="rb2_face" x1="70" y1="40" x2="130" y2="95">
          <stop offset="0%" stopColor="#1e293b"/><stop offset="100%" stopColor="#0f172a"/>
        </linearGradient>
        <linearGradient id="rb2_brand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={T.navy}/><stop offset="100%" stopColor={T.blue}/>
        </linearGradient>
        <linearGradient id="rb2_gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={T.goldLt}/><stop offset="100%" stopColor={T.goldDk}/>
        </linearGradient>
        <filter id="rb2_shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor={T.navy} floodOpacity="0.15"/>
        </filter>
      </defs>

      {/* Ground shadow */}
      <ellipse cx="100" cy="215" rx="50" ry="7" fill="#0f172a" opacity="0.07"/>

      {/* ── Pakistan Flag (right hand) ── */}
      <g transform={waving ? 'rotate(-10 167 58)' : ''}>
        <rect x="163" y="26" width="4" height="116" rx="2" fill="#94A3B8"/>
        <circle cx="165" cy="24" r="4" fill="url(#rb2_gold)"/>
        <path d="M167 33 C 188 29,205 37,211 34 L 211 76 C 205 79,188 71,167 75 Z" fill="#01411C"/>
        <path d="M167 33 C 171 32,175 32,178 33 L 178 74 C 175 73,171 73,167 75 Z" fill="white"/>
        <circle cx="192" cy="54" r="9.5" fill="white"/>
        <circle cx="196" cy="52.5" r="7.8" fill="#01411C"/>
        <path d="M200 47.5 l1.3 2.9 3.1.35 -2.3 2.1.6 3-2.7-1.5-2.7 1.5.6-3-2.3-2.1 3.1-.35z" fill="white"/>
      </g>

      {/* Right arm */}
      <path d="M137 116 C 151 106,157 90,162 70" stroke="url(#rb2_brand)" strokeWidth="13" strokeLinecap="round"/>
      <circle cx="163" cy="66" r="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2"/>

      {/* Body */}
      <rect x="58" y="108" width="82" height="80" rx="16" fill="url(#rb2_body)" stroke="#CBD5E1" strokeWidth="2" filter="url(#rb2_shadow)"/>

      {/* Brand strip on body */}
      <rect x="66" y="140" width="66" height="20" rx="6" fill="url(#rb2_brand)" opacity="0.12"/>
      <rect x="66" y="140" width="66" height="20" rx="6" fill="none" stroke="url(#rb2_brand)" strokeWidth="1" strokeOpacity="0.3"/>
      {/* ilm text on body */}
      <text x="80" y="154" fontFamily="'Poppins',sans-serif" fontSize="10" fontWeight="900" fill={T.navy} opacity="0.7">ilm</text>
      {/* فورج text on body */}
      <text x="110" y="153" fontFamily="'Noto Nastaliq Urdu',serif" fontSize="9" fontWeight="700" fill={T.goldDk} textAnchor="middle" direction="rtl">فورج</text>

      {/* Chest LED dots */}
      <rect x="74" y="120" width="46" height="14" rx="5" fill="url(#rb2_brand)" opacity="0.1" stroke="url(#rb2_brand)" strokeWidth="1" strokeOpacity="0.3"/>
      <circle cx="85" cy="127" r="3.5" fill="url(#rb2_brand)" opacity="0.5"/>
      <circle cx="99" cy="127" r="3.5" fill="url(#rb2_gold)" opacity="0.8"/>
      <circle cx="113" cy="127" r="3.5" fill="#15803d" opacity="0.6"/>

      {/* Left arm */}
      <path d="M60 126 C 44 123,37 132,35 142" stroke="#CBD5E1" strokeWidth="13" strokeLinecap="round"/>
      <circle cx="34" cy="145" r="10" fill="#E2E8F0" stroke="#94A3B8" strokeWidth="2"/>

      {/* Legs */}
      <rect x="70"  y="185" width="24" height="30" rx="9" fill="#CBD5E1"/>
      <rect x="106" y="185" width="24" height="30" rx="9" fill="#CBD5E1"/>
      <rect x="70"  y="205" width="24" height="10" rx="5" fill="#94A3B8"/>
      <rect x="106" y="205" width="24" height="10" rx="5" fill="#94A3B8"/>

      {/* Head */}
      <rect x="56" y="42" width="88" height="70" rx="20" fill="url(#rb2_face)" stroke="url(#rb2_brand)" strokeWidth="2.5" filter="url(#rb2_shadow)"/>

      {/* Antenna */}
      <line x1="100" y1="42" x2="100" y2="24" stroke="#94A3B8" strokeWidth="3.5" strokeLinecap="round"/>
      <circle cx="100" cy="20" r="7" fill="url(#rb2_gold)"/>
      <circle cx="100" cy="20" r="3.5" fill={T.goldLt} opacity="0.8"/>

      {/* Eyes */}
      <rect x="68" y="60" width="24" height="17" rx="8.5" fill="url(#rb2_brand)"/>
      <rect x="108" y="60" width="24" height="17" rx="8.5" fill="url(#rb2_brand)"/>
      {/* Iris */}
      <circle cx="80" cy="68.5" r="5.5" fill="white"/>
      <circle cx="120" cy="68.5" r="5.5" fill="white"/>
      {/* Pupil */}
      <circle cx="81.5" cy="67.5" r="2.8" fill={T.navy}/>
      <circle cx="121.5" cy="67.5" r="2.8" fill={T.navy}/>
      {/* Shine */}
      <circle cx="83" cy="66.2" r="1.2" fill="white" opacity="0.9"/>
      <circle cx="123" cy="66.2" r="1.2" fill="white" opacity="0.9"/>

      {/* Smile */}
      <path d="M82 88 Q 100 100 118 88" stroke="url(#rb2_gold)" strokeWidth="3.5" strokeLinecap="round" fill="none"/>

      {/* Ear bolts */}
      <circle cx="56" cy="76" r="6" fill="#94A3B8" stroke="#CBD5E1" strokeWidth="2"/>
      <circle cx="144" cy="76" r="6" fill="#94A3B8" stroke="#CBD5E1" strokeWidth="2"/>
    </svg>
  );
}
