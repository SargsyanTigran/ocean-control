// Mission Details: expedition overview, stage timeline, depth profile, crew + log
import { EXPEDITION, STAGES, CREW, LOGS, DEPTH_PROFILE, SUBMARINES, CREATURES } from '../data.js';
import { on, fmt } from '../store.js';
import { icon } from '../icons.js';
import { $, $$, html } from '../util.js';

function chartSVG() {
  const W = 640, H = 240, L = 56, B = 28, T = 12, Rr = 12;
  const max = 6500;
  const xs = (i) => L + (i / (EXPEDITION.totalDays - 1)) * (W - L - Rr);
  const ys = (d) => T + (d / max) * (H - T - B);
  const pts = DEPTH_PROFILE.map((d, i) => `${xs(i).toFixed(1)},${ys(d).toFixed(1)}`);
  const grid = [0, 2000, 4000, 6000].map((d) => {
    const f = fmt.depth(d);
    return `<line x1="${L}" x2="${W - Rr}" y1="${ys(d)}" y2="${ys(d)}" stroke="rgba(120,200,255,.12)" stroke-dasharray="2 4"/>
            <text x="${L - 8}" y="${ys(d) + 4}" text-anchor="end">${f.v}</text>`;
  }).join('');
  const days = [1, 10, 20, 30, 40, 47].map((d) => `<text x="${xs(d - 1)}" y="${H - 6}" text-anchor="middle">D${d}</text>`).join('');
  const lastX = xs(DEPTH_PROFILE.length - 1), lastY = ys(DEPTH_PROFILE[DEPTH_PROFILE.length - 1]);
  const planned = `M${lastX},${lastY} L${xs(33)},${ys(6000)} L${xs(40)},${ys(5800)} L${xs(46)},${ys(0)}`;
  return `
    <svg class="chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      <defs><linearGradient id="dpf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#5ce1ff" stop-opacity=".02"/><stop offset="1" stop-color="#5ce1ff" stop-opacity=".3"/></linearGradient></defs>
      ${grid}${days}
      <path d="M${xs(0)},${ys(0)} L${pts.join(' L')} L${lastX},${ys(0)} Z" fill="url(#dpf)"/>
      <path d="M${pts.join(' L')}" fill="none" stroke="#5ce1ff" stroke-width="1.6" style="filter:drop-shadow(0 0 5px #5ce1ff)"/>
      <path d="${planned}" fill="none" stroke="rgba(169,155,255,.7)" stroke-width="1.2" stroke-dasharray="4 5"/>
      <line x1="${lastX}" x2="${lastX}" y1="${T}" y2="${H - B}" stroke="rgba(124,242,200,.5)"/>
      <circle cx="${lastX}" cy="${lastY}" r="4" fill="#7cf2c8" style="filter:drop-shadow(0 0 6px #7cf2c8)"/>
      <text x="${lastX + 8}" y="${T + 12}" style="fill:#7cf2c8">Today</text>
    </svg>`;
}

export function mountMission(root, { navigate }) {
  const active = STAGES.find((s) => s.status === 'active');
  const maxD = Math.max(...DEPTH_PROFILE);

  function render(focusStage = active.id) {
    const md = fmt.depth(maxD);
    root.innerHTML = '';
    root.append(html(`
      <div class="page">
        <div class="page-head">
          <h2>Mission Details</h2>
          <span class="sub">${EXPEDITION.code} · ${EXPEDITION.region}</span>
          <div class="right"><span class="chip live">${active.name} in progress</span><button class="btn" data-go="map">${icon('map', 18)} Open map</button></div>
        </div>
        <div class="mission-grid">
          <div class="panel m-hero">
            <div>
              <div class="label">Expedition</div>
              <div class="big">${EXPEDITION.name}</div>
              <div class="desc">${EXPEDITION.summary}</div>
              <div style="display:flex;gap:10px;margin-top:16px;flex-wrap:wrap">
                <span class="chip">Vessel · ${EXPEDITION.vessel}</span>
                <span class="chip">Lead · ${EXPEDITION.lead}</span>
                <span class="chip">${EXPEDITION.start.replaceAll('-', '.')} → ${EXPEDITION.end.replaceAll('-', '.')}</span>
              </div>
            </div>
            <div class="stats">
              <div class="stat"><div class="label">Mission day</div><div class="v">${EXPEDITION.day}<small>/ ${EXPEDITION.totalDays}</small></div></div>
              <div class="stat"><div class="label">Max depth</div><div class="v">${md.v}<small>${md.u}</small></div></div>
              <div class="stat"><div class="label">Vehicles</div><div class="v">${SUBMARINES.length}<small>active</small></div></div>
              <div class="stat"><div class="label">Discoveries</div><div class="v">${CREATURES.length}<small>logged</small></div></div>
            </div>
          </div>

          <div class="panel" style="grid-row: 2 / 4">
            <div class="panel-head">${icon('timeline', 20)}<h3>Expedition stages</h3><span class="aside">${STAGES.filter((s) => s.status === 'done').length} / ${STAGES.length} done</span></div>
            <div class="panel-body" style="padding-top:6px">
              <ul class="vtl">
                ${STAGES.map((s) => `
                  <li class="${s.status} ${s.id === focusStage ? 'focus' : ''}" data-stage="${s.id}">
                    <span class="pt"></span>
                    <div>
                      <div class="nm"><span>${s.name}</span><span class="dt">${s.code}</span></div>
                      <div class="dt">${s.start} – ${s.end} · ${s.status === 'done' ? 'Complete' : s.status === 'active' ? `${Math.round(s.progress * 100)}% · active` : 'Pending'}</div>
                      ${s.id === focusStage ? `<div class="dd">${s.detail}</div><div class="bar"><i style="width:${s.progress * 100}%"></i></div>` : ''}
                    </div>
                  </li>`).join('')}
              </ul>
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">${icon('depth', 20)}<h3>Depth profile</h3><span class="aside"><span class="hi">━ Logged</span> &nbsp; <span style="color:var(--violet)">┅ Planned</span></span></div>
            <div class="panel-body">${chartSVG()}</div>
          </div>

          <div class="panel">
            <div class="panel-head">${icon('user', 20)}<h3>Crew roster</h3><span class="aside">${CREW.length} members</span></div>
            <div class="panel-body crew" style="padding-top:4px">
              ${CREW.map((c) => `<div class="p"><span class="av">${icon('user', 18)}</span><div><div class="nm">${c.name}</div><div class="rl">${c.role}</div></div><span class="chip">${c.station}</span></div>`).join('')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">${icon('check', 20)}<h3>Objectives</h3><span class="aside">${EXPEDITION.objectives.filter((o) => o.done).length} / ${EXPEDITION.objectives.length}</span></div>
            <div class="panel-body">
              ${EXPEDITION.objectives.map((o) => `
                <div style="padding:8px 0;border-bottom:1px solid var(--line)">
                  <div class="kv" style="padding:0 0 6px"><span style="color:${o.done ? 'var(--text-hi)' : 'var(--text-dim)'}">${o.label}</span><span class="${o.done ? 'hi' : ''}">${o.done ? 'Done' : Math.round((o.progress || 0) * 100) + '%'}</span></div>
                  <div class="bar"><i style="width:${o.done ? 100 : (o.progress || 0) * 100}%"></i></div>
                </div>`).join('')}
            </div>
          </div>

          <div class="panel">
            <div class="panel-head">${icon('clock', 20)}<h3>Mission log</h3><span class="aside">Last 24 h</span></div>
            <div class="panel-body log" style="padding-top:4px">
              ${LOGS.map((l) => `<div class="e"><span class="t">${l.t}</span><div><div class="w">${l.who}</div><div class="m">${l.msg}</div></div></div>`).join('')}
            </div>
          </div>
        </div>
      </div>`));
    $$('.vtl li', root).forEach((li) => (li.onclick = () => { const y = $('.page', root).scrollTop; render(li.dataset.stage); $('.page', root).scrollTop = y; }));
    $('[data-go="map"]', root).onclick = () => navigate('map');
  }

  render();
  on('navigate', ({ id, payload }) => { if (id === 'mission') render(payload && payload.stage ? payload.stage : active.id); });
  on('settings', ({ key }) => { if (key === 'units' || key === '*') render(); });
}
