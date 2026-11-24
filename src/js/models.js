// Procedural 3D models for Ocean Control (three.js).
// Every builder returns { group, update(t, dt) }.
import * as THREE from 'three';
import { ParametricGeometry } from 'three/addons/geometries/ParametricGeometry.js';

const C = {
  hull: 0x22344f,
  hullDark: 0x121d2e,
  cyan: 0x5ce1ff,
  teal: 0x7cf2c8,
  ice: 0xcfeeff,
  violet: 0x9f8cff,
  amber: 0xffcf7a,
  deep: 0x0a1424
};

const metal = (color = C.hull, rough = 0.38, metalness = 0.75) =>
  new THREE.MeshStandardMaterial({ color, roughness: rough, metalness });

const glow = (color = C.cyan, intensity = 2.2) =>
  new THREE.MeshStandardMaterial({ color: 0x000000, emissive: color, emissiveIntensity: intensity, roughness: 1 });

const soft = (color, opacity = 0.55, emissive = color, ei = 0.6) =>
  new THREE.MeshStandardMaterial({
    color, emissive, emissiveIntensity: ei, transparent: true, opacity,
    roughness: 0.25, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false
  });

const additive = (color, opacity = 0.35) =>
  new THREE.MeshBasicMaterial({ color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });

// Halo shell: backside additive copy for a soft outer glow
function halo(mesh, color, scale = 1.08, opacity = 0.18) {
  const h = new THREE.Mesh(mesh.geometry, new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, blending: THREE.AdditiveBlending, side: THREE.BackSide, depthWrite: false
  }));
  h.scale.setScalar(scale);
  mesh.add(h);
  return h;
}

// Tube along +X that can be bent each frame by a displacement function.
function wiggleTube({ length = 3, radius = 0.06, taper = 0.1, segments = 40, radial = 8 }) {
  const geo = new THREE.CylinderGeometry(radius * taper, radius, length, radial, segments, true);
  geo.rotateZ(-Math.PI / 2);             // axis along X: base at -L/2, tip at +L/2
  geo.translate(length / 2, 0, 0);        // base at origin
  const base = geo.attributes.position.array.slice();
  return {
    geo,
    bend(fn) {
      const pos = geo.attributes.position.array;
      for (let i = 0; i < pos.length; i += 3) {
        const x = base[i];
        const u = x / length;
        const [dy, dz] = fn(u, x);
        pos[i + 1] = base[i + 1] + dy;
        pos[i + 2] = base[i + 2] + dz;
      }
      geo.attributes.position.needsUpdate = true;
      geo.computeVertexNormals();
    }
  };
}

// ------------------------------------------------------------------ SUBMARINE
function submarine({ auv = false } = {}) {
  const g = new THREE.Group();
  const len = auv ? 5.2 : 4.4;
  const rad = auv ? 0.5 : 0.78;

  // hull via lathe (axis Y → rotated to X)
  const pts = [];
  const N = 40;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let r;
    if (u > 0.62) r = Math.sqrt(Math.max(0, 1 - ((u - 0.62) / 0.38) ** 2));
    else r = 0.22 + 0.78 * Math.sin((u / 0.62) * Math.PI / 2);
    pts.push(new THREE.Vector2(Math.max(0.001, r * rad), -len / 2 + u * len));
  }
  const hullGeo = new THREE.LatheGeometry(pts, 48);
  hullGeo.rotateZ(-Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, metal(C.hull, 0.32, 0.8));
  g.add(hull);

  // panel seams / light rings
  const ringMat = glow(C.cyan, 1.6);
  [-0.9, 0.35].forEach((x, i) => {
    const r = rad * (i === 0 ? 0.86 : 0.99);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 8, 64), ringMat);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = x;
    g.add(ring);
  });

  // side light strips
  const stripGeo = new THREE.BoxGeometry(len * 0.42, 0.03, 0.03);
  [1, -1].forEach((s) => {
    const strip = new THREE.Mesh(stripGeo, glow(C.teal, 1.4));
    strip.position.set(-0.2, -rad * 0.2, s * rad * 0.97);
    g.add(strip);
  });

  // viewport dome at nose
  const port = new THREE.Mesh(
    new THREE.SphereGeometry(rad * 0.55, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    soft(0x0b2940, 0.85, C.cyan, 0.9)
  );
  port.rotation.z = -Math.PI / 2;
  port.position.x = len / 2 - rad * 0.28;
  g.add(port);

  if (!auv) {
    // conning tower
    const towerGeo = new THREE.CylinderGeometry(0.28, 0.36, 0.55, 32);
    towerGeo.scale(2.1, 1, 1);
    const tower = new THREE.Mesh(towerGeo, metal(C.hullDark, 0.4, 0.7));
    tower.position.set(0.1, rad + 0.12, 0);
    g.add(tower);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.02, 0.5), glow(C.cyan, 1.2));
    cap.position.set(0.1, rad + 0.4, 0);
    g.add(cap);
    // skids
    [1, -1].forEach((s) => {
      const skid = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 2.4, 4, 8), metal(C.hullDark));
      skid.rotation.z = Math.PI / 2;
      skid.position.set(0.2, -rad - 0.18, s * 0.45);
      g.add(skid);
      [-0.7, 0.9].forEach((x) => {
        const strut = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.32), metal(C.hullDark));
        strut.position.set(x, -rad - 0.02, s * 0.42);
        strut.rotation.x = s * 0.35;
        g.add(strut);
      });
    });
    // manipulator arm
    const arm = new THREE.Group();
    const seg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.7), metal(C.hull));
    seg1.rotation.z = -0.9; seg1.position.set(0.28, -0.2, 0);
    const seg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.55), metal(C.hull));
    seg2.rotation.z = 0.5; seg2.position.set(0.72, -0.42, 0);
    const claw = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glow(C.teal, 1.5));
    claw.position.set(0.85, -0.65, 0);
    arm.add(seg1, seg2, claw);
    arm.position.set(len / 2 - 1.0, -rad * 0.55, 0.35);
    g.add(arm);
  } else {
    // sensor pods for AUV
    [1, -1].forEach((s) => {
      const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.9, 6, 16), metal(C.hullDark));
      pod.rotation.z = Math.PI / 2;
      pod.position.set(0.6, -0.2, s * (rad + 0.18));
      g.add(pod);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glow(C.violet, 2));
      tip.position.set(1.2, -0.2, s * (rad + 0.18));
      g.add(tip);
    });
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.6), metal(C.hullDark));
    mast.position.set(-0.6, rad + 0.25, 0);
    g.add(mast);
  }

  // tail fins (cross)
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.lineTo(-0.7, 0); finShape.lineTo(-0.85, 0.55); finShape.lineTo(-0.35, 0.55); finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: 0.04, bevelEnabled: false });
  finGeo.translate(0, rad * 0.35, -0.02);
  for (let k = 0; k < 4; k++) {
    const fin = new THREE.Mesh(finGeo, metal(C.hullDark, 0.5, 0.6));
    fin.position.x = -len / 2 + 0.95;
    fin.rotation.x = (k * Math.PI) / 2;
    g.add(fin);
  }

  // propeller with shroud
  const prop = new THREE.Group();
  const bladeGeo = new THREE.BoxGeometry(0.04, 0.42, 0.12);
  for (let k = 0; k < 5; k++) {
    const b = new THREE.Mesh(bladeGeo, metal(0x3a5578, 0.3, 0.9));
    b.position.y = 0.2;
    const pivot = new THREE.Group();
    pivot.rotation.x = (k / 5) * Math.PI * 2;
    b.rotation.y = 0.5;
    pivot.add(b);
    prop.add(pivot);
  }
  prop.position.x = -len / 2 - 0.12;
  g.add(prop);
  const shroud = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.035, 8, 48), glow(C.cyan, 1.1));
  shroud.rotation.y = Math.PI / 2;
  shroud.position.x = -len / 2 - 0.12;
  g.add(shroud);

  // headlights + beams
  [1, -1].forEach((s) => {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glow(C.ice, 3));
    lamp.position.set(len / 2 - 0.55, -rad * 0.35, s * rad * 0.6);
    g.add(lamp);
    const beamGeo = new THREE.ConeGeometry(0.7, 3.2, 32, 8, true);
    // fade the beam from the lamp (apex, +y) to the far end
    const bp = beamGeo.attributes.position;
    const bc = [];
    for (let i = 0; i < bp.count; i++) { const f = Math.pow((bp.getY(i) + 1.6) / 3.2, 2.6); bc.push(0.36 * f, 0.88 * f, 1.0 * f); }
    beamGeo.setAttribute('color', new THREE.Float32BufferAttribute(bc, 3));
    const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.FrontSide }));
    beam.userData.noBounds = true;
    beam.rotation.z = Math.PI / 2;
    beam.position.set(len / 2 - 0.55 + 1.6, -rad * 0.35 - 0.15, s * rad * 0.6);
    g.add(beam);
  });

  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(C.teal, 3));
  beacon.position.set(auv ? -0.6 : 0.1, auv ? rad + 0.58 : rad + 0.5, 0);
  g.add(beacon);

  return {
    group: g,
    update(t) {
      prop.rotation.x = t * 6;
      beacon.material.emissiveIntensity = 1 + Math.max(0, Math.sin(t * 3)) * 3;
      g.position.y = Math.sin(t * 0.8) * 0.08;
      g.rotation.z = Math.sin(t * 0.6) * 0.03;
    }
  };
}

// ------------------------------------------------------------------ STATION
function station() {
  const g = new THREE.Group();

  const plate = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.22, 6), metal(0x0c1626, 0.85, 0.3));
  plate.position.y = -0.1;
  g.add(plate);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(2.4, 0.02, 6, 6), glow(C.cyan, 1.4));
  edge.rotation.x = Math.PI / 2;
  edge.rotation.z = Math.PI / 6;
  edge.position.y = 0.02;
  g.add(edge);

  // central dome
  const dome = new THREE.Mesh(new THREE.SphereGeometry(1.05, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), metal(C.hull, 0.3, 0.8));
  dome.position.y = 0.02;
  g.add(dome);
  const windowBand = new THREE.Mesh(new THREE.CylinderGeometry(0.93, 1.0, 0.16, 48, 1, true), soft(0x0a2236, 0.9, C.cyan, 1.2));
  windowBand.position.y = 0.42;
  g.add(windowBand);
  const topRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.03, 8, 48), glow(C.teal, 1.6));
  topRing.rotation.x = Math.PI / 2;
  topRing.position.y = 0.92;
  g.add(topRing);

  // modules
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + Math.PI / 6;
    const pod = new THREE.Group();
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 8, 24), metal(C.hull, 0.35, 0.75));
    body.rotation.z = Math.PI / 2;
    pod.add(body);
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.02, 8, 32), glow(C.cyan, 1.3));
    band.rotation.y = Math.PI / 2;
    pod.add(band);
    pod.position.set(Math.cos(a) * 1.75, 0.35, Math.sin(a) * 1.75);
    pod.rotation.y = -a;
    g.add(pod);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.8, 16), metal(C.hullDark));
    tube.rotation.z = Math.PI / 2;
    tube.position.set(Math.cos(a) * 1.1, 0.3, Math.sin(a) * 1.1);
    tube.rotation.y = -a;
    g.add(tube);
  }

  // legs
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 0.9), metal(C.hullDark));
    leg.position.set(Math.cos(a) * 2.1, -0.6, Math.sin(a) * 2.1);
    leg.rotation.z = Math.cos(a) * 0.25;
    leg.rotation.x = -Math.sin(a) * 0.25;
    g.add(leg);
  }

  // mast + dish
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.4), metal(C.hull));
  mast.position.set(0.4, 1.2, -0.2);
  g.add(mast);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), glow(C.teal, 3));
  beacon.position.set(0.4, 1.95, -0.2);
  g.add(beacon);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.35, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3.2), metal(0x3a5578, 0.3, 0.8));
  dish.material.side = THREE.DoubleSide;
  dish.position.set(-0.55, 1.05, 0.3);
  dish.rotation.set(0.7, 0, 0.5);
  g.add(dish);

  // scanning ring
  const scan = new THREE.Mesh(new THREE.RingGeometry(2.6, 2.66, 96), additive(C.cyan, 0.5));
  scan.rotation.x = -Math.PI / 2;
  scan.position.y = -0.2;
  g.add(scan);

  return {
    group: g,
    update(t) {
      beacon.material.emissiveIntensity = 1 + Math.max(0, Math.sin(t * 2.5)) * 3;
      const s = 1 + ((t * 0.35) % 1) * 0.6;
      scan.scale.setScalar(s);
      scan.material.opacity = 0.5 * (1 - ((t * 0.35) % 1));
      dish.rotation.y = t * 0.4;
    }
  };
}

// ------------------------------------------------------------------ JELLYFISH
function jellyfish() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 24; i++) {
    const u = i / 24;
    const a = u * Math.PI * 0.55;
    const r = Math.sin(a) * 1.3 * (1 + 0.06 * Math.sin(u * 18));
    pts.push(new THREE.Vector2(Math.max(0.001, r), Math.cos(a) * 1.0));
  }
  pts.push(new THREE.Vector2(1.15, 0.02));
  const bellGeo = new THREE.LatheGeometry(pts, 64);
  const bell = new THREE.Mesh(bellGeo, soft(0x7fd8ff, 0.42, C.cyan, 0.7));
  g.add(bell);
  halo(bell, C.cyan, 1.12, 0.12);
  const inner = new THREE.Mesh(bellGeo, soft(0xb7a8ff, 0.5, C.violet, 1.2));
  inner.scale.setScalar(0.55);
  inner.position.y = 0.1;
  g.add(inner);

  // radial canals
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2;
    const curve = new THREE.EllipseCurve(0, 0, 1.22, 0.98, 0, Math.PI / 2);
    const p2 = curve.getPoints(20).map((p) => new THREE.Vector3(p.x * Math.cos(a), p.y, p.x * Math.sin(a)));
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(p2), new THREE.LineBasicMaterial({ color: C.ice, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending }));
    g.add(line);
  }

  // tentacles
  const tentacles = [];
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const len = 2.4 + (k % 3) * 0.9;
    const wt = wiggleTube({ length: len, radius: 0.025, taper: 0.3, segments: 30, radial: 5 });
    const m = new THREE.Mesh(wt.geo, additive(k % 2 ? C.cyan : C.violet, 0.55));
    m.rotation.z = -Math.PI / 2;     // hang down
    m.position.set(Math.cos(a) * 1.08, 0.02, Math.sin(a) * 1.08);
    g.add(m);
    tentacles.push({ wt, phase: k * 0.7 });
  }
  // oral arms
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + 0.4;
    const wt = wiggleTube({ length: 1.8, radius: 0.09, taper: 0.2, segments: 24, radial: 8 });
    const m = new THREE.Mesh(wt.geo, soft(0xa4c8ff, 0.5, C.violet, 0.9));
    m.rotation.z = -Math.PI / 2;
    m.position.set(Math.cos(a) * 0.25, 0.1, Math.sin(a) * 0.25);
    g.add(m);
    tentacles.push({ wt, phase: k * 1.3, arm: true });
  }
  g.position.y = 0.6;

  return {
    group: g,
    update(t) {
      const p = Math.sin(t * 1.6);
      bell.scale.set(1 + p * 0.06, 1 - p * 0.08, 1 + p * 0.06);
      inner.scale.set(0.55 + p * 0.03, 0.55 - p * 0.04, 0.55 + p * 0.03);
      g.position.y = 0.6 + Math.sin(t * 0.8) * 0.15;
      tentacles.forEach(({ wt, phase, arm }) => {
        wt.bend((u) => {
          const amp = (arm ? 0.25 : 0.4) * u * u;
          return [Math.sin(t * 1.4 + u * 5 + phase) * amp, Math.cos(t * 1.1 + u * 4 + phase) * amp];
        });
      });
    }
  };
}

// ------------------------------------------------------------------ ANGLERFISH
function anglerfish() {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0x1b2b45, roughness: 0.55, metalness: 0.25, emissive: 0x0a1a33, emissiveIntensity: 0.6 });

  const bodyGeo = new THREE.SphereGeometry(1, 48, 32);
  // squash + bulge the head
  const pa = bodyGeo.attributes.position;
  for (let i = 0; i < pa.count; i++) {
    let x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
    const head = Math.max(0, x);
    y *= 0.92 + head * 0.12;
    z *= 0.78;
    x *= 1.25;
    if (x > 0.4 && y < 0) y *= 1.15;   // jaw
    pa.setXYZ(i, x, y, z);
  }
  bodyGeo.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeo, skin);
  g.add(body);
  halo(body, C.cyan, 1.04, 0.08);

  // mouth
  const mouth = new THREE.Mesh(new THREE.CircleGeometry(0.55, 32), new THREE.MeshBasicMaterial({ color: 0x02050a }));
  mouth.scale.set(1, 0.55, 1);
  mouth.rotation.y = Math.PI / 2;
  mouth.position.set(1.2, -0.2, 0);
  g.add(mouth);
  const toothMat = new THREE.MeshStandardMaterial({ color: 0xdff4ff, emissive: C.ice, emissiveIntensity: 0.4 });
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.16 + (k % 2) * 0.07, 6), toothMat);
    const y = Math.sin(a) * 0.3 - 0.2, z = Math.cos(a) * 0.55;
    tooth.position.set(1.22, y, z);
    tooth.lookAt(1.22, -0.2, 0);
    tooth.rotateX(Math.PI / 2);
    g.add(tooth);
  }

  // eyes
  [1, -1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 16, 12), new THREE.MeshStandardMaterial({ color: 0x050a12, roughness: 0.1, metalness: 0.5 }));
    eye.position.set(0.85, 0.42, s * 0.5);
    g.add(eye);
    const iris = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.012, 8, 24), glow(C.teal, 2));
    iris.position.copy(eye.position);
    iris.lookAt(eye.position.clone().multiplyScalar(2));
    g.add(iris);
  });

  // tail + fins
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.3, 24), skin);
  tail.rotation.z = Math.PI / 2;
  tail.position.x = -1.6;
  g.add(tail);
  const finShape = new THREE.Shape();
  finShape.moveTo(0, 0); finShape.quadraticCurveTo(-0.6, 0.9, -0.9, 0.7); finShape.lineTo(-0.6, 0); finShape.quadraticCurveTo(-0.9, -0.7, -0.6, -0.9); finShape.closePath();
  const tailFin = new THREE.Mesh(new THREE.ShapeGeometry(finShape), soft(0x4f88c8, 0.6, C.cyan, 0.5));
  tailFin.position.x = -2.2;
  g.add(tailFin);
  const pecs = [];
  [1, -1].forEach((s) => {
    const pec = new THREE.Mesh(new THREE.CircleGeometry(0.4, 16, 0, Math.PI), soft(0x4f88c8, 0.55, C.cyan, 0.4));
    pec.position.set(-0.1, -0.35, s * 0.7);
    pec.rotation.set(Math.PI / 2, 0, Math.PI);
    g.add(pec);
    pecs.push(pec);
  });

  // lure
  const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0.5, 0.85, 0), new THREE.Vector3(1.0, 2.1, 0), new THREE.Vector3(1.9, 1.35, 0));
  const rod = new THREE.Mesh(new THREE.TubeGeometry(curve, 32, 0.025, 8), skin);
  g.add(rod);
  const lure = new THREE.Mesh(new THREE.SphereGeometry(0.13, 24, 16), glow(C.teal, 4));
  lure.position.copy(curve.getPoint(1));
  g.add(lure);
  const lureHalo = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), additive(C.teal, 0.1));
  lure.add(lureHalo);
  const light = new THREE.PointLight(C.teal, 6, 6, 1.5);
  lure.add(light);

  // spots
  for (let k = 0; k < 18; k++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), glow(C.cyan, 2));
    const th = Math.random() * Math.PI * 2, ph = Math.random() * Math.PI;
    d.position.set(Math.cos(th) * Math.sin(ph) * 1.2 - 0.2, Math.cos(ph) * 0.9, Math.sin(th) * Math.sin(ph) * 0.78);
    g.add(d);
  }

  return {
    group: g,
    update(t) {
      const f = 0.7 + Math.sin(t * 2.2) * 0.3;
      lure.material.emissiveIntensity = 2 + f * 3;
      light.intensity = 3 + f * 5;
      lureHalo.scale.setScalar(0.9 + f * 0.3);
      tailFin.rotation.y = Math.sin(t * 2) * 0.35;
      pecs.forEach((p, i) => (p.rotation.x = Math.PI / 2 + Math.sin(t * 2.5 + i) * 0.3));
      g.position.y = Math.sin(t * 0.7) * 0.1;
    }
  };
}

// ------------------------------------------------------------------ SQUID
function squid() {
  const g = new THREE.Group();
  const pts = [];
  for (let i = 0; i <= 30; i++) {
    const u = i / 30;
    const r = Math.sin(Math.min(1, u * 1.25) * Math.PI / 2) * 0.55 * (1 - Math.pow(u, 3) * 0.95);
    pts.push(new THREE.Vector2(Math.max(0.001, r), u * 3.0));
  }
  const mantleGeo = new THREE.LatheGeometry(pts, 48);
  mantleGeo.rotateZ(-Math.PI / 2);   // tip to +X
  const skin = new THREE.MeshStandardMaterial({ color: 0x30426e, emissive: 0x1a2a66, emissiveIntensity: 0.7, roughness: 0.45, metalness: 0.2 });
  const mantle = new THREE.Mesh(mantleGeo, skin);
  g.add(mantle);
  halo(mantle, C.violet, 1.05, 0.1);

  const fins = [];
  [1, -1].forEach((s) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0); shape.quadraticCurveTo(0.5, 0.9 * s, 1.0, 0); shape.closePath();
    const fin = new THREE.Mesh(new THREE.ShapeGeometry(shape), soft(0x6d7fd9, 0.6, C.violet, 0.6));
    fin.rotation.x = Math.PI / 2;
    fin.position.set(1.9, 0, 0);
    g.add(fin);
    fins.push(fin);
  });

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.48, 32, 24), skin);
  head.scale.set(0.9, 0.9, 1);
  head.position.x = -0.25;
  g.add(head);
  [1, -1].forEach((s) => {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.16, 20, 16), glow(C.ice, 1.2));
    eye.position.set(-0.25, 0.1, s * 0.4);
    g.add(eye);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.015, 8, 32), glow(C.cyan, 2));
    ring.position.copy(eye.position);
    ring.rotation.y = Math.PI / 2;
    g.add(ring);
  });

  const arms = [];
  for (let k = 0; k < 10; k++) {
    const a = (k / 10) * Math.PI * 2;
    const long = k < 2;
    const len = long ? 3.6 : 2.2;
    const wt = wiggleTube({ length: len, radius: long ? 0.05 : 0.09, taper: 0.15, segments: 36, radial: 8 });
    const m = new THREE.Mesh(wt.geo, skin);
    m.rotation.y = Math.PI; // point to -X
    m.position.set(-0.55, Math.sin(a) * 0.22, Math.cos(a) * 0.22);
    g.add(m);
    arms.push({ wt, phase: k * 0.6, a });
  }

  // photophores
  for (let k = 0; k < 12; k++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), glow(C.violet, 2.5));
    const x = 0.2 + (k / 12) * 2.2;
    const r = 0.5 * (1 - Math.pow(x / 3, 3));
    const th = k * 1.3;
    d.position.set(x, Math.sin(th) * r, Math.cos(th) * r);
    g.add(d);
  }
  g.position.x = 0.4;

  return {
    group: g,
    update(t) {
      arms.forEach(({ wt, phase, a }) => {
        wt.bend((u) => {
          const amp = 0.35 * u * u;
          const w = Math.sin(t * 1.8 + u * 4 + phase) * amp;
          return [Math.sin(a) * 0.25 * u + w, Math.cos(a) * 0.25 * u + Math.cos(t * 1.3 + u * 3 + phase) * amp];
        });
      });
      fins.forEach((f, i) => (f.rotation.x = Math.PI / 2 + Math.sin(t * 2 + i * Math.PI) * 0.25));
      g.position.y = Math.sin(t * 0.6) * 0.12;
    }
  };
}

// ------------------------------------------------------------------ NAUTILUS
function nautilus() {
  const g = new THREE.Group();
  const a = 0.16, b = 0.18, T = Math.PI * 4.2;
  const shellGeo = new ParametricGeometry((u, v, target) => {
    const th = u * T;
    const r = a * Math.exp(b * th);
    const rho = r * 0.62;
    const ph = v * Math.PI * 2;
    const nx = Math.cos(th), ny = Math.sin(th);
    const x = r * nx + rho * Math.cos(ph) * nx;
    const y = r * ny + rho * Math.cos(ph) * ny;
    const z = rho * Math.sin(ph) * 0.9;
    target.set(x, y, z);
  }, 220, 32);
  // stripe colours
  const cols = [];
  const pos = shellGeo.attributes.position;
  const uvs = shellGeo.attributes.uv;
  const c1 = new THREE.Color(0x9fbfe6), c2 = new THREE.Color(0x26508c);
  for (let i = 0; i < pos.count; i++) {
    const u = uvs.getX(i);
    const s = Math.sin(u * 70) > 0.2 && u > 0.55 ? 1 : 0;
    const c = c1.clone().lerp(c2, s * 0.8);
    cols.push(c.r, c.g, c.b);
  }
  shellGeo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  shellGeo.computeVertexNormals();
  const shell = new THREE.Mesh(shellGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.15, emissive: 0x0b2244, emissiveIntensity: 0.5, side: THREE.DoubleSide }));
  const holder = new THREE.Group();
  holder.add(shell);
  holder.rotation.z = Math.PI;
  g.add(holder);

  // aperture & tentacles
  const rEnd = a * Math.exp(b * T);
  const ap = new THREE.Vector3(-rEnd * Math.cos(T), -rEnd * Math.sin(T), 0);
  const hood = new THREE.Mesh(new THREE.SphereGeometry(rEnd * 0.45, 24, 16), new THREE.MeshStandardMaterial({ color: 0x2a3d66, emissive: 0x112244, emissiveIntensity: 0.8, roughness: 0.6 }));
  hood.position.copy(ap);
  g.add(hood);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), glow(C.ice, 1.5));
  eye.position.copy(ap).add(new THREE.Vector3(0.25, 0.2, 0.55));
  g.add(eye);
  const tents = [];
  for (let k = 0; k < 16; k++) {
    const wt = wiggleTube({ length: 1.3 + (k % 4) * 0.2, radius: 0.03, taper: 0.4, segments: 20, radial: 5 });
    const m = new THREE.Mesh(wt.geo, soft(0x9bb6e8, 0.8, C.cyan, 0.4));
    const th = (k / 16) * Math.PI * 2;
    m.position.copy(ap).add(new THREE.Vector3(0.2, Math.sin(th) * 0.3, Math.cos(th) * 0.3));
    m.rotation.z = 0.2;
    g.add(m);
    tents.push({ wt, phase: k });
  }
  const bb = new THREE.Box3().setFromObject(g);
  const c = bb.getCenter(new THREE.Vector3());
  g.children.forEach((ch) => ch.position.sub(c));

  return {
    group: g,
    update(t) {
      tents.forEach(({ wt, phase }) => wt.bend((u) => [Math.sin(t * 2 + u * 4 + phase) * 0.15 * u, Math.cos(t * 1.7 + phase) * 0.15 * u]));
      g.rotation.z = Math.sin(t * 0.5) * 0.08;
      g.position.y = Math.sin(t * 0.7) * 0.1;
    }
  };
}

// ------------------------------------------------------------------ EEL
function eel() {
  const g = new THREE.Group();
  const L = 6;
  const wt = wiggleTube({ length: L, radius: 0.28, taper: 0.05, segments: 120, radial: 16 });
  // taper the head a little
  const mat = new THREE.MeshStandardMaterial({ color: 0x1f3557, emissive: 0x0d2a4d, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.3 });
  const body = new THREE.Mesh(wt.geo, mat);
  body.rotation.y = Math.PI;   // head at origin, body trails to -X
  body.position.x = L / 2;
  g.add(body);
  halo(body, C.cyan, 1.05, 0.08);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), mat);
  head.scale.set(1.5, 0.9, 0.9);
  head.position.x = L / 2 + 0.1;
  g.add(head);
  [1, -1].forEach((s) => {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glow(C.ice, 2));
    e.position.set(L / 2 + 0.3, 0.1, s * 0.2);
    g.add(e);
  });

  // glowing dorsal ribbon (lines following body)
  const N = 60;
  const ribbonGeo = new THREE.BufferGeometry();
  ribbonGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(N * 3), 3));
  const ribbon = new THREE.Line(ribbonGeo, new THREE.LineBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending }));
  g.add(ribbon);
  const dots = [];
  for (let k = 0; k < 14; k++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), glow(k % 2 ? C.cyan : C.violet, 3));
    g.add(d);
    dots.push({ d, u: 0.08 + k * 0.06 });
  }

  return {
    group: g,
    update(t) {
      const wave = (u) => Math.sin(t * 2.2 - u * 9) * (0.15 + u * 0.6);
      wt.bend((u) => [Math.sin(t * 1.1 - u * 4) * 0.15 * u, wave(u)]);
      const p = ribbonGeo.attributes.position.array;
      for (let i = 0; i < N; i++) {
        const u = i / (N - 1);
        const r = 0.28 * (1 - u * 0.95);
        p[i * 3] = L / 2 - u * L;
        p[i * 3 + 1] = Math.sin(t * 1.1 - u * 4) * 0.15 * u + r + 0.02;
        p[i * 3 + 2] = -wave(u);
      }
      ribbonGeo.attributes.position.needsUpdate = true;
      dots.forEach(({ d, u }) => {
        const r = 0.28 * (1 - u * 0.95);
        d.position.set(L / 2 - u * L, Math.sin(t * 1.1 - u * 4) * 0.15 * u, -wave(u) + r);
        d.material.emissiveIntensity = 2 + Math.sin(t * 4 + u * 20) * 1.5;
      });
      g.position.y = Math.sin(t * 0.6) * 0.1;
    }
  };
}

// ------------------------------------------------------------------ VENT
function vent() {
  const g = new THREE.Group();
  const rock = new THREE.MeshStandardMaterial({ color: 0x1d2a3d, roughness: 0.9, metalness: 0.1, flatShading: true });

  const floorGeo = new THREE.CircleGeometry(3, 48);
  const fp = floorGeo.attributes.position;
  for (let i = 0; i < fp.count; i++) fp.setZ(i, (Math.random() - 0.5) * 0.12);
  floorGeo.computeVertexNormals();
  const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x0e1826, roughness: 1, metalness: 0, flatShading: true }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -1.2;
  g.add(floor);

  const chimneys = [[0, 2.6, 0.5], [-1.1, 1.6, 0.35], [1.0, 1.9, 0.4]];
  const plumes = [];
  chimneys.forEach(([x, h, r], idx) => {
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const u = i / 14;
      pts.push(new THREE.Vector2(r * (1.3 - u * 0.6) * (1 + (Math.random() - 0.5) * 0.25), u * h));
    }
    const geo = new THREE.LatheGeometry(pts, 12);
    const m = new THREE.Mesh(geo, rock);
    m.position.set(x, -1.2, idx === 0 ? 0 : (idx === 1 ? 0.5 : -0.6));
    g.add(m);
    const mouth = new THREE.Mesh(new THREE.CircleGeometry(r * 0.55, 16), glow(C.teal, 2.5));
    mouth.rotation.x = -Math.PI / 2;
    mouth.position.set(m.position.x, -1.2 + h + 0.01, m.position.z);
    g.add(mouth);

    // plume particles
    const N = 90;
    const geoP = new THREE.BufferGeometry();
    const arr = new Float32Array(N * 3);
    const seeds = [];
    for (let i = 0; i < N; i++) seeds.push({ life: Math.random(), dx: (Math.random() - 0.5), dz: (Math.random() - 0.5) });
    geoP.setAttribute('position', new THREE.BufferAttribute(arr, 3));
    const pts3 = new THREE.Points(geoP, new THREE.PointsMaterial({ color: C.cyan, size: 0.09, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false }));
    g.add(pts3);
    plumes.push({ arr, geoP, seeds, origin: mouth.position.clone() });
  });

  // tube worms
  for (let k = 0; k < 16; k++) {
    const a = Math.random() * Math.PI * 2;
    const d = 1.4 + Math.random() * 1.2;
    const h = 0.4 + Math.random() * 0.7;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, h, 8), new THREE.MeshStandardMaterial({ color: 0xd7e6f5, roughness: 0.7 }));
    tube.position.set(Math.cos(a) * d, -1.2 + h / 2, Math.sin(a) * d);
    tube.rotation.z = (Math.random() - 0.5) * 0.3;
    g.add(tube);
    const plume = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), glow(k % 3 ? C.violet : C.cyan, 1.8));
    plume.scale.y = 1.5;
    plume.position.set(tube.position.x, -1.2 + h + 0.06, tube.position.z);
    g.add(plume);
  }
  const light = new THREE.PointLight(C.teal, 8, 8, 1.5);
  light.position.set(0, 1.6, 0);
  g.add(light);

  return {
    group: g,
    update(t, dt = 0.016) {
      plumes.forEach(({ arr, geoP, seeds, origin }) => {
        seeds.forEach((s, i) => {
          s.life += dt * 0.35;
          if (s.life > 1) { s.life = 0; s.dx = Math.random() - 0.5; s.dz = Math.random() - 0.5; }
          const spread = s.life * 0.9;
          arr[i * 3] = origin.x + s.dx * spread + Math.sin(t + i) * 0.05;
          arr[i * 3 + 1] = origin.y + s.life * 2.4;
          arr[i * 3 + 2] = origin.z + s.dz * spread;
        });
        geoP.attributes.position.needsUpdate = true;
      });
      light.intensity = 6 + Math.sin(t * 3) * 1.5;
    }
  };
}


// ------------------------------------------------------------------ ROV (tethered survey robot)
function rov() {
  const g = new THREE.Group();
  const frameMat = metal(0x2b4466, 0.4, 0.7);
  // open frame: 12 edges of a box
  const W = 2.6, H = 1.3, D = 1.7;
  const edges = [
    [[0, H / 2, D / 2], [W, 0.08, 0.08]], [[0, -H / 2, D / 2], [W, 0.08, 0.08]], [[0, H / 2, -D / 2], [W, 0.08, 0.08]], [[0, -H / 2, -D / 2], [W, 0.08, 0.08]],
    [[W / 2, 0, D / 2], [0.08, H, 0.08]], [[-W / 2, 0, D / 2], [0.08, H, 0.08]], [[W / 2, 0, -D / 2], [0.08, H, 0.08]], [[-W / 2, 0, -D / 2], [0.08, H, 0.08]],
    [[W / 2, H / 2, 0], [0.08, 0.08, D]], [[-W / 2, H / 2, 0], [0.08, 0.08, D]], [[W / 2, -H / 2, 0], [0.08, 0.08, D]], [[-W / 2, -H / 2, 0], [0.08, 0.08, D]]
  ];
  edges.forEach(([p, sz]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...sz), frameMat); m.position.set(...p); g.add(m); });
  // buoyancy block
  const foam = new THREE.Mesh(new THREE.BoxGeometry(W * 0.96, 0.5, D * 0.96), new THREE.MeshStandardMaterial({ color: 0x0c1a2e, roughness: 0.45, metalness: 0.6 }));
  foam.position.y = H / 2 - 0.2;
  g.add(foam);
  // panel seams on the float block
  [-0.4, 0.4].forEach((x) => {
    const seam = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, D * 0.9), glow(C.cyan, 0.9));
    seam.position.set(x, H / 2 + 0.06, 0);
    g.add(seam);
  });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(W * 0.97, 0.04, D * 0.97), glow(C.teal, 1.4));
  stripe.position.y = H / 2 - 0.42;
  g.add(stripe);
  // electronics pod
  const pod = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.4, 8, 24), metal(C.hullDark, 0.35, 0.8));
  pod.rotation.z = Math.PI / 2;
  pod.position.y = -0.15;
  g.add(pod);
  // camera dome
  const cam = new THREE.Mesh(new THREE.SphereGeometry(0.26, 24, 16), soft(0x0b2940, 0.85, C.cyan, 1.1));
  cam.position.set(W / 2 + 0.05, 0, 0);
  g.add(cam);
  // thrusters
  const props = [];
  [[W / 2 - 0.3, 0, D / 2 + 0.22], [W / 2 - 0.3, 0, -D / 2 - 0.22], [-W / 2 + 0.3, 0, D / 2 + 0.22], [-W / 2 + 0.3, 0, -D / 2 - 0.22]].forEach((p) => {
    const duct = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.045, 8, 24), glow(C.cyan, 1));
    duct.position.set(...p);
    g.add(duct);
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.05, 0.02), metal(0x3a5578));
    blade.position.set(...p);
    g.add(blade);
    props.push(blade);
  });
  // lamps
  [0.4, -0.4].forEach((z) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 16), glow(C.ice, 3));
    lamp.rotation.z = Math.PI / 2;
    lamp.position.set(W / 2 + 0.06, -H / 2 + 0.15, z);
    g.add(lamp);
  });
  // tether
  const tether = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.6, H / 2, 0), new THREE.Vector3(-1.0, H / 2 + 1.0, 0.2), new THREE.Vector3(-1.9, H / 2 + 1.6, 0.6), new THREE.Vector3(-2.4, H / 2 + 2.6, 0.3)
  ]), 40, 0.03, 6), glow(C.amber, 1.2));
  g.add(tether);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), glow(C.teal, 3));
  beacon.position.set(0.8, H / 2 + 0.1, 0);
  g.add(beacon);
  return {
    group: g,
    update(t) {
      props.forEach((b, i) => (b.rotation.z = t * 8 + i));
      beacon.material.emissiveIntensity = 1 + Math.max(0, Math.sin(t * 3)) * 3;
      g.position.y = Math.sin(t * 0.9) * 0.06;
      g.rotation.x = Math.sin(t * 0.7) * 0.03;
    }
  };
}

// ------------------------------------------------------------------ RELAY (acoustic relay mast)
function relay() {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.35, 8), metal(0x0c1626, 0.85, 0.3));
  base.position.y = -1.6;
  g.add(base);
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.4), metal(C.hull));
    leg.position.set(Math.cos(a) * 0.5, -0.4, Math.sin(a) * 0.5);
    leg.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
    g.add(leg);
  }
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 3.6, 16), metal(C.hull, 0.35, 0.8));
  mast.position.y = 0.3;
  g.add(mast);
  const rings = [];
  [0.0, 0.8, 1.6].forEach((y, i) => {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.55 - i * 0.1, 0.03, 8, 48), glow(i === 1 ? C.teal : C.cyan, 1.6));
    r.rotation.x = Math.PI / 2;
    r.position.y = y;
    g.add(r);
    rings.push(r);
  });
  const pod = new THREE.Mesh(new THREE.SphereGeometry(0.4, 32, 16), metal(C.hullDark, 0.3, 0.8));
  pod.position.y = 2.2;
  g.add(pod);
  const dish = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 3.5), metal(0x3a5578, 0.3, 0.8));
  dish.material.side = THREE.DoubleSide;
  dish.position.set(0, 0.9, 0);
  const dishPivot = new THREE.Group();
  dishPivot.add(dish);
  dish.rotation.set(Math.PI / 2.4, 0, 0);
  dish.position.set(0, 0, 0.5);
  dishPivot.position.y = -0.6;
  g.add(dishPivot);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), glow(C.teal, 3));
  beacon.position.y = 2.7;
  g.add(beacon);
  const pulse = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 6, 96), new THREE.MeshBasicMaterial({ color: C.cyan, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false }));
  pulse.rotation.x = Math.PI / 2;
  pulse.position.y = 2.2;
  pulse.userData.noBounds = true;
  g.add(pulse);
  return {
    group: g,
    update(t) {
      const p = (t * 0.5) % 1;
      pulse.scale.setScalar(0.5 + p * 1.8);
      pulse.material.opacity = 0.7 * (1 - p);
      rings.forEach((r, i) => (r.material.emissiveIntensity = 1 + Math.max(0, Math.sin(t * 3 - i)) * 2));
      dishPivot.rotation.y = t * 0.5;
      beacon.material.emissiveIntensity = 1 + Math.max(0, Math.sin(t * 2)) * 3;
    }
  };
}

// ------------------------------------------------------------------ PROBE (sensor array)
function probe() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.7, 1), metal(C.hull, 0.3, 0.8));
  core.material.flatShading = true;
  g.add(core);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.32, 24, 16), soft(0x0b2940, 0.9, C.cyan, 1.4));
  eye.position.set(0.55, 0.1, 0);
  g.add(eye);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.025, 8, 64), glow(C.cyan, 1.4));
  ring.rotation.x = Math.PI / 2.3;
  g.add(ring);
  const ring2 = new THREE.Mesh(new THREE.TorusGeometry(1.3, 0.015, 8, 64), glow(C.violet, 1.4));
  ring2.rotation.set(Math.PI / 2, 0.6, 0);
  g.add(ring2);
  for (let k = 0; k < 4; k++) {
    const a = (k / 4) * Math.PI * 2 + Math.PI / 4;
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.8), metal(C.hullDark));
    leg.position.set(Math.cos(a) * 0.7, -1.0, Math.sin(a) * 0.7);
    leg.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);
    g.add(leg);
    const foot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), glow(C.teal, 1.6));
    foot.position.set(Math.cos(a) * 1.15, -1.8, Math.sin(a) * 1.15);
    g.add(foot);
  }
  const arms = [];
  for (let k = 0; k < 3; k++) {
    const arm = new THREE.Group();
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.4), metal(0x3a5578));
    rod.position.y = 0.7;
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glow(C.cyan, 2.5));
    tip.position.y = 1.4;
    arm.add(rod, tip);
    arm.rotation.set(0.5, (k / 3) * Math.PI * 2, 0.3);
    g.add(arm);
    arms.push(arm);
  }
  return {
    group: g,
    update(t) {
      ring.rotation.z = t * 0.6;
      ring2.rotation.z = -t * 0.4;
      eye.material.emissiveIntensity = 1 + Math.sin(t * 2) * 0.5;
      arms.forEach((a, i) => (a.children[1].material.emissiveIntensity = 1.5 + Math.sin(t * 4 + i * 2) * 1.2));
      g.position.y = Math.sin(t * 0.6) * 0.05;
    }
  };
}

const BUILDERS = {
  submarine: () => submarine(),
  'submarine-b': () => submarine({ auv: true }),
  station,
  relay,
  probe,
  rov,
  jellyfish,
  anglerfish,
  squid,
  nautilus,
  eel,
  vent
};

// Every model is scaled to the same bounding radius so one camera setup frames them all.
const TARGET_RADIUS = 2.4;
export function buildModel(name) {
  const b = BUILDERS[name] || BUILDERS.submarine;
  const m = b();
  m.update(0, 0.016);
  // bounds ignore light beams / pulses so the solid body fills the frame
  const box = new THREE.Box3();
  m.group.updateMatrixWorld(true);
  m.group.traverse((o) => {
    if (!o.isMesh) return;
    let p = o, skip = false;
    while (p) { if (p.userData.noBounds) { skip = true; break; } p = p.parent; }
    if (!skip) box.expandByObject(o, false);
  });
  const sphere = box.getBoundingSphere(new THREE.Sphere());
  const size = box.getSize(new THREE.Vector3());
  // largest box dimension (not the sphere) so flat or long objects are not undersized
  const k = TARGET_RADIUS / ((Math.max(size.x, size.y, size.z) / 2) * 1.12 || 1);
  const outer = new THREE.Group();
  const holder = new THREE.Group();
  holder.add(m.group);
  holder.scale.setScalar(k);
  holder.position.set(-sphere.center.x * k, -sphere.center.y * k, -sphere.center.z * k);
  outer.add(holder);
  return { group: outer, update: m.update };
}

export const MODEL_NAMES = Object.keys(BUILDERS);
