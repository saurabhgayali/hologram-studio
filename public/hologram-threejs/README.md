# Hologram Studio — Holo-Deck

**[Live demo](https://hologram-studio.vercel.app/)** · **[Documentation](https://hologram-studio.vercel.app/doc.html)** · **[GitHub](https://github.com/saurabhgayali/hologram-studio)**

A **render-target volumetric hologram** for three.js. Ships as a zero-build, single-page demo
(`index.html`) plus a **reusable, framework-free module** (`holo-projector.js`) you can drop into
any three.js project to project your own `.glb` onto any surface in your own scene.

> Two scenes, two cameras, one texture: hidden content is rendered into a `WebGLRenderTarget`, the
> hidden camera mirrors your main camera's angle every frame, and a custom shader paints the result
> as light — scanlines, chromatic split, spectral tint, fresnel edge glow, glitch and flicker.

---

## Features

- **Dual-scene render-target architecture** — 1024², `HalfFloatType`, 4× MSAA
- **Real parallax depth** — hidden camera angle mirrored from the main camera relative to the panel
- **Custom hologram shader** — scanlines, rolling sweep, chromatic aberration, spectral tint,
  fresnel edge glow, glitch bands, flicker, luminance-driven alpha
- **Any surface** — `projector.material` is an ordinary three.js material; put it on a plane,
  a curved panel, a screen inside a model
- **Any model** — `loadGLB(url)` with automatic centering and scaling into the hidden frustum
- **Safe uploads** — `createValidatedModelURL(file)` validates extension, size, GLB magic header and
  declared length before touching `GLTFLoader` (kills the *"Invalid typed array length"* crash)
- **Built-in presets** — sci-fi crystal with orbiting dust, procedural fire sphere, galaxy core,
  plus starfield / ember / fog background FX
- **Glassmorphic sci-fi UI** — presets, drag-and-drop GLB upload, tint + FX + lighting sliders,
  auto-rotate, camera reset, fullscreen
- **Disciplined cleanup** — render targets, geometries, materials, textures and blob URLs all disposed

## Quick start

No build step, no npm install. three.js loads from a CDN via an import map.

```bash
git clone https://github.com/<you>/hologram-threejs.git
cd hologram-threejs
python3 -m http.server 8080     # or: npx serve .
# open http://localhost:8080/index.html
```

`file://` will not work — ES modules need an HTTP origin.

## Files

| File | Purpose |
| --- | --- |
| `index.html` | The complete Holo-Deck app: card, UI, upload, controls. Self-contained. |
| `holo-projector.js` | **The reusable module.** No UI, no framework, no dependencies beyond three.js. |
| `presets.js` | Optional built-in hologram scenes and background FX. |
| `doc.html` | Full documentation: architecture, shader breakdown, API reference, recipes. |

## Use it in your own project

```js
import * as THREE from 'three';
import { HoloProjector } from './holo-projector.js';

const holo = new HoloProjector({ renderer, tint: '#38e8ff' });

await holo.loadGLB('/models/robot.glb');       // auto-centered + auto-scaled
// or: holo.setContent(anyObject3D);

const panel = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), holo.material);
scene.add(panel);
holo.attachTo(panel);                          // parallax anchor

function loop() {
  const delta = clock.getDelta();
  holo.update(camera, delta);                  // render hidden scene → texture
  renderer.render(scene, camera);              // then draw your scene
  requestAnimationFrame(loop);
}
loop();
```

### Core API

```js
new HoloProjector({ renderer, size, tint, opacity, scanSpeed, glitch,
                    distance, fov, fitSize, parallax, additive,
                    autoRotate, autoRotateSpeed, samples })

holo.material            // put this on any mesh
holo.scene / holo.camera // the hidden scene + camera
holo.contentGroup        // what auto-rotate spins
holo.renderTarget        // raw WebGLRenderTarget

holo.update(camera, delta)
holo.setContent(obj, { fit, owned })
holo.loadGLB(url, { fit })
holo.clearContent()
holo.fit(obj, targetSize)
holo.attachTo(mesh)
holo.setTint(hex) / setOpacity(v) / setScanSpeed(v) / setGlitch(v) / setAutoRotate(bool)
holo.addDefaultLights(i) / removeDefaultLights() / setLightIntensity(i)
holo.setResolution(size)
holo.dispose()
```

Helpers: `createValidatedModelURL(file)`, `disposeObject(root)`,
`HOLO_VERTEX_SHADER`, `HOLO_FRAGMENT_SHADER`.

Full reference and recipes: open **`doc.html`**.

## How it works (30 seconds)

```text
hidden scene            render target            visible scene
┌──────────────┐        ┌────────────┐          ┌────────────────────┐
│  your GLB    │  ───►  │  1024x1024 │  ───►    │  card frame        │
│  lights, fx  │ render │  texture   │  uMap    │  ├ panel mesh ─────┼── hologram shader
│  hidden cam  │        └────────────┘          │  └ glass cover     │
└──────▲───────┘                                └─────────▲──────────┘
       └──────── angle mirrored every frame ──────────────┘
```

The parallax mirroring is what makes it read as volume instead of a sticker: orbit the card and the
hidden camera swings with you, revealing the far side of the model through the window.

**Gotcha worth knowing:** a raw `ShaderMaterial` receives no automatic linear→sRGB conversion, so the
fragment shader applies `pow(col, 1.0/2.2)` itself. Without it the projection renders nearly black.

## Browser support

Any browser with WebGL 2 and ES module import maps: Chrome/Edge 89+, Firefox 108+, Safari 16.4+.

## Performance notes

- The hidden scene costs one extra full render pass per frame — keep it lean.
- `holo.setResolution(512)` on low-end/mobile devices.
- Skip `holo.update()` when the panel is off-screen; the last frame stays in the texture.
- Call `holo.dispose()` on unmount — render targets are not garbage collected.

## Roadmap

- Optional bloom/afterimage post pass on the render target
- Cube-camera mode for 360° holographic surfaces
- React (`@react-three/fiber`) wrapper package

## License

MIT — see [LICENSE](./LICENSE).
