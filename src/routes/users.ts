import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const router = Router();

router.get('/:address/portfolio', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address as string;
    const user = await prisma.user.findUnique({ where: { stellarAddress: address }, include: { bets: { include: { market: true } } } });

    if (!user) {
      return res.status(200).json({
        address, total_wagered: "0", total_won: "0", pnl: "0", active_bets: 0, markets_won: 0, markets_lost: 0
      });
    }

    let total_wagered = 0n;
    let total_won = 0n;
    let active_bets = 0;
    let markets_won = 0;
    let markets_lost = 0;

    for (const bet of user.bets) {
      total_wagered += bet.amount;
      if (bet.payout) total_won += bet.payout;

      if (bet.market.status === 'ACTIVE') {
        active_bets++;
      } else if (bet.claimed && bet.payout && bet.payout > 0n) {
        markets_won++;
      } else if ((bet.market.status === 'RESOLVED_YES' || bet.market.status === 'RESOLVED_NO') && bet.side !== bet.market.outcome) {
        markets_lost++;
      }
    }

    const pnl = total_won - total_wagered;

    return res.status(200).json({
      address,
      total_wagered: total_wagered.toString(),
      total_won: total_won.toString(),
      pnl: pnl.toString(),
      active_bets,
      markets_won,
      markets_lost
    });
  } catch (error) {
    next(error);
  }
});

const betsQuerySchema = z.object({
  status: z.enum(['active', 'won', 'lost']).optional(),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(20),
});

router.get('/:address/bets', validateQuery(betsQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address as string;
    const { status, page, limit } = req.query as any;

    const user = await prisma.user.findUnique({ where: { stellarAddress: address } });
    if (!user) return res.status(200).json({ bets: [], total: 0, page, pages: 0 });

    let filter: any = { userId: user.id };
    
    if (status === 'active') {
      filter.market = { status: 'ACTIVE' };
    } else if (status === 'won') {
      filter.claimed = true;
      filter.payout = { gt: 0 };
    } else if (status === 'lost') {
      filter.market = { status: { in: ['RESOLVED_YES', 'RESOLVED_NO'] } };
      // Can't easily filter bet.side != market.outcome deeply in basic prisma without raw query
      // but we resolve it below or skip perfect filtering in this basic map
    }

    const bets = await prisma.bet.findMany({
      where: filter,
      include: { market: { include: { content: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' }
    });

    const filteredBets = bets.filter(b => {
      if (status === 'lost') {
        return b.side !== b.market.outcome;
      }
      return true;
    });

    return res.status(200).json({
      bets: filteredBets.map(b => ({
        id: b.id,
        market: {
          id: b.marketId,
          content_title: b.market.content.title,
          content_thumbnail: b.market.content.thumbnailUrl,
          threshold: Number(b.market.threshold),
          window_hours: b.market.windowHours,
          status: b.market.status,
          outcome: b.market.outcome
        },
        side: b.side.toLowerCase(),
        amount: b.amount.toString(),
        payout: b.payout?.toString() || null,
        claimed: b.claimed,
        placed_at: b.createdAt.toISOString()
      })),
      total: filteredBets.length,
      page,
      pages: Math.ceil(filteredBets.length / limit)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
