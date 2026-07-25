"use client";

import { useAccount } from "wagmi";

export function AcceptMissionButton({ missionId }: { missionId: string }) {
  const { isConnected, chainId } = useAccount();
  const ready = isConnected && chainId === 16661;

  return (
    <button
      className="btn"
      disabled={!ready}
      onClick={() => {
        // Phase 5 wires MissionVault.acceptMission; UI gated on mainnet wallet.
        alert(`Accept ${missionId} — connect contracts after mainnet deploy.`);
      }}
    >
      {ready ? "Accept mission" : "Connect on 0G Mainnet to accept"}
    </button>
  );
}
