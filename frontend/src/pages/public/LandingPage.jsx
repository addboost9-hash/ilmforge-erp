import { Link } from 'react-router-dom';
import { IlmForgeLogo, RoboBuddyMascot } from '../../components/brand/Brand';
import { useState, useEffect, useRef } from 'react';
import {
  GraduationCap, Users, DollarSign, BarChart3, Smartphone,
  Cloud, Building2, Shield, MessageSquare, CreditCard,
  Fingerprint, FileText, Bell, Zap, ChevronDown, ChevronUp,
  Play, Check, Star, ArrowRight, Phone, Mail, MapPin,
  X, Facebook, Twitter, Linkedin, Instagram, Youtube
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────
   Brand palette
   Primary  Navy  #1B2F6E
   Accent   Blue  #0073b7
   Success  Green #15803d
   Amber          #D97706
   ───────────────────────────────────────────────────────── */
const NAVY  = '#1B2F6E';
const BLUE  = '#0073b7';
const GREEN = '#15803d';
const AMBER = '#D97706';

/* 13 features */
const FEATURES = [
  { icon: Smartphone,   color: '#7C3AED', title: 'Free Mobile App',          desc: 'Parents, teachers & students get free iOS & Android apps with full portal access.' },
  { icon: Cloud,        color: '#0D9488', title: 'Cloud Based',               desc: 'Hosted on AWS servers. Access from anywhere, any device, 99.9% uptime guaranteed.' },
  { icon: Building2,    color: '#2563EB', title: 'Multi Campus',              desc: 'Manage unlimited school campuses from one dashboard with separate data & reports.' },
  { icon: Users,        color: '#DC2626', title: 'Multi Portal',              desc: 'Separate portals for Admin, Teachers, Accountants, Parents & Gate-keepers.' },
  { icon: MessageSquare,color: '#15803D', title: 'WhatsApp Integration',      desc: 'Send fee receipts, attendance alerts & results via WhatsApp automatically.' },
  { icon: CreditCard,   color: '#D97706', title: 'Digital Payments',          desc: 'Accept online payments via EasyPaisa, JazzCash & bank transfer.' },
  { icon: Fingerprint,  color: '#0891B2', title: 'Biometric Attendance',      desc: 'Connect ZKTeco & other biometric devices for automatic attendance marking.' },
  { icon: FileText,     color: '#7C3AED', title: 'Easy Reports',              desc: '50+ printable & Excel reports: fee, attendance, salary, marksheets & more.' },
  { icon: Bell,         color: '#DC2626', title: 'SMS Alerts',                desc: 'Automatic SMS for absent students, fee reminders, exam results & birthdays.' },
  { icon: Zap,          color: '#0D9488', title: 'Task Automation',           desc: 'Auto generate monthly fees, salaries, birthday wishes & database backups.' },
  { icon: Shield,       color: '#1B2F6E', title: 'Bank-Grade Security',       desc: '256-bit SSL encryption, daily backups, role-based access control.' },
  { icon: BarChart3,    color: '#15803D', title: 'Full Accounting',           desc: 'Income/expense tracking, balance sheets, salary management & profit reports.' },
  { icon: GraduationCap,color: '#0073b7', title: 'Exams & Results',           desc: 'Datesheets, grading schemes, position calculation & instant marksheet generation.' },
];

const FAQS = [
  { q: 'Is there a free plan for small schools?', a: 'Yes! IlmForge offers a free plan for schools with up to 100 students. No credit card required, free forever.' },
  { q: 'Is my data safe and private?', a: 'Absolutely. Your data is encrypted with 256-bit SSL and stored securely on AWS. Only authorized users can access it.' },
  { q: 'Can I manage multiple school campuses?', a: 'Yes. You can manage unlimited campuses from a single dashboard, each with its own data and reports.' },
  { q: 'How does the mobile app work?', a: 'Parents, teachers and students download the free app and log in. They can view attendance, fees, results and homework.' },
  { q: 'Can parents pay fees online?', a: 'Yes. Parents can pay via EasyPaisa, JazzCash or bank transfer through their parent portal in seconds.' },
  { q: 'Is biometric attendance supported?', a: 'Yes. We support ZKTeco and other popular biometric devices with our BioAttendance desktop app.' },
];

const TESTIMONIALS = [
  { name: 'Muhammad Tariq', school: 'City Grammar School, Rawalpindi', text: 'IlmForge transformed how we manage our 3 campuses. Fee collection time dropped by 80% and parents love the WhatsApp updates.' },
  { name: 'Ali Hassan Khan', school: 'The Savvy School, Islamabad',    text: 'The automatic SMS alerts for absent students are fantastic. Parents appreciate the transparency and our attendance improved significantly.' },
  { name: 'Neersh Siddiqui', school: 'Perfect Academy, Lahore',        text: 'Reports that used to take hours now take seconds. The exam result system with marksheets is exactly what we needed.' },
];

/* animated counters — numeric target + suffix + label */
const STATS = [
  { target: 1200,   suffix: '+', label: 'Happy Schools',     color: BLUE },
  { target: 350000, suffix: '+', label: 'Students Managed',  color: NAVY },
  { target: 32,     suffix: '+', label: 'Cities Across Pak', color: '#7C3AED' },
  { target: 13,     suffix: '+', label: 'Years of Success',  color: GREEN },
];

/* marquee trust items */
const TRUST_ITEMS = [
  '1,200+ Schools',
  '350,000+ Students',
  '32+ Cities',
  '13+ Years',
  'AWS Cloud Hosted',
  '99.9% Uptime',
  'WhatsApp Integrated',
  'Biometric Ready',
];

/* Why IlmForge comparison */
const COMPARISON = [
  { feature: 'Setup time',            trad: 'Weeks of paperwork', other: 'Days of config',  ilm: 'Ready in 5 minutes' },
  { feature: 'Fee collection',        trad: 'Manual registers',   other: 'Basic online',    ilm: 'EasyPaisa + JazzCash + Bank' },
  { feature: 'Parent communication',  trad: 'Diary notes',        other: 'SMS only',        ilm: 'WhatsApp + SMS + App' },
  { feature: 'Reports',               trad: 'Hand-written',       other: 'Limited exports', ilm: '50+ Print / PDF / Excel' },
  { feature: 'Mobile access',         trad: 'None',               other: 'Paid add-on',     ilm: 'Free iOS & Android app' },
  { feature: 'Attendance',            trad: 'Roll call',          other: 'Manual entry',    ilm: 'Biometric auto-sync' },
  { feature: 'Pricing',               trad: 'High staff cost',    other: 'Expensive tiers', ilm: 'Free plan available' },
];

/* Pricing tiers */
const PRICING = [
  { name: 'Free',     price: '0',    period: 'forever',    students: 'Up to 100 students',  highlight: false, accent: GREEN,
    features: ['Core school management','Student & staff records','Basic attendance','Fee vouchers','Email support'] },
  { name: 'Starter',  price: '1,500',period: 'per month',  students: 'Up to 500 students',  highlight: false, accent: BLUE,
    features: ['Everything in Free','SMS alerts','WhatsApp receipts','Online fee payments','Exam & results module'] },
  { name: 'Standard', price: '2,500',period: 'per month',  students: 'Up to 1,500 students',highlight: true,  accent: NAVY,
    features: ['Everything in Starter','Multi-campus support','Biometric attendance','Full accounting suite','Priority support'] },
  { name: 'Premium',  price: '4,000',period: 'per month',  students: 'Unlimited students',  highlight: false, accent: '#7C3AED',
    features: ['Everything in Standard','Unlimited campuses','Task automation','Custom branding','Dedicated manager'] },
];

const REPORT_DESIGNS = [
  { title: 'Fee Voucher',          emoji: '🧾', color: NAVY },
  { title: 'Family Voucher',       emoji: '👨‍👩‍👦', color: '#7C3AED' },
  { title: 'Student Marksheet',    emoji: '📊', color: '#0D9488' },
  { title: 'Admit Card',           emoji: '🆔', color: BLUE },
  { title: 'Leaving Certificate',  emoji: '📜', color: '#DC2626' },
  { title: 'Character Certificate',emoji: '✅', color: GREEN },
  { title: 'Staff ID Card',        emoji: '👤', color: AMBER },
  { title: 'Salary Slip',          emoji: '💰', color: '#0891B2' },
];

/* ── Animated counter hook ─────────────────────────────── */
function useCountUp(target, active, duration = 1800) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!active) return;
    let raf;
    const start = performance.now();
    const tick = (now) => {
      const p = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3); // easeOutCubic
      setValue(Math.floor(eased * target));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setValue(target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, target, duration]);
  return value;
}

function StatCounter({ stat, active }) {
  const value = useCountUp(stat.target, active);
  return (
    <div style={{ background:'#fff', borderRadius:16, padding:'26px 16px', textAlign:'center', border:'1px solid #E8EDF3', boxShadow:'0 4px 18px rgba(27,47,110,0.06)' }}>
      <div style={{ fontSize:34, fontWeight:900, color:stat.color, letterSpacing:'-0.5px' }}>
        {value.toLocaleString()}{stat.suffix}
      </div>
      <div style={{ fontSize:13, color:'#64748B', fontWeight:600, marginTop:6 }}>{stat.label}</div>
    </div>
  );
}

/* ── Reveal-on-scroll wrapper ──────────────────────────── */
function Reveal({ children, delay = 0, style }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.12 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div
      ref={ref}
      style={{
        ...style,
        opacity: shown ? 1 : 0,
        transform: shown ? 'translateY(0)' : 'translateY(28px)',
        transition: `opacity .6s ease ${delay}ms, transform .6s cubic-bezier(.22,1,.36,1) ${delay}ms`,
      }}
    >
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);
  const [statsActive, setStatsActive] = useState(false);
  const statsRef = useRef(null);

  useEffect(() => {
    const el = statsRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setStatsActive(true); io.disconnect(); } },
      { threshold: 0.3 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div style={{ fontFamily:"'Inter',system-ui,-apple-system,'Segoe UI',sans-serif", background:'#fff', color:'#1F2937', overflowX:'hidden' }}>

      {/* ── Inline keyframes / responsive rules ─────────────── */}
      <style>{`
        @keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }
        @keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-14px); } }
        @keyframes floatySlow { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-22px); } }
        @keyframes shine { 0% { left:-60%; } 100% { left:130%; } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(26px); } to { opacity:1; transform:translateY(0); } }
        @keyframes blob { 0%,100% { transform:scale(1) translate(0,0); } 50% { transform:scale(1.15) translate(20px,-20px); } }
        .fade-up { animation: fadeUp .8s cubic-bezier(.22,1,.36,1) both; }
        .float-slow  { animation: floaty 6s ease-in-out infinite; }
        .float-slower{ animation: floatySlow 8s ease-in-out infinite; }
        .mesh-blob   { animation: blob 14s ease-in-out infinite; }
        .mesh-blob-2 { animation: blob 18s ease-in-out infinite reverse; }
        .glass-dark  { background:rgba(255,255,255,0.10); border:1px solid rgba(255,255,255,0.18); backdrop-filter:blur(8px); }
        .grid-pattern{ background-image:linear-gradient(rgba(255,255,255,0.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.05) 1px,transparent 1px); background-size:44px 44px; -webkit-mask-image:radial-gradient(circle at 50% 40%,#000,transparent 72%); mask-image:radial-gradient(circle at 50% 40%,#000,transparent 72%); }
        .marquee-track { display:flex; width:max-content; animation: marquee 26s linear infinite; }
        .marquee-wrap:hover .marquee-track { animation-play-state: paused; }
        .btn-shine { position:relative; overflow:hidden; }
        .btn-shine::after { content:''; position:absolute; top:0; left:-60%; width:45%; height:100%; background:linear-gradient(120deg,transparent,rgba(255,255,255,0.55),transparent); transform:skewX(-20deg); animation:shine 3.4s ease-in-out infinite; }
        .hero-grid { display:grid; grid-template-columns:1.05fr 0.95fr; gap:44px; align-items:center; }
        .mobile-grid { display:grid; grid-template-columns:1fr 1fr; gap:48px; align-items:center; }
        .cmp-grid { display:grid; grid-template-columns:1.2fr 1fr 1fr 1.2fr; }
        .price-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:20px; }
        .testi-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; }
        .foot-grid { display:grid; grid-template-columns:2fr 1fr 1fr 1fr; gap:32px; }
        @media (max-width: 960px) {
          .hero-grid, .mobile-grid { grid-template-columns:1fr !important; text-align:center; }
          .price-grid { grid-template-columns:repeat(2,1fr) !important; }
          .testi-grid { grid-template-columns:1fr !important; }
          .foot-grid  { grid-template-columns:1fr 1fr !important; }
          .cmp-grid   { grid-template-columns:1fr 1fr !important; }
          .cmp-hide-md { display:none !important; }
          .nav-links-desktop { display:none !important; }
        }
        @media (max-width: 560px) {
          .price-grid, .foot-grid, .cmp-grid { grid-template-columns:1fr !important; }
          .hero-h1 { font-size:34px !important; }
          .sec-h2  { font-size:26px !important; }
        }
        html { scroll-behavior: smooth; }
      `}</style>

      {/* ── Navbar ─────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(10px)', borderBottom:'1px solid #E5E7EB', padding:'0 5%' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:66 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <IlmForgeLogo size={40} showText={false} />
            <div>
              <div style={{ fontSize:17,fontWeight:900,color:NAVY,letterSpacing:'-0.2px',lineHeight:1 }}>IlmForge</div>
              <div style={{ fontSize:9.5,fontWeight:600,color:AMBER,letterSpacing:'0.3px' }}>Ilm Ko Asaan Banaye</div>
            </div>
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            <div className="nav-links-desktop" style={{ display:'flex', alignItems:'center', gap:4 }}>
              {[['#features','Features'],['#why','Why Us'],['#pricing','Pricing'],['#reports','Reports'],['#faq','FAQ']].map(([href,label])=>(
                <a key={href} href={href} style={{ fontSize:13,color:'#6B7280',textDecoration:'none',padding:'7px 13px',borderRadius:8,fontWeight:500,transition:'color .12s' }}
                  onMouseEnter={e=>e.target.style.color=BLUE} onMouseLeave={e=>e.target.style.color='#6B7280'}>
                  {label}
                </a>
              ))}
            </div>
            <Link to="/register"
              style={{ background:`linear-gradient(90deg,${NAVY},${BLUE})`,color:'#fff',padding:'9px 22px',borderRadius:9,fontSize:13.5,fontWeight:700,textDecoration:'none',boxShadow:'0 3px 12px rgba(27,47,110,0.3)',marginLeft:8,transition:'all .13s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 18px rgba(27,47,110,0.4)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 3px 12px rgba(27,47,110,0.3)';}}>
              Register Your School →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────── */}
      <section style={{ background:`linear-gradient(145deg,${NAVY} 0%,#152449 40%,${BLUE} 100%)`, padding:'80px 5% 96px', position:'relative', overflow:'hidden' }}>
        <div className="mesh-blob" style={{ position:'absolute',width:540,height:540,top:-220,left:-200,background:'radial-gradient(circle,rgba(0,115,183,0.4),transparent 65%)',borderRadius:'50%',pointerEvents:'none',filter:'blur(4px)' }}/>
        <div className="mesh-blob-2" style={{ position:'absolute',width:460,height:460,bottom:-180,right:-160,background:'radial-gradient(circle,rgba(217,119,6,0.2),transparent 65%)',borderRadius:'50%',pointerEvents:'none',filter:'blur(4px)' }}/>
        <div className="grid-pattern" style={{ position:'absolute',inset:0,pointerEvents:'none',opacity:.7 }}/>

        <div className="hero-grid fade-up" style={{ position:'relative', maxWidth:1160, margin:'0 auto' }}>
          {/* Left — copy */}
          <div>
            <div style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.22)',borderRadius:99,padding:'6px 16px',marginBottom:22 }}>
              <span style={{ fontSize:14 }}>🇵🇰</span>
              <span style={{ fontSize:12.5,color:'rgba(255,255,255,0.92)',fontWeight:600 }}>Made for Pakistani Schools</span>
            </div>
            <h1 className="hero-h1" style={{ fontSize:52,fontWeight:900,color:'#fff',lineHeight:1.1,marginBottom:16,letterSpacing:'-1px' }}>
              Digital School<br/>Management,<br/>
              <span style={{ color:AMBER }}>Made Simple.</span>
            </h1>
            <p style={{ fontSize:20,fontWeight:700,color:'#5EEAD4',marginBottom:14 }}>
              Ilm Ko Asaan Banaye 🇵🇰
            </p>
            <p style={{ fontSize:16.5,color:'rgba(255,255,255,0.74)',maxWidth:520,lineHeight:1.7,marginBottom:34 }}>
              Admissions, fees, attendance, exams, staff & more — all in one powerful platform built for Pakistani schools.
            </p>
            <div style={{ display:'flex',gap:12,flexWrap:'wrap' }}>
              <Link to="/register" className="btn-shine"
                style={{ background:`linear-gradient(135deg,${AMBER},#F59E0B)`,color:'#fff',padding:'14px 30px',borderRadius:11,fontSize:15.5,fontWeight:800,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8,boxShadow:'0 6px 22px rgba(217,119,6,0.42)',transition:'all .14s' }}
                onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 10px 30px rgba(217,119,6,0.5)';}}
                onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 6px 22px rgba(217,119,6,0.42)';}}>
                <Zap size={18}/> Register Your School — Free
              </Link>
              <a href="#features"
                style={{ background:'rgba(255,255,255,0.12)',color:'#fff',padding:'14px 26px',borderRadius:11,fontSize:15,fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:8,border:'1px solid rgba(255,255,255,0.24)',transition:'background .13s' }}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.2)'}
                onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
                <Play size={16}/> See Features
              </a>
            </div>
            <div style={{ display:'flex', gap:18, marginTop:28, flexWrap:'wrap' }}>
              {['Free forever plan','No credit card needed','Setup in 5 minutes'].map(t => (
                <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:12.5, color:'rgba(255,255,255,0.6)' }}>
                  <Check size={14} color="#5EEAD4"/>{t}
                </div>
              ))}
            </div>
          </div>

          {/* Right — browser mockup with dashboard placeholder */}
          <div style={{ position:'relative' }}>
            <div className="float-slow" style={{ background:'#fff', borderRadius:16, boxShadow:'0 30px 70px rgba(0,0,0,0.35)', overflow:'hidden', border:'1px solid rgba(255,255,255,0.4)' }}>
              {/* browser chrome */}
              <div style={{ display:'flex', alignItems:'center', gap:6, padding:'11px 14px', background:'#F1F5F9', borderBottom:'1px solid #E2E8F0' }}>
                <span style={{ width:11,height:11,borderRadius:'50%',background:'#FB7185' }}/>
                <span style={{ width:11,height:11,borderRadius:'50%',background:'#FBBF24' }}/>
                <span style={{ width:11,height:11,borderRadius:'50%',background:'#34D399' }}/>
                <div style={{ marginLeft:10, flex:1, background:'#fff', border:'1px solid #E2E8F0', borderRadius:7, fontSize:10.5, color:'#94A3B8', padding:'4px 10px' }}>
                  🔒 app.ilmforge.pk/dashboard
                </div>
              </div>
              {/* dashboard body */}
              <div style={{ display:'flex', minHeight:280 }}>
                <div style={{ width:56, background:NAVY, padding:'16px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:16 }}>
                  {['🏫','👥','💰','📊','⚙️'].map((e,i)=>(
                    <div key={i} style={{ width:34,height:34,borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,background:i===0?'rgba(255,255,255,0.18)':'transparent' }}>{e}</div>
                  ))}
                </div>
                <div style={{ flex:1, padding:16, background:'#F8FAFC' }}>
                  <div style={{ fontSize:13, fontWeight:800, color:NAVY, marginBottom:12 }}>Dashboard Overview</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                    {[['Students','1,842',BLUE],['Fee Collected','Rs 2.4M',GREEN],['Attendance','94%',AMBER]].map(([l,v,c])=>(
                      <div key={l} style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:9, padding:'9px 10px' }}>
                        <div style={{ fontSize:8.5, color:'#94A3B8', fontWeight:600 }}>{l}</div>
                        <div style={{ fontSize:14, fontWeight:900, color:c }}>{v}</div>
                      </div>
                    ))}
                  </div>
                  <div style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:9, padding:12 }}>
                    <div style={{ fontSize:9.5, color:'#94A3B8', fontWeight:600, marginBottom:8 }}>Monthly Fee Collection</div>
                    <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:76 }}>
                      {[42,58,50,70,64,88,76].map((h,i)=>(
                        <div key={i} style={{ flex:1, height:`${h}%`, borderRadius:'4px 4px 0 0', background:`linear-gradient(180deg,${BLUE},${NAVY})` }}/>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* floating chips */}
            <div className="float-slower glass-dark" style={{ position:'absolute', top:-18, left:-14, borderRadius:14, padding:'9px 14px', display:'flex', alignItems:'center', gap:9 }}>
              <span style={{ fontSize:18 }}>💬</span>
              <span><span style={{ display:'block', fontSize:13, fontWeight:800, color:'#fff' }}>WhatsApp Sent</span><span style={{ fontSize:9.5, color:'rgba(255,255,255,.65)' }}>Fee receipt delivered</span></span>
            </div>
            <div className="float-slow" style={{ position:'absolute', bottom:-24, right:-10, filter:'drop-shadow(0 12px 24px rgba(0,0,0,0.3))' }}>
              <RoboBuddyMascot size={104} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust marquee ──────────────────────── */}
      <section className="marquee-wrap" style={{ background:NAVY, padding:'16px 0', overflow:'hidden', borderBottom:`3px solid ${GREEN}` }}>
        <div className="marquee-track">
          {[...TRUST_ITEMS, ...TRUST_ITEMS].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'0 34px', whiteSpace:'nowrap' }}>
              <Star size={14} color={AMBER} fill={AMBER}/>
              <span style={{ fontSize:15, fontWeight:800, color:'#fff', letterSpacing:'.2px' }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Animated stats ─────────────────────── */}
      <section ref={statsRef} style={{ background:'#F8FAFC', padding:'54px 5%' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:18 }}>
          {STATS.map((s,i) => (
            <Reveal key={s.label} delay={i*90}>
              <StatCounter stat={s} active={statsActive}/>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── School-Branded URL Showcase ───────────────── */}
      <section style={{ background:'#FFFFFF', padding:'56px 5% 30px' }}>
        <Reveal style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ background:'linear-gradient(135deg,#EFF6FF,#F0FDF4)', border:'1px solid #DBEAFE', borderRadius:16, padding:'26px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:22, alignItems:'center' }}>
            <div>
              <div style={{ fontSize:11.5, fontWeight:700, color:BLUE, letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>
                Unique School Identity
              </div>
              <div style={{ fontSize:26, fontWeight:900, color:NAVY, letterSpacing:'-.3px', lineHeight:1.2, marginBottom:8 }}>
                Every School Gets Its Own Branded Login Link
              </div>
              <div style={{ fontSize:14, color:'#475569', lineHeight:1.65, marginBottom:12 }}>
                Upload logo during registration and get a unique school URL with your own school name, logo and visual identity.
              </div>
              <div style={{ fontFamily:"'Consolas',monospace", fontSize:13, color:BLUE, background:'#ffffff', border:'1px solid #BFDBFE', borderRadius:10, padding:'9px 12px', wordBreak:'break-all' }}>
                https://your-domain/login?slug=the-multan-alma-xyz123
              </div>
            </div>
            <div style={{ background:'#fff', border:'1px solid #DBEAFE', borderRadius:14, padding:14, boxShadow:'0 8px 18px rgba(27,47,110,0.08)' }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{ width:46, height:46, borderRadius:12, background:`linear-gradient(135deg,${NAVY},${BLUE})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20 }}>🏫</div>
                <div>
                  <div style={{ fontSize:14, fontWeight:800, color:NAVY }}>Your School Branding</div>
                  <div style={{ fontSize:11.5, color:'#64748B' }}>Professional login page auto-generated</div>
                </div>
              </div>
              <div style={{ display:'grid', gap:7, fontSize:12.5 }}>
                <div style={{ color:GREEN, fontWeight:700 }}>✓ School logo on login and print pages</div>
                <div style={{ color:GREEN, fontWeight:700 }}>✓ School name on certificates and vouchers</div>
                <div style={{ color:GREEN, fontWeight:700 }}>✓ Unique portal identity per school</div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ── Features ───────────────────────────── */}
      <section id="features" style={{ padding:'72px 5%', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ display:'inline-block', background:'#EFF6FF', color:BLUE, fontSize:12, fontWeight:800, padding:'5px 14px', borderRadius:99, marginBottom:14, letterSpacing:'.04em' }}>
              13 POWERFUL FEATURES
            </div>
            <h2 className="sec-h2" style={{ fontSize:34, fontWeight:800, color:NAVY, marginBottom:10 }}>
              Everything Your School Needs
            </h2>
            <p style={{ fontSize:15, color:'#64748B', maxWidth:500, margin:'0 auto' }}>
              From admissions to accounting — one platform for your entire school
            </p>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:18 }}>
            {FEATURES.map((f,i) => {
              const Icon = f.icon;
              return (
                <Reveal key={f.title} delay={(i%3)*90}>
                  <div style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:14, padding:'24px 20px', transition:'all 0.18s', cursor:'default', height:'100%' }}
                    onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 12px 28px rgba(27,47,110,0.1)'; e.currentTarget.style.borderColor = f.color+'55'; e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#E8EDF3'; e.currentTarget.style.transform = ''; }}>
                    <div style={{ width:46, height:46, borderRadius:12, background:f.color+'18', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                      <Icon size={23} color={f.color}/>
                    </div>
                    <div style={{ fontSize:15, fontWeight:700, color:NAVY, marginBottom:7 }}>{f.title}</div>
                    <div style={{ fontSize:12.5, color:'#64748B', lineHeight:1.6 }}>{f.desc}</div>
                  </div>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Why IlmForge? comparison ──────────────── */}
      <section id="why" style={{ padding:'72px 5%', background:'#F8FAFC' }}>
        <div style={{ maxWidth:1000, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:44 }}>
            <div style={{ display:'inline-block', background:'#DCFCE7', color:GREEN, fontSize:12, fontWeight:800, padding:'5px 14px', borderRadius:99, marginBottom:14, letterSpacing:'.04em' }}>
              WHY ILMFORGE?
            </div>
            <h2 className="sec-h2" style={{ fontSize:34, fontWeight:800, color:NAVY, marginBottom:10 }}>
              See the Difference
            </h2>
            <p style={{ fontSize:15, color:'#64748B' }}>
              How IlmForge compares to traditional methods and other ERP tools
            </p>
          </Reveal>

          <Reveal>
            <div style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:16, overflow:'hidden', boxShadow:'0 8px 26px rgba(27,47,110,0.06)' }}>
              {/* header row */}
              <div className="cmp-grid" style={{ background:NAVY, color:'#fff' }}>
                <div className="cmp-hide-md" style={{ padding:'16px 18px', fontSize:12.5, fontWeight:700, opacity:.8 }}>Capability</div>
                <div style={{ padding:'16px 18px', fontSize:13, fontWeight:700, textAlign:'center', opacity:.75 }}>Traditional</div>
                <div style={{ padding:'16px 18px', fontSize:13, fontWeight:700, textAlign:'center', opacity:.75 }}>Other ERP</div>
                <div style={{ padding:'16px 18px', fontSize:13.5, fontWeight:900, textAlign:'center', background:`linear-gradient(135deg,${GREEN},#16a34a)`, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                  <GraduationCap size={16}/> IlmForge
                </div>
              </div>
              {/* rows */}
              {COMPARISON.map((row, i) => (
                <div key={row.feature} className="cmp-grid" style={{ borderTop:'1px solid #EEF2F7', background:i%2 ? '#FBFCFE' : '#fff' }}>
                  <div className="cmp-hide-md" style={{ padding:'14px 18px', fontSize:13, fontWeight:700, color:NAVY }}>{row.feature}</div>
                  <div style={{ padding:'14px 18px', fontSize:12.5, color:'#94A3B8', textAlign:'center', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <X size={14} color="#CBD5E1" style={{ flexShrink:0 }}/> {row.trad}
                  </div>
                  <div style={{ padding:'14px 18px', fontSize:12.5, color:'#64748B', textAlign:'center' }}>{row.other}</div>
                  <div style={{ padding:'14px 18px', fontSize:12.8, fontWeight:700, color:GREEN, textAlign:'center', background:'rgba(21,128,61,0.05)', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <Check size={15} color={GREEN} style={{ flexShrink:0 }}/> {row.ilm}
                  </div>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── Mobile App ─────────────────────────── */}
      <section style={{ background:`linear-gradient(135deg,${NAVY},#122440)`, padding:'72px 5%' }}>
        <div className="mobile-grid" style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal>
            <div style={{ display:'inline-block', background:'rgba(0,115,183,0.25)', color:'#93C5FD', fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:99, marginBottom:16, border:'1px solid rgba(0,115,183,0.4)' }}>
              Free Mobile Apps
            </div>
            <h2 className="sec-h2" style={{ fontSize:34, fontWeight:800, color:'#fff', marginBottom:16, lineHeight:1.2 }}>
              Free Mobile App for<br/>Parents, Teachers & Staff
            </h2>
            <p style={{ fontSize:14.5, color:'rgba(255,255,255,0.65)', lineHeight:1.7, marginBottom:28 }}>
              Parents track attendance, pay fees online, view results & get WhatsApp alerts — all from their phone. Teachers mark attendance and homework. Staff view salary slips.
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
              {['Parent portal with fee payment','Real-time attendance & results','WhatsApp & push notifications','Homework diary for students','Staff salary & leave management'].map(item => (
                <div key={item} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13.5, color:'rgba(255,255,255,0.8)' }}>
                  <Check size={14} color="#5EEAD4" style={{ flexShrink:0 }}/>{item}
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
              <a href="#" style={{ background:BLUE, color:'#fff', padding:'11px 20px', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:7 }}>
                <Smartphone size={16}/> Google Play
              </a>
              <a href="#" style={{ background:'rgba(255,255,255,0.12)', color:'#fff', padding:'11px 20px', borderRadius:9, fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:7, border:'1px solid rgba(255,255,255,0.2)' }}>
                <Smartphone size={16}/> App Store
              </a>
            </div>
          </Reveal>
          <Reveal delay={120} style={{ display:'flex', justifyContent:'center', gap:16, flexWrap:'wrap' }}>
            {[
              { title:'Parent Portal', items:['Fee Due: Rs. 3,500','Attendance: 92%','Results: A+','Homework: 2 pending'] },
              { title:'Teacher Portal', items:['Students: 42','Present Today: 38','Homework Added','Marks Entered'] },
            ].map((card, i) => (
              <div key={i} className={i===0?'float-slow':'float-slower'} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.14)', borderRadius:18, padding:20, width:168, backdropFilter:'blur(4px)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#5EEAD4', marginBottom:12 }}>{card.title}</div>
                {card.items.map(item => (
                  <div key={item} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, fontSize:11.5, color:'rgba(255,255,255,0.75)' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#5EEAD4', flexShrink:0 }}/>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* ── Pricing ────────────────────────────── */}
      <section id="pricing" style={{ padding:'72px 5%', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ display:'inline-block', background:'#EDE9FE', color:'#7C3AED', fontSize:12, fontWeight:800, padding:'5px 14px', borderRadius:99, marginBottom:14, letterSpacing:'.04em' }}>
              SIMPLE PRICING
            </div>
            <h2 className="sec-h2" style={{ fontSize:34, fontWeight:800, color:NAVY, marginBottom:10 }}>
              Plans for Every School
            </h2>
            <p style={{ fontSize:15, color:'#64748B' }}>
              Start free, upgrade anytime. No hidden fees. Cancel whenever you like.
            </p>
          </Reveal>
          <div className="price-grid">
            {PRICING.map((p,i) => (
              <Reveal key={p.name} delay={i*80}>
                <div style={{
                  position:'relative', background:'#fff',
                  border: p.highlight ? `2px solid ${p.accent}` : '1px solid #E8EDF3',
                  borderRadius:18, padding:'28px 22px', height:'100%',
                  boxShadow: p.highlight ? '0 18px 40px rgba(27,47,110,0.14)' : '0 3px 12px rgba(0,0,0,0.04)',
                  transform: p.highlight ? 'scale(1.03)' : 'none', transition:'all .18s',
                }}
                  onMouseEnter={e=>{ if(!p.highlight){ e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 14px 32px rgba(27,47,110,0.1)'; } }}
                  onMouseLeave={e=>{ if(!p.highlight){ e.currentTarget.style.transform=''; e.currentTarget.style.boxShadow='0 3px 12px rgba(0,0,0,0.04)'; } }}>
                  {p.highlight && (
                    <div style={{ position:'absolute', top:-13, left:'50%', transform:'translateX(-50%)', background:p.accent, color:'#fff', fontSize:11, fontWeight:800, padding:'4px 14px', borderRadius:99, whiteSpace:'nowrap', letterSpacing:'.03em' }}>
                      MOST POPULAR
                    </div>
                  )}
                  <div style={{ fontSize:16, fontWeight:800, color:p.accent, marginBottom:6 }}>{p.name}</div>
                  <div style={{ display:'flex', alignItems:'baseline', gap:4, marginBottom:4 }}>
                    <span style={{ fontSize:15, fontWeight:700, color:'#64748B' }}>Rs</span>
                    <span style={{ fontSize:38, fontWeight:900, color:NAVY, letterSpacing:'-1px' }}>{p.price}</span>
                    <span style={{ fontSize:12.5, color:'#94A3B8' }}>/{p.period}</span>
                  </div>
                  <div style={{ fontSize:12.5, color:'#64748B', fontWeight:600, marginBottom:18 }}>{p.students}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:9, marginBottom:22 }}>
                    {p.features.map(f => (
                      <div key={f} style={{ display:'flex', alignItems:'flex-start', gap:8, fontSize:12.5, color:'#475569' }}>
                        <Check size={15} color={GREEN} style={{ flexShrink:0, marginTop:1 }}/>{f}
                      </div>
                    ))}
                  </div>
                  <Link to="/register" style={{
                    display:'block', textAlign:'center', padding:'11px 16px', borderRadius:10, fontSize:13.5, fontWeight:800, textDecoration:'none', transition:'all .13s',
                    background: p.highlight ? `linear-gradient(135deg,${p.accent},${BLUE})` : 'transparent',
                    color: p.highlight ? '#fff' : p.accent,
                    border: p.highlight ? '2px solid transparent' : `1.5px solid ${p.accent}`,
                    boxShadow: p.highlight ? '0 6px 18px rgba(27,47,110,0.25)' : 'none',
                  }}
                    onMouseEnter={e=>{ e.currentTarget.style.transform='translateY(-1px)'; if(!p.highlight){ e.currentTarget.style.background=p.accent; e.currentTarget.style.color='#fff'; } }}
                    onMouseLeave={e=>{ e.currentTarget.style.transform=''; if(!p.highlight){ e.currentTarget.style.background='transparent'; e.currentTarget.style.color=p.accent; } }}>
                    {p.price === '0' ? 'Start Free' : 'Choose Plan'}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Report Designs Gallery ──────────────── */}
      <section id="reports" style={{ padding:'72px 5%', background:'#F8FAFC' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:48 }}>
            <h2 className="sec-h2" style={{ fontSize:34, fontWeight:800, color:NAVY, marginBottom:10 }}>
              Beautiful Printable Reports
            </h2>
            <p style={{ fontSize:15, color:'#64748B' }}>
              Professional designs for every document your school needs
            </p>
          </Reveal>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
            {REPORT_DESIGNS.map((r,i) => (
              <Reveal key={r.title} delay={(i%4)*70}>
                <div style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:14, padding:'24px 16px', textAlign:'center', transition:'all 0.15s', height:'100%' }}
                  onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 10px 24px rgba(27,47,110,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                  <div style={{ fontSize:36, marginBottom:10 }}>{r.emoji}</div>
                  <div style={{ fontSize:13.5, fontWeight:700, color:r.color }}>{r.title}</div>
                  <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:4 }}>Print / PDF / Excel</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────── */}
      <section style={{ padding:'72px 5%', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:48 }}>
            <div style={{ display:'inline-block', background:'#FEF3C7', color:AMBER, fontSize:12, fontWeight:800, padding:'5px 14px', borderRadius:99, marginBottom:14, letterSpacing:'.04em' }}>
              LOVED BY PRINCIPALS
            </div>
            <h2 className="sec-h2" style={{ fontSize:34, fontWeight:800, color:NAVY, marginBottom:10 }}>
              What School Principals Say
            </h2>
          </Reveal>
          <div className="testi-grid">
            {TESTIMONIALS.map((t, i) => (
              <Reveal key={i} delay={i*100}>
                <div style={{ background:'#F8FAFC', border:'1px solid #E8EDF3', borderRadius:16, padding:26, height:'100%' }}>
                  <div style={{ display:'flex', gap:3, marginBottom:12 }}>
                    {[...Array(5)].map((_,j) => <Star key={j} size={15} color="#F59E0B" fill="#F59E0B"/>)}
                  </div>
                  <p style={{ fontSize:13.5, color:'#374151', lineHeight:1.7, marginBottom:16, fontStyle:'italic' }}>"{t.text}"</p>
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:40, height:40, borderRadius:'50%', background:`linear-gradient(135deg,${BLUE},${NAVY})`, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:15 }}>
                      {t.name.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize:13, fontWeight:700, color:NAVY }}>{t.name}</div>
                      <div style={{ fontSize:11.5, color:'#94A3B8' }}>{t.school}</div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────── */}
      <section id="faq" style={{ padding:'72px 5%', background:'#F8FAFC' }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <Reveal style={{ textAlign:'center', marginBottom:44 }}>
            <h2 className="sec-h2" style={{ fontSize:34, fontWeight:800, color:NAVY, marginBottom:10 }}>Frequently Asked Questions</h2>
            <p style={{ fontSize:15, color:'#64748B' }}>Everything you need to know about IlmForge</p>
          </Reveal>
          {FAQS.map((faq, i) => (
            <Reveal key={i} delay={i*50}>
              <div style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:12, marginBottom:10, overflow:'hidden' }}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  style={{ width:'100%', textAlign:'left', padding:'17px 20px', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', gap:12, fontSize:14, fontWeight:600, color:NAVY, fontFamily:'inherit' }}>
                  {faq.q}
                  {openFaq === i ? <ChevronUp size={17} color={BLUE}/> : <ChevronDown size={17} color="#94A3B8"/>}
                </button>
                <div style={{ maxHeight: openFaq === i ? 200 : 0, overflow:'hidden', transition:'max-height .3s ease' }}>
                  <div style={{ padding:'0 20px 16px', fontSize:13.5, color:'#475569', lineHeight:1.7 }}>{faq.a}</div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────── */}
      <section style={{ background:`linear-gradient(145deg,${NAVY},#152449,${BLUE})`, padding:'80px 5%', textAlign:'center', position:'relative', overflow:'hidden' }}>
        <div className="mesh-blob" style={{ position:'absolute',width:420,height:420,top:-160,right:-120,background:'radial-gradient(circle,rgba(217,119,6,0.2),transparent 65%)',borderRadius:'50%',pointerEvents:'none' }}/>
        <Reveal style={{ maxWidth:640, margin:'0 auto', position:'relative' }}>
          <div style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', border:'1px solid rgba(255,255,255,0.22)', borderRadius:99, padding:'6px 16px', marginBottom:18 }}>
            <span style={{ fontSize:14 }}>🇵🇰</span>
            <span style={{ fontSize:12.5, color:'rgba(255,255,255,0.9)', fontWeight:600 }}>Made for Pakistani Schools</span>
          </div>
          <h2 className="sec-h2" style={{ fontSize:36, fontWeight:900, color:'#fff', marginBottom:12, letterSpacing:'-0.5px' }}>
            Register Your School on IlmForge
          </h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.74)', marginBottom:10, lineHeight:1.65 }}>
            Join 1,200+ schools. Your login password is auto-generated &amp; sent to your email. Setup in 5 minutes.
          </p>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.55)', marginBottom:30 }}>
            ✅ Free forever plan &nbsp;·&nbsp; 📧 Credentials sent by email &nbsp;·&nbsp; 🔒 Secure &amp; reliable
          </p>
          <Link to="/register" className="btn-shine"
            style={{ background:`linear-gradient(135deg,${AMBER},#F59E0B)`, color:'#fff', padding:'15px 36px', borderRadius:11, fontSize:16, fontWeight:800, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:9, boxShadow:'0 6px 24px rgba(217,119,6,0.45)', transition:'all .14s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 10px 32px rgba(217,119,6,0.55)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 6px 24px rgba(217,119,6,0.45)';}}>
            Register Your School Free <ArrowRight size={18}/>
          </Link>
          <div style={{ marginTop:20, fontSize:12, color:'rgba(255,255,255,0.45)' }}>
            Already registered?{' '}
            <Link to="/login" style={{ color:'#5EEAD4', textDecoration:'none', fontWeight:700 }}>Sign in here</Link>
          </div>
        </Reveal>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer style={{ background:NAVY, padding:'52px 5% 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div className="foot-grid" style={{ paddingBottom:32, borderBottom:'1px solid rgba(255,255,255,0.1)' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:38,height:38,background:`linear-gradient(135deg,${BLUE},${AMBER})`,borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18 }}>🎓</div>
                <div>
                  <div style={{ fontSize:16,fontWeight:900,color:'#fff',lineHeight:1 }}>IlmForge</div>
                  <div style={{ fontSize:9.5,color:AMBER,fontWeight:600 }}>Ilm Ko Asaan Banaye</div>
                </div>
              </div>
              <p style={{ fontSize:12.5, color:'#94A3B8', lineHeight:1.7, maxWidth:240 }}>Pakistan's #1 School ERP platform. Trusted by 1,200+ schools nationwide. 🇵🇰</p>
              <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:7 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#A5B4CB' }}><MapPin size={13}/> Islamabad, Pakistan</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#A5B4CB' }}><Phone size={13}/> +92 300 1234567</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#A5B4CB' }}><Mail size={13}/> info@ilmforge.pk</div>
              </div>
              <div style={{ marginTop:18, display:'flex', gap:10 }}>
                {[Facebook, Twitter, Linkedin, Instagram, Youtube].map((Ico, i) => (
                  <a key={i} href="#" aria-label="social" style={{ width:34, height:34, borderRadius:9, background:'rgba(255,255,255,0.08)', display:'flex', alignItems:'center', justifyContent:'center', color:'#A5B4CB', transition:'all .14s' }}
                    onMouseEnter={e=>{e.currentTarget.style.background=BLUE; e.currentTarget.style.color='#fff';}}
                    onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.08)'; e.currentTarget.style.color='#A5B4CB';}}>
                    <Ico size={16}/>
                  </a>
                ))}
              </div>
            </div>
            {[
              { title:'PRODUCT',   links:[['Features','#features'],['Reports','#reports'],['Pricing','#pricing'],['FAQ','#faq']] },
              { title:'COMPANY',   links:[['About Us','#'],['Blog','#'],['Privacy Policy','#'],['Terms','#']] },
              { title:'SECURITY',  links:[['256-bit SSL','#'],['AWS Hosted','#'],['99.9% Uptime','#'],['Daily Backups','#']] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, color:'#64748B', textTransform:'uppercase', marginBottom:14 }}>{col.title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {col.links.map(([l,href]) => (
                    <a key={l} href={href} style={{ fontSize:13, color:'#A5B4CB', textDecoration:'none', transition:'color 0.12s' }}
                      onMouseEnter={e=>e.target.style.color='#5EEAD4'} onMouseLeave={e=>e.target.style.color='#A5B4CB'}>
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <span style={{ fontSize:12, color:'#64748B' }}>© 2026 IlmForge · Ilm Ko Asaan Banaye · Made in Pakistan 🇵🇰</span>
            <div style={{ display:'flex', gap:16 }}>
              <a href="#" style={{ fontSize:12, color:'#64748B', textDecoration:'none' }}>Privacy Policy</a>
              <a href="#" style={{ fontSize:12, color:'#64748B', textDecoration:'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
