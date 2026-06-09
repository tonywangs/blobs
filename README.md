# 🫧 blobs

> A gorgeous animated liquid-metaball background for your website — in **one line of code**.

[Live demo & customizer](https://blobs.vercel.app) · zero dependencies · MIT

![blobs](./assets/hero.png)

## Quick start

Drop these two lines anywhere in your HTML:

```html
<script src="https://cdn.jsdelivr.net/gh/tonywangs/blobs@v6/dist/blobs.min.js"></script>
<metaball-bg></metaball-bg>
```

Want it as a full-page background behind your whole site? Add `background`:

```html
<metaball-bg background></metaball-bg>
```

## Customize

The easiest way is the visual customizer at **[blobs.vercel.app](https://blobs.vercel.app)** — pick a
preset, tweak, hit **more options** for the full control set, and copy the one-liner it generates. Or set
attributes by hand:

| attribute | values | default | what it does |
|---|---|---|---|
| `preset` | `chrome` · `glass` · `jelly` | `chrome` | material look (sets the defaults below) |
| `blobs` | `1`–`16` | `9` | number of metaballs |
| `speed` | `0`–`3` | `1` | animation speed |
| `color1` | hex | `#64ffda` | top reflection color |
| `color2` | hex | `#ff64da` | bottom reflection color |
| `bg` | hex or `transparent` | transparent (chrome) | background behind the blob |
| `quality` | `32` · `48` · `64` | `64` | mesh resolution (perf ↔ smoothness) |
| `background` | _(boolean)_ | — | fixed, full-page background mode |

<details>
<summary><b>Advanced attributes</b> — sculpt a bespoke look (defaults follow the chosen <code>preset</code>)</summary>

| attribute | values | what it does |
|---|---|---|
| `color` | hex | base material tint |
| `metalness` / `roughness` | `0`–`1` | how metallic / how polished |
| `clearcoat` / `iridescence` | `0`–`1` | glossy lacquer / oil-film shimmer |
| `transmission` | `0`–`1` | glassiness (see-through refraction) |
| `reflections` | `0`–`3` | environment reflection intensity |
| `emissive` / `emissive-str` | hex / `0`–`4` | inner glow color & strength |
| `spread` | `0.05`–`0.35` | how far the blobs roam |
| `threshold` | `10`–`120` | surface tightness |
| `strength` | `0.2`–`3` | blob mass |
| `exposure` | `0.2`–`2.5` | overall brightness |
| `bloom` / `bloom-cutoff` / `bloom-radius` | `0`–`2` / `0`–`1` / `0`–`1` | glow bloom (needs a solid `bg`) |
| `autorotate` | _(boolean)_ | slowly spin the camera |
| `rotate-speed` | `0`–`3` | spin speed |

> **Bloom needs a solid background.** A transparent blob can't bloom (the glow has nothing to spill onto),
> so set a `bg` color when you raise `bloom`. The customizer does this for you automatically.

</details>

Example:

```html
<metaball-bg preset="jelly" blobs="12" color1="#ff8a3d" color2="#3d6bff" bloom="1.2" bg="#0a0a0a"></metaball-bg>
```

## Why it won't slow your site down

- **Self-contained** — Three.js is bundled in (~128 KB gzipped). No dependencies, no build step on your end.
- **Lazy** — starts rendering only when it scrolls into view, and pauses when off-screen or on a hidden tab.
- **Polite** — respects `prefers-reduced-motion`, caps the device pixel ratio, and never intercepts clicks in background mode.

## Local development

```bash
npm install
npm run dev         # live customizer (simple + advanced controls)
npm run build       # → dist/blobs.min.js   (the embeddable widget)
npm run build:site  # → site-dist/          (the customizer, as a static site)
```

> The `studio/` folder holds the original standalone Three.js design tool. The customizer above now exposes
> the same controls over the embeddable widget, so it's the one to use — `studio/` is kept for reference.

## License

MIT © Tony Wang
