import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3001'),
  corsOrigin: process.env.CORS_ORIGIN || '*',
  database: {
    url: process.env.DATABASE_URL!,
  },
  stellar: {
    network: process.env.STELLAR_NETWORK || 'testnet',
    rpcUrl: process.env.STELLAR_RPC_URL!,
    horizonUrl: process.env.STELLAR_HORIZON_URL!,
    networkPassphrase: process.env.STELLAR_NETWORK_PASSPHRASE!,
    factoryAddress: process.env.FACTORY_CONTRACT_ADDRESS!,
    tokenAddress: process.env.TOKEN_CONTRACT_ADDRESS!,
    oracleSecret: process.env.ORACLE_SECRET_KEY!,
  },
  youtube: {
    apiKey: process.env.YOUTUBE_API_KEY!,
  },
  encryption: {
    masterKey: process.env.ENCRYPTION_MASTER_KEY!,
  },
} as const;
