/** Academics Hub — classes, subjects, timetable, homework, LMS */
import { lazy, Suspense, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarDays, BookOpen, GraduationCap, BookMarked, Clock, ClipboardList, FileText, Calendar, LogOut, CalendarCheck, Star } from 'lucide-react';

const ClassesPage     = lazy(() => import('../settings/ClassesPage'));
const SubjectsPage    = lazy(() => import('../settings/SubjectsPage'));
const TimetablePage   = lazy(() => import('../timetable/TimetablePage'));
const HomeworkPage    = lazy(() => import('../homework/HomeworkPage'));
const StudyMaterials  = lazy(() => import('../academics/StudyMaterialsPage'));
const OnlineClasses   = lazy(() => import('../academics/OnlineClassesPage'));
const HolidayCalendar = lazy(() => import('../calendar/HolidayCalendarPage'));
const LeavePage       = lazy(() => import('../leaves/LeavePage'));
const PTMSchedulerPage = lazy(() => import('../academics/PTMSchedulerPage'));
const EventsPage      = lazy(() => import('../operations/EventsPage'));

const L = (C) => () => (
  <Suspense fallback={<div className="p-10 text-center text-slate-400 text-sm">Loading…</div>}>
    <C />
  </Suspense>
);

const TABS = [
  { id: 'classes',   label: 'Classes & Sections', hint: 'Structure setup',     icon: GraduationCap, render: L(ClassesPage) },
  { id: 'subjects',  label: 'Subjects',           hint: 'Class-wise subjects', icon: BookMarked,    render: L(SubjectsPage) },
  { id: 'timetable', label: 'Timetable',          hint: 'Period scheduling',   icon: Clock,         render: L(TimetablePage) },
  { id: 'homework',  label: 'Homework Diary',     hint: 'Daily assignments',   icon: ClipboardList, render: L(HomeworkPage) },
  { id: 'materials', label: 'Study Materials',    hint: 'LMS uploads',         icon: FileText,      render: L(StudyMaterials) },
  { id: 'online',    label: 'Online Classes',     hint: 'Meeting links',       icon: BookOpen,      render: L(OnlineClasses) },
  { id: 'calendar',  label: 'Holiday Calendar',   hint: 'Events + holidays',   icon: Calendar,      render: L(HolidayCalendar) },
  { id: 'leaves',    label: 'Leave Applications', hint: 'Approve/reject',      icon: LogOut,        render: L(LeavePage) },
  { id: 'ptm',       label: 'PTM Schedule',       hint: 'Parent-teacher meetings', icon: CalendarCheck, render: L(PTMSchedulerPage) },
  { id: 'events',    label: 'Events',             hint: 'School events',       icon: Star,          render: L(EventsPage) },
];

const ACCENT = '#0d9488';

export default function AcademicsHub() {
  const [params, setParams] = useSearchParams();
  const activeId = params.get('tab') || TABS[0].id;
  const active = TABS.find(t => t.id === activeId) || TABS[0];
  const go = (id) => setParams({ tab: id }, { replace: false });

  return (
    <div className="hub-shell">

      {/* Hub Header */}
      <div className="hub-header" style={{ borderLeft: `4px solid ${ACCENT}` }}>
        <div>
          <div className="hub-title">
            <GraduationCap size={20} style={{ color: ACCENT }} />
            Academics Hub
          </div>
          <div className="hub-subtitle">
            Classes, subjects, timetable, homework, LMS — academic setup ek jagah
          </div>
        </div>
        <div className="hub-actions">
          <button className="btn btn-primary" onClick={() => go('timetable')}>
            <CalendarDays size={14} /> Timetable
          </button>
          <button className="btn btn-outline" onClick={() => go('homework')}>
            <BookOpen size={14} /> Homework
          </button>
        </div>
      </div>

      {/* Tab Strip */}
      <div className="tab-strip">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={'tab-btn' + (activeId === tab.id ? ' active' : '')}
            onClick={() => go(tab.id)}
          >
            <tab.icon size={15} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Breadcrumb */}
      <div className="content-wrapper" style={{ paddingBottom: 0, paddingTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 12 }}>
          <span style={{ color: 'var(--text-secondary)' }}>Academics Hub</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span style={{ color: ACCENT }}>{active.label}</span>
          {active.hint && (
            <>
              <span style={{ color: 'var(--text-muted)' }}>›</span>
              <span>{active.hint}</span>
            </>
          )}
        </div>
      </div>

      {/* Active Tab Content */}
      <div className="content-wrapper" style={{ paddingTop: 0 }}>
        <div className="hub-content">
          {active.render()}
        </div>
      </div>

    </div>
  );
}
