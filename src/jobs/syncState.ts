import { prisma } from '../lib/prisma';
import { StellarService } from '../services/stellar';
import { config } from '../config';

export async function syncState(): Promise<void> {
  try {
    const activeMarkets = await prisma.market.findMany({
      where: { status: 'ACTIVE' }
    });

    if (activeMarkets.length === 0) return;

    const stellarService = new StellarService(config.stellar.rpcUrl, config.stellar.networkPassphrase, config.stellar.oracleSecret, config.stellar.factoryAddress);

    for (const market of activeMarkets) {
      try {
        const state = await stellarService.getMarketState(market.contractAddress);
        
        await prisma.market.update({
          where: { id: market.id },
          data: {
            yesPool: state.yesPool,
            noPool: state.noPool,
            yesWeightedPool: state.yesWeightedPool,
            noWeightedPool: state.noWeightedPool,
            totalBettors: state.totalBettors,
          }
        });
      } catch (e) {
        console.error(`Failed to sync state for market ${market.id}`, e);
      }
    }
  } catch (error) {
    console.error('State sync job error:', error);
  }
}
