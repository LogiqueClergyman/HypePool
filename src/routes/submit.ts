import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { getStellarService } from '../services/stellar';
import { AppError } from '../lib/errors';
import { TransactionBuilder } from '@stellar/stellar-sdk';
import { config } from '../config';

const router = Router();

const submitSchema = z.object({
  signed_xdr: z.string().min(1),
});

// Accepts a signed XDR from Freighter and submits it to the Soroban RPC.
// Returns the tx_hash once the transaction is confirmed.
router.post('/', validate(submitSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { signed_xdr } = req.body;

    let tx;
    try {
      tx = TransactionBuilder.fromXDR(signed_xdr, config.stellar.networkPassphrase);
    } catch {
      throw new AppError(400, 'invalid_xdr', 'Could not parse signed transaction XDR');
    }

    const stellarService = getStellarService();
    const { txHash } = await stellarService.submitSigned(tx);

    return res.status(200).json({ tx_hash: txHash });
  } catch (error) {
    next(error);
  }
});

export default router;
