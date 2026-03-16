export const VIEW_KEY = 'view';
export const VIEW_TS  = 'view_ts';
const MAX_AGE = 1000 * 60 * 60 * 24; // 24h

export function setView(view: 'desktop'|'mobile') {
  localStorage.setItem(VIEW_KEY, view);
  localStorage.setItem(VIEW_TS, String(Date.now()));
}

export function getView(): 'desktop'|'mobile'|null {
  const view = localStorage.getItem(VIEW_KEY);
  const ts = Number(localStorage.getItem(VIEW_TS) || 0);
  if (!view || !ts) return null;
  if (Date.now() - ts > MAX_AGE) {
    localStorage.removeItem(VIEW_KEY);
    localStorage.removeItem(VIEW_TS);
    return null;
  }
  return (view === 'desktop' || view === 'mobile') ? view : null;
}
