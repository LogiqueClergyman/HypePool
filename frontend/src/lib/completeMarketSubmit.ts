import {
  submitSignedTx,
  confirmTx,
  type SubmitContentResponse,
} from "@/lib/api";

/**
 * After POST /content/submit: custodial users get `markets_created`; others get `interactions`
 * that must be signed in Freighter and confirmed on the API.
 */
export async function completeMarketCreateInteractions(
  result: SubmitContentResponse,
  network: "TESTNET" | "MAINNET" | null
): Promise<string | null> {
  const directId = result.markets_created?.[0]?.id;
  if (directId) return directId;

  const interactions = result.interactions;
  if (!interactions?.length) return null;

  const { signTransaction } = await import("@stellar/freighter-api");
  const networkPassphrase =
    network === "TESTNET"
      ? "Test SDF Network ; September 2015"
      : "Public Global Stellar Network ; September 2015";

  let lastMarketId: string | null = null;
  for (const inter of interactions) {
    const signResult = await signTransaction(inter.xdr, { networkPassphrase });
    const signedXdr =
      typeof signResult === "string" ? signResult : signResult.signedTxXdr;
    const { tx_hash } = await submitSignedTx(signedXdr);
    const confirmed = await confirmTx(inter.interaction_id, tx_hash);
    if (confirmed.market_id) lastMarketId = confirmed.market_id;
  }

  return lastMarketId;
}
