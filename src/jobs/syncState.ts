import { prisma } from '../lib/prisma';
import { getStellarService } from '../services/stellar';

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
        console.error(`Failed to sync state for market ${market.id}`, e);
      }
      // Small pause between RPC calls to avoid hammering the endpoint
      await new Promise(r => setTimeout(r, 500));
    }
  } catch (error) {
    console.error('State sync job error:', error);
  }
}
