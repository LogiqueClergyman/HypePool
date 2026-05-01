import { prisma } from '../lib/prisma';
import { registry } from '../providers/registry';
import { getStellarService } from '../services/stellar';

export async function resolveMarkets(): Promise<void> {
  try {
    const marketsToResolve = await prisma.market.findMany({
      where: {
        OR: [
          { status: 'ACTIVE', deadline: { lt: new Date() } },
          { status: { in: ['RESOLVED_YES', 'RESOLVED_NO'] }, settledAt: null }
        ]
      },
      include: { content: true },
      take: 20,
      orderBy: { deadline: 'asc' },
    });

    if (marketsToResolve.length === 0) return;

    const stellarService = getStellarService();

    for (const market of marketsToResolve) {
      if (market.status === 'ACTIVE') {
        const resolver = registry.getResolver();
        const result = await resolver.resolve({
          contentPlatform: market.content.platform,
          contentExternalId: market.content.externalId,
          threshold: Number(market.threshold),
          metric: 'views', // Only one metric right now
        });

        if (!result) continue; // Waiting for data or human input

        try {
          await stellarService.resolveMarket(market.contractAddress, result.outcome);
          
          await prisma.market.update({
            where: { id: market.id },
            data: {
              status: `RESOLVED_${result.outcome.toUpperCase()}` as any,
              outcome: result.outcome.toUpperCase() as any,
              resolvedAt: result.resolvedAt
            }
          });

          market.status = `RESOLVED_${result.outcome.toUpperCase()}` as any;
          market.outcome = result.outcome.toUpperCase() as any;
        } catch (e) {
          console.error(`Failed to execute on-chain resolution for market ${market.id}:`, e);
          continue; // Retry on next cron loop
        }
      }

      // Auto-Claim loop
      if (market.status !== 'ACTIVE' && market.settledAt === null) {
        let allSuccess = true;
        
        const winningBets = await prisma.bet.findMany({
          where: { marketId: market.id, side: market.outcome! as any, claimed: false },
          include: { user: true },
          take: 25,
          orderBy: { createdAt: 'asc' },
        });

        for (const bet of winningBets) {
          try {
            const { txHash, payout } = await stellarService.claimForUser(market.contractAddress, bet.user.stellarAddress);
            await prisma.bet.update({
              where: { id: bet.id },
              data: { claimed: true, claimTxHash: txHash, payout }
            });
          } catch (e) {
            console.error(`Failed to claim for user ${bet.user.stellarAddress} on market ${market.id}:`, e);
            allSuccess = false;
          }
        }

        if (allSuccess) {
          await prisma.market.update({
            where: { id: market.id },
            data: { settledAt: new Date() }
          });
        }
      }
    }
  } catch (error) {
    console.error('Scheduler resolution failed:', error);
  }
}
