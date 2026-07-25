"use client";

import { http, createConfig } from "wagmi";
import { injected } from "@wagmi/core";
import { ogMainnet } from "./chain";

export const wagmiConfig = createConfig({
  chains: [ogMainnet],
  connectors: [injected()],
  transports: {
    [ogMainnet.id]: http(
      process.env.NEXT_PUBLIC_OG_RPC_URL ?? "https://evmrpc.0g.ai",
    ),
  },
  ssr: true,
});
