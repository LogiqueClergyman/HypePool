import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';

const router = Router();

const marketsQuerySchema = z.object({
  status: z.enum(['active', 'resolved_yes', 'resolved_no', 'expired']).optional().default('active'),
  content_id: z.string().uuid().optional(),
  sort: z.enum(['volume', 'newest', 'closing_soon']).optional().default('volume'),
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(20),
});

router.get('/', validateQuery(marketsQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { status, content_id, sort, page, limit } = req.query as any;

    let where: any = { status: status.toUpperCase() };
    if (content_id) {
      where.contentId = content_id;
    }

    let orderBy: any = {};
    if (sort === 'newest') {
      orderBy = { createdAt: 'desc' };
    } else if (sort === 'closing_soon') {
      orderBy = { deadline: 'asc' };
    }

    let markets = await prisma.market.findMany({
      where,
      include: { content: true },
      orderBy: sort !== 'volume' ? orderBy : undefined,
      skip: (page - 1) * limit,
      take: limit,
    });

    if (sort === 'volume') {
      markets.sort((a, b) => {
        const volA = a.yesPool + a.noPool;
        const volB = b.yesPool + b.noPool;
        if (volA > volB) return -1;
        if (volA < volB) return 1;
        return 0;
      });
    }

    const total = await prisma.market.count({ where });

    return res.status(200).json({
      markets: markets.map(m => ({
        id: m.id,
        content: {
          video_id: m.content.externalId,
          title: m.content.title,
          channel: m.content.author,
          thumbnail: m.content.thumbnailUrl,
          current_views: Number(m.content.currentViews)
        },
        threshold: Number(m.threshold),
        window_hours: m.windowHours,
        deadline: m.deadline.toISOString(),
        yes_pool: m.yesPool.toString(),
        no_pool: m.noPool.toString(),
        total_bettors: m.totalBettors,
        status: m.status
      })),
      total,
      page,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const market = await prisma.market.findUnique({
      where: { id: req.params.id as string },
      include: { content: true }
    });

    if (!market) throw new AppError(404, 'market_not_found', 'Market not found');

    return res.status(200).json({
      id: market.id,
      onchain_id: market.onchainId,
      contract_address: market.contractAddress,
      content: {
        video_id: market.content.externalId,
        title: market.content.title,
        channel: market.content.author,
        thumbnail: market.content.thumbnailUrl,
        current_views: Number(market.content.currentViews)
      },
      threshold: Number(market.threshold),
      window_hours: market.windowHours,
      deadline: market.deadline.toISOString(),
      resolution_deadline: market.resolutionDeadline.toISOString(),
      min_bet: market.minBet.toString(),
      yes_pool: market.yesPool.toString(),
      no_pool: market.noPool.toString(),
      total_bettors: market.totalBettors,
      status: market.status,
      outcome: market.outcome,
      resolved_at: market.resolvedAt?.toISOString() || null,
      created_at: market.createdAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

export default router;
