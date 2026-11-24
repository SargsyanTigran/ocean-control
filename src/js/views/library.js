// Discovery Library: filterable catalogue with a rotatable 3D viewer + info panel
import { ALL_OBJECTS, findObject } from '../data.js';
import { telemetry } from '../telemetry.js';
import { on, fmt, toggleSaved, isSaved } from '../store.js';
import { Viewer, thumbnail } from '../viewer.js';
import { icon } from '../icons.js';
import { $, $$, html, toast, typeLabel, typeIcon } from '../util.js';

const FILTERS = [
  ['all', 'All'], ['creature', 'Creatures'], ['vehicle', 'Vehicles'], ['station', 'Stations'], ['site', 'Sites']
];

export function mountLibrary(root, { navigate }) {
  let filter = 'all';
  let query = '';
  let current = 'cr-angler';
  let viewer = null;

  root.append(html(`
    <div class="page">
      <div class="page-head">
        <h2>Discovery Library</h2>
        <span class="sub" id="lib-count"></span>
        <div class="right">
          <div class="seg filters" id="lib-filters">${FILTERS.map(([k, l]) => `<button data-f="${k}">${l}</button>`).join('')}</div>
          <label class="search">${icon('search', 18)}<input id="lib-q" placeholder="Search catalogue" /></label>
        </div>
      </div>
      <div class="lib-layout">
        <div class="lib-grid scroll" id="lib-grid"></div>
        <div class="lib-detail">
          <div class="panel stage-panel">
            <div class="panel-head"><span id="ld-ico"></span><h3 id="ld-title"></h3><span class="aside">3D specimen view</span></div>
            <div class="stage" id="ld-stage">
              <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
              <div class="hint">Drag to rotate · scroll to zoom</div>
            </div>
            <div class="stage-ctrls">
              <button class="btn icon" data-a="rotl" title="Rotate left" style="transform:scaleX(-1)">${icon('rotate', 18)}</button>
              <button class="btn icon" data-a="rotr" title="Rotate right">${icon('rotate', 18)}</button>
              <button class="btn icon" data-a="reset" title="Reset view">${icon('reset', 18)}</button>
              <span class="grow"></span>
              <button class="btn on" data-a="info">${icon('info', 18)} Info panel</button>
            </div>
          </div>
          <div class="panel info-panel" id="ld-info"><div class="panel-body" id="ld-body"></div></div>
        </div>
      </div>
    </div>`));

  const grid = $('#lib-grid', root);

  function list() {
    return ALL_OBJECTS().filter((o) =>
      (filter === 'all' || o.type === filter) &&
      (!query || `${o.name} ${o.latin || ''} ${o.klass || ''}`.toLowerCase().includes(query)));
  }

  function renderGrid() {
    const items = list();
    $('#lib-count', root).textContent = `${items.length} ${items.length === 1 ? 'entry' : 'entries'}`;
    $$('#lib-filters button', root).forEach((b) => b.classList.toggle('on', b.dataset.f === filter));
    grid.innerHTML = '';
    if (!items.length) {
      grid.append(html(`<div class="empty" style="grid-column:1/-1">${icon('search', 36)}<h3>No matches</h3><div>Lorem ipsum dolor sit amet.</div></div>`));
      return;
    }
    items.forEach((o) => {
      const tm = telemetry.subs[o.id];
      const d = fmt.depth(tm ? tm.depth : o.depth);
      const card = html(`
        <div class="panel card ${o.id === current ? 'sel' : ''}" data-id="${o.id}">
          <div class="thumb"><img alt="" /></div>
          ${isSaved(o.id) ? `<span class="save-flag">${icon('bookmark', 18)}</span>` : ''}
          <div class="meta">
            <div class="nm">${o.name}</div>
            <div class="ln"><span>${typeLabel(o)}</span><span>${d.v} ${d.u}</span></div>
          </div>
        </div>`);
      card.onclick = () => show(o.id);
      grid.append(card);
      // render thumbnails lazily so the grid appears instantly
      requestAnimationFrame(() => { $('img', card).src = thumbnail(o.model); });
    });
  }

  function renderInfo(o) {
    const tm = telemetry.subs[o.id];
    const d = fmt.depth(tm ? tm.depth : o.depth);
    const saved = isSaved(o.id);
    const rows = o.type === 'creature' || o.type === 'site'
      ? [['Depth', `${d.v}<small>${d.u}</small>`], ['Size', o.size], ['Water temp', `${fmt.temp(o.temp).v}<small>${fmt.temp(o.temp).u}</small>`], ['Rarity', o.rarity], ['Found by', o.by], ['Logged', o.discovered.slice(5).replace('-', '.')]]
      : o.type === 'vehicle'
        ? [['Depth', `${d.v}<small>${d.u}</small>`], ['Rated', `${fmt.depth(o.maxDepth).v}<small>${fmt.depth(o.maxDepth).u}</small>`], ['Battery', fmt.pct(tm.battery)], ['Hull', fmt.pct(o.hull)], ['Speed', `${o.speed}<small>kn</small>`], ['Crew', o.crew || '—']]
        : [['Depth', `${d.v}<small>${d.u}</small>`], ['Power', fmt.pct(o.power)], ['Status', o.status], ['Crew', o.crew || '—']];
    $('#ld-body', root).innerHTML = `
      <div class="kind">${typeLabel(o)} · ${o.id.toUpperCase()}</div>
      <h4>${o.name}</h4>
      <div class="latin">${o.latin || o.klass}</div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <span class="chip live">${o.status}</span>
        ${o.biolum ? '<span class="chip violet">Bioluminescent</span>' : ''}
      </div>
      <div class="stat-grid">${rows.map(([l, v]) => `<div class="stat"><div class="label">${l}</div><div class="v">${v}</div></div>`).join('')}</div>
      <p class="desc">${o.description}</p>
      <p class="desc" style="margin-top:6px">Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore.</p>
      <div class="info-actions">
        <button class="btn ${saved ? 'primary' : ''}" data-b="save">${icon('bookmark', 18)} ${saved ? 'Saved' : 'Save discovery'}</button>
        <button class="btn" data-b="map">${icon('map', 18)} Show on map</button>
      </div>`;
    $('[data-b="save"]', root).onclick = () => {
      toast(toggleSaved(o.id) ? `${o.name} saved` : `${o.name} removed`);
    };
    $('[data-b="map"]', root).onclick = () => navigate('map', { id: o.id });
  }

  function show(id) {
    const o = findObject(id);
    if (!o) return;
    current = id;
    $$('.card', grid).forEach((c) => c.classList.toggle('sel', c.dataset.id === id));
    $('#ld-title', root).textContent = o.name;
    $('#ld-ico', root).innerHTML = icon(typeIcon(o), 20);
    if (viewer) viewer.setModel(o.model);
    renderInfo(o);
  }

  $$('#lib-filters button', root).forEach((b) => (b.onclick = () => { filter = b.dataset.f; renderGrid(); }));
  $('#lib-q', root).addEventListener('input', (e) => { query = e.target.value.trim().toLowerCase(); renderGrid(); });

  $$('.stage-ctrls [data-a]', root).forEach((b) => {
    const a = b.dataset.a;
    b.onclick = () => {
      if (!viewer) return;
      if (a === 'rotl') viewer.rotateBy(-Math.PI / 4);
      if (a === 'rotr') viewer.rotateBy(Math.PI / 4);
      if (a === 'reset') viewer.resetView();
      if (a === 'info') { $('#ld-info', root).classList.toggle('closed'); b.classList.toggle('on'); }
    };
  });

  on('navigate', ({ id, payload }) => {
    if (id !== 'library') return;
    if (!viewer) { viewer = new Viewer($('#ld-stage', root)); }
    if (payload && payload.id) { filter = 'all'; current = payload.id; }
    renderGrid();
    show(current);
  });
  on('saved', () => { renderGrid(); const o = findObject(current); if (o) renderInfo(o); });
  on('settings', ({ key }) => { if (key === 'units' || key === '*') { renderGrid(); show(current); } });
}
