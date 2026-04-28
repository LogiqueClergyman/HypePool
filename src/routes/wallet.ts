import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { WalletService } from '../services/wallet';
import { AppError } from '../lib/errors';
import { config } from '../config';

const router = Router();

const createSchema = z.object({
  user_address: z.string().min(56).max(56)
});

router.post('/create', validate(createSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { user_address } = req.body;

    const user = await prisma.user.upsert({
      where: { stellarAddress: user_address },
      update: {},
      create: { stellarAddress: user_address }
    });

    const existing = await prisma.custodialWallet.findUnique({ where: { userId: user.id } });
    if (existing) throw new AppError(409, 'wallet_exists', 'User already has a custodial wallet');

    const walletService = new WalletService(config.encryption.masterKey);
    const keypair = walletService.generateKeypair();
    const encryptedKey = walletService.encrypt(keypair.secretKey);

    try {
      await fetch(`https://friendbot.stellar.org/?addr=${keypair.publicKey}`);
    } catch (e) {
      console.warn("Friendbot funding failed or delayed:", e);
    }

    const wallet = await prisma.custodialWallet.create({
      data: {
        userId: user.id,
        custodialAddress: keypair.publicKey,
        encryptedKey
      }
    });

    return res.status(201).json({
      custodial_address: wallet.custodialAddress,
      status: 'active'
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address as string;
    const wallet = await prisma.custodialWallet.findUnique({
      where: { custodialAddress: address },
      include: { user: true }
    });

    if (!wallet) throw new AppError(404, 'wallet_not_found', 'Wallet not found');

    // Balance fetching from Horizon would go here. Dummy for now.
    const balance = "48000000"; 

    return res.status(200).json({
      custodial_address: wallet.custodialAddress,
      balance,
      owner_address: wallet.user.stellarAddress,
      created_at: wallet.createdAt.toISOString()
    });
  } catch (error) {
    next(error);
  }
});

const withdrawSchema = z.object({
  custodial_address: z.string().min(56).max(56),
  amount: z.number().int().positive(),
  destination: z.string().min(56).max(56)
});

router.post('/withdraw', validate(withdrawSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { custodial_address, amount, destination } = req.body;

    const wallet = await prisma.custodialWallet.findUnique({
      where: { custodialAddress: custodial_address },
      include: { user: true }
    });

    if (!wallet) throw new AppError(404, 'wallet_not_found', 'Wallet not found');
    if (wallet.user.stellarAddress !== destination) {
      throw new AppError(403, 'unauthorized_destination', 'Can only withdraw to the owner signature');
    }

    // Stellar transaction builder for native/token transfer...
    const txHash = "dummy_tx_" + Math.random();

    return res.status(200).json({
      tx_hash: txHash,
      new_balance: "0" // Update from actual
    });
  } catch (error) {
    next(error);
  }
});

export default router;
