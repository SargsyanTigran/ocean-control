// Settings: units, map rendering, 3D viewer, telemetry, data
import { state, on, setSetting, resetSettings, persist, emit } from '../store.js';
import { icon } from '../icons.js';
import { $, $$, html, toast } from '../util.js';

const seg = (key, opts) => `<div class="seg" data-seg="${key}">${opts.map(([v, l]) => `<button data-v="${v}">${l}</button>`).join('')}</div>`;
const tog = (key) => `<button class="toggle" data-tog="${key}" aria-label="${key}"></button>`;
const row = (t, d, ctrl) => `<div class="set-row"><div class="txt"><div class="t">${t}</div><div class="d">${d}</div></div>${ctrl}</div>`;

export function mountSettings(root) {
  root.append(html(`
    <div class="page">
      <div class="page-head">
        <h2>Settings</h2>
        <span class="sub">Preferences are saved automatically</span>
        <div class="right"><button class="btn" id="set-reset">${icon('reset', 18)} Restore defaults</button></div>
      </div>
      <div class="settings-grid">
        <div class="panel">
          <div class="panel-head">${icon('depth', 20)}<h3>Units & display</h3></div>
          <div class="panel-body">
            ${row('Measurement units', 'Depth, pressure and temperature', seg('units', [['metric', 'Metric'], ['imperial', 'Imperial']]))}
            ${row('Glow intensity', 'Illuminated lines and markers', `<div class="range"><input type="range" min="0" max="1" step="0.05" data-range="glow"/><output data-out="glow"></output></div>`)}
            ${row('Glass blur', 'Frosted panels · auto turns off without a GPU', seg('glassBlur', [['auto', 'Auto'], ['on', 'On'], ['off', 'Off']]))}
            ${row('Marine particles', 'Drifting particles on map and 3D views', tog('particles'))}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">${icon('map', 20)}<h3>Ocean map</h3></div>
          <div class="panel-body">
            ${row('Depth line interval', 'Spacing between contour lines', seg('contourInterval', [[250, '250 m'], [500, '500 m'], [1000, '1000 m']]))}
            ${row('Coordinate grid', 'Latitude and longitude overlay', tog('showGrid'))}
            ${row('Submarine tracks', 'Routes and movement trails', tog('showTracks'))}
            ${row('Animate map', 'Moving vehicles and pulsing markers', tog('animateMap'))}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">${icon('rotate', 20)}<h3>3D viewer</h3></div>
          <div class="panel-body">
            ${row('Auto-rotate', 'Slowly orbit selected objects', tog('autoRotate'))}
            ${row('Discoveries on map', 'Show creature and site markers', tog('showCreatures'))}
            ${row('Stations on map', 'Show station markers and range rings', tog('showStations'))}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">${icon('signal', 20)}<h3>Telemetry & data</h3></div>
          <div class="panel-body">
            ${row('Refresh rate', 'Simulated sensor interval', seg('telemetryRate', [[500, '500 ms'], [1000, '1 s'], [2000, '2 s']]))}
            ${row('Saved items', 'Remove every bookmarked item', `<button class="btn danger" id="set-clear">${icon('trash', 18)} Clear saved</button>`)}
            ${row('Data source', 'Lorem ipsum dolor sit amet', '<span class="chip live">Simulated</span>')}
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">${icon('info', 20)}<h3>About</h3><span class="aside">v1.0.0</span></div>
          <div class="panel-body keys-list">
            <div class="kv"><span>Application</span><span>Ocean Control</span></div>
            <div class="kv"><span>Runtime</span><span id="about-rt">Browser preview</span></div>
            <div class="kv"><span>Storage</span><span>${window.oceanAPI ? 'User data · JSON' : 'Local storage'}</span></div>
            <div class="kv"><span>Expedition</span><span>${'EXP-0427'}</span></div>
          </div>
        </div>

        <div class="panel">
          <div class="panel-head">${icon('target', 20)}<h3>Controls</h3></div>
          <div class="panel-body keys-list">
            <div class="kv"><span>Pan map</span><span class="kbd">Drag</span></div>
            <div class="kv"><span>Zoom map</span><span class="kbd">Scroll</span></div>
            <div class="kv"><span>Select object</span><span class="kbd">Click</span></div>
            <div class="kv"><span>Rotate 3D object</span><span class="kbd">Drag</span></div>
            <div class="kv"><span>Close inspector</span><span class="kbd">Esc</span></div>
          </div>
        </div>
      </div>
    </div>`));

  function sync() {
    const s = state.settings;
    $$('[data-seg]', root).forEach((g) => $$('button', g).forEach((b) => b.classList.toggle('on', String(s[g.dataset.seg]) === b.dataset.v)));
    $$('[data-tog]', root).forEach((t) => t.classList.toggle('on', !!s[t.dataset.tog]));
    $$('[data-range]', root).forEach((r) => { r.value = s[r.dataset.range]; $(`[data-out="${r.dataset.range}"]`, root).textContent = `${Math.round(s[r.dataset.range] * 100)}%`; });
  }

  $$('[data-seg]', root).forEach((g) => $$('button', g).forEach((b) => (b.onclick = () => {
    const cur = state.settings[g.dataset.seg];
    setSetting(g.dataset.seg, typeof cur === 'number' ? Number(b.dataset.v) : b.dataset.v);
  })));
  $$('[data-tog]', root).forEach((t) => (t.onclick = () => setSetting(t.dataset.tog, !state.settings[t.dataset.tog])));
  $$('[data-range]', root).forEach((r) => r.addEventListener('input', () => setSetting(r.dataset.range, Number(r.value))));
  $('#set-reset', root).onclick = () => { resetSettings(); toast('Defaults restored'); };
  $('#set-clear', root).onclick = () => { state.saved = []; persist(); emit('saved', state.saved); toast('Saved items cleared'); };

  on('settings', sync);
  sync();
  const v = window.oceanAPI && window.oceanAPI.versions;
  if (v) $('#about-rt', root).textContent = `Electron ${v.electron} · Chrome ${v.chrome.split('.')[0]}`;
}
