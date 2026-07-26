"use client";

import { AdminMissionForm } from "./AdminMissionForm";
import { WalletButton } from "@/components/WalletButton";
import { useIsVaultAdmin } from "@/game/hooks/useIsVaultAdmin";

/** Unlisted Bureau Ops — case authoring with dossier pages. Admin wallet only. */
export default function AdminPage() {
  const { isAdmin, isLoading } = useIsVaultAdmin();

  return (
    <main
      style={{
        minHeight: "100dvh",
        overflow: "auto",
        padding: "1.5rem",
        maxWidth: 720,
        margin: "0 auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: "1rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "1.6rem",
              margin: "0 0 0.35rem",
            }}
          >
            Bureau Ops
          </h1>
          <p style={{ color: "var(--paper-dim)", margin: 0 }}>
            Author cases with a public dossier (signal + noise) and hidden
            criteria. Players only see the hook and dossier until debrief.
          </p>
        </div>
        <WalletButton />
      </div>
      <div className="panel">
        {isLoading ? (
          <p className="empty-note">Checking admin role…</p>
        ) : isAdmin ? (
          <AdminMissionForm />
        ) : (
          <p className="empty-note">
            Connect the MissionVault admin wallet (deployer) on 0G Mainnet.
          </p>
        )}
      </div>
    </main>
  );
}
