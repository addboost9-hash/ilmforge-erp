/**
 * Saves that wait for the internet.
 *
 * School internet in Pakistan drops most often in the morning, which is when
 * registers are marked. Attendance saves are safe to send late and to send
 * twice (the server upserts one row per student per day and never re-texts a
 * parent it already told), so when there is no connection the save is kept on
 * this device and sent automatically once the connection is back.
 *
 * Only saves that are safe to repeat use this. Fee payments do not: a
 * payment must be confirmed by the server before a receipt exists.
 *
 * Items are tagged with the user who made them and only sent with that
 * user's sign-in, so a shared office computer never sends one teacher's
 * register under another's name.
 */
import api from '../api/client';
import { isDesktop, localServer } from './desktop';

const KEY = 'ilm.offline.queue';
const EVENT = 'ilm-offline-queue';

const currentUserId = () => {
  try { return JSON.parse(localStorage.getItem('user') || 'null')?.id ?? null; } catch { return null; }
};

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(items) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* storage full or blocked */ }
  window.dispatchEvent(new CustomEvent(EVENT));
}

/** No answer from the server at all: offline, weak signal, or the server unreachable. */
export const isNetworkError = (err) => !!err && !err.response && err.code !== 'ERR_CANCELED';

/** This user's saves still waiting to be sent. */
export function pending() {
  const uid = currentUserId();
  return read().filter((i) => i.userId === uid);
}

export function onQueueChange(fn) {
  const handler = () => fn(pending());
  window.addEventListener(EVENT, handler);
  window.addEventListener('storage', handler);
  return () => { window.removeEventListener(EVENT, handler); window.removeEventListener('storage', handler); };
}

function enqueue({ url, body, label }) {
  const items = read();
  // A register saved twice while offline: keep only the latest version.
  const dedupeKey = `${url}|${body?.date || ''}|${body?.classId || ''}|${body?.sectionId || ''}`;
  const kept = items.filter((i) => !(i.userId === currentUserId() && i.dedupeKey === dedupeKey));
  kept.push({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    userId: currentUserId(),
    url, body, label, dedupeKey,
    savedAt: new Date().toISOString(),
  });
  write(kept);
}

const QUEUED_MESSAGE = localServer
  ? 'The school\'s IlmForge computer could not be reached: saved on this device. It will be sent automatically when the connection is back.'
  : 'No internet: saved on this device. It will be sent automatically when you are back online.';

/**
 * POST now if possible; if there is no connection, keep it and send later.
 * Resolves like an axios response either way; a queued one has
 * `queued: true` and `data.message` explaining what happened.
 */
export async function postOrQueue(url, body, { label } = {}) {
  // In the desktop app the server is on this same computer: having no
  // network says nothing about reaching it, so always try.
  if (!isDesktop && typeof navigator !== 'undefined' && navigator.onLine === false) {
    enqueue({ url, body, label });
    return { queued: true, data: { success: true, queued: true, message: QUEUED_MESSAGE } };
  }
  try {
    return await api.post(url, body, { silent: true });
  } catch (err) {
    if (isNetworkError(err)) {
      enqueue({ url, body, label });
      return { queued: true, data: { success: true, queued: true, message: QUEUED_MESSAGE } };
    }
    throw err;
  }
}

let flushing = null;

/**
 * Send this user's waiting saves, oldest first. Stops at the first network
 * failure (still offline). A save the server refuses (e.g. no longer allowed)
 * is taken out of the queue and reported, so it cannot block the rest.
 */
export function flush() {
  if (flushing) return flushing;
  flushing = (async () => {
    const result = { sent: 0, failed: [], remaining: 0 };
    const uid = currentUserId();
    if (uid == null) return result;
    for (const item of read().filter((i) => i.userId === uid)) {
      try {
        await api.post(item.url, item.body, { silent: true });
        write(read().filter((i) => i.id !== item.id));
        result.sent += 1;
      } catch (err) {
        if (isNetworkError(err)) break;
        write(read().filter((i) => i.id !== item.id));
        result.failed.push({ label: item.label, message: err.response?.data?.message || 'The server refused it.' });
      }
    }
    result.remaining = pending().length;
    return result;
  })().finally(() => { flushing = null; });
  return flushing;
}
