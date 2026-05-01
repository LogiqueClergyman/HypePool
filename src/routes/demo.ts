import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

// !! DEV ONLY — never mounted in production !!
const router = Router();

// POST /api/demo/resolve/:marketId?outcome=YES  → force-resolves instantly
router.post('/resolve/:marketId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const raw = req.query.outcome;
    const outcome = (Array.isArray(raw) ? raw[0] : raw ?? 'YES').toString().toUpperCase();
    if (outcome !== 'YES' && outcome !== 'NO') {
      throw new AppError(400, 'bad_outcome', 'outcome must be YES or NO');
    }

    const market = await prisma.market.findUnique({
      where: { id: req.params.marketId as string },
      include: { bets: { include: { user: true } } },
    });
    if (!market) throw new AppError(404, 'not_found', 'Market not found');

    const bets = (market as any).bets as Array<{ id: string; side: string; amount: bigint; user: { stellarAddress: string } }>;
    const winningBets = bets.filter(b => b.side === outcome);
    const losingBets  = bets.filter(b => b.side !== outcome);

    const winPool  = winningBets.reduce((s, b) => s + b.amount, 0n);
    const losePool = losingBets.reduce((s, b)  => s + b.amount, 0n);

    await prisma.market.update({
      where: { id: market.id },
      data: {
        status: `RESOLVED_${outcome}` as any,
        outcome: outcome as any,
        resolvedAt: new Date(),
        settledAt: new Date(),
      },
    });

    for (const bet of winningBets) {
      const payout = winPool > 0n ? bet.amount + (bet.amount * losePool) / winPool : bet.amount;
      await prisma.bet.update({ where: { id: bet.id }, data: { claimed: true, payout } });
    }
    for (const bet of losingBets) {
      await prisma.bet.update({ where: { id: bet.id }, data: { claimed: true, payout: 0n } });
    }

    return res.json({
      resolved: true,
      outcome,
      market_id: market.id,
      winners: winningBets.length,
      losers: losingBets.length,
      bets: [
        ...winningBets.map(b => {
          const payout = winPool > 0n ? Number(b.amount + (b.amount * losePool) / winPool) : Number(b.amount);
          return { side: b.side, amount_xlm: (Number(b.amount) / 1e6).toFixed(2), payout_xlm: (payout / 1e6).toFixed(2), result: '✅ WON' };
        }),
        ...losingBets.map(b => ({
          side: b.side, amount_xlm: (Number(b.amount) / 1e6).toFixed(2), payout_xlm: '0.00', result: '❌ LOST',
        })),
      ],
    });
  } catch (err) { next(err); }
});

// GET /api/demo/status/:marketId
router.get('/status/:marketId', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.marketId as string },
      include: { bets: { include: { user: true } }, content: true },
    });
    if (!market) throw new AppError(404, 'not_found', 'Market not found');

    const bets = (market as any).bets as Array<{ id: string; side: string; amount: bigint; payout: bigint | null; claimed: boolean; user: { stellarAddress: string } }>;
    const content = (market as any).content as { title: string } | null;

    return res.json({
      id: market.id,
      status: market.status,
      outcome: market.outcome,
      content: content?.title,
      threshold: market.threshold.toString(),
      window_hours: market.windowHours,
      deadline: market.deadline,
      yes_pool_xlm: (Number(market.yesPool) / 1e6).toFixed(2),
      no_pool_xlm:  (Number(market.noPool)  / 1e6).toFixed(2),
      bets: bets.map(b => ({
        user: b.user.stellarAddress.slice(0, 8) + '…',
        side: b.side,
        amount_xlm: (Number(b.amount) / 1e6).toFixed(2),
        payout_xlm: b.payout ? (Number(b.payout) / 1e6).toFixed(2) : null,
        claimed: b.claimed,
      })),
    });
  } catch (err) { next(err); }
});

export default router;
