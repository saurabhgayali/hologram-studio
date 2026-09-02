# Hologram Studio

Build a production-ready, highly aesthetic 3D Interactive Holographic Card web application using React, Three.js (@react-three/fiber and @react-three/drei), Tailwind CSS, and Lucide React icons.

### Architectural Overview & Mechanics
1. Dual Scene Architecture (Render Target Pattern):
   - Off-screen Scene: A hidden Three.js scene containing the hologram content (lighting, environment, particle effects, and loaded 3D models).
   - Off-screen Camera: A camera inside the hidden scene whose perspective is updated every frame relative to the main camera's angle to the card.
   - Render Target: Render the off-screen scene into a `THREE.WebGLRenderTarget` texture at 1024x1024 resolution.
   - Main Scene: A visible 3D canvas featuring a realistic physical 3D card frame.
   - Hologram Projection Surface: A semi-transparent plane inside the card frame that uses the WebGLRenderTarget as its texture, combined with a custom shader or material effect.

2. Holographic Material & Visual Effects:
   - Apply additive blending (`THREE.AdditiveBlending`) or custom opacity to make the projection semi-transparent.
   - Add holographic visual artifacts: subtle moving scanlines, a blue/cyan spectral tint, edge glowing (Fresnel effect), and slight glitch/flicker intensity controls.
   - The card frame itself should be solid (glassy or dark metallic texture) with floating holographic content visible inside/behind the window.

3. Interactive Parallax Camera Control:
   - Orbit controls or mouse/tilt tracking for the main camera.
   - Dynamically mirror main camera angles to the off-screen camera so rotating around the card reveals real depth inside the holographic display.

4. Model Loader & FX Engine:
   - Provide built-in preset scenes for the hologram (e.g., Preset 1: Floating Sci-Fi Crystal with Orbiting Dust, Preset 2: Flaming Fire Sphere, Preset 3: Deep Space Starfield & Galaxy Core).
   - Support custom user `.glb` / `.gltf` file uploads using a file input or drag-and-drop.
   - Auto-center and auto-scale uploaded models so they fit perfectly inside the off-screen camera frustum.

### User Interface & Controls (Tailwind UI Overlay)
- Floating Glassmorphic UI Panel:
  - Model Source Tab: Switch between built-in presets and "Upload Custom GLB".
  - GLB File Uploader: Dropzone/button to load custom 3D files with loading indicators and error handling.
  - FX Controls Panel: Sliders for Hologram Tint Color (Cyan, Magenta, Gold, Matrix Green), Scanline Speed, Hologram Transparency, Glitch Intensity, and Background FX (Toggle Fire, Fog, Starfield).
  - Lighting Controls: Intensity slider for the holographic light source.
- Floating Card Controls: Toggle Card Auto-Rotate, Reset Camera view button, and Fullscreen mode button.
- Clean, modern sci-fi dark UI aesthetic with high contrast, subtle glows, and responsive design.

Ensure smooth performance with proper memory cleanup (disposing textures, geometries, and materials when models or render targets change).

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/31c37085-4260-4da5-b91c-06828291aaa7).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
