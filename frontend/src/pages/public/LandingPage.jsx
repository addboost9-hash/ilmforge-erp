import { Link } from 'react-router-dom';
import { IlmForgeLogo, RoboBuddyMascot } from '../../components/brand/Brand';
import { useState } from 'react';
import {
  GraduationCap, Users, DollarSign, BarChart3, Smartphone,
  Cloud, Building2, Shield, MessageSquare, CreditCard,
  Fingerprint, FileText, Bell, Zap, ChevronDown, ChevronUp,
  Play, Check, Star, ArrowRight, Phone, Mail, MapPin
} from 'lucide-react';

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
  { icon: Shield,       color: '#1E3A5F', title: 'Bank-Grade Security',       desc: '256-bit SSL encryption, daily backups, role-based access control.' },
  { icon: BarChart3,    color: '#15803D', title: 'Full Accounting',           desc: 'Income/expense tracking, balance sheets, salary management & profit reports.' },
];

const FAQS = [
  { q: 'Is there a free plan for small schools?', a: 'Yes! EduForge Pro offers a free plan for schools with up to 100 students. No credit card required.' },
  { q: 'Is my data safe and private?', a: 'Absolutely. Your data is encrypted with 256-bit SSL and stored securely. Only authorized users can access it.' },
  { q: 'Can I manage multiple school campuses?', a: 'Yes. You can manage unlimited campuses from a single dashboard, each with its own data and reports.' },
  { q: 'How does the mobile app work?', a: 'Parents, teachers and students download the free app and log in. They can view attendance, fees, results and homework.' },
  { q: 'Can parents pay fees online?', a: 'Yes. Parents can pay via EasyPaisa, JazzCash or bank transfer through their parent portal.' },
  { q: 'Is biometric attendance supported?', a: 'Yes. We support ZKTeco and other popular biometric devices with our BioAttendance desktop app.' },
];

const TESTIMONIALS = [
  { name: 'Muhammad Tariq', school: 'City Grammar School, Rawalpindi', text: 'EduForge Pro transformed how we manage our 3 campuses. Fee collection time dropped by 80% and parents love the WhatsApp updates.' },
  { name: 'Ali Hassan Khan', school: 'The Savvy School, Islamabad',    text: 'The automatic SMS alerts for absent students are fantastic. Parents appreciate the transparency and our attendance improved significantly.' },
  { name: 'Neersh Siddiqui', school: 'Perfect Academy, Lahore',        text: 'Reports that used to take hours now take seconds. The exam result system with marksheets is exactly what we needed.' },
];

const STATS = [
  { value: '1,200+', label: 'Happy Schools',      color: '#0D9488', bg: '#CCFBF1' },
  { value: '13,500+',label: 'Happy Families',     color: '#2563EB', bg: '#DBEAFE' },
  { value: '32+',    label: 'Cities Across Pak',  color: '#7C3AED', bg: '#EDE9FE' },
  { value: '13+',    label: 'Years of Success',   color: '#15803D', bg: '#DCFCE7' },
];

const REPORT_DESIGNS = [
  { title: 'Fee Voucher',          emoji: '🧾', color: '#1E3A5F' },
  { title: 'Family Voucher',       emoji: '👨‍👩‍👦', color: '#7C3AED' },
  { title: 'Student Marksheet',    emoji: '📊', color: '#0D9488' },
  { title: 'Admit Card',           emoji: '🆔', color: '#2563EB' },
  { title: 'Leaving Certificate',  emoji: '📜', color: '#DC2626' },
  { title: 'Character Certificate',emoji: '✅', color: '#15803D' },
  { title: 'Staff ID Card',        emoji: '👤', color: '#D97706' },
  { title: 'Salary Slip',          emoji: '💰', color: '#0891B2' },
];

export default function LandingPage() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <div style={{ fontFamily:"'Poppins','Inter',system-ui,sans-serif", background:'#fff', color:'#1F2937' }}>

      {/* ── Navbar ─────────────────────────────── */}
      <nav style={{ position:'sticky', top:0, zIndex:100, background:'rgba(255,255,255,0.97)', backdropFilter:'blur(10px)', borderBottom:'1px solid #E5E7EB', padding:'0 5%' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', height:66 }}>

          {/* IlmForge brand */}
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <IlmForgeLogo size={40} showText={false} />
            <div>
              <div style={{ fontSize:17,fontWeight:900,color:'#0F4C45',letterSpacing:'-0.2px',lineHeight:1 }}>IlmForge</div>
              <div style={{ fontSize:9.5,fontWeight:600,color:'#D97706',letterSpacing:'0.3px' }}>Ilm Ko Asaan Banaye</div>
            </div>
          </div>

          {/* Nav links — NO Sign In button */}
          <div style={{ display:'flex', alignItems:'center', gap:4 }}>
            {['#features','#reports','#faq'].map((href,i)=>(['Features','Reports','FAQ'][i]) && (
              <a key={href} href={href} style={{ fontSize:13,color:'#6B7280',textDecoration:'none',padding:'7px 13px',borderRadius:8,fontWeight:500,transition:'color .12s' }}
                onMouseEnter={e=>e.target.style.color='#0F766E'} onMouseLeave={e=>e.target.style.color='#6B7280'}>
                {['Features','Reports','FAQ'][i]}
              </a>
            ))}
            {/* Register — the ONLY primary CTA */}
            <Link to="/register"
              style={{ background:'linear-gradient(90deg,#0F766E,#0D9488)',color:'#fff',padding:'9px 22px',borderRadius:9,fontSize:13.5,fontWeight:700,textDecoration:'none',boxShadow:'0 3px 12px rgba(15,118,110,0.3)',marginLeft:8,transition:'all .13s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-1px)';e.currentTarget.style.boxShadow='0 6px 18px rgba(15,118,110,0.38)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 3px 12px rgba(15,118,110,0.3)';}}>
              Register Your School →
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────── */}
      <section style={{ background:'linear-gradient(145deg,#0F4C45 0%,#0F766E 55%,#0D9488 100%)', padding:'88px 5% 100px', textAlign:'center', position:'relative', overflow:'hidden' }}>
        {/* Animated mesh decoration */}
        <div className="mesh-blob" style={{ position:'absolute',width:520,height:520,top:-210,left:-190,background:'radial-gradient(circle,rgba(94,234,212,0.13),transparent 65%)',borderRadius:'50%',pointerEvents:'none',filter:'blur(2px)' }}/>
        <div className="mesh-blob-2" style={{ position:'absolute',width:440,height:440,bottom:-160,right:-140,background:'radial-gradient(circle,rgba(217,119,6,0.16),transparent 65%)',borderRadius:'50%',pointerEvents:'none',filter:'blur(2px)' }}/>
        <div className="grid-pattern" style={{ position:'absolute',inset:0,pointerEvents:'none',opacity:.6 }}/>
        {/* Floating glass stat chips */}
        <div className="float-slow glass-dark" style={{ position:'absolute', top:100, left:'6%', borderRadius:14, padding:'10px 16px', display:'flex', alignItems:'center', gap:9, pointerEvents:'none' }}>
          <span style={{ fontSize:20 }}>🎓</span>
          <span><span style={{ display:'block', fontSize:15, fontWeight:800, color:'#fff' }}>13 Hubs</span><span style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>Onboarding-style</span></span>
        </div>
        <div className="float-slow" style={{ position:'absolute', bottom:24, right:'4%', pointerEvents:'none', filter:'drop-shadow(0 12px 24px rgba(0,0,0,0.25))' }}>
          <RoboBuddyMascot size={150} />
        </div>
        <div className="float-slower glass-dark" style={{ position:'absolute', top:150, right:'6%', borderRadius:14, padding:'10px 16px', display:'flex', alignItems:'center', gap:9, pointerEvents:'none' }}>
          <span style={{ fontSize:20 }}>🔗</span>
          <span><span style={{ display:'block', fontSize:15, fontWeight:800, color:'#fff' }}>Auto Portals</span><span style={{ fontSize:10, color:'rgba(255,255,255,.6)' }}>Student + Parent</span></span>
        </div>

        <div className="fade-up" style={{ position:'relative', maxWidth:800, margin:'0 auto' }}>
          <div style={{ display:'inline-flex',alignItems:'center',gap:8,background:'rgba(255,255,255,0.12)',border:'1px solid rgba(255,255,255,0.2)',borderRadius:99,padding:'6px 16px',marginBottom:22 }}>
            <Star size={13} color="#D97706" fill="#D97706"/>
            <span style={{ fontSize:12.5,color:'rgba(255,255,255,0.9)',fontWeight:600 }}>Pakistan's #1 School Management ERP</span>
          </div>
          <h1 style={{ fontSize:50,fontWeight:900,color:'#fff',lineHeight:1.12,marginBottom:18,letterSpacing:'-0.8px' }}>
            Digital School Management<br/>
            <span style={{ color:'#D97706' }}>Powered by IlmForge</span>
          </h1>
          <p style={{ fontSize:17,color:'rgba(255,255,255,0.72)',maxWidth:560,margin:'0 auto 38px',lineHeight:1.72 }}>
            Admissions, fees, attendance, exams, staff & more — all in one powerful platform built for Pakistani schools.
          </p>
          <div style={{ display:'flex',gap:12,justifyContent:'center',flexWrap:'wrap' }}>
            <Link to="/register" className="btn-shine"
              style={{ background:'linear-gradient(135deg,#D97706,#F59E0B)',color:'#fff',padding:'14px 32px',borderRadius:10,fontSize:15.5,fontWeight:800,textDecoration:'none',display:'flex',alignItems:'center',gap:8,boxShadow:'0 4px 20px rgba(217,119,6,0.4)',transition:'all .14s' }}
              onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(217,119,6,0.45)';}}
              onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 20px rgba(217,119,6,0.4)';}}>
              <Zap size={18}/> Register Your School — Free
            </Link>
            <a href="#features"
              style={{ background:'rgba(255,255,255,0.12)',color:'#fff',padding:'14px 28px',borderRadius:10,fontSize:15,fontWeight:600,textDecoration:'none',display:'flex',alignItems:'center',gap:8,border:'1px solid rgba(255,255,255,0.22)',transition:'background .13s' }}
              onMouseEnter={e=>e.currentTarget.style.background='rgba(255,255,255,0.18)'}
              onMouseLeave={e=>e.currentTarget.style.background='rgba(255,255,255,0.12)'}>
              <Play size={16}/> See Features
            </a>
          </div>
          <div style={{ display:'flex', gap:20, justifyContent:'center', marginTop:28, flexWrap:'wrap' }}>
            {['Free forever plan','No credit card needed','Setup in 5 minutes'].map(t => (
              <div key={t} style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'rgba(255,255,255,0.5)' }}>
                <Check size={14} color="#5EEAD4"/>{t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── School-Branded URL Showcase ───────────────── */}
      <section style={{ background:'#FFFFFF', padding:'42px 5% 30px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', background:'linear-gradient(135deg,#ECFEFF,#F0FDF4)', border:'1px solid #CCFBF1', borderRadius:16, padding:'22px 22px', display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:20, alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11.5, fontWeight:700, color:'#0F766E', letterSpacing:'.08em', textTransform:'uppercase', marginBottom:6 }}>
              Unique School Identity
            </div>
            <div style={{ fontSize:26, fontWeight:900, color:'#1E3A5F', letterSpacing:'-.3px', lineHeight:1.2, marginBottom:8 }}>
              Every School Gets Its Own Branded Login Link
            </div>
            <div style={{ fontSize:14, color:'#475569', lineHeight:1.65, marginBottom:12 }}>
              Upload logo during registration and get a unique school URL with your own school name, logo and visual identity.
            </div>
            <div style={{ fontFamily:"'Consolas',monospace", fontSize:13, color:'#0F766E', background:'#ffffff', border:'1px solid #99F6E4', borderRadius:10, padding:'9px 12px', wordBreak:'break-all' }}>
              https://your-domain/login?slug=the-multan-alma-xyz123
            </div>
          </div>
          <div style={{ background:'#fff', border:'1px solid #D1FAE5', borderRadius:14, padding:14, boxShadow:'0 8px 18px rgba(15,118,110,0.08)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
              <div style={{ width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#0F766E,#0D9488)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20 }}>🏫</div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:'#1E3A5F' }}>Your School Branding</div>
                <div style={{ fontSize:11.5, color:'#64748B' }}>Professional login page auto-generated</div>
              </div>
            </div>
            <div style={{ display:'grid', gap:7, fontSize:12.5 }}>
              <div style={{ color:'#0F766E', fontWeight:700 }}>✓ School logo on login and print pages</div>
              <div style={{ color:'#0F766E', fontWeight:700 }}>✓ School name on certificates and vouchers</div>
              <div style={{ color:'#0F766E', fontWeight:700 }}>✓ Unique portal identity per school</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ──────────────────────────────── */}
      <section style={{ background:'#F8FAFC', padding:'48px 5%' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16 }}>
          {STATS.map(s => (
            <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'20px 16px', textAlign:'center', border:'1px solid #E8EDF3', boxShadow:'0 1px 4px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize:32, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:13, color:'#64748B', fontWeight:600, marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ───────────────────────────── */}
      <section id="features" style={{ padding:'72px 5%', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:34, fontWeight:800, color:'#1E3A5F', marginBottom:10 }}>
              Everything Your School Needs
            </h2>
            <p style={{ fontSize:15, color:'#64748B', maxWidth:500, margin:'0 auto' }}>
              From admissions to accounting — one platform for your entire school
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:18 }}>
            {FEATURES.map(f => {
              const Icon = f.icon;
              return (
                <div key={f.title} style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:12, padding:'22px 20px', transition:'all 0.15s', cursor:'default' }}
                  onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.08)'; e.currentTarget.style.borderColor = f.color+'50'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = '#E8EDF3'; e.currentTarget.style.transform = ''; }}>
                  <div style={{ width:44, height:44, borderRadius:11, background:f.color+'15', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }}>
                    <Icon size={22} color={f.color}/>
                  </div>
                  <div style={{ fontSize:14.5, fontWeight:700, color:'#1E3A5F', marginBottom:7 }}>{f.title}</div>
                  <div style={{ fontSize:12.5, color:'#64748B', lineHeight:1.6 }}>{f.desc}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Mobile App ─────────────────────────── */}
      <section style={{ background:'linear-gradient(135deg,#1E3A5F,#122440)', padding:'72px 5%' }}>
        <div style={{ maxWidth:1100, margin:'0 auto', display:'grid', gridTemplateColumns:'1fr 1fr', gap:48, alignItems:'center' }}>
          <div>
            <div style={{ display:'inline-block', background:'rgba(13,148,136,0.2)', color:'#5EEAD4', fontSize:12, fontWeight:700, padding:'4px 12px', borderRadius:99, marginBottom:16, border:'1px solid rgba(13,148,136,0.3)' }}>
              Free Mobile Apps
            </div>
            <h2 style={{ fontSize:34, fontWeight:800, color:'#fff', marginBottom:16, lineHeight:1.2 }}>
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
            <div style={{ display:'flex', gap:12 }}>
              <a href="#" style={{ background:'#0D9488', color:'#fff', padding:'11px 20px', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:7 }}>
                <Smartphone size={16}/> Google Play
              </a>
              <a href="#" style={{ background:'rgba(255,255,255,0.12)', color:'#fff', padding:'11px 20px', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none', display:'flex', alignItems:'center', gap:7, border:'1px solid rgba(255,255,255,0.2)' }}>
                <Smartphone size={16}/> App Store
              </a>
            </div>
          </div>
          <div style={{ display:'flex', justifyContent:'center', gap:16 }}>
            {[
              { title:'Parent Portal', items:['Fee Due: Rs. 3,500','Attendance: 92%','Results: A+','Homework: 2 pending'] },
              { title:'Teacher Portal', items:['Students: 42','Present Today: 38','Homework Added','Marks Entered'] },
            ].map((card, i) => (
              <div key={i} style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.12)', borderRadius:16, padding:20, width:160, backdropFilter:'blur(4px)' }}>
                <div style={{ fontSize:13, fontWeight:700, color:'#5EEAD4', marginBottom:12 }}>{card.title}</div>
                {card.items.map(item => (
                  <div key={item} style={{ display:'flex', alignItems:'center', gap:6, marginBottom:8, fontSize:11.5, color:'rgba(255,255,255,0.75)' }}>
                    <div style={{ width:6, height:6, borderRadius:'50%', background:'#5EEAD4', flexShrink:0 }}/>
                    {item}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Report Designs Gallery ──────────────── */}
      <section id="reports" style={{ padding:'72px 5%', background:'#F8FAFC' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:34, fontWeight:800, color:'#1E3A5F', marginBottom:10 }}>
              Beautiful Printable Reports
            </h2>
            <p style={{ fontSize:15, color:'#64748B' }}>
              Professional designs for every document your school needs
            </p>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))', gap:14 }}>
            {REPORT_DESIGNS.map(r => (
              <div key={r.title} style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:12, padding:'24px 16px', textAlign:'center', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.07)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = ''; }}>
                <div style={{ fontSize:36, marginBottom:10 }}>{r.emoji}</div>
                <div style={{ fontSize:13.5, fontWeight:700, color:r.color }}>{r.title}</div>
                <div style={{ fontSize:11.5, color:'#94A3B8', marginTop:4 }}>Print / PDF / Excel</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Testimonials ───────────────────────── */}
      <section style={{ padding:'72px 5%', background:'#fff' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:34, fontWeight:800, color:'#1E3A5F', marginBottom:10 }}>
              What School Principals Say
            </h2>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20 }}>
            {TESTIMONIALS.map((t, i) => (
              <div key={i} style={{ background:'#F8FAFC', border:'1px solid #E8EDF3', borderRadius:14, padding:24 }}>
                <div style={{ display:'flex', gap:3, marginBottom:12 }}>
                  {[...Array(5)].map((_,j) => <Star key={j} size={14} color="#F59E0B" fill="#F59E0B"/>)}
                </div>
                <p style={{ fontSize:13.5, color:'#374151', lineHeight:1.7, marginBottom:16, fontStyle:'italic' }}>"{t.text}"</p>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <div style={{ width:38, height:38, borderRadius:'50%', background:'linear-gradient(135deg,#0D9488,#0F766E)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:700, fontSize:14 }}>
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#1E3A5F' }}>{t.name}</div>
                    <div style={{ fontSize:11.5, color:'#94A3B8' }}>{t.school}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ────────────────────────────────── */}
      <section id="faq" style={{ padding:'72px 5%', background:'#F8FAFC' }}>
        <div style={{ maxWidth:720, margin:'0 auto' }}>
          <div style={{ textAlign:'center', marginBottom:48 }}>
            <h2 style={{ fontSize:34, fontWeight:800, color:'#1E3A5F', marginBottom:10 }}>Frequently Asked Questions</h2>
          </div>
          {FAQS.map((faq, i) => (
            <div key={i} style={{ background:'#fff', border:'1px solid #E8EDF3', borderRadius:10, marginBottom:10, overflow:'hidden' }}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                style={{ width:'100%', textAlign:'left', padding:'16px 20px', background:'none', border:'none', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center', fontSize:14, fontWeight:600, color:'#1E3A5F', fontFamily:'inherit' }}>
                {faq.q}
                {openFaq === i ? <ChevronUp size={16} color="#0D9488"/> : <ChevronDown size={16} color="#94A3B8"/>}
              </button>
              {openFaq === i && (
                <div style={{ padding:'0 20px 16px', fontSize:13.5, color:'#475569', lineHeight:1.7 }}>{faq.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ────────────────────────────────── */}
      <section style={{ background:'linear-gradient(145deg,#0F4C45,#0F766E,#0D9488)', padding:'80px 5%', textAlign:'center' }}>
        <div style={{ maxWidth:640, margin:'0 auto' }}>
          <div style={{ fontSize:36,marginBottom:12 }}>🎓</div>
          <h2 style={{ fontSize:36, fontWeight:900, color:'#fff', marginBottom:12, letterSpacing:'-0.5px' }}>
            Register Your School on IlmForge
          </h2>
          <p style={{ fontSize:15, color:'rgba(255,255,255,0.72)', marginBottom:10, lineHeight:1.65 }}>
            Join 1,200+ schools. Your login password is auto-generated &amp; sent to your email. Setup in 5 minutes.
          </p>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.5)', marginBottom:30 }}>
            ✅ Free forever plan &nbsp;·&nbsp; 📧 Credentials sent by email &nbsp;·&nbsp; 🔒 Secure &amp; reliable
          </p>
          <Link to="/register"
            style={{ background:'#D97706', color:'#fff', padding:'15px 36px', borderRadius:10, fontSize:16, fontWeight:800, textDecoration:'none', display:'inline-flex', alignItems:'center', gap:9, boxShadow:'0 4px 20px rgba(217,119,6,0.45)', transition:'all .14s' }}
            onMouseEnter={e=>{e.currentTarget.style.transform='translateY(-2px)';e.currentTarget.style.boxShadow='0 8px 28px rgba(217,119,6,0.5)';}}
            onMouseLeave={e=>{e.currentTarget.style.transform='';e.currentTarget.style.boxShadow='0 4px 20px rgba(217,119,6,0.45)';}}>
            Register Your School Free <ArrowRight size={18}/>
          </Link>
          <div style={{ marginTop:20, fontSize:12, color:'rgba(255,255,255,0.4)' }}>
            Already registered?{' '}
            
          </div>
        </div>
      </section>

      {/* ── Footer ─────────────────────────────── */}
      <footer style={{ background:'#0F4C45', padding:'48px 5% 24px' }}>
        <div style={{ maxWidth:1100, margin:'0 auto' }}>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:32, paddingBottom:32, borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:36,height:36,background:'linear-gradient(135deg,#0F766E,#D97706)',borderRadius:9,display:'flex',alignItems:'center',justifyContent:'center',fontSize:17 }}>🎓</div>
                <div>
                  <div style={{ fontSize:16,fontWeight:900,color:'#fff',lineHeight:1 }}>IlmForge</div>
                  <div style={{ fontSize:9.5,color:'#D97706',fontWeight:600 }}>Ilm Ko Asaan Banaye</div>
                </div>
              </div>
              <p style={{ fontSize:12.5, color:'#64748B', lineHeight:1.7, maxWidth:220 }}>Pakistan's #1 School ERP platform. Trusted by 1,200+ schools nationwide.</p>
              <div style={{ marginTop:16, display:'flex', flexDirection:'column', gap:7 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#94A3B8' }}><MapPin size={12}/> Islamabad, Pakistan</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#94A3B8' }}><Phone size={12}/>  +92 300 1234567</div>
                <div style={{ display:'flex', alignItems:'center', gap:8, fontSize:12, color:'#94A3B8' }}><Mail size={12}/>   info@eduforgepr.com</div>
              </div>
            </div>
            {[
              { title:'PRODUCT',   links:['Features','Reports','Mobile App','Pricing','FAQ'] },
              { title:'COMPANY',   links:['About Us','Blog','Privacy Policy','Terms'] },
              { title:'SECURITY',  links:['256-bit SSL','AWS Hosted','99.9% Uptime','Daily Backups'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize:10.5, fontWeight:700, letterSpacing:1.2, color:'#475569', textTransform:'uppercase', marginBottom:14 }}>{col.title}</div>
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {col.links.map(l => (
                    <a key={l} href="#" style={{ fontSize:13, color:'#94A3B8', textDecoration:'none', transition:'color 0.12s' }}
                      onMouseEnter={e=>e.target.style.color='#5EEAD4'} onMouseLeave={e=>e.target.style.color='#94A3B8'}>
                      {l}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div style={{ paddingTop:20, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <span style={{ fontSize:12, color:'#475569' }}>© 2026 IlmForge · Ilm Ko Asaan Banaye · Made in Pakistan 🇵🇰</span>
            <div style={{ display:'flex', gap:16 }}>
              <a href="#" style={{ fontSize:12, color:'#475569', textDecoration:'none' }}>Privacy Policy</a>
              <a href="#" style={{ fontSize:12, color:'#475569', textDecoration:'none' }}>Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
