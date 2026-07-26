import type { Hash, PublicClient, TransactionReceipt } from "viem";

const RECEIPT_POLL_MS = 3_000;
const RECEIPT_TIMEOUT_MS = 180_000;

function isHexHash(value: string): value is Hash {
  return /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * 0G public RPC often returns transient -32602 / null receipts right after
 * broadcast. Prefer manual polling over viem's waitForTransactionReceipt.
 */
export async function waitForOgReceipt(
  publicClient: PublicClient,
  hash: string,
  opts?: { timeoutMs?: number; pollMs?: number },
): Promise<TransactionReceipt> {
  if (!isHexHash(hash)) {
    throw new Error(`Invalid transaction hash from wallet: ${hash.slice(0, 24)}`);
  }

  const timeoutMs = opts?.timeoutMs ?? RECEIPT_TIMEOUT_MS;
  const pollMs = opts?.pollMs ?? RECEIPT_POLL_MS;
  const started = Date.now();
  let lastError: unknown;

  while (Date.now() - started < timeoutMs) {
    try {
      const receipt = await publicClient.getTransactionReceipt({ hash });
      if (receipt) return receipt;
    } catch (err) {
      lastError = err;
      // Tolerate "not found" and RPC parameter blips while the node indexes.
      const message = err instanceof Error ? err.message : String(err);
      const transient =
        /not found|could not be found|Missing or invalid|invalid argument|-32602|timeout|fetch/i.test(
          message,
        );
      if (!transient) throw err;
    }
    await new Promise((r) => setTimeout(r, pollMs));
  }

  const detail =
    lastError instanceof Error ? lastError.message.slice(0, 120) : "no receipt";
  throw new Error(
    `Timed out waiting for receipt ${hash.slice(0, 12)}… (${detail})`,
  );
}
