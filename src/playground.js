// Wires the playground controls to the live <metaball-bg> and the copy-paste snippet.
// Simple controls are always visible; "more options" reveals the full studio-level set.
// The snippet emits only settings that differ from the current preset's defaults.
const SCRIPT_URL = 'https://cdn.jsdelivr.net/gh/tonywangs/blobs@v7/dist/blobs.min.js';

// Per-preset defaults (mirror PRESETS in blobs.js) — used to know what counts as "changed".
const PRESETS = {
  chrome: { color: '#eef2f5', metalness: 1.0, roughness: 0.22, clearcoat: 1.0, iridescence: 1.0, transmission: 0.0, reflections: 1.5, emissive: '#000000', emissiveStr: 1.0, bloom: 0.5, bloomCutoff: 0.85, bloomRadius: 0.5, bg: '' },
  glass:  { color: '#ffffff', metalness: 0.0, roughness: 0.04, clearcoat: 1.0, iridescence: 0.25, transmission: 1.0, reflections: 1.5, emissive: '#000000', emissiveStr: 1.0, bloom: 0.45, bloomCutoff: 0.8, bloomRadius: 0.5, bg: '#0a0a0a' },
  jelly:  { color: '#0d1f26', metalness: 0.25, roughness: 0.28, clearcoat: 1.0, iridescence: 0.6, transmission: 0.5, reflections: 1.5, emissive: '#0a3a33', emissiveStr: 2.2, bloom: 1.0, bloomCutoff: 0.55, bloomRadius: 0.5, bg: '#0a0a0a' },
};
// Preset-independent defaults.
const FIXED = { blobs: 9, speed: 1, color1: '#64ffda', color2: '#ff64da', spread: 0.15, threshold: 45, strength: 1.5, quality: 64, exposure: 1.12, rotateSpeed: 0.6 };

// Advanced controls: DOM id → embed attribute + value kind + where its default comes from.
const ADV = [
  { id: 'spread', attr: 'spread', kind: 'num', src: 'fixed' },
  { id: 'threshold', attr: 'threshold', kind: 'num', src: 'fixed' },
  { id: 'strength', attr: 'strength', kind: 'num', src: 'fixed' },
  { id: 'quality', attr: 'quality', kind: 'sel', src: 'fixed' },
  { id: 'color', attr: 'color', kind: 'color', src: 'preset' },
  { id: 'metalness', attr: 'metalness', kind: 'num', src: 'preset' },
  { id: 'roughness', attr: 'roughness', kind: 'num', src: 'preset' },
  { id: 'clearcoat', attr: 'clearcoat', kind: 'num', src: 'preset' },
  { id: 'iridescence', attr: 'iridescence', kind: 'num', src: 'preset' },
  { id: 'transmission', attr: 'transmission', kind: 'num', src: 'preset' },
  { id: 'reflections', attr: 'reflections', kind: 'num', src: 'preset' },
  { id: 'emissive', attr: 'emissive', kind: 'color', src: 'preset' },
  { id: 'emissiveStr', attr: 'emissive-str', kind: 'num', src: 'preset' },
  { id: 'exposure', attr: 'exposure', kind: 'num', src: 'fixed' },
  { id: 'bloom', attr: 'bloom', kind: 'num', src: 'preset' },
  { id: 'bloomCutoff', attr: 'bloom-cutoff', kind: 'num', src: 'preset' },
  { id: 'bloomRadius', attr: 'bloom-radius', kind: 'num', src: 'preset' },
  { id: 'rotateSpeed', attr: 'rotate-speed', kind: 'num', src: 'fixed' },
];
const BLOOM_IDS = ['bloom', 'bloomCutoff', 'bloomRadius'];

const $ = (id) => document.getElementById(id);
const low = (s) => String(s).toLowerCase();
const fmt = (v) => (Number.isInteger(v) ? String(v) : String(Math.round(v * 100) / 100));

const blob = $('blob');
const presets = $('presets');
const code = $('code');
const copyBtn = $('copy');
const moreToggle = $('moreToggle');
const advanced = $('advanced');
const bgSolid = $('bgSolid');
const background = $('background');
const autorotateEl = $('autorotate');

const state = { preset: 'chrome', blobs: 9, speed: 1, color1: '#64ffda', color2: '#ff64da', autorotate: false, bg: '' };

function defaultOf(id) {
  const c = ADV.find((x) => x.id === id);
  return c.src === 'preset' ? PRESETS[state.preset][id] : FIXED[id];
}
function changed(a, b, kind) {
  return kind === 'color' ? low(a) !== low(b) : Math.abs(parseFloat(a) - parseFloat(b)) > 1e-6;
}

function syncAdvancedDOM() {
  for (const c of ADV) {
    const el = $(c.id);
    if (c.kind === 'color') el.value = state[c.id];
    else if (c.kind === 'sel') el.value = String(state[c.id]);
    else { el.value = state[c.id]; const v = $(c.id + 'Val'); if (v) v.textContent = fmt(state[c.id]); }
  }
  bgSolid.checked = state.bg !== '';
  if (state.bg) background.value = state.bg;
  background.disabled = !bgSolid.checked;
  autorotateEl.checked = state.autorotate;
}

function render() {
  // drive the live blob — set every attribute so it always matches state exactly
  blob.setAttribute('preset', state.preset);
  blob.setAttribute('blobs', String(state.blobs));
  blob.setAttribute('speed', String(state.speed));
  blob.setAttribute('color1', state.color1);
  blob.setAttribute('color2', state.color2);
  for (const c of ADV) blob.setAttribute(c.attr, String(state[c.id]));
  state.autorotate ? blob.setAttribute('autorotate', '') : blob.removeAttribute('autorotate');
  state.bg ? blob.setAttribute('bg', state.bg) : blob.removeAttribute('bg');

  // build the snippet — preset always, then only settings that differ from its defaults
  const attrs = [`preset="${state.preset}"`];
  if (state.blobs !== FIXED.blobs) attrs.push(`blobs="${state.blobs}"`);
  if (state.speed !== FIXED.speed) attrs.push(`speed="${state.speed}"`);
  if (low(state.color1) !== low(FIXED.color1)) attrs.push(`color1="${state.color1}"`);
  if (low(state.color2) !== low(FIXED.color2)) attrs.push(`color2="${state.color2}"`);
  for (const c of ADV) {
    if (c.id === 'rotateSpeed') continue; // only meaningful with autorotate (handled below)
    if (changed(state[c.id], defaultOf(c.id), c.kind)) attrs.push(`${c.attr}="${state[c.id]}"`);
  }
  if (low(state.bg) !== low(PRESETS[state.preset].bg) && state.bg) attrs.push(`bg="${state.bg}"`);
  if (state.autorotate) {
    attrs.push('autorotate');
    if (state.rotateSpeed !== FIXED.rotateSpeed) attrs.push(`rotate-speed="${state.rotateSpeed}"`);
  }

  code.textContent =
    `<script src="${SCRIPT_URL}"></script>\n` +
    `<metaball-bg ${attrs.join(' ')}></metaball-bg>`;
}

function applyPreset(name) {
  state.preset = name;
  const p = PRESETS[name];
  for (const c of ADV) if (c.src === 'preset') state[c.id] = p[c.id];
  state.bg = p.bg;
  syncAdvancedDOM();
  render();
}

// turning bloom up does nothing over a transparent background — switch to a solid one
function ensureSolidBg() {
  if (state.bg) return;
  state.bg = background.value || '#0a0a0a';
  bgSolid.checked = true;
  background.disabled = false;
}

// ── simple controls ──
presets.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  for (const b of presets.children) b.classList.toggle('active', b === btn);
  applyPreset(btn.dataset.preset);
});
$('blobs').addEventListener('input', (e) => { state.blobs = parseInt(e.target.value, 10); $('blobsVal').textContent = String(state.blobs); render(); });
$('speed').addEventListener('input', (e) => { state.speed = parseFloat(e.target.value); $('speedVal').textContent = state.speed.toFixed(1); render(); });
$('color1').addEventListener('input', (e) => { state.color1 = e.target.value; render(); });
$('color2').addEventListener('input', (e) => { state.color2 = e.target.value; render(); });

// ── advanced controls ──
for (const c of ADV) {
  $(c.id).addEventListener('input', (e) => {
    state[c.id] = c.kind === 'num' ? parseFloat(e.target.value) : c.kind === 'sel' ? parseInt(e.target.value, 10) : e.target.value;
    const v = $(c.id + 'Val'); if (v) v.textContent = fmt(state[c.id]);
    if (BLOOM_IDS.includes(c.id)) ensureSolidBg();
    render();
  });
}
bgSolid.addEventListener('change', () => {
  state.bg = bgSolid.checked ? (background.value || '#0a0a0a') : '';
  background.disabled = !bgSolid.checked;
  render();
});
background.addEventListener('input', () => { if (bgSolid.checked) { state.bg = background.value; render(); } });
autorotateEl.addEventListener('change', () => { state.autorotate = autorotateEl.checked; render(); });

moreToggle.addEventListener('click', () => {
  const open = advanced.classList.toggle('open');
  moreToggle.setAttribute('aria-expanded', String(open));
  moreToggle.innerHTML = `<span class="chev">⌄</span> ${open ? 'fewer options' : 'more options'}`;
});

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(code.textContent);
    copyBtn.textContent = 'copied!';
    setTimeout(() => (copyBtn.textContent = 'copy'), 1500);
  } catch {
    copyBtn.textContent = 'select + copy';
  }
});

// ── init: seed state from chrome preset + fixed defaults ──
for (const c of ADV) state[c.id] = c.src === 'fixed' ? FIXED[c.id] : PRESETS.chrome[c.id];
state.bg = PRESETS.chrome.bg;
syncAdvancedDOM();
render();
