import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { registry } from '../providers/registry';
import { prisma } from '../lib/prisma';
import { AppError } from '../lib/errors';
import { TierService } from '../services/tiers';
import { getStellarService } from '../services/stellar';
import { WalletService } from '../services/wallet';
import { config } from '../config';
import { TIME_WINDOWS, DEFAULT_MIN_BET, PLATFORM_FEE_BPS, RESOLUTION_GRACE_HOURS } from '../constants';
import { rpc, Address, Keypair } from '@stellar/stellar-sdk';
import { logger } from '../lib/logger';

const router = Router();

const tiersSchema = z.object({
  url: z.string().url(),
});

router.post('/tiers', validate(tiersSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url } = req.body;
    
    const provider = registry.getProviderForUrl(url);
    if (!provider) throw new AppError(400, 'unsupported_platform', 'URL platform is not supported');
    
    const externalId = provider.extractId(url);
    if (!externalId) throw new AppError(400, 'invalid_url', 'Failed to extract content ID from URL');
    
    let content = await prisma.content.findUnique({
      where: { platform_externalId: { platform: provider.platform, externalId } },
      include: { markets: true }
    });
    
    const details = await provider.getContentDetails(externalId);
    if (!details) throw new AppError(404, 'content_not_found', 'Content not found or private');

    const available_tiers = TierService.computeTiers(details.currentViews);
    const existing_markets = content?.markets.map(m => ({
      threshold: Number(m.threshold),
      window_hours: m.windowHours,
      market_id: m.id
    })) || [];
    
    return res.status(200).json({
      platform: details.platform,
      external_id: details.externalId,
      title: details.title,
      author: details.author,
      thumbnail: details.thumbnailUrl,
      published_at: details.publishedAt,
      current_views: details.currentViews,
      available_tiers,
      available_windows: TIME_WINDOWS,
      existing_markets
    });
  } catch (error) {
    next(error);
  }
});

const submitSchema = z.object({
  url: z.string().url(),
  tiers: z.array(z.coerce.number().int().positive()).min(1).max(4),
  windows: z.array(z.coerce.number().int().positive()).min(1).max(4),
  user_address: z.string().trim().min(56).max(69),
});

router.post('/submit', validate(submitSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { url, tiers, windows, user_address } = req.body;

    const provider = registry.getProviderForUrl(url);
    if (!provider) throw new AppError(400, 'unsupported_platform', 'URL platform is not supported');

    const externalId = provider.extractId(url);
    if (!externalId) throw new AppError(400, 'invalid_url', 'Failed to extract content ID from URL');

    const details = await provider.getContentDetails(externalId);
    if (!details) throw new AppError(404, 'content_not_found', 'Content not found or private');

    if (!TierService.validateTiers(tiers)) {
      throw new AppError(400, 'invalid_tier', 'Tier is not from the valid ladder');
    }

    const user = await prisma.user.upsert({
      where: { stellarAddress: user_address },
      update: {},
      create: { stellarAddress: user_address },
      include: { custodialWallet: true }
    });

    const stellarService = getStellarService();

    let contentRecord = await prisma.content.upsert({
      where: { platform_externalId: { platform: details.platform, externalId: details.externalId } },
      update: { currentViews: BigInt(details.currentViews), lastFetchedAt: new Date() },
      create: {
        platform: details.platform,
        externalId: details.externalId,
        url: details.url,
        title: details.title,
        author: details.author,
        thumbnailUrl: details.thumbnailUrl,
        publishedAt: details.publishedAt,
        currentViews: BigInt(details.currentViews),
        lastFetchedAt: new Date(),
      }
    });

    if (user.custodialWallet) {
      const walletService = new WalletService(config.encryption.masterKey);
      const userKeypair = walletService.getKeypair(user.custodialWallet.encryptedKey);

      const marketsCreated = [];
      const txHashes = [];

      for (const tier of tiers) {
        for (const window of windows) {
          const now = Math.floor(Date.now() / 1000);
          const deadline = now + (window * 3600);
          const resolutionDeadline = deadline + (RESOLUTION_GRACE_HOURS * 3600);

          let txHash: string | null = null;
          let txResponse: any = null;
          let onchainId = await stellarService.getFactoryMarketCount(userKeypair.publicKey());
          let contractAddress = '';

          try {
            let exists = await prisma.market.findUnique({
              where: { contentId_threshold_windowHours: { contentId: contentRecord.id, threshold: BigInt(tier), windowHours: window } }
            });
            if (exists) {
              try {
                const canonicalAddress = await stellarService.getFactoryMarketAddress(userKeypair.publicKey(), exists.onchainId);
                if (exists.contractAddress !== canonicalAddress) {
                  await prisma.market.update({
                    where: { id: exists.id },
                    data: { contractAddress: canonicalAddress }
                  });
                  exists.contractAddress = canonicalAddress;
                }
              } catch (reconcileError) {
                logger.warn({ err: reconcileError, marketId: exists.id }, 'Existing market has invalid onchain reference; recreating');
                await prisma.market.delete({ where: { id: exists.id } });
                exists = null;
                // Continue normal create path below.
              }
            }

            if (exists) {
              // Market already exists - include it in response so test can proceed
              marketsCreated.push({
                id: exists.id,
                onchain_id: exists.onchainId,
                contract_address: exists.contractAddress,
                threshold: Number(exists.threshold),
                window_hours: exists.windowHours,
                deadline: exists.deadline.toISOString(),
                tx_hash: null, // Already exists, no new tx
              });
              continue; // skip to next iteration
            }

            const marketConfig = {
              contentUrl: details.url,
              contentType: 0, // 0 for YouTube according to enums
              metric: 0,      // 0 for Views
              threshold: BigInt(tier),
              deadline,
              resolutionDeadline,
              minBet: DEFAULT_MIN_BET,
              tokenAddress: config.stellar.tokenAddress,
              oracleAddress: userKeypair.publicKey(), // the user creates via factory, but the oracle is standard
              creatorAddress: userKeypair.publicKey(),
              platformFeeBps: PLATFORM_FEE_BPS,
            };
            
            // Override oracle properly 
            marketConfig.oracleAddress = Keypair.fromSecret(config.stellar.oracleSecret).publicKey();

            const xdr = await stellarService.buildCreateMarketTx(userKeypair.publicKey(), marketConfig);
            const result = await stellarService.signAndSubmit(xdr, userKeypair);
            txHash = result.txHash;
            txResponse = result.txResponse;
            txHashes.push(txHash);
            contractAddress = await stellarService.getFactoryMarketAddress(userKeypair.publicKey(), onchainId);
            logger.info({ txHash, contractAddress, onchainId }, 'Market created on-chain');

            const market = await prisma.market.create({
              data: {
                contentId: contentRecord.id,
                onchainId: onchainId,
                contractAddress: contractAddress,
                threshold: BigInt(tier),
                windowHours: window,
                deadline: new Date(deadline * 1000),
                resolutionDeadline: new Date(resolutionDeadline * 1000),
                minBet: DEFAULT_MIN_BET,
              }
            });

            marketsCreated.push({
              id: market.id,
              onchain_id: market.onchainId,
              contract_address: market.contractAddress,
              threshold: Number(market.threshold),
              window_hours: market.windowHours,
              deadline: market.deadline.toISOString(),
              tx_hash: txHash,
            });
          } catch(e) {
            logger.error({ err: e, tier, window }, 'Failed to create market');
            throw e;
          }
        }
      }

      return res.status(201).json({
        content_id: contentRecord.id,
        markets_created: marketsCreated,
        tx_hashes: txHashes
      });

    } else {
      const interactions = [];

      for (const tier of tiers) {
        for (const window of windows) {
          const now = Math.floor(Date.now() / 1000);
          const deadline = now + (window * 3600);
          const resolutionDeadline = deadline + (RESOLUTION_GRACE_HOURS * 3600);

          const marketConfig = {
            contentUrl: details.url,
            contentType: 0,
            metric: 0,
            threshold: BigInt(tier),
            deadline,
            resolutionDeadline,
            minBet: DEFAULT_MIN_BET,
            tokenAddress: config.stellar.tokenAddress,
            oracleAddress: Keypair.fromSecret(config.stellar.oracleSecret).publicKey(),
            creatorAddress: user_address,
            platformFeeBps: PLATFORM_FEE_BPS,
          };

          const xdr = await stellarService.buildCreateMarketTx(user_address, marketConfig);
          
          const interaction = await prisma.interaction.create({
            data: {
              type: 'MARKET_CREATE',
              userAddress: user_address,
              xdr,
              expiresAt: new Date(Date.now() + 10 * 60 * 1000),
              metadata: {
                tier, window, contentId: contentRecord.id, deadline, resolutionDeadline
              }
            }
          });

          interactions.push({
            interaction_id: interaction.id,
            xdr: interaction.xdr,
            threshold: tier,
            window_hours: window
          });
        }
      }

      return res.status(200).json({
        content_id: contentRecord.id,
        interactions
      });
    }
  } catch (error) {
    next(error);
  }
});
export default router;
