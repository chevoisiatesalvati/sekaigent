"use client";

import { useEffect, useRef } from "react";
import { useAccount } from "wagmi";
import { AnimatePresence, motion } from "framer-motion";
import { WalletButton } from "@/components/WalletButton";
import { COPY } from "@/lib/copy";
import { useUiStore } from "./stores/uiStore";
import { ownerStorageKey, useSquadStore } from "./stores/squadStore";
import { useFieldStore } from "./stores/fieldStore";
import type { GameScreen } from "./types";
import { HqScreen } from "./screens/HqScreen";
import { SquadScreen } from "./screens/SquadScreen";
import { AgentEditScreen } from "./screens/AgentEditScreen";
import { RecruitScreen } from "./screens/RecruitScreen";
import { MapScreen } from "./screens/MapScreen";
import { BriefScreen } from "./screens/BriefScreen";
import { LoadoutScreen } from "./screens/LoadoutScreen";
import { SealScreen } from "./screens/SealScreen";
import { FieldScreen } from "./screens/FieldScreen";
import { DebriefScreen } from "./screens/DebriefScreen";

const RAIL: Array<{ id: GameScreen; label: string; glyph: string }> = [
  { id: "squad", label: "Squad", glyph: "◆" },
  { id: "map", label: "Cases", glyph: "◎" },
  { id: "field", label: "Field", glyph: "▣" },
  { id: "hq", label: "Command", glyph: "◈" },
];

const screenMotion = {
  initial: { opacity: 0, x: 18 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] as const },
};

function ScreenRouter({ screen }: { screen: GameScreen }) {
  switch (screen) {
    case "hq":
      return <HqScreen />;
    case "squad":
      return <SquadScreen />;
    case "agentEdit":
      return <AgentEditScreen />;
    case "recruit":
      return <RecruitScreen />;
    case "map":
      return <MapScreen />;
    case "brief":
      return <BriefScreen />;
    case "loadout":
      return <LoadoutScreen />;
    case "seal":
      return <SealScreen />;
    case "field":
      return <FieldScreen />;
    case "debrief":
      return <DebriefScreen />;
    default:
      return <HqScreen />;
  }
}

export function GameShell() {
  const { address } = useAccount();
  const screen = useUiStore((s) => s.screen);
  const setScreen = useUiStore((s) => s.setScreen);
  const hydrateSquad = useSquadStore((s) => s.hydrate);
  const agents = useSquadStore((s) => s.agents);
  const hydratedSquad = useSquadStore((s) => s.hydrated);
  const hydrateField = useFieldStore((s) => s.hydrate);
  const deployments = useFieldStore((s) => s.deployments);
  const didRoute = useRef(false);

  useEffect(() => {
    const key = ownerStorageKey(address);
    hydrateSquad(key);
    hydrateField(key);
    didRoute.current = false;
  }, [address, hydrateSquad, hydrateField]);

  useEffect(() => {
    if (!hydratedSquad || didRoute.current) return;
    didRoute.current = true;
    if (agents.length === 0) {
      setScreen("squad");
      return;
    }
    const active = deployments.some((d) => d.status === "in_field");
    setScreen(active ? "field" : "map");
  }, [hydratedSquad, agents.length, deployments, setScreen]);

  return (
    <div className="game-root">
      <header className="game-chrome">
        <div className="game-brand">
          <h1>Sekaigent</h1>
          <span>{COPY.brandTagline}</span>
        </div>
        <WalletButton />
      </header>
      <div className="game-body">
        <nav className="game-rail" aria-label="Operations">
          {RAIL.map((item) => {
            const active =
              screen === item.id ||
              (item.id === "squad" &&
                (screen === "agentEdit" || screen === "recruit")) ||
              (item.id === "map" &&
                (screen === "brief" ||
                  screen === "loadout" ||
                  screen === "seal" ||
                  screen === "debrief"));
            return (
              <button
                key={item.id}
                type="button"
                className={`rail-btn${active ? " active" : ""}`}
                onClick={() => setScreen(item.id)}
              >
                <span className="glyph">{item.glyph}</span>
                {item.label}
              </button>
            );
          })}
        </nav>
        <main className="game-stage">
          <AnimatePresence mode="wait">
            <motion.div key={screen} className="screen" {...screenMotion}>
              <ScreenRouter screen={screen} />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
