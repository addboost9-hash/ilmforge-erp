/**
 * IlmForge — a school's own public page: ilmforge-erp.vercel.app/s/<slug>
 *
 * The one link a school can print on a banner or share in a WhatsApp group.
 * Everything on it is that school's: its name, logo and colours, and the
 * three things a family or staff member comes for (apply, fee slip, sign in).
 */
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, FileDown, LogIn, MapPin, Phone, Mail, ChevronRight, Users, GraduationCap, Briefcase } from 'lucide-react';
import { useSchoolSlug, usePublicSchool, rememberSchool } from '../../utils/schoolLinks';
import { PublicShell, SchoolNotFound, SchoolLoading } from './PublicShell';

export default function SchoolHomePage() {
  const { slug } = useSchoolSlug({ allowRemembered: false });
  const { data: school, isLoading, isError } = usePublicSchool(slug);

  useEffect(() => { if (school) rememberSchool(school); }, [school]);
  useEffect(() => { if (school?.name) document.title = school.name; }, [school?.name]);

  if (isLoading) return <SchoolLoading />;
  if (isError || !school) return <SchoolNotFound />;

  const primary = school.brand?.primary || '#1B2F6E';
  const secondary = school.brand?.secondary || '#0073b7';
  const base = `/s/${encodeURIComponent(school.slug)}`;
  const login = (role) => `/login?slug=${encodeURIComponent(school.slug)}${role ? `&role=${role}` : ''}`;

  const ACTIONS = [
    { to: `${base}/apply`, Icon: UserPlus, title: 'Apply for admission', text: 'Fill the online form. The school will contact you.', tone: secondary },
    { to: `${base}/fees`, Icon: FileDown, title: 'Download fee slip', text: "Enter the student's roll number to print the voucher.", tone: '#B45309' },
    { to: login(), Icon: LogIn, title: 'Sign in', text: 'Parents, students and staff portals.', tone: primary },
  ];
  const PORTALS = [
    { role: 'parent', Icon: Users, label: 'Parents', hint: 'Sign in with your phone number' },
    { role: 'student', Icon: GraduationCap, label: 'Students', hint: 'Sign in with your roll number' },
    { role: 'teacher', Icon: Briefcase, label: 'Teachers & staff', hint: 'Sign in with your email or phone' },
  ];

  return (
    <PublicShell school={school}>
      <section className="ps-hero" style={{ background: `linear-gradient(135deg, ${primary}, ${secondary})` }}>
        <div className="ps-hero-logo">
          {school.logoUrl ? <img src={school.logoUrl} alt="" /> : <span>{school.name.charAt(0)}</span>}
        </div>
        <h1>{school.name}</h1>
        {(school.city || school.address) && (
          <p className="ps-hero-sub"><MapPin size={14} /> {[school.address, school.city].filter(Boolean).join(', ')}</p>
        )}
      </section>

      <section className="ps-actions" aria-label="What would you like to do?">
        {ACTIONS.map(({ to, Icon, title, text, tone }) => (
          <Link key={title} to={to} className="ps-action" style={{ '--tone': tone }}>
            <span className="ps-action-icon"><Icon size={22} /></span>
            <span className="ps-action-body">
              <strong>{title}</strong>
              <span>{text}</span>
            </span>
            <ChevronRight size={18} className="ps-action-go" aria-hidden="true" />
          </Link>
        ))}
      </section>

      <section className="ps-card">
        <h2>Portals</h2>
        <div className="ps-portals">
          {PORTALS.map(({ role, Icon, label, hint }) => (
            <Link key={role} to={login(role)} className="ps-portal">
              <Icon size={18} style={{ color: primary }} />
              <span><strong>{label}</strong><small>{hint}</small></span>
            </Link>
          ))}
        </div>
      </section>

      {(school.phone || school.email) && (
        <section className="ps-card">
          <h2>Contact the school</h2>
          <div className="ps-contact">
            {school.phone && <span><Phone size={15} /> <span className="ps-select">{school.phone}</span></span>}
            {school.email && <span><Mail size={15} /> <span className="ps-select">{school.email}</span></span>}
          </div>
        </section>
      )}
    </PublicShell>
  );
}
