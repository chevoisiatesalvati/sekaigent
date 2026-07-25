import { defineChain } from "viem";

export const ogMainnet = defineChain({
  id: 16661,
  name: "0G Mainnet",
  nativeCurrency: { name: "0G", symbol: "0G", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.NEXT_PUBLIC_OG_RPC_URL ?? "https://evmrpc.0g.ai"] },
  },
  blockExplorers: {
    default: { name: "0G Chainscan", url: "https://chainscan.0g.ai" },
  },
});

export const OG_CHAIN_ID = 16661;
