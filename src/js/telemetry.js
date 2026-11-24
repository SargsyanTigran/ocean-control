// Live telemetry simulation: moves submarines along their routes and
// produces depth / pressure / temperature readings.
import { SUBMARINES } from './data.js';
import { state, emit } from './store.js';

const HISTORY = 48;

export const telemetry = {
  t: 0,
  subs: {}            // id → { x, y, heading, progress, depth, pressure, temp, history: [] }
};

function routePoint(route, p) {
  // p in [0,1) across the closed route
  const n = route.length;
  const f = (p % 1) * n;
  const i = Math.floor(f);
  const k = f - i;
  const a = route[i];
  const b = route[(i + 1) % n];
  // smoothstep between waypoints for soft turns
  const s = k * k * (3 - 2 * k);
  return [a[0] + (b[0] - a[0]) * s, a[1] + (b[1] - a[1]) * s, Math.atan2(b[1] - a[1], b[0] - a[0])];
}

export function subPosition(sub, progress) {
  return routePoint(sub.route, progress);
}

SUBMARINES.forEach((s, i) => {
  const progress = 0.15 + i * 0.27;
  const [x, y, heading] = routePoint(s.route, progress);
  telemetry.subs[s.id] = {
    x, y, heading, progress,
    depth: s.baseDepth, pressure: s.baseDepth / 10.2, temp: s.baseTemp,
    battery: s.battery,
    history: Array.from({ length: HISTORY }, (_, k) => s.baseDepth + Math.sin(k * 0.4 + i) * s.depthSwing * 0.5)
  };
});

// Continuous position update (called from the map's animation loop)
export function advance(dt) {
  telemetry.t += dt;
  for (const s of SUBMARINES) {
    const tm = telemetry.subs[s.id];
    tm.progress = (tm.progress + dt * s.routeSpeed) % 1;
    const [x, y, h] = routePoint(s.route, tm.progress);
    tm.x = x; tm.y = y;
    // ease heading to avoid snapping at waypoints
    let d = h - tm.heading;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    tm.heading += d * Math.min(1, dt * 3);
  }
}

// Discrete sensor tick
function tick() {
  const t = telemetry.t;
  SUBMARINES.forEach((s, i) => {
    const tm = telemetry.subs[s.id];
    tm.depth = s.baseDepth + Math.sin(t * 0.12 + i * 2) * s.depthSwing + (Math.random() - 0.5) * 12;
    tm.pressure = tm.depth / 10.2 + 1.01;
    tm.temp = s.baseTemp + Math.sin(t * 0.05 + i) * 0.25 + (Math.random() - 0.5) * 0.05;
    tm.battery = Math.max(0.05, tm.battery - 0.00004);
    tm.history.push(tm.depth);
    if (tm.history.length > HISTORY) tm.history.shift();
  });
  emit('telemetry', telemetry);
}

let timer;
export function startTelemetry() {
  clearInterval(timer);
  tick();
  timer = setInterval(tick, state.settings.telemetryRate);
}
