const d = window.ilmDesktop;
const $ = (id) => document.getElementById(id);
$('message').textContent = new URLSearchParams(location.search).get('message') || 'Something went wrong while starting.';
$('logs').onclick = () => d.openLogsFolder();
$('data').onclick = () => d.openDataFolder();
$('quit').onclick = () => d.quit();
