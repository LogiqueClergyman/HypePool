import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { prisma } from '../lib/prisma';
import { WalletService } from '../services/wallet';
import { AppError } from '../lib/errors';
import { config } from '../config';
import { Horizon, TransactionBuilder, Operation, Asset } from '@stellar/stellar-sdk';
import { getStellarService } from '../services/stellar';

const horizon = new Horizon.Server(config.stellar.horizonUrl);

const router = Router();

const createSchema = z.object({
  user_address: z.string().trim().min(56).max(69)
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

    const wallet = await prisma.custodialWallet.create({
      data: {
        userId: user.id,
        custodialAddress: keypair.publicKey,
        encryptedKey
      }
    });

    return res.status(201).json({
      custodial_address: wallet.custodialAddress,
      status: 'pending_funding'
    });
  } catch (error) {
    next(error);
  }
});

const fundTokenSchema = z.object({
  user_address: z.string().trim().min(56).max(69),
});

/** Testnet-only: send platform token from treasury to the user’s custodial account for betting. */
router.post('/fund-token-testnet', validate(fundTokenSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!config.tokenFaucet.enabled) {
      throw new AppError(403, 'faucet_disabled', 'Testnet token faucet is disabled');
    }
    if (!config.tokenFaucet.secretKey) {
      throw new AppError(503, 'faucet_misconfigured', 'TOKEN_FAUCET_SECRET_KEY is not configured');
    }

    const { user_address } = req.body;

    const user = await prisma.user.findUnique({
      where: { stellarAddress: user_address },
      include: { custodialWallet: true },
    });

    if (!user?.custodialWallet) {
      throw new AppError(404, 'no_custodial', 'Create a custodial wallet first');
    }

    const stellar = getStellarService();
    const { txHash } = await stellar.transferToken(
      config.tokenFaucet.secretKey,
      user.custodialWallet.custodialAddress,
      config.tokenFaucet.amountRaw
    );

    return res.status(200).json({ tx_hash: txHash });
  } catch (error) {
    next(error);
  }
});

router.get('/:address', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const address = req.params.address as string;

    // Look up by custodial address first, then fall back to owner address
    let wallet = await prisma.custodialWallet.findUnique({
      where: { custodialAddress: address },
      include: { user: true }
    });

    if (!wallet) {
      const user = await prisma.user.findUnique({ where: { stellarAddress: address } });
      if (user) {
        wallet = await prisma.custodialWallet.findUnique({
          where: { userId: user.id },
          include: { user: true }
        });
      }
    }

    if (!wallet) throw new AppError(404, 'wallet_not_found', 'Wallet not found');

    let balance = "0";
    try {
      const account = await horizon.loadAccount(wallet.custodialAddress);
      const nativeBal = account.balances.find((b: any) => b.asset_type === 'native');
      if (nativeBal) balance = String(Math.floor(parseFloat(nativeBal.balance) * 10_000_000));
    } catch { /* Horizon unreachable — return 0 */ }

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
  custodial_address: z.string().trim().min(56).max(69),
  amount: z.number().int().positive(),
  destination: z.string().trim().min(56).max(69)
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

    const walletService = new WalletService(config.encryption.masterKey);
    const keypair = walletService.getKeypair(wallet.encryptedKey);

    const sourceAccount = await horizon.loadAccount(custodial_address);
    const fee = String(await horizon.fetchBaseFee());
    const xlmAmount = (amount / 10_000_000).toFixed(7);

    const tx = new TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: config.stellar.networkPassphrase,
    })
      .addOperation(Operation.payment({ destination, asset: Asset.native(), amount: xlmAmount }))
      .setTimeout(30)
      .build();

    tx.sign(keypair);
    const result = await horizon.submitTransaction(tx);

    const updated = await horizon.loadAccount(custodial_address);
    const updatedBal = updated.balances.find((b: any) => b.asset_type === 'native');
    const newBalance = updatedBal ? String(Math.floor(parseFloat(updatedBal.balance) * 10_000_000)) : "0";

    return res.status(200).json({
      tx_hash: result.hash,
      new_balance: newBalance
    });
  } catch (error) {
    next(error);
  }
});

export default router;
