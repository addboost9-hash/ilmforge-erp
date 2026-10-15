/**
 * IlmForge desktop.
 *
 * The desktop build (VITE_DESKTOP=1) is served by IlmForge running on the
 * school's own computer. It is opened two ways:
 *   - in the IlmForge app on that computer, which adds window.ilmDesktop
 *     (backups, licence, network): `desktop` below;
 *   - in a browser on another computer or phone on the school network:
 *     `localServer` is true but `desktop` is null.
 * Either way the internet does not matter; only reaching that computer does.
 */
export const desktop = typeof window !== 'undefined' && window.ilmDesktop?.isDesktop ? window.ilmDesktop : null;
export const isDesktop = !!desktop;
export const localServer = import.meta.env.VITE_DESKTOP === '1';

export const formatBytes = (n) => {
  if (!n && n !== 0) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
};
