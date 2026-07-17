/**
 * SOPs & Manuals — Academic + Administrative with pre-seeded content
 * 2 tabs: Academic Manuals | Administrative Manual
 * Each tab: table with View (teal) + Tutorial (blue) buttons
 * View → modal with professional document viewer
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../api/client';
import {
  BookOpenCheck, X, Download, Play, FileText,
} from 'lucide-react';

/* ─── Pre-seeded Academic Manuals ──────────────────────────────── */
const ACADEMIC_MANUALS = [
  {
    id: 'sop-ac-1',
    title: 'Orientation Day: Activities and Student Integration',
    category: 'Academic',
    content: `PURPOSE
This SOP outlines the structured process for organizing Orientation Day to ensure smooth student integration into the school environment.

SCOPE
Applicable to all new students joining at the start of each academic session.

PROCEDURE
1. Pre-Orientation Planning
   - Form an Orientation Committee (Principal, Vice-Principal, Class Teachers, Prefects)
   - Prepare welcome kits (timetable, school rules, map of premises, stationery list)
   - Arrange assembly hall / main hall with seating for students and parents
   - Brief all teachers and prefects on their roles

2. Day-of-Event Schedule
   - 7:30 AM — Arrival & Registration of new students at Main Gate
   - 8:00 AM — Welcome address by the Principal
   - 8:30 AM — School tour led by senior prefects
   - 9:30 AM — Class-wise introduction sessions
   - 10:30 AM — Library, Labs, and Facilities walkthrough
   - 11:00 AM — Q&A session for students and parents
   - 11:30 AM — Distribution of handbooks, diaries, and timetables
   - 12:00 PM — Closing remarks and group photo

3. Student Integration Activities
   - Icebreaker activities in each class (name games, pair introductions)
   - Buddy system: assign each new student a senior student mentor for 2 weeks
   - Display classroom rules and school values on noticeboards

4. Follow-Up
   - Homeroom teachers to check in with new students daily for first week
   - Report any adjustment concerns to the Counselor

DOCUMENTATION
- Attendance register signed by all participants
- Orientation feedback forms collected from parents
- Photographs archived in school records`,
  },
  {
    id: 'sop-ac-2',
    title: 'First Day(s) Protocol',
    category: 'Academic',
    content: `PURPOSE
Establish a consistent and welcoming protocol for the first day(s) of each academic session.

SCOPE
All teachers, administrative staff, and students.

PROCEDURE
1. Preparation (Day Before)
   - Confirm classroom assignments and seating plans
   - Prepare attendance registers for all sections
   - Display timetables on class noticeboards
   - Ensure all classrooms are clean and properly arranged

2. First Day Morning
   - All staff to report 30 minutes before student arrival
   - Gate duty teachers stationed at main entrance to welcome students
   - Direct students to their respective classrooms

3. First Period Protocol
   - Class teacher introduces themselves and key class rules
   - Distribute school diary and explain its use
   - Review the academic calendar for the term
   - Collect emergency contact forms if not already submitted

4. Administrative Tasks
   - Verify enrollment lists against physical attendance
   - Issue lockers / seating assignments if applicable
   - Collect any outstanding fee clearance documents

5. Closing Assembly
   - Principal's address setting the tone for the academic year
   - Reiterate school values: Respect, Responsibility, Excellence
   - Announce any key dates for the upcoming month

DOCUMENTATION
- First-day attendance recorded and signed
- Any absent students flagged for follow-up call to parents`,
  },
  {
    id: 'sop-ac-3',
    title: 'Positive Classroom Management: Strategies, Procedures and Teacher Well Being',
    category: 'Academic',
    content: `PURPOSE
Provide teachers with evidence-based strategies for maintaining a productive, respectful, and positive classroom environment while also prioritizing teacher well-being.

CLASSROOM MANAGEMENT STRATEGIES

1. Establish Clear Expectations
   - Post classroom rules (3–5 rules, positively worded) visibly
   - Review rules with students at the start of each month
   - Apply rules consistently and fairly

2. Proactive Strategies
   - Greet students at the door; establish warm daily routines
   - Use proximity control rather than raising voice
   - Provide preferential seating for students needing extra attention
   - Give warnings and reminders before consequences

3. Engagement Techniques
   - Use varied instructional methods: direct instruction, group work, hands-on
   - Cold-calling with "think time" — avoid putting students on the spot
   - Chunk lessons into 15–20 minute segments with transitions
   - Incorporate student interests where possible

4. Behavior Reinforcement
   - Acknowledge and praise positive behavior publicly
   - Use individual/class reward systems (merit points, stars, certificates)
   - Avoid public humiliation; address misbehavior privately when possible
   - Document persistent behavioral issues and refer to Coordinator

5. Conflict De-escalation
   - Speak calmly and quietly; avoid power struggles
   - Allow a cool-down period before addressing the issue
   - Use restorative conversations instead of punitive measures

TEACHER WELL-BEING
- Teachers are encouraged to take their full lunch break away from the classroom
- Monthly Teacher Well-Being check-ins by the Principal/Vice-Principal
- Access to confidential counseling support if needed
- Report workload concerns to the Head of Department
- Peer observation and collaborative planning to reduce isolation

DOCUMENTATION
- Behavior incident log maintained by class teacher
- Monthly summary submitted to Vice-Principal`,
  },
  {
    id: 'sop-ac-4',
    title: 'Curriculum Development and Textbook Selection',
    category: 'Academic',
    content: `PURPOSE
Ensure a systematic, standards-aligned, and inclusive process for developing curriculum and selecting textbooks.

PROCEDURE

1. Annual Curriculum Review
   - Convene Curriculum Committee (HODs, Senior Teachers, Principal) at end of each year
   - Review student performance data, teacher feedback, and board examination results
   - Identify gaps and areas needing enrichment or revision

2. Curriculum Development Framework
   - Align all syllabi with Punjab Curriculum Authority / Federal Board requirements
   - Ensure vertical alignment (progression across grade levels) and horizontal alignment (across subjects at same grade)
   - Incorporate 21st-century skills: critical thinking, communication, collaboration, creativity

3. Textbook Selection Criteria
   - Content accuracy and currency
   - Alignment with national curriculum
   - Reading level appropriateness for the grade
   - Quality of exercises, visuals, and assessments
   - Cost and availability

4. Selection Process
   - HODs propose 2–3 options per subject with written justification
   - Review committee evaluates against criteria using standardized rubric
   - Parent representatives may be consulted for major changes
   - Final approval by Principal; significant changes require Board of Governors notification

5. Implementation
   - Approved textbook list circulated to parents/students before session start
   - Teacher training on new curriculum/textbook provided before first day
   - Supplementary resources list provided to teachers

6. Annual Evaluation
   - Teachers complete textbook evaluation form at end of year
   - Student performance data analyzed to inform next cycle

DOCUMENTATION
- Curriculum maps filed by HOD
- Textbook selection reports archived annually`,
  },
  {
    id: 'sop-ac-5',
    title: 'Timetable Design for Learning Balance and School Efficiency',
    category: 'Academic',
    content: `PURPOSE
Create balanced, pedagogically sound timetables that optimize learning time, reduce teacher fatigue, and ensure equitable distribution of subjects.

PRINCIPLES
- Core subjects (Math, English, Science, Urdu) scheduled during peak alert hours (first 3 periods)
- Arts, Physical Education, and electives scheduled in afternoon or post-break slots
- No teacher to have more than 5 consecutive teaching periods
- Double periods for subjects requiring extended time (lab work, art, sports)

PROCEDURE

1. Pre-Timetabling (Before Session Start)
   - Collect confirmed teacher roster and their subject-class assignments
   - Determine total periods per week per subject (as per curriculum)
   - Note any teacher constraints (part-time hours, medical needs)
   - Book specialized rooms (labs, computer room, library) in advance

2. Draft Timetable Creation
   - Use timetabling software or structured spreadsheet
   - Assign core subjects to morning slots first
   - Balance workload: maximum 6 periods/day per teacher
   - Ensure each class has a "break" from intensive subjects

3. Review and Finalization
   - HODs review subject coverage totals
   - Principal approves final timetable
   - Circulate to all teachers 5 days before session start
   - Post on school notice board and parent communication

4. Mid-Year Adjustments
   - Changes require written request to Vice-Principal
   - Approved changes updated in master timetable within 24 hours
   - Parent notification required if student's schedule changes significantly

DOCUMENTATION
- Master timetable signed by Principal
- Individual teacher timetables issued to each staff member
- Copy retained in admin office`,
  },
  {
    id: 'sop-ac-6',
    title: 'Effective Lesson Planning and Instructional Practices',
    category: 'Academic',
    content: `PURPOSE
Standardize lesson planning across the school to ensure high-quality, goal-driven instruction in every classroom.

LESSON PLAN COMPONENTS (Required for all teachers)

1. Learning Objectives
   - Stated in observable, measurable terms (e.g., "Students will be able to...")
   - Aligned to curriculum standards for that grade and subject

2. Materials and Resources
   - List all materials: textbook pages, worksheets, AV equipment, manipulatives
   - Digital resources referenced by URL or platform

3. Lesson Structure (Typical 45-minute class)
   - Hook / Introduction (5 min): Engage prior knowledge, pose a question
   - Instruction (15–20 min): Teach new concept with clear examples
   - Guided Practice (10 min): Teacher models, students follow
   - Independent / Group Practice (10 min): Students apply learning
   - Closure / Summary (5 min): Recap, exit ticket, preview next lesson

4. Differentiation
   - Note how the lesson will be adapted for advanced and struggling learners
   - Identify any EAL/D or special needs accommodations

5. Assessment
   - Formative: observation, questioning, whiteboard responses, exit slips
   - Summative: quizzes, assignments, projects (reference upcoming dates)

SUBMISSION REQUIREMENTS
- Lesson plans submitted to HOD by Thursday for following week
- HOD reviews and returns feedback within 24 hours
- Monthly spot-check by Principal; commendable plans shared with team

INSTRUCTIONAL BEST PRACTICES
- Use Bloom's Taxonomy to ensure higher-order thinking
- Pose at least 2 open-ended questions per lesson
- Actively circulate during practice; provide immediate feedback
- Avoid reading directly from textbook for entire lesson

DOCUMENTATION
- Lesson plans filed in teacher portfolio
- Annual portfolio review during appraisal`,
  },
  {
    id: 'sop-ac-7',
    title: 'Holistic Homework Policy, Implementation and Evaluation',
    category: 'Academic',
    content: `PURPOSE
Establish a fair, meaningful, and developmentally appropriate homework policy that reinforces learning without overburdening students.

HOMEWORK PHILOSOPHY
Homework should consolidate classroom learning, develop independent study habits, and encourage family engagement — not serve as punishment or excessive busywork.

HOMEWORK GUIDELINES BY GRADE

- Pre-Primary (Nursery–KG): No formal homework. Reading together with parent only.
- Classes 1–3: Maximum 20 minutes/night. Reading + one subject.
- Classes 4–6: Maximum 40 minutes/night. 2–3 subjects, no weekends.
- Classes 7–8: Maximum 60 minutes/night. Rotate subjects throughout the week.
- Classes 9–10: Maximum 90 minutes/night. Project-based and exam preparation acceptable.

TYPES OF HOMEWORK (Encouraged)
- Reading and comprehension
- Practice exercises (math, grammar)
- Review of class notes
- Short research projects
- Creative assignments

TEACHER RESPONSIBILITIES
- Assign homework in diary with clear instructions
- Ensure homework is related to current class topic
- Check and acknowledge homework within 2 school days
- Provide constructive written feedback, not just marks

EVALUATION
- Homework completion tracked in class register
- Persistent non-submission reported to parent via diary note or SMS
- Regular homework contributes to continuous assessment (10% weightage)

PARENT GUIDELINES
- Check diary daily and sign each night
- Provide a quiet space and regular homework time
- Contact class teacher if child consistently struggles

DOCUMENTATION
- Homework register maintained per class
- Quarterly review of homework quality by HOD`,
  },
  {
    id: 'sop-ac-8',
    title: 'Guidelines for Notebook & Diary Checking',
    category: 'Academic',
    content: `PURPOSE
Standardize the process of notebook and diary checking to ensure students maintain quality work and that communication with parents is consistent.

NOTEBOOK CHECKING STANDARDS

1. Frequency
   - Subject notebooks checked minimum once every 2 weeks
   - Class teacher spot-checks diaries weekly
   - HOD conducts notebook inspection once per term

2. What to Check
   - Date and heading on every page
   - Completeness of class notes and exercises
   - Neatness and legibility
   - Corrections made where work was returned
   - Homework completion

3. Marking System
   - Use school-standard stamps or initials
   - Color coding: Green = Excellent, Blue = Satisfactory, Red = Needs Improvement
   - Written comments for any grade below Satisfactory

4. Diary Checking Protocol
   - Class teacher checks diary every Monday
   - Verify parent signature from previous week
   - Note any messages from parents; respond in diary or phone same day
   - Flag any missing signatures to parents

5. Student Responsibilities
   - Date and title every new entry
   - Write homework assignments in diary daily
   - Obtain parent signature each evening
   - Present notebooks on checking day

6. Follow-Up Procedures
   - For consistently poor notebooks: parent meeting arranged
   - For lost diaries: issue replacement from school store; note in class register
   - Term-end notebook review contributes to student conduct assessment

DOCUMENTATION
- Notebook inspection record signed by HOD each term
- Diary check register maintained by class teacher`,
  },
  {
    id: 'sop-ac-9',
    title: 'Academic Assessment and Examination Framework',
    category: 'Academic',
    content: `PURPOSE
Define a comprehensive, fair, and transparent assessment and examination system that accurately measures student learning and guides teaching.

ASSESSMENT TYPES

1. Formative Assessment (Ongoing — 30% of total marks)
   - Class participation
   - Homework and notebook quality
   - Short quizzes and oral assessments
   - Group projects and presentations

2. Summative Assessment (Term-based — 70% of total marks)
   - Monthly tests (per subject)
   - Mid-term examinations
   - Final annual examinations

EXAMINATION SCHEDULE PROCESS
1. Principal and Vice-Principal finalize exam dates 3 weeks in advance
2. Date sheet shared with teachers, students, and parents
3. Examination committee (3–5 senior teachers) formed per examination
4. Seating plans prepared 2 days before exam
5. Invigilators assigned by Vice-Principal; no teacher invigilates their own class

PAPER SETTING STANDARDS
- HODs responsible for final paper quality
- Papers set in accordance with Board guidelines for that class
- Questions distributed across Bloom's levels (remembering to creating)
- Difficulty ratio: 30% easy, 50% moderate, 20% challenging

RESULT PROCESSING
- Papers marked within 5 school days
- Marks entered in software and verified by HOD
- Result cards printed and distributed to parents via student or parent meeting
- Any re-checking requests submitted within 3 days of result distribution

SPECIAL CIRCUMSTANCES
- Students absent from exam: medical certificate required for re-sit
- Suspected cheating: paper confiscated, matter referred to Principal, parent notified
- Students with learning difficulties: accommodations provided per IEP

DOCUMENTATION
- Examination papers archived for 3 years
- Mark sheets signed by all subject teachers and Principal
- Results report filed per academic year`,
  },
  {
    id: 'sop-ac-10',
    title: 'Roles and Responsibilities of School Stakeholders',
    category: 'Academic',
    content: `PURPOSE
Clearly define the roles, responsibilities, and accountability of each stakeholder in the school community.

PRINCIPAL
- Overall academic and administrative leadership
- Final decision-making authority on school policies
- Conducting teacher appraisals and staff development
- Managing school finances (in coordination with accountant)
- Representing school to Board of Governors and regulatory bodies
- Handling disciplinary cases escalated beyond VP level

VICE-PRINCIPAL
- Overseeing day-to-day academic operations
- Managing examination committee and assessment processes
- Teacher timetabling and cover arrangements
- First escalation point for discipline matters
- Coordinating parent-teacher communication

HEADS OF DEPARTMENT (HODs)
- Curriculum planning and quality of instruction in their subject/department
- Lesson plan review and classroom observation
- Department meetings: minimum monthly
- Supporting junior teachers through mentoring

CLASS TEACHERS
- Taking daily attendance and maintaining class register
- Daily diary and notebook checking coordination
- First point of contact for student and parent concerns
- Managing classroom environment and student welfare

SUBJECT TEACHERS
- Delivering high-quality, planned lessons
- Setting, marking, and returning assessments on time
- Maintaining subject records (marks register, lesson plans)
- Communication with class teacher about student concerns

PARENTS
- Ensuring regular attendance and punctuality
- Supporting homework completion
- Attending parent-teacher meetings and school events
- Communicating promptly with school regarding student concerns

STUDENTS
- Regular and punctual attendance
- Completing and submitting work on time
- Following school code of conduct
- Treating all community members with respect

DOCUMENTATION
- Role descriptions included in staff handbook
- Annual review by Principal to update responsibilities`,
  },
  {
    id: 'sop-ac-11',
    title: 'Staff Coordination Meetings: From Planning to Execution and Review',
    category: 'Academic',
    content: `PURPOSE
Establish a structured, productive meeting culture that drives school improvement through effective coordination and follow-through.

TYPES OF MEETINGS

1. Weekly Staff Briefing (Every Monday, 7:30–7:45 AM)
   - Quick updates, announcements, week's events
   - Standing items: attendance, upcoming duties, any urgent matters
   - Chaired by Principal or Vice-Principal

2. Monthly Department Meetings
   - Chaired by HOD
   - Agenda circulated 2 days before meeting
   - Items: curriculum progress, assessment review, student concerns, resource needs
   - Minutes documented and submitted to Vice-Principal within 24 hours

3. Quarterly Full Staff Meetings
   - Chaired by Principal
   - Review of school performance data, policy updates, professional development
   - Open floor for structured feedback from staff

4. Ad-hoc Meetings
   - Convened for urgent matters (e.g., incident review, parent complaint)
   - Minimum 1-hour notice unless emergency

MEETING PROTOCOL
- Agenda shared in advance (at least 24 hours for department and full staff meetings)
- Meetings start and end on time
- Mobile phones on silent; no unrelated conversations
- Decisions recorded with clear action items: Who? What? By When?
- Minutes distributed within 24 hours of meeting

FOLLOW-UP & ACCOUNTABILITY
- Action items tracked in running log maintained by Secretary/Coordinator
- Previous meeting minutes reviewed at start of next meeting
- Overdue action items flagged to Principal

DOCUMENTATION
- All meeting minutes signed by chairperson and secretary
- Filed in school administration folder
- Annual review of meeting effectiveness by leadership team`,
  },
  {
    id: 'sop-ac-12',
    title: 'Ethics and Guidelines for Effective Parent-Teacher Meetings',
    category: 'Academic',
    content: `PURPOSE
Ensure that parent-teacher meetings (PTMs) are productive, respectful, and result in meaningful outcomes for student growth.

SCHEDULING AND PREPARATION

1. Scheduling
   - PTMs held at end of each term (minimum 3 per year)
   - Dates shared at least 2 weeks in advance via SMS, diary notice, and school app
   - Slots of 10–15 minutes per parent booked in advance (walk-ins accommodated if time permits)
   - PTM schedule displayed at school gate and admin office

2. Teacher Preparation
   - Review each student's academic performance, attendance, behavior, and homework completion before meeting
   - Prepare specific examples and evidence (notebooks, test papers) to share
   - Note at least one positive point for every student
   - Have improvement strategies ready — not just problems

DURING THE MEETING

Code of Conduct for Teachers
- Greet parents warmly; maintain professional tone throughout
- Begin with a positive observation about the student
- Use "I" statements and specific examples, not generalizations
- Listen actively; do not interrupt or dismiss parent concerns
- Maintain confidentiality — do not discuss other students
- Avoid using jargon; communicate clearly
- If meeting becomes difficult, involve Vice-Principal or Principal
- Do not make commitments beyond your authority

Code of Conduct for Parents
- Attend meetings punctually; notify school if unable to attend
- Come prepared with questions or concerns
- Engage constructively; avoid confrontational language
- Respect other families' meeting times; do not overrun slots
- Focus on child's welfare, not comparisons with other students

ETHICAL GUIDELINES
- No meeting to take place without at least one school staff member present (for sensitive matters, two)
- Student data discussed in meetings is strictly confidential
- Notes may be taken with parent consent
- Any commitments made (by either party) to be recorded in writing

FOLLOW-UP
- Action items noted in meeting record signed by both parties
- Class teacher to check in with student within one week of PTM
- If parent is unable to attend: phone call within 3 days, brief written summary sent home

DOCUMENTATION
- PTM attendance register
- Meeting notes filed in student record (with parent consent)
- Anonymized summary report submitted to Principal`,
  },
];

/* ─── Shared styles ─────────────────────────────── */
const TEAL = '#0D9488';
const BLUE = '#1d4ed8';

const btn = (extra = {}) => ({
  border: 'none', borderRadius: 6, cursor: 'pointer',
  fontFamily: 'inherit', fontWeight: 600, fontSize: 12.5,
  padding: '6px 14px', display: 'inline-flex', alignItems: 'center', gap: 5,
  transition: 'all .15s',
  ...extra,
});

/* ─── View Manual Modal ─────────────────────────── */
function ViewManualModal({ sop, onClose }) {
  if (!sop) return null;

  const handleDownload = () => {
    // Create a simple text download for the document
    const content = `${sop.title}\n${'='.repeat(sop.title.length)}\n\n${sop.content}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sop.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        padding: '30px 16px', overflowY: 'auto',
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#fff', borderRadius: 14, width: '100%', maxWidth: 780,
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
          margin: 'auto',
        }}
      >
        {/* Modal toolbar */}
        <div style={{
          background: '#1B2F6E', padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <FileText size={18} color="#fff" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>SOP Document Viewer</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleDownload}
              style={{ ...btn({ background: TEAL, color: '#fff', padding: '6px 14px' }) }}
            >
              <Download size={13} /> Download PDF
            </button>
            <button
              onClick={onClose}
              style={{ ...btn({ background: 'rgba(255,255,255,0.15)', color: '#fff', padding: '6px 10px', borderRadius: '50%' }) }}
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Document body — PDF-style viewer */}
        <div style={{ padding: '0', background: '#e8e8e8' }}>
          {/* Document page */}
          <div style={{
            background: '#fff',
            margin: '20px auto',
            maxWidth: 680,
            minHeight: 900,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            position: 'relative',
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}>
            {/* Watermark */}
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none', zIndex: 1,
              opacity: 0.04,
              fontSize: 48, fontWeight: 900, color: '#1B2F6E',
              transform: 'rotate(-30deg)',
              userSelect: 'none',
              whiteSpace: 'nowrap',
            }}>
              Copyright IlmForge
            </div>

            {/* Header / Letterhead */}
            <div style={{
              background: 'linear-gradient(135deg, #1B2F6E 0%, #0D9488 100%)',
              padding: '28px 40px 20px',
              position: 'relative', zIndex: 2,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 10, flexShrink: 0,
                  background: 'rgba(255,255,255,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
                }}>
                  🎓
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 20, fontFamily: 'Poppins, Inter, sans-serif', letterSpacing: '-0.02em' }}>
                    IlmForge
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, fontFamily: 'Inter, sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase', marginTop: 2 }}>
                    School Management System — Standard Operating Procedure
                  </div>
                </div>
              </div>
            </div>

            {/* Document content */}
            <div style={{ padding: '32px 40px 40px', position: 'relative', zIndex: 2 }}>
              {/* Category badge */}
              <div style={{ marginBottom: 12 }}>
                <span style={{
                  background: '#f0fdf4', color: TEAL, fontFamily: 'Inter, sans-serif',
                  fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 99,
                  border: `1px solid ${TEAL}`,
                }}>
                  {sop.category || 'Academic'} Manual
                </span>
              </div>

              {/* Title */}
              <h1 style={{
                fontSize: 20, fontWeight: 700, color: '#1B2F6E',
                margin: '0 0 8px', lineHeight: 1.3,
                fontFamily: 'Poppins, Georgia, serif',
              }}>
                {sop.title}
              </h1>

              {/* Developed by */}
              <div style={{
                display: 'flex', gap: 20, marginBottom: 24, marginTop: 12,
                padding: '12px 16px', background: '#f8fafc', borderRadius: 6,
                borderLeft: `4px solid ${TEAL}`,
                fontFamily: 'Inter, sans-serif',
              }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Developed By</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginTop: 2 }}>IlmForge Academic Team</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Document Type</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginTop: 2 }}>Standard Operating Procedure</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Version</div>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: '#374151', marginTop: 2 }}>1.0 — 2025–2026</div>
                </div>
              </div>

              <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', marginBottom: 24 }} />

              {/* Content */}
              <div style={{
                fontSize: 13.5, lineHeight: 1.9, color: '#1e293b',
                whiteSpace: 'pre-line',
                fontFamily: 'Georgia, "Times New Roman", serif',
              }}>
                {sop.content}
              </div>

              {/* Footer */}
              <div style={{
                marginTop: 40, paddingTop: 16,
                borderTop: '1px solid #e2e8f0',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                fontFamily: 'Inter, sans-serif',
              }}>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  © IlmForge School Management System
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8' }}>
                  Academic Year 2025–2026
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Tutorial Modal ────────────────────────────── */
function TutorialModal({ sop, onClose }) {
  if (!sop) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(5px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
      }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 480, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}
      >
        <div style={{ background: BLUE, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Play size={16} color="#fff" />
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Tutorial</span>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <X size={14} />
          </button>
        </div>
        <div style={{ padding: '32px 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#111827', marginBottom: 8 }}>
            {sop.title}
          </div>
          <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 24 }}>
            Tutorial video for this manual is coming soon. Our team is working on creating comprehensive video walkthroughs for all SOPs.
          </div>
          <div style={{
            background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8,
            padding: '12px 16px', fontSize: 12, color: '#0369a1', marginBottom: 20,
          }}>
            In the meantime, you can view and download the full written SOP document using the "View Manual" button.
          </div>
          <button onClick={onClose} style={{ ...btn({ background: BLUE, color: '#fff', padding: '9px 20px', fontSize: 13 }) }}>
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── SOP Table ─────────────────────────────────── */
function SOPTable({ rows, onView, onTutorial }) {
  return (
    <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 8 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 12, width: 50 }}>S.No.</th>
            <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, color: '#374151', fontSize: 12 }}>Title</th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: 12, width: 130 }}>View</th>
            <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#374151', fontSize: 12, width: 130 }}>Tutorial</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} style={{ padding: '32px 16px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                No manuals available yet.
              </td>
            </tr>
          )}
          {rows.map((sop, i) => (
            <tr
              key={sop.id || sop._id}
              style={{
                background: i % 2 === 0 ? '#fff' : '#f9fafb',
                borderBottom: '1px solid #f1f5f9',
                transition: 'background .1s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#f9fafb'}
            >
              <td style={{ padding: '12px 14px', color: '#6b7280', fontWeight: 600 }}>{i + 1}</td>
              <td style={{ padding: '12px 14px', fontWeight: 600, color: '#111827', lineHeight: 1.5 }}>
                {sop.title}
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                <button
                  onClick={() => onView(sop)}
                  style={{
                    border: `1px solid ${TEAL}`, borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
                    padding: '5px 12px', background: 'transparent', color: TEAL,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = TEAL; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = TEAL; }}
                >
                  <FileText size={12} /> View Manual
                </button>
              </td>
              <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                <button
                  onClick={() => onTutorial(sop)}
                  style={{
                    border: `1px solid ${BLUE}`, borderRadius: 6, cursor: 'pointer',
                    fontFamily: 'inherit', fontWeight: 600, fontSize: 12,
                    padding: '5px 12px', background: 'transparent', color: BLUE,
                    display: 'inline-flex', alignItems: 'center', gap: 4,
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = BLUE; e.currentTarget.style.color = '#fff'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = BLUE; }}
                >
                  <Play size={12} /> Tutorial
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── MAIN COMPONENT ─────────────────────────────── */
export default function SOPsPage() {
  const [activeTab, setActiveTab] = useState('academic');
  const [viewSOP, setViewSOP] = useState(null);
  const [tutorialSOP, setTutorialSOP] = useState(null);

  // Load server SOPs (for administrative manual)
  const { data: serverSops = [] } = useQuery({
    queryKey: ['sops'],
    queryFn: () => api.get('/sops').then(r => r.data?.data || r.data || []),
  });

  const adminSops = serverSops.filter(s =>
    (s.category || '').toLowerCase().includes('admin') ||
    (s.category || '').toLowerCase().includes('administrative')
  );

  // Placeholder admin manuals if none from server
  const adminRows = adminSops.length > 0 ? adminSops : [
    {
      id: 'admin-placeholder',
      title: 'Administrative Manual — Coming Soon',
      category: 'Administrative',
      content: 'Administrative manuals are being developed. Please check back soon.',
    },
  ];

  const tabStyle = (id) => ({
    padding: '10px 24px', fontSize: 13.5, fontWeight: activeTab === id ? 700 : 600,
    cursor: 'pointer', border: 'none', fontFamily: 'inherit',
    background: activeTab === id ? TEAL : 'transparent',
    color: activeTab === id ? '#fff' : '#374151',
    borderBottom: activeTab === id ? `3px solid ${TEAL}` : '3px solid transparent',
    transition: 'all .15s',
    borderRadius: activeTab === id ? '6px 6px 0 0' : 0,
  });

  return (
    <div style={{ padding: '20px 24px', minHeight: '100vh', background: '#f0f4f8' }}>
      {/* Page header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 8, background: TEAL,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <BookOpenCheck size={20} color="#fff" />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>SOPs & School Manuals</h2>
          <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>
            Standard Operating Procedures — Academic & Administrative
          </div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{
            background: '#f0fdf4', color: TEAL, fontSize: 12, fontWeight: 700,
            padding: '4px 12px', borderRadius: 99, border: `1px solid ${TEAL}`,
          }}>
            {ACADEMIC_MANUALS.length} Academic SOPs
          </span>
          <span style={{
            background: '#eff6ff', color: BLUE, fontSize: 12, fontWeight: 700,
            padding: '4px 12px', borderRadius: 99, border: `1px solid ${BLUE}`,
          }}>
            {adminRows.length} Admin SOPs
          </span>
        </div>
      </div>

      {/* Tab container */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid #e2e8f0', background: '#fafafa' }}>
          <button style={tabStyle('academic')} onClick={() => setActiveTab('academic')}>
            Academic Manuals
          </button>
          <button style={tabStyle('admin')} onClick={() => setActiveTab('admin')}>
            Administrative Manual
          </button>
        </div>

        {/* Tab content */}
        <div style={{ padding: '24px 22px' }}>
          {activeTab === 'academic' && (
            <div>
              <div style={{ marginBottom: 16, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                The following Academic Manuals cover key operational procedures for classroom management, curriculum, assessments, and teacher-parent engagement. Click <strong>View Manual</strong> to read the full SOP.
              </div>
              <SOPTable
                rows={ACADEMIC_MANUALS}
                onView={setViewSOP}
                onTutorial={setTutorialSOP}
              />
            </div>
          )}

          {activeTab === 'admin' && (
            <div>
              <div style={{ marginBottom: 16, fontSize: 13, color: '#64748b', lineHeight: 1.6 }}>
                Administrative Manuals cover school operations, HR policies, financial procedures, and compliance. These are maintained and uploaded by school administration.
              </div>
              <SOPTable
                rows={adminRows}
                onView={setViewSOP}
                onTutorial={setTutorialSOP}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {viewSOP && <ViewManualModal sop={viewSOP} onClose={() => setViewSOP(null)} />}
      {tutorialSOP && <TutorialModal sop={tutorialSOP} onClose={() => setTutorialSOP(null)} />}
    </div>
  );
}
