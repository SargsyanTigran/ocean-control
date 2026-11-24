// Expedition Map view: map canvas + floating HUD panels + inspector + timeline
import { SUBMARINES, STAGES, EXPEDITION, findObject } from '../data.js';
import { telemetry } from '../telemetry.js';
import { state, on, select, fmt, toggleSaved, isSaved, setSetting } from '../store.js';
import { createMap, DEPTH_RAMP } from '../map.js';
import { Viewer } from '../viewer.js';
import { icon } from '../icons.js';
import { $, $$, html, toast, sparkPath, typeLabel } from '../util.js';

export function mountMap(root, { navigate }) {
  const hud = $('#map-hud', root);
  let tracked = SUBMARINES[0].id;   // sub shown in the telemetry stack

  // ------------------------------------------------------------ left: telemetry
  const left = html(`
    <div class="hud-left">
      <div class="panel tele-track">
        <span class="dot" id="tk-dot"></span>
        <span class="label" style="flex:1">Tracking</span>
        <span class="name" id="tk-name"></span>
      </div>

      <div class="panel tele-card">
        <div class="row">${icon('depth', 20)}<span class="label">Depth</span><span class="trend" id="t-depth-trend"></span></div>
        <div class="value"><span id="t-depth">0</span><span class="unit" id="t-depth-u">m</span></div>
        <svg class="spark" id="t-spark" viewBox="0 0 232 44" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sparkFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#5ce1ff" stop-opacity=".0"/>
              <stop offset="1" stop-color="#5ce1ff" stop-opacity=".28"/>
            </linearGradient>
          </defs>
          <path id="t-spark-fill" fill="url(#sparkFill)"/>
          <path id="t-spark-line" fill="none" stroke="#5ce1ff" stroke-width="1.4" style="filter:drop-shadow(0 0 4px #5ce1ff)"/>
        </svg>
        <div class="foot"><span>Last 48 readings</span><span id="t-depth-max"></span></div>
      </div>

      <div class="panel tele-card">
        <div class="row">${icon('pressure', 20)}<span class="label">Pressure</span></div>
        <div class="gauge-row">
          <svg width="74" height="74" viewBox="0 0 74 74">
            <circle cx="37" cy="37" r="30" fill="none" stroke="rgba(120,200,255,.14)" stroke-width="4" stroke-dasharray="141 200" transform="rotate(135 37 37)" stroke-linecap="round"/>
            <circle id="t-gauge" cx="37" cy="37" r="30" fill="none" stroke="#5ce1ff" stroke-width="4" stroke-dasharray="0 200" transform="rotate(135 37 37)" stroke-linecap="round" style="filter:drop-shadow(0 0 5px #5ce1ff)"/>
            <circle cx="37" cy="37" r="20" fill="none" stroke="rgba(120,200,255,.18)" stroke-dasharray="1 4"/>
          </svg>
          <div>
            <div class="value"><span id="t-press">0</span><span class="unit" id="t-press-u">bar</span></div>
            <div class="label" style="margin-top:6px" id="t-press-pct">Hull rating</div>
          </div>
        </div>
      </div>

      <div class="panel tele-card">
        <div class="row">${icon('temp', 20)}<span class="label">Water temperature</span></div>
        <div class="value"><span id="t-temp">0</span><span class="unit" id="t-temp-u">°C</span></div>
        <div class="thermo"><i id="t-thermo"></i></div>
        <div class="foot"><span id="t-tmin">0°</span><span>Thermocline</span><span id="t-tmax">12°</span></div>
      </div>
    </div>`);
  hud.append(left);

  // ------------------------------------------------------------ right: subs + progress
  const activeStage = STAGES.find((s) => s.status === 'active');
  const stageIdx = STAGES.indexOf(activeStage);
  const overall = (stageIdx + activeStage.progress) / STAGES.length;
  const done = EXPEDITION.objectives.filter((o) => o.done).length;
  const R = 44, CIRC = 2 * Math.PI * R;

  const right = html(`
    <div class="hud-right">
      <div class="panel">
        <div class="panel-head">${icon('sub', 20)}<h3>Submarine status</h3><span class="aside">${SUBMARINES.length} active</span></div>
        <div id="sub-list"></div>
      </div>
      <div class="panel">
        <div class="panel-head">${icon('progress', 20)}<h3>Mission progress</h3><span class="aside">${EXPEDITION.code}</span></div>
        <div class="panel-body">
          <div class="progress-wrap">
            <div class="ring">
              <svg viewBox="0 0 104 104">
                <circle cx="52" cy="52" r="${R}" fill="none" stroke="rgba(120,200,255,.12)" stroke-width="5"/>
                <circle cx="52" cy="52" r="${R}" fill="none" stroke="#5ce1ff" stroke-width="5" stroke-linecap="round"
                  stroke-dasharray="${(CIRC * overall).toFixed(1)} ${CIRC.toFixed(1)}" style="filter:drop-shadow(0 0 6px #5ce1ff)"/>
                <circle cx="52" cy="52" r="36" fill="none" stroke="rgba(120,200,255,.15)" stroke-dasharray="2 5"/>
              </svg>
              <div class="c"><div class="v">${Math.round(overall * 100)}%</div><div class="l">Complete</div></div>
            </div>
            <div style="flex:1">
              <div class="kv"><span>Stage</span><span>${stageIdx + 1} / ${STAGES.length}</span></div>
              <div class="kv"><span>Current</span><span class="hi">${activeStage.name}</span></div>
              <div class="kv"><span>Objectives</span><span>${done} / ${EXPEDITION.objectives.length}</span></div>
              <div class="kv"><span>Day</span><span>${EXPEDITION.day} / ${EXPEDITION.totalDays}</span></div>
            </div>
          </div>
          <ul class="obj-list">
            ${EXPEDITION.objectives.slice(2, 5).map((o) => `<li class="${o.done ? 'done' : ''}"><span class="box">${o.done ? icon('check', 12) : ''}</span>${o.label}</li>`).join('')}
          </ul>
        </div>
      </div>
    </div>`);
  hud.append(right);

  const subList = $('#sub-list', right);
  SUBMARINES.forEach((s) => {
    const row = html(`
      <div class="sub-row" data-id="${s.id}">
        <svg class="chev" width="14" height="14" viewBox="0 0 14 14"><path d="M13 7L2 13l3-6-3-6z" fill="${s.color}" style="filter:drop-shadow(0 0 4px ${s.color})"/></svg>
        <div><div class="nm">${s.name}</div><div class="st">${s.status}</div></div>
        <div class="dp" data-f="depth"></div>
        <div class="meters">
          <div><div class="l"><span>Battery</span><span data-f="bat"></span></div><div class="bar" data-f="batbar"><i></i></div></div>
          <div><div class="l"><span>Hull</span><span>${fmt.pct(s.hull)}</span></div><div class="bar"><i style="width:${s.hull * 100}%"></i></div></div>
        </div>
      </div>`);
    row.addEventListener('click', () => { tracked = s.id; select(s.id); map.focus(s.id, focusFx()); refreshZoom(); });
    subList.append(row);
  });

  // ------------------------------------------------------------ tools + legend + readout
  const tools = html(`
    <div class="map-tools">
      <div class="panel tool-group">
        <button data-t="in" title="Zoom in">${icon('plus', 20)}</button>
        <button data-t="out" title="Zoom out">${icon('minus', 20)}</button>
        <button data-t="center" title="Recenter">${icon('target', 20)}</button>
        <button data-t="layers" title="Layers">${icon('layers', 20)}</button>
      </div>
      <div class="panel layer-pop" id="layer-pop">
        <div class="label" style="margin-bottom:4px">Map layers</div>
        ${[['showTracks', 'Submarine tracks'], ['showStations', 'Stations'], ['showCreatures', 'Discoveries'], ['showGrid', 'Coordinate grid'], ['animateMap', 'Animation']]
          .map(([k, l]) => `<div class="trow"><span>${l}</span><button class="toggle" data-k="${k}"></button></div>`).join('')}
      </div>
    </div>`);
  hud.append(tools);

  const rampCss = `linear-gradient(90deg, ${DEPTH_RAMP.map(([d, c]) => `rgb(${c.join(',')}) ${(d / 6400 * 100).toFixed(0)}%`).join(',')})`;
  const legend = html(`
    <div class="panel legend">
      <div class="label">Depth layers</div>
      <div class="scale" style="background:${rampCss}"></div>
      <div class="ticks" id="legend-ticks"></div>
      <div class="keys">
        <span><i style="background:#5ce1ff;clip-path:polygon(0 0,100% 50%,0 100%,30% 50%)"></i>Submarine</span>
        <span><i style="border:1px solid #7cf2c8;border-radius:2px"></i>Station</span>
        <span><i style="background:#b9abff;transform:rotate(45deg) scale(.8)"></i>Discovery</span>
      </div>
    </div>`);
  hud.append(legend);

  const readout = html(`<div class="panel readout"><span>Lat<b id="r-lat">--</b></span><span>Lon<b id="r-lon">--</b></span><span>Seabed<b id="r-depth">--</b></span><span>Zoom<b id="r-zoom">1.0×</b></span></div>`);
  hud.append(readout);

  // ------------------------------------------------------------ timeline
  const tl = html(`
    <div class="panel timeline">
      <div class="tl-head">${icon('timeline', 20)}<h3>Expedition timeline</h3>
        <div class="aside"><span>${EXPEDITION.start.replaceAll('-', '.')} → ${EXPEDITION.end.replaceAll('-', '.')}</span><span class="hi">${activeStage.code} · ${Math.round(activeStage.progress * 100)}%</span></div>
      </div>
      <div class="tl-track">
        <div class="tl-line"></div>
        <div class="tl-fill" style="width:${((stageIdx + activeStage.progress) / (STAGES.length - 1)) * 100}%"></div>
        ${STAGES.map((s, i) => `
          <button class="tl-node ${s.status}" style="left:${(i / (STAGES.length - 1)) * 100}%" data-stage="${s.id}">
            <span class="pt"></span><span class="nm">${s.name}</span><span class="dt">${s.start} – ${s.end}</span>
          </button>`).join('')}
      </div>
    </div>`);
  hud.append(tl);
  $$('.tl-node', tl).forEach((n) => n.addEventListener('click', () => navigate('mission', { stage: n.dataset.stage })));

  // ------------------------------------------------------------ inspector
  const insp = html(`
    <div class="inspector">
      <div class="panel stage-panel">
        <div class="panel-head"><span id="i-ico"></span><h3 id="i-title">Object</h3><span class="aside" id="i-kind"></span></div>
        <div class="stage" id="i-stage">
          <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
          <div class="hint">Drag to rotate · scroll to zoom</div>
        </div>
        <div class="stage-ctrls">
          <button class="btn icon" data-a="rotl" title="Rotate left" style="transform:scaleX(-1)">${icon('rotate', 18)}</button>
          <button class="btn icon" data-a="rotr" title="Rotate right">${icon('rotate', 18)}</button>
          <button class="btn icon" data-a="reset" title="Reset view">${icon('reset', 18)}</button>
          <span class="grow"></span>
          <button class="btn on" data-a="info">${icon('info', 18)} Info</button>
          <button class="btn icon" data-a="close" title="Close">${icon('close', 18)}</button>
        </div>
      </div>
      <div class="panel info-panel" id="i-info"><div class="panel-body" id="i-body"></div></div>
    </div>`);
  hud.append(insp);

  let viewer = null;
  const stageEl = $('#i-stage', insp);
  const infoEl = $('#i-info', insp);

  function renderInfo(o) {
    const tm = telemetry.subs[o.id];
    const d = fmt.depth(tm ? tm.depth : o.depth);
    const saved = isSaved(o.id);
    let stats = '';
    if (o.type === 'vehicle') {
      stats = `
        <div class="stat"><div class="label">Depth</div><div class="v" data-live="depth">${d.v}<small>${d.u}</small></div></div>
        <div class="stat"><div class="label">Rated depth</div><div class="v">${fmt.depth(o.maxDepth).v}<small>${fmt.depth(o.maxDepth).u}</small></div></div>
        <div class="stat"><div class="label">Battery</div><div class="v" data-live="bat">${fmt.pct(tm.battery)}</div></div>
        <div class="stat"><div class="label">Crew</div><div class="v">${o.crew || '—'}</div></div>`;
    } else if (o.type === 'station') {
      stats = `
        <div class="stat"><div class="label">Depth</div><div class="v">${d.v}<small>${d.u}</small></div></div>
        <div class="stat"><div class="label">Power</div><div class="v">${fmt.pct(o.power)}</div></div>
        <div class="stat"><div class="label">Status</div><div class="v">${o.status}</div></div>
        <div class="stat"><div class="label">Crew</div><div class="v">${o.crew || '—'}</div></div>`;
    } else {
      const tp = fmt.temp(o.temp);
      stats = `
        <div class="stat"><div class="label">Depth</div><div class="v">${d.v}<small>${d.u}</small></div></div>
        <div class="stat"><div class="label">Size</div><div class="v">${o.size}</div></div>
        <div class="stat"><div class="label">Water temp</div><div class="v">${tp.v}<small>${tp.u}</small></div></div>
        <div class="stat"><div class="label">Rarity</div><div class="v">${o.rarity}</div></div>`;
    }
    $('#i-body', insp).innerHTML = `
      <div class="kind">${typeLabel(o)}</div>
      <h4>${o.name}</h4>
      <div class="latin">${o.latin || o.klass}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <span class="chip live">${o.status}</span>
        ${o.biolum ? '<span class="chip violet">Bioluminescent</span>' : ''}
        ${o.discovered ? `<span class="chip">${o.discovered.replaceAll('-', '.')}</span>` : ''}
      </div>
      <div class="stat-grid">${stats}</div>
      <p class="desc">${o.description}</p>
      <div class="info-actions">
        <button class="btn ${saved ? 'primary' : ''}" data-a="save">${icon('bookmark', 18)} ${saved ? 'Saved' : 'Save'}</button>
        <button class="btn" data-a="library">${icon('library', 18)} Library</button>
      </div>`;
    $('[data-a="save"]', insp).onclick = () => {
      const now = toggleSaved(o.id);
      toast(now ? `${o.name} saved` : `${o.name} removed`);
      renderInfo(o);
    };
    $('[data-a="library"]', insp).onclick = () => navigate('library', { id: o.id });
  }

  function openInspector(id) {
    const o = id && findObject(id);
    if (!o) {
      insp.classList.remove('open');
      right.classList.remove('hidden');
      return;
    }
    if (!viewer) viewer = new Viewer(stageEl, { distance: 8.4 });
    viewer.setModel(o.model);
    $('#i-title', insp).textContent = o.name;
    $('#i-kind', insp).textContent = typeLabel(o);
    $('#i-ico', insp).innerHTML = icon({ vehicle: 'sub', station: 'station', creature: 'creature', site: 'site' }[o.type], 20);
    renderInfo(o);
    insp.classList.add('open');
    right.classList.add('hidden');
  }

  $$('[data-a]', insp).forEach((b) => {
    const a = b.dataset.a;
    if (a === 'rotl') b.onclick = () => viewer && viewer.rotateBy(-Math.PI / 4);
    if (a === 'rotr') b.onclick = () => viewer && viewer.rotateBy(Math.PI / 4);
    if (a === 'reset') b.onclick = () => viewer && viewer.resetView();
    if (a === 'close') b.onclick = () => select(null);
    if (a === 'info') b.onclick = () => { infoEl.classList.toggle('closed'); b.classList.toggle('on'); };
  });

  // ------------------------------------------------------------ map
  const focusFx = () => {
    // centre objects in the free space between the left HUD and the inspector
    const w = root.clientWidth;
    const l = 20 + 264;
    const r = w - (20 + 420 + 12 + 300);
    return Math.max(0.25, ((l + r) / 2) / w);
  };

  const map = createMap($('#ocean-map', root), {
    safeRight: () => (insp.classList.contains('open') ? 20 + 420 + 12 + 300 + 16 : 20 + 318 + 16),
    onSelect: (id) => {
      if (!id) return;
      if (id.startsWith('sub-')) tracked = id;
      select(id);
      map.focus(id, focusFx());
      refreshZoom();
    },
    onCursor: ({ x, y, depth }) => {
      const { lat, lon } = EXPEDITION.bounds;
      $('#r-lat', readout).textContent = `${Math.abs(lat[1] - (lat[1] - lat[0]) * y).toFixed(3)}°S`;
      $('#r-lon', readout).textContent = `${(lon[0] + (lon[1] - lon[0]) * x).toFixed(3)}°E`;
      const d = fmt.depth(depth);
      $('#r-depth', readout).textContent = `${d.v} ${d.u}`;
      $('#r-zoom', readout).textContent = `${map.zoom.toFixed(1)}×`;
    }
  });

  $('#ocean-map', root).addEventListener('wheel', () => refreshZoom(), { passive: true });

  function refreshZoom() {
    setTimeout(() => ($('#r-zoom', readout).textContent = `${map.zoom.toFixed(1)}×`), 900);
  }

  $$('[data-t]', tools).forEach((b) => {
    const t = b.dataset.t;
    b.onclick = () => {
      if (t === 'in') map.zoomIn();
      if (t === 'out') map.zoomOut();
      if (t === 'center') map.recenter();
      if (t === 'layers') { $('#layer-pop', tools).classList.toggle('open'); b.classList.toggle('on'); }
      refreshZoom();
    };
  });
  const syncToggles = () => $$('.toggle', tools).forEach((tg) => tg.classList.toggle('on', !!state.settings[tg.dataset.k]));
  $$('.toggle', tools).forEach((tg) => (tg.onclick = () => setSetting(tg.dataset.k, !state.settings[tg.dataset.k])));
  syncToggles();

  // ------------------------------------------------------------ live updates
  function updateTelemetry() {
    const s = SUBMARINES.find((q) => q.id === tracked);
    const tm = telemetry.subs[tracked];
    $('#tk-name', left).textContent = s.name;
    $('#tk-dot', left).style.cssText = `background:${s.color};box-shadow:0 0 10px ${s.color}`;

    const d = fmt.depth(tm.depth);
    $('#t-depth', left).textContent = d.v;
    $('#t-depth-u', left).textContent = d.u;
    const h = tm.history;
    const delta = h[h.length - 1] - h[h.length - 2];
    const tr = $('#t-depth-trend', left);
    tr.textContent = `${delta >= 0 ? '▼ Descending' : '▲ Ascending'}`;
    tr.classList.toggle('down', delta < 0);
    const line = sparkPath(h, 232, 44);
    $('#t-spark-line', left).setAttribute('d', line);
    $('#t-spark-fill', left).setAttribute('d', `${line} L232,44 L0,44 Z`);
    const mx = fmt.depth(s.maxDepth);
    $('#t-depth-max', left).textContent = `Rated ${mx.v} ${mx.u}`;

    const p = fmt.pressure(tm.pressure);
    $('#t-press', left).textContent = p.v;
    $('#t-press-u', left).textContent = p.u;
    const ratio = tm.depth / s.maxDepth;
    $('#t-gauge', left).setAttribute('stroke-dasharray', `${(141 * ratio).toFixed(1)} 200`);
    $('#t-press-pct', left).textContent = `${Math.round(ratio * 100)}% of hull rating`;

    const tp = fmt.temp(tm.temp);
    $('#t-temp', left).textContent = tp.v;
    $('#t-temp-u', left).textContent = tp.u;
    $('#t-thermo', left).style.left = `${Math.min(98, (tm.temp / 12) * 100)}%`;
    $('#t-tmin', left).textContent = `${fmt.temp(0).v}°`;
    $('#t-tmax', left).textContent = `${fmt.temp(12).v}°`;

    $$('.sub-row', subList).forEach((row) => {
      const id = row.dataset.id;
      const t2 = telemetry.subs[id];
      const dd = fmt.depth(t2.depth);
      $('[data-f="depth"]', row).textContent = `${dd.v} ${dd.u}`;
      $('[data-f="bat"]', row).textContent = fmt.pct(t2.battery);
      const bar = $('[data-f="batbar"]', row);
      bar.classList.toggle('low', t2.battery < 0.35);
      bar.firstElementChild.style.width = `${t2.battery * 100}%`;
      row.classList.toggle('sel', id === tracked);
    });

    if (state.selectedId && telemetry.subs[state.selectedId]) {
      const live = $('[data-live="depth"]', insp);
      if (live) { const q = fmt.depth(telemetry.subs[state.selectedId].depth); live.innerHTML = `${q.v}<small>${q.u}</small>`; }
    }
  }

  function updateLegend() {
    const ticks = [0, 2000, 4000, 6000].map((d) => fmt.depth(d).v);
    $('#legend-ticks', legend).innerHTML = ticks.map((t) => `<span>${t}</span>`).join('') ;
    $('#legend-ticks', legend).lastElementChild.textContent += ` ${fmt.depth(0).u}`;
  }

  on('telemetry', updateTelemetry);
  on('select', (id) => openInspector(id));
  on('settings', () => { syncToggles(); updateLegend(); updateTelemetry(); if (state.selectedId) renderInfo(findObject(state.selectedId)); });
  on('saved', () => { if (state.selectedId) renderInfo(findObject(state.selectedId)); });
  on('navigate', ({ id, payload }) => {
    if (id === 'map' && payload && payload.id) {
      if (payload.id.startsWith('sub-')) tracked = payload.id;
      select(payload.id);
      setTimeout(() => { map.focus(payload.id, focusFx()); refreshZoom(); }, 60);
    }
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && state.view === 'map') select(null); });

  updateTelemetry();
  updateLegend();
  // initial readout: position of the tracked vehicle
  const t0 = telemetry.subs[tracked];
  map && readout && (() => {
    const { lat, lon } = EXPEDITION.bounds;
    $('#r-lat', readout).textContent = `${Math.abs(lat[1] - (lat[1] - lat[0]) * t0.y).toFixed(3)}°S`;
    $('#r-lon', readout).textContent = `${(lon[0] + (lon[1] - lon[0]) * t0.x).toFixed(3)}°E`;
    const d = fmt.depth(t0.depth);
    $('#r-depth', readout).textContent = `${d.v} ${d.u}`;
  })();
}
