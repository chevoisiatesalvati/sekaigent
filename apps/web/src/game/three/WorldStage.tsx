"use client";

import { Canvas, useFrame, useLoader, useThree } from "@react-three/fiber";
import { Html, OrbitControls, Stars } from "@react-three/drei";
import { Suspense, useEffect, useMemo, useRef } from "react";
import {
  TextureLoader,
  SRGBColorSpace,
  Vector3,
  type Group,
} from "three";
import { REGIONS, type MissionListItem } from "@/lib/api";

type ControlsLike = {
  target: Vector3;
  update: () => void;
};

const EARTH_TEXTURE = "/textures/earth-day.jpg";
const DEFAULT_CAMERA_DISTANCE = 4.2;

type WorldStageProps = {
  missions: MissionListItem[];
  selectedMissionId: string | null;
  onSelectMission: (missionId: string) => void;
};

/** Lat/lon for region pins on the textured sphere. */
export const REGION_SPHERE: Record<string, [number, number]> = {
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

/** One-shot camera move when the selected case changes; manual orbit stays free after. */
function CameraFocus({
  selectedMissionId,
  missions,
}: {
  selectedMissionId: string | null;
  missions: MissionListItem[];
}) {
  const { camera } = useThree();
  const controls = useThree((s) => s.controls) as ControlsLike | null;
  const lastFocusedId = useRef<string | null>(null);
  const anim = useRef<{
    from: Vector3;
    to: Vector3;
    t: number;
  } | null>(null);

  useEffect(() => {
    if (!selectedMissionId) return;
    if (lastFocusedId.current === selectedMissionId) return;
    lastFocusedId.current = selectedMissionId;

    const mission = missions.find((m) => m.id === selectedMissionId);
    if (!mission) return;
    const [lat, lon] = REGION_SPHERE[mission.region_id] ?? [0, 0];
    const distance = Math.max(camera.position.length(), DEFAULT_CAMERA_DISTANCE);
    const [x, y, z] = latLonToVec(lat, lon, distance);
    anim.current = {
      from: camera.position.clone(),
      to: new Vector3(x, y, z),
      t: 0,
    };
  }, [selectedMissionId, missions, camera]);

  useFrame((_, delta) => {
    if (!anim.current) return;
    anim.current.t = Math.min(1, anim.current.t + delta * 2.2);
    const ease = 1 - (1 - anim.current.t) ** 3;
    camera.position.lerpVectors(anim.current.from, anim.current.to, ease);
    camera.lookAt(0, 0, 0);
    if (controls) {
      controls.target.set(0, 0, 0);
      controls.update();
    }
    if (anim.current.t >= 1) {
      anim.current = null;
    }
  });

  return null;
}

function TexturedGlobe({
  missions,
  selectedMissionId,
  onSelectMission,
}: WorldStageProps) {
  const globeGroup = useRef<Group>(null);
  const earthMap = useLoader(TextureLoader, EARTH_TEXTURE);
  earthMap.colorSpace = SRGBColorSpace;

  const pins = useMemo(() => {
    return REGIONS.map((region) => {
      const [lat, lon] = REGION_SPHERE[region.id] ?? [0, 0];
      const position = latLonToVec(lat, lon, 1.52);
      const regionMissions = missions.filter((m) => m.region_id === region.id);
      const open = regionMissions.find((m) => m.status === "open");
      const settled = regionMissions.find((m) => m.status === "settled");
      const mission = open ?? settled ?? regionMissions[0];
      return { region, position, mission, open: Boolean(open) };
    });
  }, [missions]);

  return (
    <group ref={globeGroup}>
      <mesh>
        <sphereGeometry args={[1.5, 64, 64]} />
        <meshStandardMaterial
          map={earthMap}
          roughness={0.85}
          metalness={0.05}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.51, 32, 32]} />
        <meshStandardMaterial
          color="#7ab0c8"
          transparent
          opacity={0.07}
          roughness={0.2}
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
              <sphereGeometry args={[open ? 0.065 : 0.045, 16, 16]} />
              <meshStandardMaterial
                color={selected ? "#e0c06a" : open ? "#5a9e72" : "#d8e0d4"}
                emissive={open ? "#3f7a58" : "#000000"}
                emissiveIntensity={open ? 0.9 : 0}
              />
            </mesh>
            {open && (
              <mesh scale={2}>
                <sphereGeometry args={[0.045, 12, 12]} />
                <meshBasicMaterial color="#5a9e72" transparent opacity={0.22} />
              </mesh>
            )}
            <Html
              distanceFactor={10}
              occlude
              style={{ pointerEvents: "none" }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: selected ? "#e0c06a" : "#d8e0d4",
                  whiteSpace: "nowrap",
                  textShadow: "0 1px 4px #000",
                  transform: "translate(-50%, -130%)",
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
  );
}

export function WorldStage(props: WorldStageProps) {
  return (
    <Canvas
      camera={{ position: [0, 0.6, DEFAULT_CAMERA_DISTANCE], fov: 42 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
      style={{ width: "100%", height: "100%" }}
    >
      <color attach="background" args={["#070b09"]} />
      <ambientLight intensity={0.55} />
      <directionalLight position={[4, 3, 2]} intensity={1.35} color="#fff6e8" />
      <pointLight position={[-3, -1, -2]} intensity={0.35} color="#c4a35a" />
      <Stars radius={40} depth={30} count={1200} factor={3} fade speed={0.4} />
      <Suspense fallback={null}>
        <TexturedGlobe {...props} />
      </Suspense>
      <CameraFocus
        selectedMissionId={props.selectedMissionId}
        missions={props.missions}
      />
      <OrbitControls
        makeDefault
        enablePan={false}
        minDistance={3.2}
        maxDistance={6}
        autoRotate={false}
      />
    </Canvas>
  );
}
