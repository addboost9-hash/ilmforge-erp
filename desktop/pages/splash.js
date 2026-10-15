const d = window.ilmDesktop;
d.onStatus((t) => { document.getElementById('status').textContent = t; });
d.info().then((i) => { document.getElementById('ver').textContent = `Version ${i.version} · works without internet`; }).catch(() => {});
