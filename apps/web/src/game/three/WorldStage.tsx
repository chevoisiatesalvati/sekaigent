"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Html, OrbitControls, Stars } from "@react-three/drei";
import { useMemo, useRef } from "react";
import type { Group } from "three";
import { REGIONS, type MissionListItem } from "@/lib/api";

type WorldStageProps = {
  missions: MissionListItem[];
  selectedMissionId: string | null;
  onSelectMission: (missionId: string) => void;
};

/** Region lat/lon-ish placement on a unit sphere (degrees → radians). */
const REGION_SPHERE: Record<string, [number, number]> = {
  harbor: [-35, 20],
  embassy: [10, 45],
  archive: [55, 15],
  station: [-10, -25],
};

function latLonToVec(lat: number, lon: number, radius: number) {
  const phi = ((90 - lat) * Math.PI) / 180;
  const theta = ((lon + 180) * Math.PI) / 180;
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  ] as [number, number, number];
}

function Globe({
  missions,
  selectedMissionId,
  onSelectMission,
}: WorldStageProps) {
  const globeRef = useRef<Group>(null);

  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.08;
    }
  });

  const pins = useMemo(() => {
    return REGIONS.map((region) => {
      const [lat, lon] = REGION_SPHERE[region.id] ?? [0, 0];
      const position = latLonToVec(lat, lon, 1.62);
      const regionMissions = missions.filter((m) => m.region_id === region.id);
      const open = regionMissions.find((m) => m.status === "open");
      const settled = regionMissions.find((m) => m.status === "settled");
      const mission = open ?? settled ?? regionMissions[0];
      return { region, position, mission, open: Boolean(open) };
    });
  }, [missions]);

  return (
    <group>
      <Float speed={1.2} rotationIntensity={0.15} floatIntensity={0.25}>
        <group ref={globeRef}>
          <mesh>
            <sphereGeometry args={[1.5, 48, 48]} />
            <meshStandardMaterial
              color="#1e3a2f"
              roughness={0.55}
              metalness={0.25}
              emissive="#0c1a14"
              emissiveIntensity={0.35}
            />
          </mesh>
          <mesh>
            <sphereGeometry args={[1.52, 32, 32]} />
            <meshStandardMaterial
              color="#3f7a58"
              wireframe
              transparent
              opacity={0.18}
            />
          </mesh>
          {pins.map(({ region, position, mission, open }) => {
            const selected = mission?.id === selectedMissionId;
            return (
              <group key={region.id} position={position}>
                <mesh
                  onClick={(e) => {
                    e.stopPropagation();
                    if (mission) onSelectMission(mission.id);
                  }}
                  onPointerOver={() => {
                    document.body.style.cursor = mission ? "pointer" : "default";
                  }}
                  onPointerOut={() => {
                    document.body.style.cursor = "default";
                  }}
                >
                  <sphereGeometry args={[open ? 0.07 : 0.05, 16, 16]} />
                  <meshStandardMaterial
                    color={
                      selected ? "#e0c06a" : open ? "#5a9e72" : "#7a8a80"
                    }
                    emissive={open ? "#3f7a58" : "#000000"}
                    emissiveIntensity={open ? 0.8 : 0}
                  />
                </mesh>
                {open && (
                  <mesh scale={1.8}>
                    <sphereGeometry args={[0.05, 12, 12]} />
                    <meshBasicMaterial
                      color="#5a9e72"
                      transparent
                      opacity={0.25}
                    />
                  </mesh>
                )}
                <Html distanceFactor={8} style={{ pointerEvents: "none" }}>
                  <div
                    style={{
                      fontSize: 11,
                      color: selected ? "#e0c06a" : "#d8e0d4",
                      whiteSpace: "nowrap",
                      textShadow: "0 1px 4px #000",
                      transform: "translate(-50%, -140%)",
                      fontFamily: "IBM Plex Sans, sans-serif",
                    }}
                  >
                    {region.name}
                  </div>
                </Html>
              </group>
            );
          })}
        </group>
      </Float>
    </group>
  );
}

export function WorldStage(props: WorldStageProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, 4.2], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#070b09"]} />
      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 3, 2]} intensity={1.2} color="#d8e0d4" />
      <pointLight position={[-3, -1, -2]} intensity={0.5} color="#c4a35a" />
      <Stars radius={40} depth={30} count={1200} factor={3} fade speed={0.4} />
      <Globe {...props} />
      <OrbitControls
        enablePan={false}
        minDistance={3.2}
        maxDistance={6}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}
