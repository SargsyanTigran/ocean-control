// Shared app state, persistence (Electron IPC → JSON file, localStorage fallback) and a tiny event bus.

const DEFAULT_SETTINGS = {
  units: 'metric',          // 'metric' | 'imperial'
  contourInterval: 500,     // metres between depth lines
  showGrid: true,
  showTracks: true,
  showCreatures: true,
  showStations: true,
  animateMap: true,
  glow: 0.7,                // 0..1
  autoRotate: true,
  telemetryRate: 1000,      // ms
  particles: true,
  glassBlur: 'auto'         // 'auto' | 'on' | 'off' (auto = off on software rendering)
};

const listeners = new Map();

export const state = {
  view: 'map',
  selectedId: null,
  saved: [],                // [{ id, savedAt, note }]
  settings: { ...DEFAULT_SETTINGS }
};

export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, new Set());
  listeners.get(evt).add(fn);
  return () => listeners.get(evt).delete(fn);
}
export function emit(evt, payload) {
  (listeners.get(evt) || []).forEach((fn) => fn(payload));
}

const api = window.oceanAPI;

export async function loadStore() {
  let data = {};
  try {
    data = api ? await api.store.get() : JSON.parse(localStorage.getItem('ocean-control') || '{}');
  } catch { data = {}; }
  state.saved = Array.isArray(data.saved) ? data.saved : [
    { id: 'cr-angler', savedAt: '2025-03-23T09:14:00Z', note: 'Lorem ipsum dolor sit amet, consectetur.' },
    { id: 'cr-lumen', savedAt: '2025-03-12T11:02:00Z', note: 'Ut enim ad minim veniam, quis nostrud.' },
    { id: 'cr-vent', savedAt: '2025-03-19T06:25:00Z', note: '' },
    { id: 'st-aurora', savedAt: '2025-03-18T17:40:00Z', note: 'Sed do eiusmod tempor incididunt.' }
  ];
  state.settings = { ...DEFAULT_SETTINGS, ...(data.settings || {}) };
}

let saveTimer;
export function persist() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const data = { saved: state.saved, settings: state.settings };
    if (api) api.store.set(data);
    else localStorage.setItem('ocean-control', JSON.stringify(data));
  }, 150);
}

export const isSaved = (id) => state.saved.some((s) => s.id === id);

export function toggleSaved(id) {
  if (isSaved(id)) state.saved = state.saved.filter((s) => s.id !== id);
  else state.saved = [{ id, savedAt: new Date().toISOString(), note: '' }, ...state.saved];
  persist();
  emit('saved', state.saved);
  return isSaved(id);
}

export function setNote(id, note) {
  const s = state.saved.find((x) => x.id === id);
  if (s) { s.note = note; persist(); }
}

export function setSetting(key, value) {
  state.settings[key] = value;
  persist();
  emit('settings', { key, value, settings: state.settings });
}

export function resetSettings() {
  state.settings = { ...DEFAULT_SETTINGS };
  persist();
  emit('settings', { key: '*', settings: state.settings });
}

export function select(id) {
  state.selectedId = id;
  emit('select', id);
}

// ---- unit helpers ----
export const fmt = {
  depth(m) {
    return state.settings.units === 'imperial'
      ? { v: Math.round(m * 3.28084).toLocaleString('en-US'), u: 'ft' }
      : { v: Math.round(m).toLocaleString('en-US'), u: 'm' };
  },
  temp(c) {
    return state.settings.units === 'imperial'
      ? { v: (c * 9 / 5 + 32).toFixed(1), u: '°F' }
      : { v: c.toFixed(1), u: '°C' };
  },
  pressure(bar) {
    return state.settings.units === 'imperial'
      ? { v: Math.round(bar * 14.5038).toLocaleString('en-US'), u: 'psi' }
      : { v: Math.round(bar).toLocaleString('en-US'), u: 'bar' };
  },
  pct: (x) => `${Math.round(x * 100)}%`
};
