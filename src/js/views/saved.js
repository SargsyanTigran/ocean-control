// Saved Items: bookmarked discoveries, vehicles and stations with notes
import { findObject } from '../data.js';
import { state, on, fmt, toggleSaved, setNote } from '../store.js';
import { thumbnail } from '../viewer.js';
import { icon } from '../icons.js';
import { $, $$, html, toast, typeLabel } from '../util.js';

export function mountSaved(root, { navigate }) {
  function render() {
    const items = state.saved.map((s) => ({ ...s, o: findObject(s.id) })).filter((s) => s.o);
    root.innerHTML = '';
    const page = html(`
      <div class="page">
        <div class="page-head">
          <h2>Saved Items</h2>
          <span class="sub">${items.length} saved · stored locally</span>
          <div class="right"><button class="btn" data-go="library">${icon('library', 18)} Browse library</button></div>
        </div>
        <div class="saved-summary">
          ${[['creature', 'Creatures', 'creature'], ['vehicle', 'Vehicles', 'sub'], ['station', 'Stations', 'station'], ['site', 'Sites', 'site']].map(([t, l, ic]) => `
            <div class="panel">${icon(ic, 28)}<div><div class="v">${items.filter((i) => i.o.type === t).length}</div><div class="label">${l}</div></div></div>`).join('')}
        </div>
        <div class="saved-grid" id="saved-grid"></div>
      </div>`);
    root.append(page);
    $('[data-go="library"]', page).onclick = () => navigate('library');
    const grid = $('#saved-grid', page);

    if (!items.length) {
      grid.append(html(`<div class="panel empty" style="grid-column:1/-1">${icon('bookmark', 40)}<h3>Nothing saved yet</h3><div>Lorem ipsum dolor sit amet · save discoveries from the map or the library.</div></div>`));
      return;
    }
    items.forEach(({ id, savedAt, note, o }) => {
      const d = fmt.depth(o.depth || o.baseDepth);
      const card = html(`
        <div class="panel saved-item">
          <div class="thumb"><img alt="" /></div>
          <div class="body">
            <div class="label hi">${typeLabel(o)}</div>
            <div class="nm">${o.name}</div>
            <div class="ln"><span>${o.latin || o.klass}</span><span>${d.v} ${d.u}</span><span>Saved ${new Date(savedAt).toISOString().slice(0, 10).replaceAll('-', '.')}</span></div>
            <textarea placeholder="Add a field note…">${note || ''}</textarea>
            <div class="acts">
              <button class="btn" data-a="map">${icon('map', 18)} Map</button>
              <button class="btn" data-a="lib">${icon('eye', 18)} View 3D</button>
              <span style="flex:1"></span>
              <button class="btn icon danger" data-a="rm" title="Remove">${icon('trash', 18)}</button>
            </div>
          </div>
        </div>`);
      $('textarea', card).addEventListener('input', (e) => setNote(id, e.target.value));
      $('[data-a="map"]', card).onclick = () => navigate('map', { id });
      $('[data-a="lib"]', card).onclick = () => navigate('library', { id });
      $('[data-a="rm"]', card).onclick = () => { toggleSaved(id); toast(`${o.name} removed`); };
      grid.append(card);
      requestAnimationFrame(() => { $('img', card).src = thumbnail(o.model, 360, 300); });
    });
  }

  on('navigate', ({ id }) => { if (id === 'saved') render(); });
  on('saved', () => { if (state.view === 'saved') render(); });
  on('settings', () => { if (state.view === 'saved') render(); });
}
