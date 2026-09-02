/**
 * presets.js — optional built-in hologram scenes for holo-projector.js
 * Each factory returns { object, update(delta, elapsed), dispose() }.
 * These are plain three.js objects: use them, replace them, or ignore them.
 */

import * as THREE from 'three';

/* ---------------------------------- dust ---------------------------------- */

export function createDust({ count = 400, color = '#38e8ff', size = 0.035 } = {}) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const r = 1.2 + Math.random() * 1.6;
    const t = Math.random() * Math.PI * 2;
    positions.set([Math.cos(t) * r, (Math.random() - 0.5) * 2.2, Math.sin(t) * r], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size, color: new THREE.Color(color), transparent: true, opacity: 0.8,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  return {
    object: points,
    update(delta, elapsed, { autoRotate = false } = {}) {
      if (autoRotate) points.rotation.y += delta * 0.25;
      points.rotation.x = Math.sin(elapsed * 0.2) * 0.15;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

/* -------------------------- preset 1 — sci-fi crystal --------------------- */

export function createCrystal({ color = '#38e8ff' } = {}) {
  const group = new THREE.Group();
  const geo = new THREE.IcosahedronGeometry(1.1, 0);
  const mat = new THREE.MeshStandardMaterial({
    color, emissive: new THREE.Color(color), emissiveIntensity: 0.9,
    roughness: 0.15, metalness: 0.4, flatShading: true,
  });
  const core = new THREE.Mesh(geo, mat);

  const cageGeo = new THREE.IcosahedronGeometry(1.1, 0);
  const cageMat = new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.55 });
  const cage = new THREE.Mesh(cageGeo, cageMat);
  cage.scale.setScalar(1.35);

  const dust = createDust({ color });
  group.add(core, cage, dust.object);

  return {
    object: group,
    update(delta, elapsed, opts = {}) {
      if (opts.autoRotate) { core.rotation.y += delta * 0.5; core.rotation.z += delta * 0.12; }
      dust.update(delta, elapsed, opts);
    },
    dispose() { geo.dispose(); mat.dispose(); cageGeo.dispose(); cageMat.dispose(); dust.dispose(); },
  };
}

/* --------------------------- preset 2 — fire sphere ----------------------- */

const FIRE_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormalW;
  uniform float uTime;
  void main() {
    vPos = position;
    vNormalW = normalize(normalMatrix * normal);
    vec3 p = position * (1.0 + 0.06 * sin(uTime * 2.0 + position.y * 4.0));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const FIRE_FRAG = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormalW;
  uniform float uTime;
  float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
  float noise(vec3 p){
    vec3 i = floor(p); vec3 f = fract(p); f = f*f*(3.0-2.0*f);
    return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
  }
  void main(){
    float n = noise(vPos * 2.2 + vec3(0.0, -uTime * 1.4, uTime * 0.4));
    n += 0.5 * noise(vPos * 5.0 + vec3(0.0, -uTime * 2.2, 0.0));
    float heat = smoothstep(0.25, 1.25, n + (0.6 - vPos.y * 0.35));
    vec3 col = mix(vec3(0.6, 0.05, 0.0), vec3(1.0, 0.55, 0.08), heat);
    col = mix(col, vec3(1.0, 0.95, 0.65), pow(heat, 3.0));
    col += pow(1.0 - abs(vNormalW.z), 2.0) * vec3(1.0, 0.4, 0.1);
    gl_FragColor = vec4(col, 1.0);
  }
`;

export function createFireSphere() {
  const group = new THREE.Group();
  const uniforms = { uTime: { value: 0 } };
  const geo = new THREE.SphereGeometry(1.15, 96, 96);
  const mat = new THREE.ShaderMaterial({ uniforms, vertexShader: FIRE_VERT, fragmentShader: FIRE_FRAG });
  const core = new THREE.Mesh(geo, mat);

  const haloGeo = new THREE.SphereGeometry(1.15, 32, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: '#ff7a18', transparent: true, opacity: 0.12,
    blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const halo = new THREE.Mesh(haloGeo, haloMat);
  halo.scale.setScalar(1.5);

  const dust = createDust({ count: 250, color: '#ffb066' });
  const light = new THREE.PointLight(0xff7a18, 6, 8);
  group.add(core, halo, dust.object, light);

  return {
    object: group,
    update(delta, elapsed, opts = {}) { uniforms.uTime.value = elapsed; dust.update(delta, elapsed, opts); },
    dispose() { geo.dispose(); mat.dispose(); haloGeo.dispose(); haloMat.dispose(); dust.dispose(); },
  };
}

/* ---------------------------- preset 3 — galaxy --------------------------- */

export function createGalaxy({ color = '#38e8ff', count = 9000 } = {}) {
  const group = new THREE.Group();
  group.rotation.x = 0.35;

  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const inner = new THREE.Color(color);
  const outer = new THREE.Color('#2b1a5e');
  for (let i = 0; i < count; i++) {
    const branch = (i % 4) / 4;
    const r = Math.pow(Math.random(), 0.6) * 2.4;
    const angle = branch * Math.PI * 2 + r * 1.9;
    const spread = 0.28 * r;
    positions.set([
      Math.cos(angle) * r + (Math.random() - 0.5) * spread,
      (Math.random() - 0.5) * spread * 0.6,
      Math.sin(angle) * r + (Math.random() - 0.5) * spread,
    ], i * 3);
    const c = inner.clone().lerp(outer, Math.min(r / 2.4, 1));
    colors.set([c.r, c.g, c.b], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.03, vertexColors: true, transparent: true,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const disc = new THREE.Points(geo, mat);

  const coreGeo = new THREE.SphereGeometry(0.28, 32, 32);
  const coreMat = new THREE.MeshBasicMaterial({ color });
  group.add(disc, new THREE.Mesh(coreGeo, coreMat), new THREE.PointLight(new THREE.Color(color), 5, 10));

  return {
    object: group,
    update(delta, _elapsed, opts = {}) { if (opts.autoRotate) disc.rotation.y += delta * 0.12; },
    dispose() { geo.dispose(); mat.dispose(); coreGeo.dispose(); coreMat.dispose(); },
  };
}

/* ------------------------------ background FX ----------------------------- */

export function createStarfield({ count = 1200 } = {}) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(6 + Math.random() * 8);
    positions.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({ size: 0.05, color: '#cfe9ff', transparent: true, opacity: 0.7, depthWrite: false });
  const points = new THREE.Points(geo, mat);
  return { object: points, update() {}, dispose() { geo.dispose(); mat.dispose(); } };
}

export function createEmbers({ count = 300 } = {}) {
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    positions.set([(Math.random() - 0.5) * 5, Math.random() * 6 - 3, (Math.random() - 0.5) * 5], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.07, color: '#ff8c2e', transparent: true, opacity: 0.75,
    depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, mat);
  return {
    object: points,
    update(delta) {
      const pos = geo.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        let y = pos.getY(i) + delta * (0.5 + (i % 5) * 0.12);
        if (y > 3) y = -3;
        pos.setY(i, y);
      }
      pos.needsUpdate = true;
      points.rotation.y += delta * 0.05;
    },
    dispose() { geo.dispose(); mat.dispose(); },
  };
}

export const PRESETS = {
  crystal: { label: 'Sci-Fi Crystal', create: createCrystal },
  fire: { label: 'Fire Sphere', create: createFireSphere },
  galaxy: { label: 'Galaxy Core', create: createGalaxy },
};

export const TINTS = {
  cyan: { label: 'Cyan', hex: '#38e8ff' },
  magenta: { label: 'Magenta', hex: '#ff45d0' },
  gold: { label: 'Gold', hex: '#ffc061' },
  matrix: { label: 'Matrix', hex: '#4dff88' },
};
