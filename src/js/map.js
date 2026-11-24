// Interactive ocean map (Canvas 2D).
// Layered bathymetry (darker = deeper), illuminated depth lines, animated markers,
// moving submarine tracks and soft neon range circles.
import { SUBMARINES, STATIONS, CREATURES, EXPEDITION } from './data.js';
import { telemetry, advance, subPosition } from './telemetry.js';
import { state, on, fmt } from './store.js';

const W0 = 1600, H0 = 1000;         // world size in "world pixels"
const GW = 320, GH = 200;           // bathymetry grid resolution
const MAX_DEPTH = 6400;
const FONT = '"Ostrich Sans", sans-serif';

// ---------------------------------------------------------------- noise
function hash(x, y) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
function fbm(x, y) {
  let v = 0, amp = 0.5, f = 1;
  for (let o = 0; o < 5; o++) { v += amp * vnoise(x * f, y * f); f *= 2.03; amp *= 0.5; }
  return v;
}

// depth in metres at normalised coords (0..1)
export function depthAt(x, y) {
  let d = 1400 + fbm(x * 4 + 3.1, y * 4 - 1.7) * 2600;
  // continental shelf: shallow in the north-east
  const shelf = Math.max(0, (x - 0.55) * 1.6 + (0.35 - y) * 1.8);
  d -= Math.min(1, shelf) * 2300;
  // curved trench running south-west → east
  const ty = 0.78 - x * 0.22 + Math.sin(x * 6) * 0.05;
  const dist = Math.abs(y - ty);
  d += Math.exp(-((dist / 0.085) ** 2)) * 2600 * (0.6 + x * 0.5);
  // seamounts
  [[0.24, 0.30, 0.06, 1800], [0.62, 0.56, 0.05, 1300], [0.86, 0.72, 0.07, 1500]].forEach(([sx, sy, r, h]) => {
    const q = ((x - sx) ** 2 + (y - sy) ** 2) / (r * r);
    d -= Math.exp(-q) * h;
  });
  return Math.max(40, Math.min(MAX_DEPTH, d));
}

// ---------------------------------------------------------------- build grid
const grid = new Float32Array((GW + 1) * (GH + 1));
for (let j = 0; j <= GH; j++) for (let i = 0; i <= GW; i++) grid[j * (GW + 1) + i] = depthAt(i / GW, j / GH);
const G = (i, j) => grid[j * (GW + 1) + i];

// colour ramp for depth (shallow → deep)
const RAMP = [
  [0, [34, 104, 138]],
  [800, [20, 76, 114]],
  [1800, [12, 50, 88]],
  [3000, [7, 30, 60]],
  [4200, [3, 16, 37]],
  [5400, [1, 7, 19]],
  [6400, [0, 3, 9]]
];
function rampColor(d) {
  for (let k = 1; k < RAMP.length; k++) {
    if (d <= RAMP[k][0]) {
      const [d0, c0] = RAMP[k - 1], [d1, c1] = RAMP[k];
      const t = (d - d0) / (d1 - d0);
      return [c0[0] + (c1[0] - c0[0]) * t, c0[1] + (c1[1] - c0[1]) * t, c0[2] + (c1[2] - c0[2]) * t];
    }
  }
  return RAMP[RAMP.length - 1][1];
}

function buildFill(interval) {
  const c = document.createElement('canvas');
  c.width = GW + 1; c.height = GH + 1;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(GW + 1, GH + 1);
  for (let j = 0; j <= GH; j++) {
    for (let i = 0; i <= GW; i++) {
      const d = G(i, j);
      // terraced layers: quantise towards the band floor, keep a little gradient
      const band = Math.floor(d / interval) * interval;
      const dq = band + (d - band) * 0.35;
      let [r, g, b] = rampColor(dq);
      // hillshade
      const dx = G(Math.min(GW, i + 1), j) - G(Math.max(0, i - 1), j);
      const dy = G(i, Math.min(GH, j + 1)) - G(i, Math.max(0, j - 1));
      const shade = 1 + Math.max(-0.3, Math.min(0.3, (-dx * 0.7 - dy * 0.5) / 900));
      const k = (j * (GW + 1) + i) * 4;
      img.data[k] = r * shade; img.data[k + 1] = g * shade; img.data[k + 2] = b * shade; img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

// marching squares → segments in normalised coords
function buildContours(interval) {
  const levels = [];
  for (let L = interval; L < MAX_DEPTH; L += interval) {
    const segs = [];
    for (let j = 0; j < GH; j++) {
      for (let i = 0; i < GW; i++) {
        const a = G(i, j), b = G(i + 1, j), c = G(i + 1, j + 1), d = G(i, j + 1);
        let idx = 0;
        if (a > L) idx |= 8; if (b > L) idx |= 4; if (c > L) idx |= 2; if (d > L) idx |= 1;
        if (idx === 0 || idx === 15) continue;
        const t = (p, q) => (L - p) / (q - p);
        const top = [(i + t(a, b)) / GW, j / GH];
        const right = [(i + 1) / GW, (j + t(b, c)) / GH];
        const bottom = [(i + t(d, c)) / GW, (j + 1) / GH];
        const left = [i / GW, (j + t(a, d)) / GH];
        const push = (p, q) => segs.push(p[0], p[1], q[0], q[1]);
        switch (idx) {
          case 1: case 14: push(left, bottom); break;
          case 2: case 13: push(bottom, right); break;
          case 3: case 12: push(left, right); break;
          case 4: case 11: push(top, right); break;
          case 5: push(left, top); push(bottom, right); break;
          case 6: case 9: push(top, bottom); break;
          case 7: case 8: push(left, top); break;
          case 10: push(left, bottom); push(top, right); break;
        }
      }
    }
    levels.push({ depth: L, segs: new Float32Array(segs) });
  }
  return levels;
}

// ---------------------------------------------------------------- map
export function createMap(canvas, { onHover, onSelect, onCursor, safeRight = () => 0 } = {}) {
  const ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas');
  const lctx = layer.getContext('2d');
  // hairline font: avoid hinting artefacts on canvas text too
  const noHint = (c) => { if ('textRendering' in c) c.textRendering = 'geometricPrecision'; };

  let dpr = 1, cw = 1, ch = 1;
  const view = { k: 1, tx: 0, ty: 0, minK: 1 };
  let interval = state.settings.contourInterval;
  let fill = buildFill(interval);
  let contours = buildContours(interval);
  let dirty = true;
  let hoverId = null;
  let selectedId = state.selectedId;
  let last = performance.now();
  let t = 0;
  let running = true;
  const target = { k: null, tx: 0, ty: 0 };   // smooth camera target

  // drifting particles
  const motes = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.4 + 0.4, v: Math.random() * 0.004 + 0.001 }));

  // precomputed route polylines
  const routes = {};
  SUBMARINES.forEach((s) => {
    routes[s.id] = Array.from({ length: 240 }, (_, i) => subPosition(s, i / 240));
  });

  const toScreen = (x, y) => [x * W0 * view.k + view.tx, y * H0 * view.k + view.ty];
  const toWorld = (sx, sy) => [(sx - view.tx) / (W0 * view.k), (sy - view.ty) / (H0 * view.k)];

  function clampView(v = view) {
    const mw = W0 * v.k, mh = H0 * v.k;
    v.tx = Math.min(0, Math.max(cw - mw, v.tx));
    v.ty = Math.min(0, Math.max(ch - mh, v.ty));
  }

  function resize() {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, window.devicePixelRatio || 1);
    cw = Math.max(1, r.width); ch = Math.max(1, r.height);
    canvas.width = layer.width = Math.round(cw * dpr);
    canvas.height = layer.height = Math.round(ch * dpr);
    const prevMin = view.minK;
    view.minK = Math.max(cw / W0, ch / H0);
    if (view.k < view.minK || view.k === prevMin) {
      view.k = view.minK * 1.08;
      view.tx = (cw - W0 * view.k) / 2;
      view.ty = (ch - H0 * view.k) / 2;
    }
    clampView();
    target.k = null;
    dirty = true;
  }

  // ------------------------------------------------------------ static layer
  function drawStatic() {
    const g = lctx;
    const glowK = state.settings.glow;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    noHint(g);
    g.clearRect(0, 0, cw, ch);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    g.drawImage(fill, view.tx, view.ty, W0 * view.k, H0 * view.k);

    // depth lines
    const sx = W0 * view.k, sy = H0 * view.k;
    contours.forEach(({ depth, segs }) => {
      const major = depth % (interval * 2) === 0;
      const shallow = 1 - depth / MAX_DEPTH;
      g.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        g.moveTo(segs[i] * sx + view.tx, segs[i + 1] * sy + view.ty);
        g.lineTo(segs[i + 2] * sx + view.tx, segs[i + 3] * sy + view.ty);
      }
      // glow pass
      g.strokeStyle = `rgba(92,225,255,${(major ? 0.16 : 0.07) * glowK * (0.5 + shallow)})`;
      g.lineWidth = major ? 5 : 3;
      g.stroke();
      // line pass
      g.strokeStyle = major
        ? `rgba(150,232,255,${0.35 + shallow * 0.45})`
        : `rgba(92,190,235,${0.2 + shallow * 0.3})`;
      g.lineWidth = major ? 1.1 : 0.7;
      g.stroke();
    });

    // contour labels (major lines)
    g.font = `15px ${FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    const placed = [];
    contours.forEach(({ depth, segs }) => {
      if (depth % (interval * 2) !== 0) return;
      const label = fmt.depth(depth);
      const txt = `${label.v} ${label.u}`;
      const step = Math.max(4, Math.floor(segs.length / 4 / 5) * 4);
      for (let i = 0; i < segs.length; i += step) {
        const x = segs[i] * sx + view.tx, y = segs[i + 1] * sy + view.ty;
        if (x < 60 || y < 60 || x > cw - 60 || y > ch - 60) continue;
        if (placed.some(([px, py]) => (px - x) ** 2 + (py - y) ** 2 < 240 ** 2)) continue;
        placed.push([x, y]);
        const w = g.measureText(txt).width + 12;
        g.fillStyle = 'rgba(3,10,22,0.78)';
        g.fillRect(x - w / 2, y - 9, w, 18);
        g.fillStyle = 'rgba(170,225,255,0.9)';
        g.fillText(txt, x, y + 1);
      }
    });

    // coordinate grid
    if (state.settings.showGrid) {
      const { lat, lon } = EXPEDITION.bounds;
      g.strokeStyle = 'rgba(120,190,255,0.10)';
      g.lineWidth = 1;
      g.setLineDash([2, 6]);
      g.fillStyle = 'rgba(170,220,250,0.8)';
      g.font = `15px ${FONT}`;
      for (let k = 0; k <= 10; k++) {
        const [x] = toScreen(k / 10, 0);
        const [, y] = toScreen(0, k / 10);
        g.beginPath(); g.moveTo(x, 0); g.lineTo(x, ch); g.stroke();
        g.beginPath(); g.moveTo(0, y); g.lineTo(cw, y); g.stroke();
        const lo = lon[0] + (lon[1] - lon[0]) * (k / 10);
        const la = lat[1] - (lat[1] - lat[0]) * (k / 10);
        g.textAlign = 'left';
        if (x > 300 && x < cw - 360) g.fillText(`${lo.toFixed(1)}°E`, x + 4, 72);
        if (y > 140 && y < ch - 220) g.fillText(`${Math.abs(la).toFixed(1)}°S`, 300, y - 8);
      }
      g.setLineDash([]);
    }

    // vignette
    const vg = g.createRadialGradient(cw / 2, ch / 2, Math.min(cw, ch) * 0.35, cw / 2, ch / 2, Math.max(cw, ch) * 0.75);
    vg.addColorStop(0, 'rgba(2,6,14,0)');
    vg.addColorStop(1, 'rgba(2,6,14,0.55)');
    g.fillStyle = vg;
    g.fillRect(0, 0, cw, ch);
    dirty = false;
  }

  // ------------------------------------------------------------ dynamic
  function neonCircle(x, y, r, color, alpha, width = 1) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.strokeStyle = color.replace('A', alpha * 0.25);
    ctx.lineWidth = width + 4;
    ctx.stroke();
    ctx.strokeStyle = color.replace('A', alpha);
    ctx.lineWidth = width;
    ctx.stroke();
  }

  function label(x, y, text, sub, color = '#d9f3ff', gap = 18) {
    ctx.font = `17px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const w = Math.max(ctx.measureText(text).width, sub ? ctx.measureText(sub).width : 0) + 16;
    // flip to the left of the marker when the label would slide under the right-hand HUD
    if (x + w > cw - safeRight()) x = x - gap * 2 - w;
    const h = sub ? 38 : 22;
    ctx.fillStyle = 'rgba(4,12,26,0.8)';
    ctx.strokeStyle = 'rgba(92,225,255,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(x, y - h / 2, w, h, 4);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = color;
    ctx.fillText(text, x + 8, sub ? y - 8 : y + 1);
    if (sub) {
      ctx.font = `15px ${FONT}`;
      ctx.fillStyle = 'rgba(150,200,230,0.85)';
      ctx.fillText(sub, x + 8, y + 9);
    }
  }

  function reticle(x, y, r) {
    const a = r * 0.45;
    ctx.strokeStyle = 'rgba(200,245,255,0.95)';
    ctx.lineWidth = 1.2;
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(x + sx * r, y + sy * (r - a));
      ctx.lineTo(x + sx * r, y + sy * r);
      ctx.lineTo(x + sx * (r - a), y + sy * r);
      ctx.stroke();
    });
  }

  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state.settings.animateMap) { t += dt; advance(dt); }
    if (!canvas.offsetParent) return;

    // smooth camera
    if (target.k !== null) {
      const e = Math.min(1, dt * 6);
      view.k += (target.k - view.k) * e;
      view.tx += (target.tx - view.tx) * e;
      view.ty += (target.ty - view.ty) * e;
      clampView();
      dirty = true;
      if (Math.abs(target.k - view.k) < 0.0005 && Math.abs(target.tx - view.tx) < 0.3 && Math.abs(target.ty - view.ty) < 0.3) target.k = null;
    }
    if (dirty) drawStatic();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    noHint(ctx);
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(layer, 0, 0, cw, ch);
    const glowK = state.settings.glow;

    // drifting motes
    if (state.settings.particles) {
      ctx.fillStyle = 'rgba(160,220,255,0.35)';
      motes.forEach((m) => {
        if (state.settings.animateMap) { m.y += m.v * dt * 6; m.x += Math.sin(t * 0.3 + m.s * 4) * 0.00015; }
        if (m.y > 1) m.y = 0;
        ctx.beginPath();
        ctx.arc(m.x * cw, m.y * ch, m.s, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // station range rings (soft neon circles)
    if (state.settings.showStations) {
      STATIONS.forEach((s, i) => {
        const [x, y] = toScreen(s.x, s.y);
        const base = 70 * view.k;
        for (let r = 1; r <= 3; r++) neonCircle(x, y, base * r, 'rgba(92,225,255,A)', 0.12 * glowK / r, 1);
        const p = ((t * 0.4 + i * 0.33) % 1);
        neonCircle(x, y, 10 + p * base * 2.4, 'rgba(124,242,200,A)', (1 - p) * 0.5 * glowK, 1.2);
      });
    }

    // submarine routes + trails
    if (state.settings.showTracks) {
      SUBMARINES.forEach((s) => {
        const pts = routes[s.id];
        ctx.beginPath();
        pts.forEach(([x, y], i) => { const [X, Y] = toScreen(x, y); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); });
        ctx.closePath();
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = -t * 20;
        ctx.strokeStyle = hexA(s.color, 0.35);
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.setLineDash([]);
        // trail: last 14% of the route
        const tm = telemetry.subs[s.id];
        const N = 48;
        for (let k = 0; k < N; k++) {
          const p0 = tm.progress - (k / N) * 0.14;
          const p1 = tm.progress - ((k + 1) / N) * 0.14;
          const [x0, y0] = subPosition(s, (p0 + 1) % 1);
          const [x1, y1] = subPosition(s, (p1 + 1) % 1);
          const [X0, Y0] = toScreen(x0, y0), [X1, Y1] = toScreen(x1, y1);
          ctx.beginPath(); ctx.moveTo(X0, Y0); ctx.lineTo(X1, Y1);
          const a = 1 - k / N;
          ctx.strokeStyle = hexA(s.color, a * 0.9);
          ctx.lineWidth = 2.2 * a + 0.4;
          ctx.stroke();
        }
      });
    }

    // creatures & sites
    if (state.settings.showCreatures) {
      CREATURES.forEach((c, i) => {
        const [x, y] = toScreen(c.x, c.y);
        const p = (Math.sin(t * 2 + i) + 1) / 2;
        neonCircle(x, y, 12 + p * 4, 'rgba(159,140,255,A)', 0.35 * glowK + 0.1, 1);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = c.type === 'site' ? '#7cf2c8' : '#b9abff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12 * glowK;
        ctx.fillRect(-4, -4, 8, 8);
        ctx.restore();
        if (hoverId === c.id || selectedId === c.id) label(x + 20, y, c.name, `${fmt.depth(c.depth).v} ${fmt.depth(c.depth).u}`);
      });
    }

    // stations
    if (state.settings.showStations) {
      STATIONS.forEach((s) => {
        const [x, y] = toScreen(s.x, s.y);
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = (k / 6) * Math.PI * 2 + Math.PI / 6;
          const px = x + Math.cos(a) * 9, py = y + Math.sin(a) * 9;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(4,14,28,0.9)';
        ctx.fill();
        ctx.strokeStyle = '#7cf2c8';
        ctx.shadowColor = '#7cf2c8';
        ctx.shadowBlur = 10 * glowK;
        ctx.lineWidth = 1.4;
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#7cf2c8';
        ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
        label(x + 18, y - 2, s.name, hoverId === s.id || selectedId === s.id ? `${s.klass} · ${fmt.depth(s.depth).v} ${fmt.depth(s.depth).u}` : null, '#bff7e4');
      });
    }

    // submarines
    SUBMARINES.forEach((s) => {
      const tm = telemetry.subs[s.id];
      const [x, y] = toScreen(tm.x, tm.y);
      const sel = selectedId === s.id;
      if (sel) {
        // sonar sweep
        const R = 120;
        const ang = t * 1.4;
        const grad = ctx.createConicGradient(ang, x, y);
        grad.addColorStop(0, hexA(s.color, 0.32 * glowK + 0.08));
        grad.addColorStop(0.12, hexA(s.color, 0));
        grad.addColorStop(1, hexA(s.color, 0));
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(x, y, R, 0, Math.PI * 2); ctx.fill();
        neonCircle(x, y, R, 'rgba(92,225,255,A)', 0.4, 1);
        neonCircle(x, y, R * 0.5, 'rgba(92,225,255,A)', 0.2, 1);
      }
      const p = (t * 0.8 + s.routeSpeed * 50) % 1;
      neonCircle(x, y, 8 + p * 26, hexA(s.color, 'A'), (1 - p) * 0.7, 1.2);

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(tm.heading);
      ctx.beginPath();
      ctx.moveTo(11, 0); ctx.lineTo(-7, 7); ctx.lineTo(-3, 0); ctx.lineTo(-7, -7); ctx.closePath();
      ctx.fillStyle = s.color;
      ctx.shadowColor = s.color;
      ctx.shadowBlur = 16 * glowK;
      ctx.fill();
      ctx.restore();

      const d = fmt.depth(tm.depth);
      label(x + 22, y - 22, s.name, `${s.status} · ${d.v} ${d.u}`, '#e6f8ff');
      if (sel) reticle(x, y, 20);
    });

    // selection reticle for non-sub objects
    if (selectedId) {
      const o = [...STATIONS, ...CREATURES].find((q) => q.id === selectedId);
      if (o) { const [x, y] = toScreen(o.x, o.y); reticle(x, y, 18 + Math.sin(t * 3) * 1.5); }
    }
  }

  // ------------------------------------------------------------ hit testing
  function objectsOnScreen() {
    const arr = [];
    SUBMARINES.forEach((s) => { const tm = telemetry.subs[s.id]; arr.push([s.id, ...toScreen(tm.x, tm.y)]); });
    if (state.settings.showStations) STATIONS.forEach((s) => arr.push([s.id, ...toScreen(s.x, s.y)]));
    if (state.settings.showCreatures) CREATURES.forEach((c) => arr.push([c.id, ...toScreen(c.x, c.y)]));
    return arr;
  }
  function hit(mx, my) {
    let best = null, bd = 18 * 18;
    objectsOnScreen().forEach(([id, x, y]) => {
      const d = (x - mx) ** 2 + (y - my) ** 2;
      if (d < bd) { bd = d; best = id; }
    });
    return best;
  }

  // ------------------------------------------------------------ interaction
  let drag = null;
  canvas.addEventListener('pointerdown', (e) => {
    drag = { x: e.clientX, y: e.clientY, tx: view.tx, ty: view.ty, moved: false };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    if (drag) {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      view.tx = drag.tx + dx; view.ty = drag.ty + dy;
      target.k = null;
      clampView(); dirty = true;
      canvas.style.cursor = 'grabbing';
      return;
    }
    const id = hit(mx, my);
    if (id !== hoverId) { hoverId = id; onHover && onHover(id); }
    canvas.style.cursor = id ? 'pointer' : 'grab';
    const [wx, wy] = toWorld(mx, my);
    if (onCursor && wx >= 0 && wx <= 1 && wy >= 0 && wy <= 1) onCursor({ x: wx, y: wy, depth: depthAt(wx, wy) });
  });
  canvas.addEventListener('pointerup', (e) => {
    const r = canvas.getBoundingClientRect();
    if (drag && !drag.moved) {
      const id = hit(e.clientX - r.left, e.clientY - r.top);
      onSelect && onSelect(id);
    }
    drag = null;
    canvas.style.cursor = 'grab';
  });
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    zoomAt(e.clientX - r.left, e.clientY - r.top, Math.exp(-e.deltaY * 0.0015), false);
  }, { passive: false });

  function zoomAt(mx, my, f, smooth = true) {
    const base = target.k !== null ? target : view;
    const k = Math.min(view.minK * 4, Math.max(view.minK, base.k * f));
    const wx = (mx - base.tx) / base.k, wy = (my - base.ty) / base.k;
    const nv = { k, tx: mx - wx * k, ty: my - wy * k };
    clampView(nv);
    if (smooth) Object.assign(target, nv);
    else { Object.assign(view, nv); target.k = null; dirty = true; }
  }

  function focus(id, fx = 0.5, fy = 0.45) {
    let pos = null;
    const sub = telemetry.subs[id];
    if (sub) pos = [sub.x, sub.y];
    const o = [...STATIONS, ...CREATURES].find((q) => q.id === id);
    if (o) pos = [o.x, o.y];
    if (!pos) return;
    const [px, py] = pos;
    // zoom in far enough that the map can actually pan the object to (fx, fy)
    const need = Math.max(
      (cw * fx) / (W0 * Math.max(0.01, px)),
      (cw * (1 - fx)) / (W0 * Math.max(0.01, 1 - px)),
      (ch * fy) / (H0 * Math.max(0.01, py)),
      (ch * (1 - fy)) / (H0 * Math.max(0.01, 1 - py))
    );
    const k = Math.min(view.minK * 4, Math.max(view.k, view.minK * 1.6, need));
    const nv = { k, tx: cw * fx - px * W0 * k, ty: ch * fy - py * H0 * k };
    clampView(nv);
    Object.assign(target, nv);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  document.fonts && document.fonts.ready.then(() => { dirty = true; });

  on('settings', ({ key }) => {
    if (key === 'contourInterval' || key === 'units' || key === '*') {
      interval = state.settings.contourInterval;
      fill = buildFill(interval);
      contours = buildContours(interval);
    }
    dirty = true;
  });
  on('select', (id) => { selectedId = id; });

  requestAnimationFrame(frame);

  return {
    zoomIn: () => zoomAt(cw / 2, ch / 2, 1.4),
    zoomOut: () => zoomAt(cw / 2, ch / 2, 1 / 1.4),
    recenter: () => {
      const k = view.minK * 1.08;
      Object.assign(target, { k, tx: (cw - W0 * k) / 2, ty: (ch - H0 * k) / 2 });
    },
    focus,
    get zoom() { return view.k / view.minK; },
    destroy: () => { running = false; ro.disconnect(); }
  };
}

function hexA(hex, a) {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export const DEPTH_RAMP = RAMP;
