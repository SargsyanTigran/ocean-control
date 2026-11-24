export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function html(str) {
  const t = document.createElement('template');
  t.innerHTML = str.trim();
  return t.content.firstElementChild;
}

let toastTimer;
export function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1800);
}

export function sparkPath(values, w, h, pad = 2) {
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  return values.map((v, i) => {
    const x = (i / (values.length - 1)) * w;
    const y = pad + ((v - min) / span) * (h - pad * 2);   // deeper = lower
    return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
}

export const typeLabel = (o) => ({ vehicle: 'Vehicle', station: 'Station', creature: 'Creature', site: 'Geological site' }[o.type] || o.type);
export const typeIcon = (o) => ({ vehicle: 'sub', station: 'station', creature: 'creature', site: 'site' }[o.type] || 'info');
