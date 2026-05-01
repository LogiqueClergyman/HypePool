import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { rpc, scValToNative } from '@stellar/stellar-sdk';
import { config } from '../config';

const router = Router();

const confirmSchema = z.object({
  interaction_id: z.string().uuid(),
  tx_hash: z.string()
});

router.post('/', validate(confirmSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { interaction_id, tx_hash } = req.body;

    const interaction = await prisma.interaction.findUnique({ where: { id: interaction_id } });
    if (!interaction) throw new AppError(404, 'interaction_not_found', 'Interaction not found');

    if (interaction.status !== 'PENDING') {
      throw new AppError(400, 'interaction_not_pending', 'Interaction already confirmed or expired');
    }

    if (interaction.expiresAt < new Date()) {
      await prisma.interaction.update({ where: { id: interaction.id }, data: { status: 'EXPIRED' } });
      throw new AppError(400, 'interaction_expired', 'Transaction XDR has expired');
    }

    const server = new rpc.Server(config.stellar.rpcUrl);
    let txResponse: rpc.Api.GetTransactionResponse;

    try {
      txResponse = await server.getTransaction(tx_hash);
      if (txResponse.status !== 'SUCCESS') {
        throw new Error('Not success');
      }
    } catch {
      throw new AppError(400, 'tx_not_confirmed', 'Transaction not confirmed on chain');
    }

    await prisma.interaction.update({
      where: { id: interaction.id },
      data: { status: 'CONFIRMED', txHash: tx_hash, confirmedAt: new Date() }
    });

    const user = await prisma.user.findUnique({ where: { stellarAddress: interaction.userAddress } });

    if (interaction.type === 'BET') {
      const meta = interaction.metadata as any;
      await prisma.bet.create({
        data: {
          userId: user!.id,
          marketId: meta.market_id,
          side: meta.side.toUpperCase(),
          amount: BigInt(meta.amount),
          txHash: tx_hash,
        }
      });

      await prisma.market.update({
        where: { id: meta.market_id },
        data: {
          ...(meta.side === 'yes'
            ? { yesPool: { increment: BigInt(meta.amount) } }
            : { noPool: { increment: BigInt(meta.amount) } }),
          totalBettors: { increment: 1 },
        }
      });

    } else if (interaction.type === 'MARKET_CREATE') {
      const meta = interaction.metadata as any;

      // Parse (u64, Address) tuple returned by factory.create_market()
      let onchainId: number;
      let contractAddress: string;

      const retval = (txResponse as any).returnValue;
      if (retval) {
        try {
          const parsed = scValToNative(retval) as [bigint, string];
          onchainId = Number(parsed[0]);
          contractAddress = parsed[1];
        } catch {
          throw new AppError(400, 'tx_parse_failed', 'Could not parse market creation result from transaction');
        }
      } else {
        throw new AppError(400, 'tx_no_return', 'Transaction did not return expected market data');
      }

      await prisma.market.create({
        data: {
          contentId: meta.contentId,
          onchainId,
          contractAddress,
          threshold: BigInt(meta.tier),
          windowHours: meta.window,
          deadline: new Date(meta.deadline * 1000),
          resolutionDeadline: new Date(meta.resolutionDeadline * 1000),
          minBet: BigInt(1_000_000),
        }
      });
    }

    return res.status(200).json({ status: 'confirmed' });
  } catch (error) {
    next(error);
  }
});

export default router;
