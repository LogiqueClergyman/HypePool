import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { StellarService } from '../services/stellar';
import { WalletService } from '../services/wallet';
import { config } from '../config';

const router = Router();

const betSchema = z.object({
  side: z.enum(['yes', 'no']),
  amount: z.number().int().positive(),
  user_address: z.string().min(56).max(56),
});

router.post('/:id/bet', validate(betSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { side, amount, user_address } = req.body;
    const market = await prisma.market.findUnique({ where: { id: req.params.id as string } });

    if (!market) throw new AppError(404, 'market_not_found', 'Market not found');
    if (market.status !== 'ACTIVE' || market.deadline < new Date()) {
      throw new AppError(400, 'market_closed', 'Betting window has closed');
    }
    if (BigInt(amount) < market.minBet) {
      throw new AppError(400, 'below_min_bet', 'Bet amount is below minimum');
    }

    const user = await prisma.user.upsert({
      where: { stellarAddress: user_address },
      update: {},
      create: { stellarAddress: user_address },
      include: { custodialWallet: true }
    });

    const stellarService = new StellarService(config.stellar.rpcUrl, config.stellar.networkPassphrase, config.stellar.oracleSecret, config.stellar.factoryAddress);

    if (user.custodialWallet) {
      const walletService = new WalletService(config.encryption.masterKey);
      const userKeypair = walletService.getKeypair(user.custodialWallet.encryptedKey);

      const xdr = side === 'yes' 
        ? await stellarService.buildBuyYesTx(market.contractAddress, user_address, BigInt(amount), userKeypair.publicKey())
        : await stellarService.buildBuyNoTx(market.contractAddress, user_address, BigInt(amount), userKeypair.publicKey());

      const { txHash } = await stellarService.signAndSubmit(xdr, userKeypair);

      const newYesPool = side === 'yes' ? market.yesPool + BigInt(amount) : market.yesPool;
      const newNoPool = side === 'no' ? market.noPool + BigInt(amount) : market.noPool;

      const bet = await prisma.bet.create({
        data: {
          userId: user.id,
          marketId: market.id,
          side: side.toUpperCase() as any,
          amount: BigInt(amount),
          txHash,
        }
      });

      await prisma.market.update({
        where: { id: market.id },
        data: {
          yesPool: newYesPool,
          noPool: newNoPool,
          totalBettors: market.totalBettors + 1 // Simplified: accurately requires checking if user already bet
        }
      });

      return res.status(200).json({
        status: 'confirmed',
        tx_hash: txHash,
        bet: {
          id: bet.id,
          market_id: bet.marketId,
          side,
          amount: bet.amount.toString(),
          new_yes_pool: newYesPool.toString(),
          new_no_pool: newNoPool.toString(),
        }
      });
    } else {
      const xdr = side === 'yes'
        ? await stellarService.buildBuyYesTx(market.contractAddress, user_address, BigInt(amount), user_address)
        : await stellarService.buildBuyNoTx(market.contractAddress, user_address, BigInt(amount), user_address);

      const interaction = await prisma.interaction.create({
        data: {
          type: 'BET',
          userAddress: user_address,
          marketId: market.id,
          xdr,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000),
          metadata: { side, amount, market_id: market.id }
        }
      });

      return res.status(200).json({
        status: 'unsigned',
        xdr,
        interaction_id: interaction.id
      });
    }
  } catch (error) {
    next(error);
  }
});

export default router;
