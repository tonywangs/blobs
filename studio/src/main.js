import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import GUI from 'lil-gui';

const TEAL = '#64ffda';
const MAGENTA = '#ff64da';
const BG = '#0a0a0a';

// ───────────────────────── parameters ─────────────────────────
const params = {
  // motion
  blobs: 9,
  speed: 1.0,
  spread: 0.19,
  autoRotate: true,
  rotateSpeed: 0.6,
  // field / mesh
  resolution: 64,
  isolation: 45,
  strength: 1.5,
  subtract: 12,
  // material
  color: '#eef2f5',
  metalness: 1.0,
  roughness: 0.22,
  clearcoat: 1.0,
  clearcoatRoughness: 0.12,
  iridescence: 1.0,
  iridescenceIOR: 1.3,
  transmission: 0.0,
  ior: 1.45,
  thickness: 1.0,
  envMapIntensity: 1.5,
  emissive: '#000000',
  emissiveIntensity: 1.0,
  // lighting
  tealIntensity: 0.0,
  magentaIntensity: 0.0,
  ambient: 0.12,
  exposure: 1.12,
  background: BG,
  // bloom
  bloomStrength: 0.5,
  bloomRadius: 0.5,
  bloomThreshold: 0.85,
};

const PRESETS = {
  'Liquid Chrome': {
    color: '#eef2f5', metalness: 1.0, roughness: 0.22, clearcoat: 1.0, clearcoatRoughness: 0.12,
    iridescence: 1.0, iridescenceIOR: 1.3, transmission: 0.0, emissive: '#000000', emissiveIntensity: 1.0,
    bloomStrength: 0.6, bloomThreshold: 0.7,
  },
  'Glass Droplet': {
    color: '#ffffff', metalness: 0.0, roughness: 0.04, clearcoat: 1.0, clearcoatRoughness: 0.06,
    iridescence: 0.25, iridescenceIOR: 1.3, transmission: 1.0, ior: 1.5, thickness: 1.2,
    emissive: '#000000', emissiveIntensity: 1.0, bloomStrength: 0.45, bloomThreshold: 0.8,
  },
  'Neon Jelly': {
    color: '#0d1f26', metalness: 0.25, roughness: 0.28, clearcoat: 1.0, clearcoatRoughness: 0.2,
    iridescence: 0.6, iridescenceIOR: 1.4, transmission: 0.5, ior: 1.4, thickness: 0.8,
    emissive: '#0a3a33', emissiveIntensity: 2.2, bloomStrength: 1.0, bloomThreshold: 0.55,
  },
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducedMotion) { params.speed = 0; params.autoRotate = false; }

// ───────────────────────── renderer / scene ─────────────────────────
const app = document.getElementById('app');

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = params.exposure;
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(params.background);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0, 3.9);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.8;
controls.maxDistance = 8;
controls.autoRotate = params.autoRotate;
controls.autoRotateSpeed = params.rotateSpeed;

// Custom environment: a teal→magenta gradient with soft "studio light" glints, baked
// into a reflection probe. This is what gives the chrome its flowing neon reflections.
function makeEnvTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');

  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  // NOTE: a camera-facing mirror reflects the env *horizon* (v≈0.5), so the middle
  // must stay bright or the front of the blob goes dark. Teal up top, magenta below,
  // a bright seam through the middle.
  g.addColorStop(0.00, '#1fb89f');
  g.addColorStop(0.22, '#74ffe6'); // bright teal — top
  g.addColorStop(0.46, '#d8fff7'); // bright teal-white seam (front of blob)
  g.addColorStop(0.54, '#ffe2f6'); // bright magenta-white seam
  g.addColorStop(0.78, '#ff7ce0'); // bright magenta — underside
  g.addColorStop(1.00, '#c93aa6');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, c.width, c.height);

  const glow = (x, y, r, color, a) => {
    const rg = ctx.createRadialGradient(x, y, 0, x, y, r);
    rg.addColorStop(0, color);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.globalAlpha = a;
    ctx.fillStyle = rg;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
  };
  // large, soft glints → broad sweeping highlights on the chrome (not hot dots)
  glow(c.width * 0.30, c.height * 0.16, 400, '#f2fffb', 0.95); // soft white-hot key
  glow(c.width * 0.78, c.height * 0.30, 260, '#aafff0', 0.7);  // teal highlight
  glow(c.width * 0.66, c.height * 0.88, 340, '#ffc4ef', 0.8);  // magenta fill

  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const pmrem = new THREE.PMREMGenerator(renderer);
const envTex = makeEnvTexture();
scene.environment = pmrem.fromEquirectangular(envTex).texture;
envTex.dispose();

// subtle colored key lights for extra specular life
const tealLight = new THREE.DirectionalLight(TEAL, params.tealIntensity);
tealLight.position.set(3, 2, 2);
const magLight = new THREE.DirectionalLight(MAGENTA, params.magentaIntensity);
magLight.position.set(-3, -1, 1.5);
const ambient = new THREE.AmbientLight(0xffffff, params.ambient);
scene.add(tealLight, magLight, ambient);

// ───────────────────────── material + metaballs ─────────────────────────
const material = new THREE.MeshPhysicalMaterial({
  color: new THREE.Color(params.color),
  metalness: params.metalness,
  roughness: params.roughness,
  clearcoat: params.clearcoat,
  clearcoatRoughness: params.clearcoatRoughness,
  iridescence: params.iridescence,
  iridescenceIOR: params.iridescenceIOR,
  iridescenceThicknessRange: [100, 400],
  transmission: params.transmission,
  ior: params.ior,
  thickness: params.thickness,
  envMapIntensity: params.envMapIntensity,
  emissive: new THREE.Color(params.emissive),
  emissiveIntensity: params.emissiveIntensity,
});

let mc;
function buildMetaballs() {
  if (mc) { scene.remove(mc); mc.geometry.dispose(); }
  mc = new MarchingCubes(params.resolution, material, true, false, 200000);
  mc.scale.setScalar(1.6);
  mc.isolation = params.isolation;
  scene.add(mc);
}
buildMetaballs();

function updateMetaballs(t) {
  mc.reset();
  const n = params.blobs;
  const strength = params.strength / ((Math.sqrt(n) - 1) / 4 + 1);
  const s = params.spread;
  for (let i = 0; i < n; i++) {
    const x = 0.5 + s * Math.sin(i * 1.71 + t * 0.90);
    const y = 0.5 + s * Math.cos(i * 2.31 + t * 0.77);
    const z = 0.5 + s * Math.sin(i * 3.13 + t * 1.13);
    mc.addBall(x, y, z, strength, params.subtract);
  }
  mc.update();
}

// ───────────────────────── post-processing (bloom) ─────────────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  params.bloomStrength, params.bloomRadius, params.bloomThreshold,
);
composer.addPass(bloom);
composer.addPass(new OutputPass());

// ───────────────────────── GUI ─────────────────────────
function syncMaterial() {
  material.color.set(params.color);
  material.metalness = params.metalness;
  material.roughness = params.roughness;
  material.clearcoat = params.clearcoat;
  material.clearcoatRoughness = params.clearcoatRoughness;
  material.iridescence = params.iridescence;
  material.iridescenceIOR = params.iridescenceIOR;
  material.transmission = params.transmission;
  material.ior = params.ior;
  material.thickness = params.thickness;
  material.envMapIntensity = params.envMapIntensity;
  material.emissive.set(params.emissive);
  material.emissiveIntensity = params.emissiveIntensity;
  material.needsUpdate = true;
}
function syncBloom() {
  bloom.strength = params.bloomStrength;
  bloom.radius = params.bloomRadius;
  bloom.threshold = params.bloomThreshold;
}

const gui = new GUI({ title: '$ ./metaballs' });

const fShape = gui.addFolder('shape');
fShape.add(params, 'blobs', 1, 16, 1);
fShape.add(params, 'spread', 0.05, 0.35, 0.01);
fShape.add(params, 'isolation', 10, 120, 1).name('threshold').onChange((v) => (mc.isolation = v));
fShape.add(params, 'strength', 0.2, 3, 0.05);
fShape.add(params, 'resolution', [32, 48, 64, 80]).name('quality').onChange(buildMetaballs);

const fMat = gui.addFolder('material');
fMat.add(params, 'preset', Object.keys(PRESETS)).onChange(applyPreset);
fMat.addColor(params, 'color').onChange(syncMaterial);
fMat.add(params, 'metalness', 0, 1, 0.01).onChange(syncMaterial);
fMat.add(params, 'roughness', 0, 1, 0.01).onChange(syncMaterial);
fMat.add(params, 'clearcoat', 0, 1, 0.01).onChange(syncMaterial);
fMat.add(params, 'iridescence', 0, 1, 0.01).onChange(syncMaterial);
fMat.add(params, 'transmission', 0, 1, 0.01).name('glassiness').onChange(syncMaterial);
fMat.add(params, 'envMapIntensity', 0, 3, 0.05).name('reflections').onChange(syncMaterial);
fMat.addColor(params, 'emissive').onChange(syncMaterial);
fMat.add(params, 'emissiveIntensity', 0, 4, 0.05).name('emissive str').onChange(syncMaterial);

const fLight = gui.addFolder('light + bloom');
fLight.add(params, 'tealIntensity', 0, 8, 0.1).name('teal light').onChange((v) => (tealLight.intensity = v));
fLight.add(params, 'magentaIntensity', 0, 8, 0.1).name('magenta light').onChange((v) => (magLight.intensity = v));
fLight.add(params, 'exposure', 0.2, 2.5, 0.01).onChange((v) => (renderer.toneMappingExposure = v));
fLight.add(params, 'bloomStrength', 0, 2, 0.01).name('bloom').onChange(syncBloom);
fLight.add(params, 'bloomThreshold', 0, 1, 0.01).name('bloom cutoff').onChange(syncBloom);
fLight.add(params, 'bloomRadius', 0, 1, 0.01).name('bloom radius').onChange(syncBloom);
fLight.addColor(params, 'background').onChange((v) => scene.background.set(v));

const fMotion = gui.addFolder('motion');
fMotion.add(params, 'speed', 0, 3, 0.01);
fMotion.add(params, 'autoRotate').onChange((v) => (controls.autoRotate = v));
fMotion.add(params, 'rotateSpeed', 0, 3, 0.05).onChange((v) => (controls.autoRotateSpeed = v));
fMotion.close();

// subtle author credit, pinned to the bottom of the panel (below "motion")
const credit = document.createElement('a');
credit.className = 'gui-credit';
credit.href = 'https://tonywang.xyz';
credit.target = '_blank';
credit.rel = 'noopener noreferrer';
credit.textContent = '// made by tony wang';
gui.domElement.appendChild(credit);

function applyPreset(name) {
  Object.assign(params, PRESETS[name]);
  syncMaterial();
  syncBloom();
  gui.controllersRecursive().forEach((c) => c.updateDisplay());
}

// ───────────────────────── loop + resize ─────────────────────────
const clock = new THREE.Clock();
let simTime = 0;

function animate() {
  requestAnimationFrame(animate);
  simTime += clock.getDelta() * params.speed;
  updateMetaballs(simTime);
  controls.update();
  composer.render();
}
animate();

window.addEventListener('resize', () => {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
});
