# 🫧 blobs

> A gorgeous animated liquid-metaball background for your website — in **one line of code**.

[Live demo & customizer](https://blobs-playground.vercel.app) · zero dependencies · MIT

![blobs](./assets/hero.png)

## Quick start

Drop these two lines anywhere in your HTML:

```html
<script src="https://cdn.jsdelivr.net/gh/tonywangs/blobs@v1/dist/blobs.min.js"></script>
<metaball-bg></metaball-bg>
```

Want it as a full-page background behind your whole site? Add `background`:

```html
<metaball-bg background></metaball-bg>
```

## Customize

| attribute | values | default | what it does |
|---|---|---|---|
| `preset` | `chrome` · `glass` · `jelly` | `chrome` | material look |
| `blobs` | `1`–`16` | `9` | number of metaballs |
| `speed` | `0`–`3` | `1` | animation speed |
| `color1` | hex | `#64ffda` | top reflection color |
| `color2` | hex | `#ff64da` | bottom reflection color |
| `bg` | hex or `transparent` | `#0a0a0a` | background behind the blob |
| `quality` | `32` · `48` · `64` | `64` | mesh resolution (perf ↔ smoothness) |
| `background` | _(boolean)_ | — | fixed, full-page background mode |

Example:

```html
<metaball-bg preset="jelly" blobs="12" color1="#ff8a3d" color2="#3d6bff"></metaball-bg>
```

Don't want to write HTML? Use the [playground](https://blobs-playground.vercel.app) to tweak it visually and copy the snippet.

## Why it won't slow your site down

- **Self-contained** — Three.js is bundled in (~124 KB gzipped). No dependencies, no build step on your end.
- **Lazy** — starts rendering only when it scrolls into view, and pauses when off-screen or on a hidden tab.
- **Polite** — respects `prefers-reduced-motion`, caps the device pixel ratio, and never intercepts clicks in background mode.

## Local development

```bash
npm install
npm run dev         # live customizer playground
npm run build       # → dist/blobs.min.js   (the embeddable widget)
npm run build:site  # → site-dist/          (the playground, as a static site)
```

## License

MIT © Tony Wang
