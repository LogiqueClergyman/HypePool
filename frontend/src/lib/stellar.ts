// Client-only Stellar helpers — never import this in server components or API routes.

export const TESTNET_RPC = "https://soroban-testnet.stellar.org";
export const TESTNET_NETWORK_PASSPHRASE = "Test SDF Network ; September 2015";
export const HYPE_POOL_CONTRACT_ID = process.env.NEXT_PUBLIC_CONTRACT_ID ?? "";

export type WalletState = {
  address: string | null;
  network: "TESTNET" | "MAINNET" | null;
  connected: boolean;
};

/**
 * Sign an XDR transaction with Freighter and return the signed XDR.
 * Must only be called in browser context.
 */
export async function signWithFreighter(xdr: string, network: "TESTNET" | "MAINNET"): Promise<string> {
  const { signTransaction } = await import("@stellar/freighter-api");
  const passphrase =
    network === "TESTNET"
      ? TESTNET_NETWORK_PASSPHRASE
      : "Public Global Stellar Network ; September 2015";
  const result = await signTransaction(xdr, { networkPassphrase: passphrase });
  // Freighter ≥ v3 returns { signedTxXdr, signerAddress }; older versions return a plain string
  if (typeof result === "string") return result;
  return (result as { signedTxXdr: string }).signedTxXdr;
}

/**
 * Submit a signed XDR to Soroban RPC and return the transaction hash.
 */
export async function submitStellarTx(
  signedXdr: string,
  network: "TESTNET" | "MAINNET" = "TESTNET"
): Promise<string> {
  const { rpc, TransactionBuilder } = await import("@stellar/stellar-sdk");
  const rpcUrl = network === "TESTNET" ? TESTNET_RPC : "https://soroban-rpc.mainnet.stellar.gateway.fm";
  const passphrase =
    network === "TESTNET"
      ? TESTNET_NETWORK_PASSPHRASE
      : "Public Global Stellar Network ; September 2015";
  const server = new rpc.Server(rpcUrl);
  const tx = TransactionBuilder.fromXDR(signedXdr, passphrase);
  const result = await server.sendTransaction(tx);
  if (result.status === "ERROR") throw new Error("Transaction failed: " + result.status);
  return result.hash;
}
