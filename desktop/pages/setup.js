const d = window.ilmDesktop;
const $ = (id) => document.getElementById(id);
const PANELS = ['new', 'import', 'restore'];

function pick(which) {
  document.querySelectorAll('.choice').forEach((c) => c.classList.toggle('on', c.dataset.pick === which));
  PANELS.forEach((p) => { $(p).hidden = p !== which; });
  if (which === 'new') $('schoolName').focus();
}
document.querySelectorAll('.choice').forEach((c) => { c.onclick = () => pick(c.dataset.pick); });

function msg(panel, kind, text) {
  const m = $(panel).querySelector('[data-msg]');
  m.className = `note ${kind}`;
  m.textContent = text;
  m.hidden = !text;
}

function working(text) {
  $('busyText').textContent = text;
  $('busy').hidden = false;
  $('choices').hidden = true;
  PANELS.forEach((p) => { $(p).hidden = true; });
}
function back(panel) {
  $('busy').hidden = true;
  $('choices').hidden = false;
  pick(panel);
}
function finished(title, text, counts) {
  $('busy').hidden = true;
  $('choices').hidden = true;
  PANELS.forEach((p) => { $(p).hidden = true; });
  $('done').hidden = false;
  $('doneTitle').textContent = title;
  $('doneText').textContent = text;
  if (counts) {
    // What a school recognises first; then the largest of the rest.
    const FIRST = ['Student', 'Staff', 'Parent', 'Class', 'Section', 'Subject', 'FeeInvoice', 'FeePayment', 'Attendance', 'StaffAttendance', 'ExamMark', 'Exam'];
    const HIDE = /Log$|Audit|Notification|Token|Otp|Session|Link$|^ParentStudent$|^User$|Setting|Counter|Sequence/;
    const human = (n) => {
      const words = n.replace(/([a-z])([A-Z])/g, '$1 $2');
      if (/(Staff|Attendance)$/.test(n)) return words;
      return /[^aeiou]y$/.test(words) ? `${words.slice(0, -1)}ies` : /(s|x|ch|sh)$/.test(words) ? `${words}es` : `${words}s`;
    };
    const rank = (name) => (FIRST.includes(name) ? FIRST.indexOf(name) : 100);
    const top = Object.entries(counts)
      .filter(([name, n]) => n > 0 && !HIDE.test(name))
      .sort((a, b) => rank(a[0]) - rank(b[0]) || b[1] - a[1])
      .slice(0, 9);
    $('counts').replaceChildren(...top.map(([name, n]) => {
      const div = document.createElement('div');
      const b = document.createElement('b');
      b.textContent = n.toLocaleString();
      div.append(b, human(name));
      return div;
    }));
    $('counts').hidden = !top.length;
  }
  document.querySelectorAll('.steps li')[1].className = 'done';
  document.querySelectorAll('.steps li')[1].querySelector('b').textContent = '✓';
  document.querySelectorAll('.steps li')[2].className = 'on';
  $('open').focus();
}

/* New school */
$('new').addEventListener('submit', async (e) => {
  e.preventDefault();
  const v = (id) => $(id).value.trim();
  const form = { schoolName: v('schoolName'), name: v('name'), phone: v('phone'), email: v('email'), password: $('password').value };
  const errors = {};
  if (form.schoolName.length < 3) errors.schoolName = 'Enter the school\'s full name.';
  if (form.name.length < 2) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email)) errors.email = 'Enter an email address (it is your sign-in).';
  if (form.password.length < 8) errors.password = 'Use at least 8 characters.';
  else if (form.password !== $('confirm').value) errors.confirm = 'The two passwords are different.';
  showErrors(errors);
  if (Object.keys(errors).length) return;
  working('Creating the school…');
  const r = await d.setupCreate(form);
  if (!r.ok) { back('new'); showErrors(r.errors || {}); msg('new', 'bad', r.message); return; }
  finished(`${r.school.name} is ready`, `Sign in with ${r.email} and the password you chose. Start with Settings → School Profile, then add classes and students.`);
});
function showErrors(errors) {
  document.querySelectorAll('#new .field').forEach((f) => {
    const text = errors[f.dataset.f] || '';
    f.classList.toggle('bad', !!text);
    f.querySelector('.err').textContent = text;
  });
  const first = document.querySelector('#new .field.bad input');
  if (first) first.focus();
}

/* From online */
$('import').querySelector('[data-go]').onclick = async () => {
  msg('import', '', '');
  const r = await d.setupImport();
  if (!r) { back('import'); return; }
  if (!r.ok) { back('import'); msg('import', 'bad', r.message); return; }
  finished(`${r.school.name} is on this computer`, `${r.total.toLocaleString()} records were brought in. Everyone signs in with the same email and password as online.`, r.counts);
};

/* Restore */
$('restore').querySelector('[data-go]').onclick = async () => {
  msg('restore', '', '');
  const r = await d.setupRestore();
  if (!r) { back('restore'); return; }
  if (!r.ok) { back('restore'); msg('restore', 'bad', r.message); return; }
  finished(`${r.school.name} is on this computer`, 'The backup was put back. Everyone signs in with the passwords they had when the backup was made.');
};

// Once a file is chosen, the app reports what it is doing.
d.onStatus((text) => working(text));

$('open').onclick = () => d.setupDone();
