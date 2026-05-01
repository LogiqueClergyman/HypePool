import { prisma } from '../lib/prisma';
import { getStellarService } from '../services/stellar';
import { logger } from '../lib/logger';

export async function syncState(): Promise<void> {
  try {
    const activeMarkets = await prisma.market.findMany({
      where: { status: 'ACTIVE', contractAddress: { not: '' } },
      take: 10,
      orderBy: { lastSyncedAt: 'asc' },
    });

    if (activeMarkets.length === 0) return;

    const stellarService = getStellarService();

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
            lastSyncedAt: new Date(),
          }
        });
      } catch (e) {
        logger.error({ err: e, marketId: market.id }, 'Failed to sync state for market');
      }
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (error) {
    logger.error({ err: error }, 'State sync job error');
  }
}
