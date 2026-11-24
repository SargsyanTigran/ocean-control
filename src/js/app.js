// Ocean Control: renderer entry point
import { state, loadStore, on, emit } from './store.js';
import { startTelemetry } from './telemetry.js';
import { EXPEDITION } from './data.js';
import { icon } from './icons.js';
import { $, $$, html } from './util.js';
import { mountMap } from './views/map-view.js';
import { mountLibrary } from './views/library.js';
import { mountMission } from './views/mission.js';
import { mountSaved } from './views/saved.js';
import { mountSettings } from './views/settings.js';

const VIEWS = [
  { id: 'map', label: 'Expedition Map', icon: 'map' },
  { id: 'library', label: 'Discovery Library', icon: 'library' },
  { id: 'mission', label: 'Mission Details', icon: 'mission' },
  { id: 'saved', label: 'Saved Items', icon: 'saved' },
  { id: 'settings', label: 'Settings', icon: 'settings' }
];

function buildRail() {
  const rail = $('#rail');
  rail.append(html(`<div class="brand" title="Ocean Control">${icon('logo', 24)}</div>`));
  VIEWS.forEach((v) => {
    const b = html(`<button class="nav-btn" data-nav="${v.id}" aria-label="${v.label}">${icon(v.icon, 24)}<span class="tip">${v.label}</span></button>`);
    b.addEventListener('click', () => navigate(v.id));
    rail.append(b);
  });
  rail.append(html('<div class="spacer"></div>'));
  rail.append(html('<div class="status-dot" title="Link nominal"></div>'));
  updateBadge();
  on('saved', updateBadge);
}

function updateBadge() {
  const b = $('[data-nav="saved"]');
  let badge = b.querySelector('.badge');
  if (!badge) { badge = html('<span class="badge"></span>'); b.append(badge); }
  badge.textContent = state.saved.length;
  badge.style.display = state.saved.length ? '' : 'none';
}

function buildTopbar() {
  const bar = $('#topbar');
  bar.innerHTML = `
    <div class="title">
      <h1>Ocean Control</h1>
      <span class="crumb">/ <b id="crumb">Expedition Map</b></span>
    </div>
    <div class="meta">
      <span class="chip live">Live telemetry</span>
      <span class="chip">${icon('mission', 18)} <b>${EXPEDITION.code}</b></span>
      <span class="chip">Day <b>${EXPEDITION.day}</b> / ${EXPEDITION.totalDays}</span>
      <span class="chip">${icon('clock', 18)} <b id="clock">--:--:--</b> UTC</span>
      <span class="chip">${icon('signal', 18)} <b>98%</b></span>
    </div>
    <div class="win-ctrls">
      <button data-win="minimize" aria-label="Minimise">${icon('min', 16)}</button>
      <button data-win="maximize" aria-label="Maximise">${icon('max', 14)}</button>
      <button data-win="close" class="close" aria-label="Close">${icon('close', 16)}</button>
    </div>`;
  $$('[data-win]', bar).forEach((b) => b.addEventListener('click', () => {
    const api = window.oceanAPI;
    if (api) api.win[b.dataset.win]();
  }));
  const tick = () => { $('#clock').textContent = new Date().toISOString().slice(11, 19); };
  tick();
  setInterval(tick, 1000);
}

// Backdrop blur is costly without a GPU, so 'auto' disables it on software renderers.
const softwareGL = (() => {
  try {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const r = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : '';
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /swiftshader|llvmpipe|software/i.test(r);
  } catch { return true; }
})();
function applyGlass() {
  const g = state.settings.glassBlur;
  document.body.classList.toggle('no-blur', g === 'off' || (g === 'auto' && softwareGL));
}

export function navigate(id, payload) {
  state.view = id;
  $$('.nav-btn').forEach((b) => b.classList.toggle('active', b.dataset.nav === id));
  $$('.view').forEach((v) => v.classList.toggle('active', v.dataset.view === id));
  $('#crumb').textContent = VIEWS.find((v) => v.id === id).label;
  emit('navigate', { id, payload });
}

async function init() {
  await loadStore();
  try { await document.fonts.load('20px "Ostrich Sans"'); } catch {}
  buildRail();
  buildTopbar();
  startTelemetry();
  on('settings', ({ key }) => { if (key === 'telemetryRate' || key === '*') startTelemetry(); applyGlass(); });
  applyGlass();

  mountMap($('#view-map'), { navigate });
  mountLibrary($('#view-library'), { navigate });
  mountMission($('#view-mission'), { navigate });
  mountSaved($('#view-saved'), { navigate });
  mountSettings($('#view-settings'), { navigate });

  // allow deep-linking via hash, e.g. index.html#library
  const start = (location.hash || '#map').slice(1);
  navigate(VIEWS.some((v) => v.id === start) ? start : 'map');
}

init();
