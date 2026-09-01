import { useFrame, useLoader } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { HoloSettings } from "./types";
import { TINTS } from "./types";

/* ---------------------------------- dust --------------------------------- */

function OrbitingDust({
  count = 400,
  color,
  autoRotate = false,
}: {
  count?: number;
  color: string;
  autoRotate?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 1.2 + Math.random() * 1.6;
      const t = Math.random() * Math.PI * 2;
      const y = (Math.random() - 0.5) * 2.2;
      positions.set([Math.cos(t) * r, y, Math.sin(t) * r], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, [count]);

  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, d) => {
    if (ref.current) {
      if (autoRotate) ref.current.rotation.y += d * 0.25;
      ref.current.rotation.x = Math.sin(performance.now() * 0.0002) * 0.15;
    }
  });

  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.035}
        color={color}
        transparent
        opacity={0.8}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* -------------------------------- presets -------------------------------- */

function CrystalPreset({ color, autoRotate = false }: { color: string; autoRotate?: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, d) => {
    if (ref.current && autoRotate) {
      ref.current.rotation.y += d * 0.5;
      ref.current.rotation.z += d * 0.12;
    }
  });
  return (
    <group>
      <mesh ref={ref}>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={1.6}
          roughness={0.15}
          metalness={0.4}
          flatShading
        />
      </mesh>
      <mesh scale={1.35}>
        <icosahedronGeometry args={[1.1, 0]} />
        <meshBasicMaterial color={color} wireframe transparent opacity={0.55} />
      </mesh>
      <OrbitingDust color={color} autoRotate={autoRotate} />
    </group>
  );
}

const FIRE_VERT = /* glsl */ `
  varying vec3 vPos;
  varying vec3 vNormalW;
  uniform float uTime;
  void main() {
    vPos = position;
    vNormalW = normalize(normalMatrix * normal);
    vec3 p = position * (1.0 + 0.06 * sin(position.y * 6.0 + uTime * 3.0) + 0.04 * sin(position.x * 8.0 - uTime * 2.0));
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
    float n = mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                  mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z);
    return n;
  }
  void main(){
    float n = noise(vPos * 2.2 + vec3(0.0, -uTime * 1.4, uTime * 0.4));
    n += 0.5 * noise(vPos * 5.0 + vec3(0.0, -uTime * 2.2, 0.0));
    float heat = smoothstep(0.25, 1.25, n + (0.6 - vPos.y * 0.35));
    vec3 col = mix(vec3(0.6, 0.05, 0.0), vec3(1.0, 0.55, 0.08), heat);
    col = mix(col, vec3(1.0, 0.95, 0.65), pow(heat, 3.0));
    float rim = pow(1.0 - abs(vNormalW.z), 2.0);
    col += rim * vec3(1.0, 0.4, 0.1);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function FirePreset({ autoRotate = false }: { autoRotate?: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);
  useFrame((s) => {
    uniforms.uTime.value = s.clock.elapsedTime;
    if (mat.current) mat.current.uniformsNeedUpdate = true;
  });
  return (
    <group>
      <mesh>
        <sphereGeometry args={[1.15, 96, 96]} />
        <shaderMaterial
          ref={mat}
          uniforms={uniforms}
          vertexShader={FIRE_VERT}
          fragmentShader={FIRE_FRAG}
        />
      </mesh>
      <mesh scale={1.5}>
        <sphereGeometry args={[1.15, 32, 32]} />
        <meshBasicMaterial
          color="#ff7a18"
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <OrbitingDust count={250} color="#ffb066" autoRotate={autoRotate} />
      <pointLight position={[0, 0, 0]} intensity={6} distance={8} color="#ff7a18" />
    </group>
  );
}

function GalaxyPreset({
  color,
  autoRotate = false,
}: {
  color: string;
  autoRotate?: boolean;
}) {
  const ref = useRef<THREE.Points>(null);
  const { geo, mat } = useMemo(() => {
    const count = 9000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const inner = new THREE.Color(color);
    const outer = new THREE.Color("#2b1a5e");
    for (let i = 0; i < count; i++) {
      const branch = (i % 4) / 4;
      const r = Math.pow(Math.random(), 0.6) * 2.4;
      const spin = r * 1.9;
      const angle = branch * Math.PI * 2 + spin;
      const spread = 0.28 * r;
      positions.set(
        [
          Math.cos(angle) * r + (Math.random() - 0.5) * spread,
          (Math.random() - 0.5) * spread * 0.6,
          Math.sin(angle) * r + (Math.random() - 0.5) * spread,
        ],
        i * 3,
      );
      const c = inner.clone().lerp(outer, Math.min(r / 2.4, 1));
      colors.set([c.r, c.g, c.b], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const m = new THREE.PointsMaterial({
      size: 0.03,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geo: g, mat: m };
  }, [color]);

  useEffect(
    () => () => {
      geo.dispose();
      mat.dispose();
    },
    [geo, mat],
  );

  useFrame((_, d) => {
    if (ref.current && autoRotate) ref.current.rotation.y += d * 0.12;
  });

  return (
    <group rotation={[0.35, 0, 0]}>
      <points ref={ref} geometry={geo} material={mat} />
      <mesh>
        <sphereGeometry args={[0.28, 32, 32]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <pointLight intensity={5} distance={10} color={color} />
    </group>
  );
}

/* ------------------------------ custom model ------------------------------ */

function CustomModel({ url, autoRotate = false }: { url: string; autoRotate?: boolean }) {
  const gltf = useLoader(GLTFLoader, url);
  const ref = useRef<THREE.Group>(null);

  const scene = useMemo(() => {
    const clone = gltf.scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const scale = 2.4 / maxDim;
    clone.position.sub(center);
    clone.scale.setScalar(scale);
    clone.position.multiplyScalar(scale);
    return clone;
  }, [gltf]);

  useEffect(
    () => () => {
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.geometry?.dispose();
          const mat = m.material as THREE.Material | THREE.Material[];
          if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
          else mat?.dispose();
        }
      });
    },
    [scene],
  );

  useFrame((_, d) => {
    if (ref.current && autoRotate) ref.current.rotation.y += d * 0.4;
  });

  return (
    <group ref={ref}>
      <primitive object={scene} />
    </group>
  );
}

/* -------------------------------- starfield ------------------------------- */

function Starfield() {
  const geo = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const v = new THREE.Vector3()
        .randomDirection()
        .multiplyScalar(6 + Math.random() * 8);
      positions.set([v.x, v.y, v.z], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={0.05} color="#cfe9ff" transparent opacity={0.7} depthWrite={false} />
    </points>
  );
}

function FireFx() {
  const ref = useRef<THREE.Points>(null);
  const geo = useMemo(() => {
    const count = 300;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      positions.set(
        [(Math.random() - 0.5) * 5, Math.random() * 6 - 3, (Math.random() - 0.5) * 5],
        i * 3,
      );
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return g;
  }, []);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, d) => {
    const pos = geo.attributes["position"] as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      let y = pos.getY(i) + d * (0.5 + (i % 5) * 0.12);
      if (y > 3) y = -3;
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    if (ref.current) ref.current.rotation.y += d * 0.05;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        size={0.07}
        color="#ff8c2e"
        transparent
        opacity={0.75}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

/* ------------------------------- main export ------------------------------ */

export function HoloContent({ settings }: { settings: HoloSettings }) {
  const color = TINTS[settings.tint].hex;

  return (
    <>
      {settings.fog && <fogExp2 attach="fog" args={["#04121c", 0.03]} />}
      <ambientLight intensity={0.35 * settings.lightIntensity} />
      <directionalLight position={[3, 4, 3]} intensity={1.6 * settings.lightIntensity} />
      <pointLight
        position={[-3, -2, 2]}
        intensity={4 * settings.lightIntensity}
        distance={14}
        color={color}
      />
      {settings.starfield && <Starfield />}
      {settings.fire && <FireFx />}

      <Suspense fallback={null}>
        {settings.preset === "crystal" && <CrystalPreset color={color} autoRotate={settings.autoRotate} />}
        {settings.preset === "fire" && <FirePreset autoRotate={settings.autoRotate} />}
        {settings.preset === "galaxy" && <GalaxyPreset color={color} autoRotate={settings.autoRotate} />}
        {settings.preset === "custom" && settings.customUrl && (
          <CustomModel url={settings.customUrl} autoRotate={settings.autoRotate} />
        )}
      </Suspense>
    </>
  );
}
