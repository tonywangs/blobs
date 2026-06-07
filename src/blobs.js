import * as THREE from 'three';
import { MarchingCubes } from 'three/examples/jsm/objects/MarchingCubes.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

// Where the subtle credit links. Change to a custom domain / repo later.
const CREDIT_URL = 'https://blobs.vercel.app';

// Same material/bloom recipe as the standalone showcase, exposed as presets.
const PRESETS = {
  chrome: {
    color: '#eef2f5', metalness: 1.0, roughness: 0.22, clearcoat: 1.0, clearcoatRoughness: 0.12,
    iridescence: 1.0, iridescenceIOR: 1.3, transmission: 0.0, ior: 1.45, thickness: 1.0,
    emissive: '#000000', emissiveIntensity: 1.0, envMapIntensity: 1.5,
    bloomStrength: 0.5, bloomRadius: 0.5, bloomThreshold: 0.85,
  },
  glass: {
    color: '#ffffff', metalness: 0.0, roughness: 0.04, clearcoat: 1.0, clearcoatRoughness: 0.06,
    iridescence: 0.25, iridescenceIOR: 1.3, transmission: 1.0, ior: 1.5, thickness: 1.2,
    emissive: '#000000', emissiveIntensity: 1.0, envMapIntensity: 1.5,
    bloomStrength: 0.45, bloomRadius: 0.5, bloomThreshold: 0.8,
  },
  jelly: {
    color: '#0d1f26', metalness: 0.25, roughness: 0.28, clearcoat: 1.0, clearcoatRoughness: 0.2,
    iridescence: 0.6, iridescenceIOR: 1.4, transmission: 0.5, ior: 1.4, thickness: 0.8,
    emissive: '#0a3a33', emissiveIntensity: 2.2, envMapIntensity: 1.5,
    bloomStrength: 1.0, bloomRadius: 0.5, bloomThreshold: 0.55,
  },
};

// Teal→magenta studio gradient with soft glints — the source of the reflections.
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
// blend two hex colors; t=0 -> a, t=1 -> b
function mix(a, b, t) {
  const x = hexToRgb(a), y = hexToRgb(b);
  const ch = (i) => Math.round(x[i] + (y[i] - x[i]) * t).toString(16).padStart(2, '0');
  return '#' + ch(0) + ch(1) + ch(2);
}

// Studio gradient (color A up top, color B below, with a bright seam through the
// middle) plus soft glints. This is the palette the metal blob reflects, so the
// two base colors fully theme the look. Defaults reproduce the original teal/magenta.
function makeEnvTexture(cA, cB) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 512;
  const ctx = c.getContext('2d');
  const g = ctx.createLinearGradient(0, 0, 0, c.height);
  g.addColorStop(0.00, mix(cA, '#000000', 0.28));
  g.addColorStop(0.22, mix(cA, '#ffffff', 0.10));
  g.addColorStop(0.46, mix(cA, '#ffffff', 0.80));
  g.addColorStop(0.54, mix(cB, '#ffffff', 0.82));
  g.addColorStop(0.78, mix(cB, '#ffffff', 0.06));
  g.addColorStop(1.00, mix(cB, '#000000', 0.24));
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
  glow(c.width * 0.30, c.height * 0.16, 400, mix(cA, '#ffffff', 0.85), 0.95);
  glow(c.width * 0.78, c.height * 0.30, 260, mix(cA, '#ffffff', 0.45), 0.7);
  glow(c.width * 0.66, c.height * 0.88, 340, mix(cB, '#ffffff', 0.55), 0.8);
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const numAttr = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };

const TEMPLATE = `
<style>
  :host { display: block; position: relative; width: 100%; height: 100%; min-height: 280px; overflow: hidden; }
  :host([background]) { position: fixed; inset: 0; width: 100vw; height: 100vh; min-height: 0; z-index: -1; pointer-events: none; }
  canvas { display: block; width: 100%; height: 100%; }
  .credit {
    position: absolute; right: 9px; bottom: 7px;
    font: 10px/1 ui-monospace, 'JetBrains Mono', SFMono-Regular, monospace;
    letter-spacing: 0.05em; color: rgba(255, 255, 255, 0.26);
    text-decoration: none; pointer-events: auto; transition: color 0.25s ease; user-select: none;
  }
  .credit:hover { color: #64ffda; }
</style>
<canvas></canvas>
<a class="credit" target="_blank" rel="noopener noreferrer">blobs</a>
`;

class MetaballBg extends HTMLElement {
  static get observedAttributes() { return ['preset', 'blobs', 'speed', 'bg', 'quality', 'color1', 'color2']; }

  connectedCallback() {
    if (this._ready) return;
    this._ready = true;

    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = TEMPLATE;
    this._canvas = root.querySelector('canvas');
    const credit = root.querySelector('.credit');
    if (this.hasAttribute('nocredit')) credit.remove();
    else credit.href = CREDIT_URL;

    this._reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this._visible = true;
    this._raf = 0;

    this._setup();

    this._ro = new ResizeObserver(() => this._resize());
    this._ro.observe(this);
    this._io = new IntersectionObserver((e) => {
      this._visible = e[0].isIntersecting;
      this._visible && !document.hidden ? this._start() : this._stop();
    }, { threshold: 0 });
    this._io.observe(this);
    this._onVis = () => (document.hidden ? this._stop() : this._visible && this._start());
    document.addEventListener('visibilitychange', this._onVis);
  }

  disconnectedCallback() {
    this._stop();
    this._ro?.disconnect();
    this._io?.disconnect();
    document.removeEventListener('visibilitychange', this._onVis);
    this._dispose();
    this._ready = false;
  }

  attributeChangedCallback(name) {
    if (!this._ready) return;
    if (name === 'quality') { this._buildBlobs(); return; }
    this._applyConfig();
    if (name === 'color1' || name === 'color2') this._buildEnv();
  }

  _config() {
    const presetName = (this.getAttribute('preset') || 'chrome').toLowerCase();
    const preset = PRESETS[presetName] || PRESETS.chrome;
    const q = parseInt(this.getAttribute('quality'), 10);
    return {
      preset,
      blobs: clamp(parseInt(this.getAttribute('blobs'), 10) || 9, 1, 16),
      speed: numAttr(this.getAttribute('speed'), 1.0),
      // transmissive presets (glass/jelly) need an opaque backdrop to refract, or they
      // blow out to white; reflective chrome stays transparent so it floats over a page.
      bg: this.getAttribute('bg') || (preset.transmission > 0 ? '#0a0a0a' : 'transparent'),
      quality: [32, 48, 64].includes(q) ? q : 64,
      color1: this.getAttribute('color1') || '#64ffda',
      color2: this.getAttribute('color2') || '#ff64da',
      spread: 0.15, isolation: 45, strength: 1.5, subtract: 12,
    };
  }

  _setup() {
    const w = this.clientWidth || 1;
    const h = this.clientHeight || 1;
    this._cfg = this._config();
    const transparent = this._cfg.bg === 'transparent';

    const renderer = (this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas, antialias: true, alpha: transparent, powerPreference: 'high-performance',
    }));
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    this._transparent = transparent;
    if (transparent) renderer.setClearColor(0x000000, 0);

    this._scene = new THREE.Scene();
    this._camera = new THREE.PerspectiveCamera(45, w / h, 0.1, 100);
    this._camera.position.set(0, 0, 5.6); // pulled back so the blob always has margin and never clips

    this._buildEnv();

    this._material = new THREE.MeshPhysicalMaterial({ iridescenceThicknessRange: [100, 400] });

    this._buildBlobs();
    this._applyConfig();

    // Bloom can't preserve a transparent background (the composer re-fills it opaque),
    // so it's only used for solid-bg embeds. Transparent embeds render directly — and
    // since transparent is the default, that's the common path.
    if (!transparent) {
      this._composer = new EffectComposer(renderer);
      this._composer.addPass(new RenderPass(this._scene, this._camera));
      this._bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.5, 0.5, 0.85);
      this._composer.addPass(this._bloom);
      this._composer.addPass(new OutputPass());
      this._composer.setSize(w, h);
    }

    this._clock = new THREE.Clock();
    this._t = 0;

    // render one immediate frame so it's never blank (and is the only frame if reduced-motion)
    this._update(0);
    this._render();
  }

  _render() {
    if (this._composer) this._composer.render();
    else this._renderer.render(this._scene, this._camera);
  }

  _buildEnv() {
    const pmrem = new THREE.PMREMGenerator(this._renderer);
    const tex = makeEnvTexture(this._cfg.color1, this._cfg.color2);
    const env = pmrem.fromEquirectangular(tex).texture;
    this._scene.environment?.dispose?.();
    this._scene.environment = env;
    tex.dispose();
    pmrem.dispose();
    if (this._reduced) this._render();
  }

  _buildBlobs() {
    const cfg = this._config();
    if (this._mc) { this._scene.remove(this._mc); this._mc.geometry.dispose(); }
    this._mc = new MarchingCubes(cfg.quality, this._material, false, false, 200000);
    this._mc.scale.setScalar(1.6);
    this._mc.isolation = cfg.isolation;
    this._scene.add(this._mc);
  }

  _applyConfig() {
    const cfg = (this._cfg = this._config());
    const p = cfg.preset;
    const m = this._material;
    m.color.set(p.color);
    m.metalness = p.metalness; m.roughness = p.roughness;
    m.clearcoat = p.clearcoat; m.clearcoatRoughness = p.clearcoatRoughness;
    m.iridescence = p.iridescence; m.iridescenceIOR = p.iridescenceIOR;
    m.transmission = p.transmission; m.ior = p.ior; m.thickness = p.thickness;
    m.envMapIntensity = p.envMapIntensity;
    m.emissive.set(p.emissive); m.emissiveIntensity = p.emissiveIntensity;
    m.needsUpdate = true;
    if (this._bloom) {
      this._bloom.strength = p.bloomStrength;
      this._bloom.radius = p.bloomRadius;
      this._bloom.threshold = p.bloomThreshold;
    }
    if (this._scene) this._scene.background = cfg.bg === 'transparent' ? null : new THREE.Color(cfg.bg);
    if (this._reduced) this._render();
  }

  _update(t) {
    const cfg = this._cfg;
    const mc = this._mc;
    mc.reset();
    const n = cfg.blobs;
    const strength = cfg.strength / ((Math.sqrt(n) - 1) / 4 + 1);
    const s = cfg.spread;
    for (let i = 0; i < n; i++) {
      mc.addBall(
        0.5 + s * Math.sin(i * 1.71 + t * 0.90),
        0.5 + s * Math.cos(i * 2.31 + t * 0.77),
        0.5 + s * Math.sin(i * 3.13 + t * 1.13),
        strength, cfg.subtract);
    }
    mc.update();
  }

  _start() {
    if (this._raf || this._reduced) return;
    this._clock.start(); // reset delta so a long pause doesn't cause a time jump
    const loop = () => {
      this._raf = requestAnimationFrame(loop);
      this._t += this._clock.getDelta() * this._cfg.speed;
      this._update(this._t);
      this._render();
    };
    this._raf = requestAnimationFrame(loop);
  }

  _stop() {
    if (this._raf) { cancelAnimationFrame(this._raf); this._raf = 0; }
  }

  _resize() {
    if (!this._renderer) return;
    const w = this.clientWidth || 1;
    const h = this.clientHeight || 1;
    this._camera.aspect = w / h;
    this._camera.updateProjectionMatrix();
    this._renderer.setSize(w, h, false);
    if (this._composer) this._composer.setSize(w, h);
    if (this._reduced) this._render();
  }

  _dispose() {
    this._mc?.geometry?.dispose();
    this._material?.dispose();
    this._scene?.environment?.dispose?.();
    this._composer?.dispose?.();
    this._renderer?.dispose?.();
  }
}

if (!customElements.get('metaball-bg')) {
  customElements.define('metaball-bg', MetaballBg);
}
