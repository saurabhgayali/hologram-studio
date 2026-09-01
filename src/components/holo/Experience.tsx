import { Environment, Lightformer, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useRef } from "react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { HoloCard } from "./HoloCard";
import type { HoloSettings } from "./types";

export function Experience({
  settings,
  resetSignal,
}: {
  settings: HoloSettings;
  resetSignal: number;
}) {
  const controls = useRef<OrbitControlsImpl>(null);

  useEffect(() => {
    controls.current?.reset();
  }, [resetSignal]);

  return (
    <Canvas
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      camera={{ position: [0, 0.4, 7.5], fov: 45 }}
    >
      <color attach="background" args={["#05070d"]} />
      <fogExp2 attach="fog" args={["#05070d", 0.045]} />

      <ambientLight intensity={0.25} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} castShadow />
      <spotLight position={[-6, 4, 4]} intensity={40} angle={0.5} penumbra={1} color="#3aa8ff" />

      <Suspense fallback={null}>
        <HoloCard settings={settings} />
        <Environment resolution={128}>
          <Lightformer intensity={2} position={[0, 5, 2]} scale={[10, 10, 1]} />
          <Lightformer
            intensity={1.4}
            color="#4fd8ff"
            position={[-5, 1, 1]}
            rotation-y={Math.PI / 2}
            scale={[20, 2, 1]}
          />
          <Lightformer
            intensity={1}
            color="#ff6ad5"
            position={[5, -1, 1]}
            rotation-y={-Math.PI / 2}
            scale={[20, 2, 1]}
          />
        </Environment>
      </Suspense>

      {/* reflective floor plane */}
      <mesh rotation-x={-Math.PI / 2} position={[0, -2.6, 0]} receiveShadow>
        <circleGeometry args={[9, 64]} />
        <meshStandardMaterial color="#070b12" metalness={0.85} roughness={0.35} />
      </mesh>

      <OrbitControls
        ref={controls}
        enablePan={false}
        minDistance={4}
        maxDistance={14}
        minPolarAngle={0.5}
        maxPolarAngle={Math.PI - 0.6}
        enableDamping
        dampingFactor={0.06}
      />
    </Canvas>
  );
}
