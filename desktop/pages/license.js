const d = window.ilmDesktop;
const $ = (id) => document.getElementById(id);

function show(kind, text) {
  const m = $('msg');
  m.className = `note ${kind}`;
  m.textContent = text;
  m.hidden = !text;
}

d.licenseCheck().then((r) => {
  $('machine').textContent = r.machine;
  // Opened because the licence stopped working: say why.
  if (r.reason && r.reason !== 'missing') { $('why').textContent = r.message; show('bad', r.message); }
});

$('copy').onclick = async () => {
  await d.copyText($('machine').textContent);
  $('copy').textContent = 'Copied';
  setTimeout(() => { $('copy').textContent = 'Copy'; }, 1600);
};

async function activate() {
  const text = $('lic').value.trim();
  if (!text) { show('bad', 'Paste the licence first, or open the licence file.'); return; }
  $('activate').disabled = true;
  const r = await d.licenseActivate(text);
  $('activate').disabled = false;
  if (r.valid) {
    const p = r.payload;
    show('good', `Activated for ${p.school}. Valid until ${p.expires} (${r.daysLeft} days).`);
    $('activate').disabled = true;
  } else {
    show('bad', r.message);
  }
}

$('activate').onclick = activate;
$('file').onclick = async () => {
  const text = await d.licenseFromFile();
  if (text) { $('lic').value = text; activate(); }
};
$('lic').addEventListener('paste', () => setTimeout(activate, 50));
$('quit').onclick = () => d.quit();
