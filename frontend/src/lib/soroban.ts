// Soroban contract binding helpers.
// placeStakeOnChain / createPoolOnChain must be called client-side (requires wallet signing).

import { HYPE_POOL_CONTRACT_ID, TESTNET_RPC, signWithFreighter, submitStellarTx } from "./stellar";

export interface PlaceStakeParams {
  stakerAddress: string;
  poolId: bigint;
  amountUsdc: number;
  rangeMin: number;
  rangeMax: number;
  network: "TESTNET" | "MAINNET";
}

function usdcToStroops(dollars: number): bigint {
  return BigInt(Math.round(dollars * 10_000_000));
}

export async function placeStakeOnChain(params: PlaceStakeParams): Promise<string> {
  const { Contract, rpc, nativeToScVal, Networks, TransactionBuilder, BASE_FEE } =
    await import("@stellar/stellar-sdk");

  const server = new rpc.Server(TESTNET_RPC);
  const contract = new Contract(HYPE_POOL_CONTRACT_ID);
  const stellarAccount = await server.getAccount(params.stakerAddress);

  const networkPassphrase =
    params.network === "TESTNET" ? Networks.TESTNET : Networks.PUBLIC;

  const tx = new TransactionBuilder(stellarAccount, { fee: BASE_FEE, networkPassphrase })
    .addOperation(
      contract.call(
        "place_stake",
        nativeToScVal(params.stakerAddress, { type: "address" }),
        nativeToScVal(params.poolId, { type: "u64" }),
        nativeToScVal(usdcToStroops(params.amountUsdc), { type: "i128" }),
        nativeToScVal(BigInt(params.rangeMin), { type: "u64" }),
        nativeToScVal(BigInt(params.rangeMax), { type: "u64" })
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  const signed = await signWithFreighter(prepared.toXDR(), params.network);
  return submitStellarTx(signed);
}

export async function createPoolOnChain(params: {
  creatorAddress: string;
  usdcContractId: string;
  targetViews: number;
  deadlineTimestamp: number;
  network: "TESTNET" | "MAINNET";
}): Promise<string> {
  const { Contract, rpc, nativeToScVal, Networks, TransactionBuilder, BASE_FEE } =
    await import("@stellar/stellar-sdk");

  const server = new rpc.Server(TESTNET_RPC);
  const contract = new Contract(HYPE_POOL_CONTRACT_ID);
  const stellarAccount = await server.getAccount(params.creatorAddress);

  const networkPassphrase =
    params.network === "TESTNET" ? Networks.TESTNET : Networks.PUBLIC;

  const tx = new TransactionBuilder(stellarAccount, { fee: BASE_FEE, networkPassphrase })
    .addOperation(
      contract.call(
        "create_pool",
        nativeToScVal(params.creatorAddress, { type: "address" }),
        nativeToScVal(params.usdcContractId, { type: "address" }),
        nativeToScVal(BigInt(params.targetViews), { type: "u64" }),
        nativeToScVal(BigInt(params.deadlineTimestamp), { type: "u64" })
      )
    )
    .setTimeout(30)
    .build();

  const prepared = await server.prepareTransaction(tx);
  const signed = await signWithFreighter(prepared.toXDR(), params.network);
  return submitStellarTx(signed);
}
