// Rotatable 3D viewer with holographic base + marine snow.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// soft studio reflections so metallic hulls read clearly
function addEnvironment(renderer, scene) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.45;
  pmrem.dispose();
}
import { buildModel } from './models.js';
import { state, on } from './store.js';

function makeStage(scene) {
  scene.add(new THREE.HemisphereLight(0x6fb8ff, 0x02060e, 1.1));
  const key = new THREE.DirectionalLight(0xbfe6ff, 2.2);
  key.position.set(4, 6, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x3f7dff, 2.5);
  rim.position.set(-6, 2, -4);
  scene.add(rim);
  const under = new THREE.PointLight(0x5ce1ff, 10, 12, 1.6);
  under.position.set(0, -2.5, 0);
  scene.add(under);

  // holographic base
  const base = new THREE.Group();
  const grid = new THREE.PolarGridHelper(3.2, 12, 6, 96, 0x1d5f86, 0x123a55);
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  base.add(grid);
  const ring = new THREE.Mesh(new THREE.RingGeometry(3.16, 3.22, 128),
    new THREE.MeshBasicMaterial({ color: 0x5ce1ff, transparent: true, opacity: 0.8, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  ring.rotation.x = -Math.PI / 2;
  base.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.2, 64),
    new THREE.MeshBasicMaterial({ color: 0x0a2a44, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  disc.rotation.x = -Math.PI / 2;
  base.add(disc);
  // tick marks
  const ticks = new THREE.Group();
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const len = i % 6 === 0 ? 0.25 : 0.1;
    const g = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(Math.cos(a) * 3.35, 0, Math.sin(a) * 3.35),
      new THREE.Vector3(Math.cos(a) * (3.35 + len), 0, Math.sin(a) * (3.35 + len))
    ]);
    ticks.add(new THREE.Line(g, new THREE.LineBasicMaterial({ color: 0x5ce1ff, transparent: true, opacity: 0.6 })));
  }
  base.add(ticks);
  base.position.y = -2.5;
  scene.add(base);

  // marine snow
  const N = 260;
  const geo = new THREE.BufferGeometry();
  const arr = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    arr[i * 3] = (Math.random() - 0.5) * 14;
    arr[i * 3 + 1] = (Math.random() - 0.5) * 9;
    arr[i * 3 + 2] = (Math.random() - 0.5) * 14;
  }
  geo.setAttribute('position', new THREE.BufferAttribute(arr, 3));
  const snow = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0x9fdcff, size: 0.035, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(snow);

  return { base, ticks, snow, arr, N };
}

export class Viewer {
  constructor(container, { autoRotate = true, distance = 11.5 } = {}) {
    this.container = container;
    this.distance = distance;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setClearColor(0x000000, 0);
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x030a16, 0.045);
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    this.camera.position.set(distance * 0.8, distance * 0.35, distance * 0.6);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.enablePan = false;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 18;
    this.controls.minPolarAngle = 0.2;
    this.controls.maxPolarAngle = Math.PI * 0.62;
    this.controls.autoRotate = autoRotate && state.settings.autoRotate;
    this.controls.autoRotateSpeed = 0.9;

    this.stage = makeStage(this.scene);
    addEnvironment(this.renderer, this.scene);
    this.model = null;
    this.clock = new THREE.Clock();
    this.t = 0;
    this.running = false;

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(container);
    this.resize();

    this.off = on('settings', ({ settings }) => {
      this.controls.autoRotate = settings.autoRotate;
      this.stage.snow.visible = settings.particles;
    });
    this.stage.snow.visible = state.settings.particles;

    // pause auto-rotate while the user drags
    this.controls.addEventListener('start', () => { this._userRot = true; this.controls.autoRotate = false; });
    this.controls.addEventListener('end', () => {
      clearTimeout(this._rt);
      this._rt = setTimeout(() => { this.controls.autoRotate = state.settings.autoRotate; }, 2500);
    });

    this.loop = this.loop.bind(this);
    this.start();
  }

  setModel(name) {
    if (this.modelName === name) return;
    this.modelName = name;
    if (this.model) {
      this.scene.remove(this.model.group);
      this.model.group.traverse((o) => { o.geometry && o.geometry.dispose(); });
    }
    this.model = buildModel(name);
    this.scene.add(this.model.group);
    // frame the object
    // models are normalised to a common radius, so a fixed distance frames them
    const dir = new THREE.Vector3(0.82, 0.32, 0.62).normalize();
    this.camera.position.copy(dir.multiplyScalar(this.distance));
    this.controls.target.set(0, -0.45, 0);
    this.controls.update();
  }

  rotateBy(angle) {
    // rotate the camera around the target by `angle` radians
    const off = this.camera.position.clone().sub(this.controls.target);
    off.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
    this.camera.position.copy(this.controls.target).add(off);
    this.controls.update();
  }

  resetView() {
    const n = this.modelName;
    this.modelName = null;
    this.setModel(n);
  }

  resize() {
    const w = this.container.clientWidth || 1;
    const h = this.container.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  start() { if (!this.running) { this.running = true; this.clock.getDelta(); requestAnimationFrame(this.loop); } }
  stop() { this.running = false; }

  loop() {
    if (!this.running) return;
    requestAnimationFrame(this.loop);
    if (!this.container.offsetParent) return;   // hidden view: skip work
    const dt = Math.min(0.05, this.clock.getDelta());
    this.t += dt;
    if (this.model) this.model.update(this.t, dt);
    const { ticks, arr, N, snow } = this.stage;
    ticks.rotation.y += dt * 0.15;
    if (snow.visible) {
      for (let i = 0; i < N; i++) {
        arr[i * 3 + 1] -= dt * 0.12;
        if (arr[i * 3 + 1] < -4.5) arr[i * 3 + 1] = 4.5;
      }
      snow.geometry.attributes.position.needsUpdate = true;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.stop();
    this.ro.disconnect();
    this.off();
    this.controls.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

// ---- shared thumbnail renderer ----
let thumbR, thumbScene, thumbCam;
const thumbCache = new Map();

export function thumbnail(name, w = 360, h = 240) {
  const key = `${name}:${w}x${h}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  if (!thumbR) {
    thumbR = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    thumbR.outputColorSpace = THREE.SRGBColorSpace;
    thumbR.toneMapping = THREE.ACESFilmicToneMapping;
    thumbR.toneMappingExposure = 1.2;
    thumbR.setClearColor(0x000000, 0);
    thumbScene = new THREE.Scene();
    const st = makeStage(thumbScene);
    addEnvironment(thumbR, thumbScene);
    st.snow.visible = false;
    st.base.visible = false;
    thumbCam = new THREE.PerspectiveCamera(34, w / h, 0.1, 100);
  }
  thumbR.setPixelRatio(2);
  thumbR.setSize(w, h, false);
  thumbCam.aspect = w / h;
  thumbCam.updateProjectionMatrix();
  const m = buildModel(name);
  m.update(1.3, 0.016);
  thumbScene.add(m.group);
  const c = new THREE.Vector3(0, 0, 0);
  thumbCam.position.copy(new THREE.Vector3(0.85, 0.3, 0.6).normalize().multiplyScalar(8.6));
  thumbCam.lookAt(c);
  thumbR.render(thumbScene, thumbCam);
  const url = thumbR.domElement.toDataURL('image/png');
  thumbScene.remove(m.group);
  m.group.traverse((o) => o.geometry && o.geometry.dispose());
  thumbCache.set(key, url);
  return url;
}
