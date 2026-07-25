"use client";

import { useAccount, useConnect, useDisconnect, useSwitchChain } from "wagmi";
import { OG_CHAIN_ID } from "@/lib/chain";

export function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();

  if (!isConnected) {
    return (
      <button
        className="btn"
        disabled={isPending || connectors.length === 0}
        onClick={() => connect({ connector: connectors[0] })}
      >
        {isPending ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  if (chainId !== OG_CHAIN_ID) {
    return (
      <button className="btn" onClick={() => switchChain({ chainId: OG_CHAIN_ID })}>
        Switch to 0G Mainnet
      </button>
    );
  }

  return (
    <button className="btn secondary" onClick={() => disconnect()}>
      {address?.slice(0, 6)}…{address?.slice(-4)}
    </button>
  );
}
