import dotenv from 'dotenv';
dotenv.config();

const appMode = (process.env.APP_MODE || 'testmode').toLowerCase();
const marketWindowUnit =
  (process.env.MARKET_WINDOW_UNIT ||
    (appMode === 'mainnet' ? 'hours' : 'minutes')).toLowerCase();

const stellarNetwork = (process.env.STELLAR_NETWORK || 'testnet').toLowerCase();

export const config = {
  appMode,
  port: parseInt(process.env.PORT || '3001'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  market: {
    windowUnit: marketWindowUnit === 'hours' ? 'hours' : 'minutes',
  },
  database: {
    url: process.env.DATABASE_URL!,
  },
  stellar: {
    network: stellarNetwork,
    rpcUrl: process.env.STELLAR_RPC_URL!,
    horizonUrl: process.env.STELLAR_HORIZON_URL!,
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE!,
    factoryAddress: process.env.FACTORY_CONTRACT_ADDRESS!,
    tokenAddress: process.env.TOKEN_CONTRACT_ADDRESS!,
    oracleSecret: process.env.ORACLE_SECRET_KEY!,
  },
  /** Testnet-only: fund custodial wallets with platform token for betting (see wallet routes). */
  tokenFaucet: {
    enabled:
      process.env.ENABLE_TESTNET_TOKEN_FAUCET === 'true' && stellarNetwork === 'testnet',
    secretKey: process.env.TOKEN_FAUCET_SECRET_KEY || '',
    /** Raw token amount (i128), default ~100 units at Soroban token scale */
    amountRaw: BigInt(process.env.TOKEN_FAUCET_AMOUNT_RAW || '100000000000'),
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY!,
  },
  encryption: {
    masterKey: process.env.ENCRYPTION_MASTER_KEY!,
  },
} as const;
