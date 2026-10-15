const d = window.ilmDesktop;
const $ = (id) => document.getElementById(id);
const ROLE = { super_admin: 'Owner', admin: 'Admin', principal: 'Principal', accountant: 'Accountant' };

function show(kind, text) {
  $('msg').className = `note ${kind}`;
  $('msg').textContent = text;
  $('msg').hidden = !text;
}

d.adminsList().then((r) => {
  if (!r.ok) { show('bad', r.message); return; }
  $('user').replaceChildren(...r.users.map((u) => {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = `${u.name} (${ROLE[u.role] || u.role}) — ${u.email}`;
    return o;
  }));
});

$('form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const password = $('password').value;
  if (password.length < 8) { show('bad', 'Use at least 8 characters.'); return; }
  if (password !== $('confirm').value) { show('bad', 'The two passwords are different.'); return; }
  $('save').disabled = true;
  const r = await d.resetPassword(Number($('user').value), password);
  $('save').disabled = false;
  if (!r.ok) { show('bad', r.message); return; }
  $('password').value = '';
  $('confirm').value = '';
  show('good', `Done. ${r.name} can now sign in with ${r.email} and the new password.`);
});
$('close').onclick = () => window.close();
