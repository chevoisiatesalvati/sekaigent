"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Center, OrbitControls, useGLTF } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import type { Group } from "three";
import type { Archetype } from "@/lib/portraits";
import { AGENT_MODEL_BY_ARCHETYPE } from "./agentModels";
import { disposeObject3D } from "./disposeObject";
import { WebglDispose } from "./WebglDispose";

type AgentShowcaseProps = {
  portraitSrc: string;
  codename: string;
  archetype: Archetype;
};

function AgentModel({ archetype }: { archetype: Archetype }) {
  const path = AGENT_MODEL_BY_ARCHETYPE[archetype];
  const { scene } = useGLTF(path);
  const root = useRef<Group>(null);
  const clone = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    clone.traverse((obj) => {
      obj.castShadow = true;
      obj.receiveShadow = true;
    });
    return () => {
      disposeObject3D(clone);
    };
  }, [clone]);

  useFrame((_, delta) => {
    if (root.current) root.current.rotation.y += delta * 0.3;
  });

  return (
    <group ref={root} position={[0, -0.15, 0]} scale={1.35}>
      <Center>
        <primitive object={clone} />
      </Center>
    </group>
  );
}

export function AgentShowcase({
  portraitSrc: _portraitSrc,
  codename,
  archetype,
}: AgentShowcaseProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.05, 3.4], fov: 32 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ width: "100%", height: "100%" }}
      aria-label={`Showcase ${codename}`}
    >
      <WebglDispose />
      <color attach="background" args={["#0a100e"]} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[2.2, 3.5, 2]} intensity={1.3} />
      <pointLight position={[-2, 1.5, -1]} intensity={0.45} color="#c4a35a" />
      <Suspense fallback={null}>
        <AgentModel archetype={archetype} />
      </Suspense>
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        minPolarAngle={Math.PI / 3.5}
        maxPolarAngle={Math.PI / 1.75}
        target={[0, 0.95, 0]}
      />
    </Canvas>
  );
}

useGLTF.preload(AGENT_MODEL_BY_ARCHETYPE.Infiltrator);
useGLTF.preload(AGENT_MODEL_BY_ARCHETYPE.Handler);
useGLTF.preload(AGENT_MODEL_BY_ARCHETYPE.Forger);
useGLTF.preload(AGENT_MODEL_BY_ARCHETYPE.Watcher);
useGLTF.preload(AGENT_MODEL_BY_ARCHETYPE.Ghost);
