import { RoundedBox, Text } from "@react-three/drei";
import { createPortal, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { HoloContent } from "./HoloContent";
import type { HoloSettings } from "./types";
import { TINTS } from "./types";

const HOLO_VERT = /* glsl */ `
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

const HOLO_FRAG = /* glsl */ `
  uniform sampler2D uMap;
  uniform vec3 uTint;
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
    float r = texture2D(uMap, uv + vec2(ca, 0.0)).r;
    float gc = texture2D(uMap, uv).g;
    float b = texture2D(uMap, uv - vec2(ca, 0.0)).b;
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

    // linear -> sRGB (custom ShaderMaterial gets no automatic output encoding)
    col = pow(max(col, vec3(0.0)), vec3(1.0 / 2.2));
    col *= 1.35;
    float alpha = clamp((lum * 1.35 + 0.12 + fres * 0.4), 0.0, 1.0) * uOpacity;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function HoloCard({ settings }: { settings: HoloSettings }) {
  const { gl, camera } = useThree();
  const group = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const target = useMemo(() => {
    const t = new THREE.WebGLRenderTarget(1024, 1024, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      type: THREE.HalfFloatType,
      samples: 4,
    });
    return t;
  }, []);

  const virtualScene = useMemo(() => new THREE.Scene(), []);
  const virtualCam = useMemo(() => {
    const c = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    c.position.set(0, 0, 4.6);
    return c;
  }, []);

  const uniforms = useMemo(
    () => ({
      uMap: { value: target.texture },
      uTint: { value: new THREE.Color(TINTS[settings.tint].hex) },
      uTime: { value: 0 },
      uOpacity: { value: settings.opacity },
      uScanSpeed: { value: settings.scanSpeed },
      uGlitch: { value: settings.glitch },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [target],
  );

  useEffect(() => {
    uniforms.uTint.value.set(TINTS[settings.tint].hex);
    uniforms.uOpacity.value = settings.opacity;
    uniforms.uScanSpeed.value = settings.scanSpeed;
    uniforms.uGlitch.value = settings.glitch;
  }, [settings.tint, settings.opacity, settings.scanSpeed, settings.glitch, uniforms]);

  useEffect(() => {
    return () => {
      target.dispose();
      target.texture.dispose();
    };
  }, [target]);

  const camWorld = useMemo(() => new THREE.Vector3(), []);
  const localDir = useMemo(() => new THREE.Vector3(), []);

  useFrame((state, delta) => {
    uniforms.uTime.value = state.clock.elapsedTime;

    if (group.current) {
      if (settings.autoRotate) group.current.rotation.y += delta * 0.25;

      // mirror main camera angle relative to the card into the virtual camera
      camWorld.copy(camera.position);
      group.current.worldToLocal(localDir.copy(camWorld));
      localDir.normalize().multiplyScalar(4.6);
      virtualCam.position.copy(localDir);
      virtualCam.up.set(0, 1, 0);
      virtualCam.lookAt(0, 0, 0);
      virtualCam.updateProjectionMatrix();
    }

    const prev = gl.getRenderTarget();
    gl.setRenderTarget(target);
    gl.clear();
    gl.render(virtualScene, virtualCam);
    gl.setRenderTarget(prev);
  });

  const tint = TINTS[settings.tint].hex;

  return (
    <group ref={group}>
      {createPortal(<HoloContent settings={settings} />, virtualScene)}

      {/* card frame */}
      <RoundedBox args={[3.2, 4.5, 0.18]} radius={0.14} smoothness={6} castShadow receiveShadow>
        <meshPhysicalMaterial
          color="#0a0f17"
          metalness={0.92}
          roughness={0.22}
          clearcoat={1}
          clearcoatRoughness={0.12}
          envMapIntensity={1.1}
        />
      </RoundedBox>

      {/* inner recess */}
      <mesh position={[0, 0.22, 0.095]}>
        <planeGeometry args={[2.72, 3.4]} />
        <meshPhysicalMaterial color="#04070c" metalness={0.6} roughness={0.5} />
      </mesh>

      {/* holographic projection surface */}
      <mesh position={[0, 0.22, 0.11]}>
        <planeGeometry args={[2.66, 3.34]} />
        <shaderMaterial
          ref={matRef}
          uniforms={uniforms}
          vertexShader={HOLO_VERT}
          fragmentShader={HOLO_FRAG}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          toneMapped={false}
        />
      </mesh>

      {/* glass cover */}
      <mesh position={[0, 0.22, 0.135]}>
        <planeGeometry args={[2.72, 3.4]} />
        <meshPhysicalMaterial
          transparent
          opacity={0.06}
          roughness={0.05}
          metalness={0}
          depthWrite={false}
          color="#9fe9ff"
        />
      </mesh>


      {/* bezel accent bar */}
      <mesh position={[0, 2.02, 0.1]}>
        <planeGeometry args={[1.1, 0.03]} />
        <meshBasicMaterial color={tint} toneMapped={false} />
      </mesh>



      <Text
        position={[0, -1.86, 0.1]}
        fontSize={0.16}
        letterSpacing={0.28}
        color={tint}
        anchorX="center"
        anchorY="middle"
      >
        HOLO-DECK / MK-VII
      </Text>
      <Text
        position={[0, -2.08, 0.1]}
        fontSize={0.085}
        letterSpacing={0.2}
        color="#6f8496"
        anchorX="center"
        anchorY="middle"
      >
        VOLUMETRIC PROJECTION UNIT
      </Text>

      {/* emitted glow from the window */}
      <pointLight position={[0, 0.22, 0.9]} intensity={2.4} distance={5} color={tint} />
    </group>
  );
}
