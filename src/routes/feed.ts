import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateQuery } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { config } from '../config';

const router = Router();

const feedQuerySchema = z.object({
  page: z.string().regex(/^\d+$/).transform(Number).optional().default(1),
  limit: z.string().regex(/^\d+$/).transform(Number).optional().default(10),
});

router.get('/', validateQuery(feedQuerySchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { page, limit } = req.query as any;

    const contents = await prisma.content.findMany({
      where: {
        markets: { some: { status: 'ACTIVE' } }
      },
      include: {
        markets: {
          orderBy: { status: 'asc' } // ACTIVE first over RESOLVED
        }
      }
    });

    const feedItems = contents.map(c => {
      let totalVolume = 0n;
      let totalBettors = 0;
      
      const mappedMarkets = c.markets.map(m => {
        totalVolume += m.yesPool + m.noPool;
        totalBettors += m.totalBettors;
        return {
          id: m.id,
          threshold: Number(m.threshold),
          window_hours: m.windowHours,
          window_unit: config.market.windowUnit,
          deadline: m.deadline.toISOString(),
          yes_pool: m.yesPool.toString(),
          no_pool: m.noPool.toString(),
          total_bettors: m.totalBettors,
          status: m.status
        };
      });

      return {
        content: {
          id: c.id,
          video_id: c.externalId,
          title: c.title,
          channel: c.author,
          thumbnail: c.thumbnailUrl,
          current_views: Number(c.currentViews)
        },
        markets: mappedMarkets,
        total_volume: totalVolume.toString(),
        total_bettors: totalBettors
      };
    });

    feedItems.sort((a, b) => {
      const volA = BigInt(a.total_volume);
      const volB = BigInt(b.total_volume);
      if (volA > volB) return -1;
      if (volA < volB) return 1;
      return 0;
    });

    const paginated = feedItems.slice((page - 1) * limit, page * limit);

    return res.status(200).json({
      items: paginated,
      page,
      has_more: page * limit < feedItems.length
    });
  } catch (error) {
    next(error);
  }
});

export default router;
