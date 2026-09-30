/**
 * IlmForge — printing helpers.
 *
 * Two ways to print, and picking the right one matters:
 *
 *   printSection(el)   prints one region of the current page and nothing
 *                      else. Use it when the document is already rendered
 *                      on screen (a report table, a mark sheet).
 *
 *   printHTML(html)    prints a standalone document that was built as an
 *                      HTML string. Use it for vouchers, ID cards, forms —
 *                      anything laid out for paper rather than the screen.
 *
 * Both restore the page afterwards, including when the user cancels the
 * print dialog.
 */

/* Opening a window must happen in the same tick as the click, or the
   browser treats it as an unsolicited popup and blocks it. Anything that
   needs awaiting has to be done BEFORE calling this. If the window is
   blocked anyway we fall back to a hidden iframe, which needs no
   permission and prints just as well. */
export function printHTML(html, { title = 'Print', onFallback } = {}) {
  const w = window.open('', '_blank', 'width=1000,height=800');

  if (w && w.document) {
    w.document.open();
    w.document.write(html);
    w.document.close();
    // Let images and fonts settle, otherwise the dialog can open over a
    // half-laid-out page.
    const go = () => { try { w.focus(); w.print(); } catch { /* user closed it */ } };
    if (w.document.readyState === 'complete') setTimeout(go, 250);
    else w.addEventListener('load', () => setTimeout(go, 250), { once: true });
    return true;
  }

  // Popup blocked — print from an iframe instead.
  if (typeof onFallback === 'function') onFallback();
  const frame = document.createElement('iframe');
  frame.setAttribute('title', title);
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;';
  document.body.appendChild(frame);

  const remove = () => { if (frame.parentNode) frame.parentNode.removeChild(frame); };
  frame.onload = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } catch { /* nothing more we can do */ }
    // Safari fires afterprint unreliably, so fall back to a timer.
    const win = frame.contentWindow;
    if (win) win.addEventListener('afterprint', () => setTimeout(remove, 100), { once: true });
    setTimeout(remove, 60000);
  };

  const doc = frame.contentWindow?.document;
  if (!doc) { remove(); return false; }
  doc.open();
  doc.write(html);
  doc.close();
  return true;
}

/* Print one region of the page. Everything else is hidden for the
   duration; see the print-isolate rules in index.css. */
export function printSection(target, { title } = {}) {
  const el = target?.current || target;
  if (!el || !el.setAttribute) {
    // Nothing to isolate — better to print the page than to do nothing.
    window.print();
    return false;
  }

  const prevTitle = document.title;
  // The document title becomes the default filename when printing to PDF,
  // so a meaningful one saves the user renaming the file.
  if (title) document.title = title;

  el.setAttribute('data-print-root', '');
  document.body.classList.add('print-isolate');

  let done = false;
  const cleanup = () => {
    if (done) return;
    done = true;
    el.removeAttribute('data-print-root');
    document.body.classList.remove('print-isolate');
    if (title) document.title = prevTitle;
  };

  window.addEventListener('afterprint', cleanup, { once: true });
  // afterprint does not fire everywhere (older Safari, some mobile), so
  // make sure the page cannot be left in the isolated state.
  setTimeout(cleanup, 1500);

  try {
    window.print();
  } finally {
    // If print() threw or returned instantly, do not wait on afterprint.
    setTimeout(cleanup, 0);
  }
  return true;
}

/* A small chrome for standalone documents: page size, margins and a
   typeface that does not depend on the app's stylesheet being loaded. */
export function printDocumentShell({ title = 'Document', body = '', size = 'A4', margin = '12mm' }) {
  return `<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>${title}</title>
<style>
  @page { size: ${size}; margin: ${margin}; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1f2430;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  table { width: 100%; border-collapse: collapse; }
  thead { display: table-header-group; }
  tr, img { break-inside: avoid; }
  @media print { .no-print { display: none !important; } }
</style>
</head>
<body>${body}</body>
</html>`;
}
