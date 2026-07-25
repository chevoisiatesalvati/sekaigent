"use client";

import { Canvas, useLoader } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { Suspense, useMemo } from "react";
import { TextureLoader } from "three";

type AgentShowcaseProps = {
  portraitSrc: string;
  codename: string;
};

function Bust({ portraitSrc }: { portraitSrc: string }) {
  const texture = useLoader(TextureLoader, portraitSrc);
  const planeArgs = useMemo(() => [1.1, 1.1] as [number, number], []);

  return (
    <Float speed={1.4} floatIntensity={0.4} rotationIntensity={0.2}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.55, 0.7, 0.35, 32]} />
        <meshStandardMaterial
          color="#1a2a22"
          metalness={0.4}
          roughness={0.45}
        />
      </mesh>
      <mesh position={[0, 0.95, 0]}>
        <boxGeometry args={[1.15, 1.15, 0.08]} />
        <meshStandardMaterial color="#0c1210" />
      </mesh>
      <mesh position={[0, 0.95, 0.05]}>
        <planeGeometry args={planeArgs} />
        <meshStandardMaterial map={texture} roughness={0.7} metalness={0.05} />
      </mesh>
      <mesh position={[0, 0.15, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 0.9, 48]} />
        <meshStandardMaterial
          color="#c4a35a"
          emissive="#c4a35a"
          emissiveIntensity={0.25}
          metalness={0.6}
          roughness={0.3}
        />
      </mesh>
    </Float>
  );
}

export function AgentShowcase({ portraitSrc, codename }: AgentShowcaseProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.9, 3.2], fov: 35 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
      aria-label={`Showcase ${codename}`}
    >
      <color attach="background" args={["#0a100e"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <pointLight position={[-2, 1, -1]} intensity={0.4} color="#c4a35a" />
      <Suspense fallback={null}>
        <Bust portraitSrc={portraitSrc} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 2}
      />
    </Canvas>
  );
}
