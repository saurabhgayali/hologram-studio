/**
 * holo-projector.js
 * ------------------------------------------------------------------
 * A tiny, dependency-light helper that turns ANY three.js surface into a
 * volumetric holographic display.
 *
 * How it works
 *  1. It creates a hidden `THREE.Scene` + `THREE.PerspectiveCamera`.
 *  2. Every frame it renders that hidden scene into a `THREE.WebGLRenderTarget`.
 *  3. The render target texture is fed to a custom `ShaderMaterial` (scanlines,
 *     chromatic split, spectral tint, fresnel edge glow, glitch + flicker).
 *  4. The hidden camera is re-positioned every frame so its angle mirrors the
 *     angle between your real camera and the display surface. That is what makes
 *     the content look like it has real depth inside the panel.
 *
 * Usage
 *   import { HoloProjector } from './holo-projector.js';
 *
 *   const holo = new HoloProjector({ renderer });
 *   holo.setContent(myGLTF.scene);            // or holo.loadGLB(url)
 *   const panel = new THREE.Mesh(new THREE.PlaneGeometry(2, 3), holo.material);
 *   scene.add(panel);
 *   holo.attachTo(panel);                     // parallax anchor
 *
 *   // in your render loop, BEFORE renderer.render(scene, camera):
 *   holo.update(camera, delta);
 *
 * MIT licensed.
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export const HOLO_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;
  void main() {
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vNormalW = normalize(normalMatrix * normal);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

export const HOLO_FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3  uTint;
  uniform float uTime;
  uniform float uOpacity;
  uniform float uScanSpeed;
  uniform float uGlitch;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vViewDir;

  float rand(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    vec2 uv = vUv;

    // horizontal glitch bands
    float band = floor(uv.y * 90.0);
    float g = step(1.0 - uGlitch * 0.25, rand(vec2(band, floor(uTime * 12.0))));
    uv.x += g * (rand(vec2(band, uTime)) - 0.5) * 0.06 * uGlitch;

    // chromatic split
    float ca = 0.0025 + uGlitch * 0.006;
    float r  = texture2D(uMap, uv + vec2(ca, 0.0)).r;
    float gc = texture2D(uMap, uv).g;
    float b  = texture2D(uMap, uv - vec2(ca, 0.0)).b;
    vec3 col = vec3(r, gc, b);

    // spectral tint
    float lum = dot(col, vec3(0.299, 0.587, 0.114));
    col = mix(col, uTint * (0.35 + lum * 1.5), 0.72);

    // scanlines
    float scan = 0.86 + 0.14 * sin((uv.y * 620.0) - uTime * 9.0 * uScanSpeed);
    col *= scan;

    // rolling sweep
    float sweep = smoothstep(0.0, 0.06, abs(fract(uv.y - uTime * 0.09 * uScanSpeed) - 0.5));
    col += uTint * (1.0 - sweep) * 0.18;

    // fresnel edge glow
    float fres = pow(1.0 - max(dot(normalize(vNormalW), normalize(vViewDir)), 0.0), 2.5);
    float edge = 1.0 - smoothstep(0.34, 0.5, max(abs(uv.x - 0.5), abs(uv.y - 0.5)));
    col += uTint * (fres * 0.6 + (1.0 - edge) * 0.35);

    // flicker
    float flicker = 1.0 - uGlitch * 0.35 * rand(vec2(floor(uTime * 18.0), 3.7));
    col *= flicker;

    // linear -> sRGB (a raw ShaderMaterial gets no automatic output encoding)
    col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
    // keep the spectral hue in the highlights instead of blowing out to white
    col = mix(col, uTint * (0.45 + lum * 0.9), 0.5);
    col *= 1.05;

    float alpha = clamp((lum * 1.35 + 0.12 + fres * 0.4), 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col, alpha);
  }
`;

const DEFAULTS = {
  size: 1024,
  tint: '#38e8ff',
  opacity: 0.9,
  scanSpeed: 1,
  glitch: 0.15,
  distance: 4.6,      // hidden camera orbit radius
  fov: 45,
  fitSize: 2.4,       // target bounding-box size for auto-fitted models
  parallax: true,     // mirror main-camera angle into the hidden camera
  additive: true,
  autoRotate: false,
  autoRotateSpeed: 0.4,
  samples: 4,
};

export class HoloProjector {
  /**
   * @param {{renderer: THREE.WebGLRenderer} & Partial<typeof DEFAULTS>} options
   */
  constructor(options) {
    if (!options || !options.renderer) {
      throw new Error('[HoloProjector] a `renderer` option is required');
    }
    this.opts = Object.assign({}, DEFAULTS, options);
    this.renderer = this.opts.renderer;

    /** hidden scene rendered into the render target */
    this.scene = new THREE.Scene();
    /** hidden camera, angle-mirrored from the main camera */
    this.camera = new THREE.PerspectiveCamera(this.opts.fov, 1, 0.1, 100);
    this.camera.position.set(0, 0, this.opts.distance);

    this.renderTarget = new THREE.WebGLRenderTarget(this.opts.size, this.opts.size, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      samples: this.opts.samples,
    });

    this.uniforms = {
      uMap: { value: this.renderTarget.texture },
      uTint: { value: new THREE.Color(this.opts.tint) },
      uTime: { value: 0 },
      uOpacity: { value: this.opts.opacity },
      uScanSpeed: { value: this.opts.scanSpeed },
      uGlitch: { value: this.opts.glitch },
    };

    /** drop this on ANY mesh you want to become a hologram surface */
    this.material = new THREE.ShaderMaterial({
      uniforms: this.uniforms,
      vertexShader: HOLO_VERTEX_SHADER,
      fragmentShader: HOLO_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      toneMapped: false,
      blending: this.opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });

    /** everything you add via setContent() lives under this group */
    this.contentGroup = new THREE.Group();
    this.scene.add(this.contentGroup);

    this.anchor = null;
    this._elapsed = 0;
    this._ownedContent = null;
    this._loader = null;
    this._v = new THREE.Vector3();
    this._defaultLights = null;

    this.addDefaultLights();
  }

  /* ------------------------------- lighting ------------------------------- */

  addDefaultLights(intensity = 1) {
    if (this._defaultLights) this.removeDefaultLights();
    const g = new THREE.Group();
    const ambient = new THREE.AmbientLight(0xffffff, 0.35 * intensity);
    const dir = new THREE.DirectionalLight(0xffffff, 1.6 * intensity);
    dir.position.set(3, 4, 3);
    const key = new THREE.PointLight(this.uniforms.uTint.value.getHex(), 4 * intensity, 14);
    key.position.set(-3, -2, 2);
    g.add(ambient, dir, key);
    this.scene.add(g);
    this._defaultLights = { group: g, ambient, dir, key };
    return g;
  }

  removeDefaultLights() {
    if (!this._defaultLights) return;
    this.scene.remove(this._defaultLights.group);
    this._defaultLights = null;
  }

  /** rescale the built-in lights without rebuilding them */
  setLightIntensity(intensity) {
    if (!this._defaultLights) return;
    this._defaultLights.ambient.intensity = 0.35 * intensity;
    this._defaultLights.dir.intensity = 1.6 * intensity;
    this._defaultLights.key.intensity = 4 * intensity;
  }

  /* -------------------------------- content -------------------------------- */

  /**
   * Replace the hologram content.
   * @param {THREE.Object3D|null} object3d
   * @param {{fit?: boolean, owned?: boolean}} [opts] fit = auto-center + auto-scale
   */
  setContent(object3d, opts = {}) {
    const { fit = true, owned = false } = opts;
    this.clearContent();
    if (!object3d) return null;
    if (fit) this.fit(object3d);
    this.contentGroup.add(object3d);
    this.content = object3d;
    if (owned) this._ownedContent = object3d;
    return object3d;
  }

  /** auto-center and auto-scale an object so it fills the hidden frustum */
  fit(object3d, targetSize = this.opts.fitSize) {
    const box = new THREE.Box3().setFromObject(object3d);
    if (box.isEmpty()) return object3d;
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = targetSize / maxDim;
    object3d.position.sub(center);
    object3d.scale.multiplyScalar(scale);
    object3d.position.multiplyScalar(scale);
    return object3d;
  }

  /**
   * Load a .glb / .gltf file (URL or blob URL) and project it.
   * @returns {Promise<THREE.Object3D>}
   */
  loadGLB(url, { fit = true } = {}) {
    if (!this._loader) this._loader = new GLTFLoader();
    return new Promise((resolve, reject) => {
      this._loader.load(
        url,
        (gltf) => resolve(this.setContent(gltf.scene, { fit, owned: true })),
        undefined,
        (err) => reject(err instanceof Error ? err : new Error(String(err && err.message || err))),
      );
    });
  }

  /** remove + dispose whatever is currently projected */
  clearContent() {
    while (this.contentGroup.children.length) {
      const child = this.contentGroup.children[0];
      this.contentGroup.remove(child);
      if (child === this._ownedContent) disposeObject(child);
    }
    this._ownedContent = null;
    this.content = null;
  }

  /* --------------------------------- look ---------------------------------- */

  setTint(hex) {
    this.uniforms.uTint.value.set(hex);
    if (this._defaultLights) this._defaultLights.key.color.set(hex);
  }
  setOpacity(v) { this.uniforms.uOpacity.value = v; }
  setScanSpeed(v) { this.uniforms.uScanSpeed.value = v; }
  setGlitch(v) { this.uniforms.uGlitch.value = v; }
  setAutoRotate(on) { this.opts.autoRotate = !!on; }

  /** parallax anchor: usually the mesh that carries `projector.material` */
  attachTo(object3d) { this.anchor = object3d; return this; }

  /* -------------------------------- runtime -------------------------------- */

  /**
   * Call once per frame BEFORE your main renderer.render(...).
   * @param {THREE.Camera} mainCamera the camera looking at the display surface
   * @param {number} delta seconds since last frame
   */
  update(mainCamera, delta = 0.016) {
    this._elapsed += delta;
    this.uniforms.uTime.value = this._elapsed;

    if (this.opts.autoRotate) {
      this.contentGroup.rotation.y += delta * this.opts.autoRotateSpeed;
    }

    if (this.opts.parallax && mainCamera && this.anchor) {
      this.anchor.updateWorldMatrix(true, false);
      this._v.copy(mainCamera.position);
      this.anchor.worldToLocal(this._v);
      if (this._v.lengthSq() > 1e-6) {
        this._v.normalize().multiplyScalar(this.opts.distance);
        this.camera.position.copy(this._v);
        this.camera.up.set(0, 1, 0);
        this.camera.lookAt(0, 0, 0);
        this.camera.updateProjectionMatrix();
      }
    }

    const prevTarget = this.renderer.getRenderTarget();
    this.renderer.setRenderTarget(this.renderTarget);
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    this.renderer.setRenderTarget(prevTarget);
  }

  /** change render-target resolution at runtime */
  setResolution(size) {
    this.opts.size = size;
    this.renderTarget.setSize(size, size);
  }

  /** free every GPU resource this projector owns */
  dispose() {
    this.clearContent();
    this.renderTarget.dispose();
    this.renderTarget.texture.dispose();
    this.material.dispose();
    disposeObject(this.scene);
  }
}

/** recursively dispose geometries, materials and their textures */
export function disposeObject(root) {
  root.traverse((o) => {
    if (o.geometry) o.geometry.dispose();
    const mat = o.material;
    if (!mat) return;
    const list = Array.isArray(mat) ? mat : [mat];
    for (const m of list) {
      for (const key of Object.keys(m)) {
        const val = m[key];
        if (val && val.isTexture) val.dispose();
      }
      m.dispose();
    }
  });
}

/**
 * Validate a user-supplied .glb / .gltf File before handing it to GLTFLoader.
 * Returns { ok: true, url, revoke } or { ok: false, error }.
 */
export async function createValidatedModelURL(file, { maxBytes = 60 * 1024 * 1024 } = {}) {
  const name = (file.name || '').toLowerCase();
  const isGlb = name.endsWith('.glb');
  const isGltf = name.endsWith('.gltf');
  if (!isGlb && !isGltf) return { ok: false, error: 'Only .glb or .gltf files are supported.' };
  if (file.size > maxBytes) return { ok: false, error: `File is too large (max ${Math.round(maxBytes / 1048576)} MB).` };

  const buffer = await file.arrayBuffer();

  if (isGlb) {
    if (buffer.byteLength < 20) return { ok: false, error: 'File is truncated or empty.' };
    const view = new DataView(buffer);
    if (view.getUint32(0, true) !== 0x46546c67) return { ok: false, error: 'Not a valid GLB (bad magic header).' };
    const declared = view.getUint32(8, true);
    if (declared !== buffer.byteLength) return { ok: false, error: 'GLB is corrupt (length mismatch).' };
  } else {
    try {
      const json = JSON.parse(new TextDecoder().decode(buffer));
      if (!json.asset || !json.asset.version) throw new Error('missing asset.version');
    } catch (e) {
      return { ok: false, error: 'Not a valid glTF JSON file.' };
    }
  }

  const blob = new Blob([buffer], { type: isGlb ? 'model/gltf-binary' : 'model/gltf+json' });
  const url = URL.createObjectURL(blob);
  return { ok: true, url, revoke: () => URL.revokeObjectURL(url) };
}

export default HoloProjector;
