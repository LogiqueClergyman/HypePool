import { rpc, Contract, TransactionBuilder, Keypair, nativeToScVal, Address, xdr } from '@stellar/stellar-sdk';
import { config as appConfig } from '../config';
import { logger } from '../lib/logger';

let _singleton: StellarService | null = null;

export function getStellarService(): StellarService {
  if (!_singleton) {
    _singleton = new StellarService(
      appConfig.stellar.rpcUrl,
      appConfig.stellar.networkPassphrase,
      appConfig.stellar.oracleSecret,
      appConfig.stellar.factoryAddress,
    );
  }
  return _singleton;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`RPC timeout after ${ms}ms: ${label}`)), ms)
    ),
  ]);
}

export interface MarketConfigParams {
  contentUrl: string;
  contentType: number;
  metric: number;
  threshold: bigint;
  deadline: number;
  resolutionDeadline: number;
  minBet: bigint;
  tokenAddress: string;
  oracleAddress: string;
  creatorAddress: string;
  platformFeeBps: number;
}

export class StellarService {
  private server: rpc.Server;
  private networkPassphrase: string;
  private oracleKeypair: Keypair;
  private factoryAddress: string;

  constructor(rpcUrl: string, passphrase: string, oracleSecret: string, factoryAddress: string) {
    this.server = new rpc.Server(rpcUrl);
    this.networkPassphrase = passphrase;
    this.oracleKeypair = Keypair.fromSecret(oracleSecret);
    this.factoryAddress = factoryAddress;
  }

  private async buildAndSimulate(
    sourceAddress: string,
    contractAddress: string,
    method: string,
    args: xdr.ScVal[]
  ): Promise<string> {
    const account = await withTimeout(this.server.getAccount(sourceAddress), 10_000, 'getAccount');
    const contract = new Contract(contractAddress);

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(contract.call(method, ...args))
      .setTimeout(30)
      .build();

    const simulated = await withTimeout(this.server.simulateTransaction(tx), 15_000, 'simulateTransaction');
    if (rpc.Api.isSimulationError(simulated)) {
      throw new Error(`Simulation failed: ${simulated.error}`);
    }

    const prepared = rpc.assembleTransaction(tx, simulated).build();
    return prepared.toXDR();
  }

  async buildCreateMarketTx(sourceAddress: string, config: MarketConfigParams): Promise<string> {
    // Contract signature: create_market(creator: Address, config: MarketConfig)
    const configVal = xdr.ScVal.scvMap([
      new xdr.ScMapEntry({ key: nativeToScVal('content_type', { type: 'symbol' }), val: nativeToScVal(config.contentType, { type: 'u32' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('content_url', { type: 'symbol' }), val: nativeToScVal(config.contentUrl) }),
      new xdr.ScMapEntry({ key: nativeToScVal('created_at', { type: 'symbol' }), val: nativeToScVal(0, { type: 'u64' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('creator', { type: 'symbol' }), val: new Address(config.creatorAddress).toScVal() }),
      new xdr.ScMapEntry({ key: nativeToScVal('deadline', { type: 'symbol' }), val: nativeToScVal(config.deadline, { type: 'u64' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('metric', { type: 'symbol' }), val: nativeToScVal(config.metric, { type: 'u32' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('min_bet', { type: 'symbol' }), val: nativeToScVal(config.minBet, { type: 'i128' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('oracle', { type: 'symbol' }), val: new Address(config.oracleAddress).toScVal() }),
      new xdr.ScMapEntry({ key: nativeToScVal('platform_fee_bps', { type: 'symbol' }), val: nativeToScVal(config.platformFeeBps, { type: 'u32' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('resolution_deadline', { type: 'symbol' }), val: nativeToScVal(config.resolutionDeadline, { type: 'u64' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('threshold', { type: 'symbol' }), val: nativeToScVal(config.threshold, { type: 'u64' }) }),
      new xdr.ScMapEntry({ key: nativeToScVal('token', { type: 'symbol' }), val: new Address(config.tokenAddress).toScVal() })
    ]);

    return this.buildAndSimulate(
      sourceAddress,
      this.factoryAddress,
      'create_market',
      [new Address(config.creatorAddress).toScVal(), configVal]
    );
  }

  async getFactoryMarketCount(sourceAddress: string): Promise<number> {
    const account = await withTimeout(this.server.getAccount(sourceAddress), 10_000, 'getAccount/marketCount');
    const factory = new Contract(this.factoryAddress);

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(factory.call('get_market_count'))
      .setTimeout(30)
      .build();

    const simulated = await withTimeout(this.server.simulateTransaction(tx), 15_000, 'simulate/marketCount');
    if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result?.retval) {
      throw new Error('Failed to fetch market count from factory');
    }

    const retval = simulated.result.retval;
    if (!retval.switch || retval.switch().value !== 5) {
      throw new Error('Unexpected return type for get_market_count');
    }

    return Number(retval.u64().low);
  }

  async getFactoryMarketAddress(sourceAddress: string, marketId: number): Promise<string> {
    const account = await withTimeout(this.server.getAccount(sourceAddress), 10_000, 'getAccount/marketAddr');
    const factory = new Contract(this.factoryAddress);

    const tx = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase: this.networkPassphrase,
    })
      .addOperation(factory.call('get_market', nativeToScVal(marketId, { type: 'u64' })))
      .setTimeout(30)
      .build();

    const simulated = await withTimeout(this.server.simulateTransaction(tx), 15_000, 'simulate/marketAddr');
    if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result?.retval) {
      throw new Error(`Failed to fetch market address for id ${marketId}`);
    }

    const retval = simulated.result.retval;
    if (!retval.switch || retval.switch().value !== 18) {
      throw new Error('Unexpected return type for get_market');
    }

    return Address.fromScVal(retval).toString();
  }

  async buildBuyYesTx(marketAddr: string, userAddr: string, amount: bigint, sourceAddr: string): Promise<string> {
    return this.buildAndSimulate(
      sourceAddr,
      marketAddr,
      'buy_yes',
      [new Address(userAddr).toScVal(), nativeToScVal(amount, { type: 'i128' })]
    );
  }

  async buildBuyNoTx(marketAddr: string, userAddr: string, amount: bigint, sourceAddr: string): Promise<string> {
    return this.buildAndSimulate(
      sourceAddr,
      marketAddr,
      'buy_no',
      [new Address(userAddr).toScVal(), nativeToScVal(amount, { type: 'i128' })]
    );
  }

  async signAndSubmit(xdrStr: string, signerKeypair: Keypair): Promise<{ txHash: string; txResponse: rpc.Api.GetTransactionResponse }> {
    const tx = TransactionBuilder.fromXDR(xdrStr, this.networkPassphrase);
    tx.sign(signerKeypair);

    let sendResult = await withTimeout(this.server.sendTransaction(tx), 10_000, 'sendTransaction');

    if (sendResult.status === 'ERROR') {
      throw new Error(`Tx Submission failed`);
    }

    // Wait for the transaction to be included in a ledger (max 20 attempts = ~40s)
    let txResponse = await withTimeout(this.server.getTransaction(sendResult.hash), 5_000, 'getTransaction');
    let waitCount = 0;
    const MAX_WAIT = 20;
    while (txResponse.status === 'NOT_FOUND') {
      if (waitCount >= MAX_WAIT) {
        throw new Error(`Tx ${sendResult.hash} not confirmed after ${MAX_WAIT * 2}s — giving up`);
      }
      waitCount++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      txResponse = await withTimeout(this.server.getTransaction(sendResult.hash), 5_000, 'getTransaction/poll');
    }
    
    logger.debug({ txHash: sendResult.hash, status: txResponse.status }, 'Transaction confirmed');
    if (txResponse.status === 'FAILED') throw new Error(`Tx Failed on-chain`);
    
    return { txHash: sendResult.hash, txResponse };
  }

  async getMarketState(marketAddr: string): Promise<{ yesPool: bigint; noPool: bigint; yesWeightedPool: bigint; noWeightedPool: bigint; outcome: string; totalBettors: number }> {
    const contract = new Contract(marketAddr);
    const tx = new TransactionBuilder(
      await withTimeout(this.server.getAccount(this.oracleKeypair.publicKey()), 10_000, 'getAccount/state'),
      { fee: '100', networkPassphrase: this.networkPassphrase }
    ).addOperation(contract.call('get_state')).setTimeout(30).build();

    const simulated = await withTimeout(this.server.simulateTransaction(tx), 15_000, 'simulate/state');
    if (!rpc.Api.isSimulationSuccess(simulated) || !simulated.result?.retval) return { yesPool: 0n, noPool: 0n, yesWeightedPool: 0n, noWeightedPool: 0n, outcome: 'Unresolved', totalBettors: 0 };
    
    // Parse result
    const scv = simulated.result.retval;
    // ... custom parsing depending on SorobanSDK ...
    return { yesPool: 0n, noPool: 0n, yesWeightedPool: 0n, noWeightedPool: 0n, outcome: 'Unresolved', totalBettors: 0 }; // Placeholder
  }

  async resolveMarket(marketAddr: string, outcome: 'Yes' | 'No'): Promise<string> {
    const outcomeCode = outcome === 'Yes' ? 1 : 2;
    const xdrStr = await this.buildAndSimulate(
      this.oracleKeypair.publicKey(),
      marketAddr,
      'resolve',
      [new Address(this.oracleKeypair.publicKey()).toScVal(), nativeToScVal(outcomeCode, { type: 'u32' })]
    );
    const { txHash } = await this.signAndSubmit(xdrStr, this.oracleKeypair);
    return txHash;
  }

  async submitSigned(tx: ReturnType<typeof TransactionBuilder.fromXDR>): Promise<{ txHash: string }> {
    let sendResult = await withTimeout(this.server.sendTransaction(tx as any), 10_000, 'sendTransaction/signed');
    if (sendResult.status === 'ERROR') throw new Error('Tx submission failed');

    let txResponse = await withTimeout(this.server.getTransaction(sendResult.hash), 5_000, 'getTransaction/signed');
    let waitCount = 0;
    const MAX_WAIT = 20;
    while (txResponse.status === 'NOT_FOUND') {
      if (waitCount >= MAX_WAIT) throw new Error(`Tx ${sendResult.hash} not confirmed after ${MAX_WAIT * 2}s`);
      waitCount++;
      await new Promise(resolve => setTimeout(resolve, 2000));
      txResponse = await withTimeout(this.server.getTransaction(sendResult.hash), 5_000, 'getTransaction/signed/poll');
    }
    if (txResponse.status === 'FAILED') throw new Error('Tx failed on-chain');
    logger.info({ txHash: sendResult.hash }, 'Signed tx submitted and confirmed');
    return { txHash: sendResult.hash };
  }

  async claimForUser(marketAddr: string, userAddr: string): Promise<{ txHash: string; payout: bigint }> {
    const xdrStr = await this.buildAndSimulate(
      this.oracleKeypair.publicKey(), // oracle fee source
      marketAddr,
      'claim',
      [new Address(userAddr).toScVal()]
    );
    const { txHash } = await this.signAndSubmit(xdrStr, this.oracleKeypair);
    return { txHash, payout: 0n }; // Return parsed payout using getTransaction
  }
}
