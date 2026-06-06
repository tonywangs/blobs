// Wires the playground controls to the live background <metaball-bg> and the copy-paste snippet.
// Note: this URL is a placeholder until the widget is published (e.g. via jsDelivr from the repo).
const SCRIPT_URL = 'https://cdn.jsdelivr.net/gh/tonywangs/blobs@v1/dist/blobs.min.js';

const DEFAULTS = { color1: '#64ffda', color2: '#ff64da' };

const blob = document.getElementById('blob');
const presets = document.getElementById('presets');
const blobsInput = document.getElementById('blobs');
const speedInput = document.getElementById('speed');
const blobsVal = document.getElementById('blobsVal');
const speedVal = document.getElementById('speedVal');
const color1Input = document.getElementById('color1');
const color2Input = document.getElementById('color2');
const code = document.getElementById('code');
const copyBtn = document.getElementById('copy');

const state = { preset: 'chrome', blobs: 9, speed: 1, color1: DEFAULTS.color1, color2: DEFAULTS.color2 };

function render() {
  blob.setAttribute('preset', state.preset);
  blob.setAttribute('blobs', String(state.blobs));
  blob.setAttribute('speed', String(state.speed));
  blob.setAttribute('color1', state.color1);
  blob.setAttribute('color2', state.color2);

  // only show non-default attributes for a clean snippet
  const attrs = [`preset="${state.preset}"`];
  if (state.blobs !== 9) attrs.push(`blobs="${state.blobs}"`);
  if (state.speed !== 1) attrs.push(`speed="${state.speed}"`);
  if (state.color1.toLowerCase() !== DEFAULTS.color1) attrs.push(`color1="${state.color1}"`);
  if (state.color2.toLowerCase() !== DEFAULTS.color2) attrs.push(`color2="${state.color2}"`);

  code.textContent =
    `<script src="${SCRIPT_URL}"></script>\n` +
    `<metaball-bg ${attrs.join(' ')}></metaball-bg>`;
}

presets.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  state.preset = btn.dataset.preset;
  for (const b of presets.children) b.classList.toggle('active', b === btn);
  render();
});

blobsInput.addEventListener('input', (e) => {
  state.blobs = parseInt(e.target.value, 10);
  blobsVal.textContent = String(state.blobs);
  render();
});

speedInput.addEventListener('input', (e) => {
  state.speed = parseFloat(e.target.value);
  speedVal.textContent = state.speed.toFixed(1);
  render();
});

color1Input.addEventListener('input', (e) => { state.color1 = e.target.value; render(); });
color2Input.addEventListener('input', (e) => { state.color2 = e.target.value; render(); });

copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(code.textContent);
    copyBtn.textContent = 'copied!';
    setTimeout(() => (copyBtn.textContent = 'copy'), 1500);
  } catch {
    copyBtn.textContent = 'select + copy';
  }
});

render();
