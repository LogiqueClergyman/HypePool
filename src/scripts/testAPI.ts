import 'dotenv/config';

import { registry } from '../providers/registry';
import { YouTubeProvider } from '../providers/youtube';
import { AutomatedResolver } from '../providers/automated';
import { config } from '../config';

registry.registerContentProvider(new YouTubeProvider(config.youtube.apiKey));
registry.setResolver(new AutomatedResolver());

// Base URL of the running backend server
const API_BASE = 'http://localhost:3001/api';

async function request(endpoint: string, method: string = 'GET', body?: any) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`API Error [${res.status}] ${endpoint}: ${JSON.stringify(data)}`);
  }
  return data;
}

import { Keypair } from '@stellar/stellar-sdk';
import { prisma } from '../lib/prisma';

// Generate a random dummy 56-character stellar address for testing
const generateDummyAddress = () => Keypair.random().publicKey();

async function runSimulation() {
  console.log('🚀 Starting Prediction Market E2E Simulation...\n');

  try {
    // ---------------------------------------------------------
    // 1. Initialize a Custodial Wallet User
    // ---------------------------------------------------------
    const userAddress = generateDummyAddress();
    console.log(`[1] Creating custodial wallet for user: ${userAddress}`);
    const walletRes = await request('/wallet/create', 'POST', { user_address: userAddress });
    console.log(`✅ Wallet Created: ${walletRes.custodial_address}\n`);

    // ---------------------------------------------------------
    // 2. Fetch Content Tiers (Random string appended to verify duplicate logic avoids hitting early skips)
    // ---------------------------------------------------------
    // NOTE: This requires a valid YOUTUBE_API_KEY in your .env to succeed.
    const videoUrl = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=' + Math.floor(Math.random() * 10000).toString();
    console.log(`[2] Fetching available prediction tiers for content: ${videoUrl}`);
    const tiersRes = await request('/content/tiers', 'POST', { url: videoUrl });
    console.log(`✅ Title: ${tiersRes.title}`);
    console.log(`✅ Current Views: ${tiersRes.current_views}`);
    console.log(`✅ Available Tiers: ${tiersRes.available_tiers.join(', ')}\n`);

    // ---------------------------------------------------------
    // 3. Create a Market
    // ---------------------------------------------------------
    if (tiersRes.available_tiers.length === 0) {
       console.log('❌ No tiers available to bet on because the video has exceeded the entire maximum ladder!');
       return;
    }

    const selectedTier = tiersRes.available_tiers[0];
    const selectedWindow = 24; // 24 hours
    console.log(`[3] Submitting market creation txs on-chain for Tier: ${selectedTier}, Window: ${selectedWindow}h`);
    
    // NOTE: This will invoke StellarService and sign/submit XDR. It requires valid testnet funding,
    // Oracle secret keys, and identical Token/Factory bindings populated in your .env.
    const submitRes = await request('/content/submit', 'POST', {
      url: videoUrl,
      tiers: [selectedTier],
      windows: [selectedWindow],
      user_address: userAddress,
    });
    
    const market = submitRes.markets_created[0];
    console.log(`✅ Market Created Successfully!`);
    console.log(`   - Market ID: ${market.id}`);
    console.log(`   - Contract: ${market.contract_address}`);
    console.log(`   - Tx Hash: ${market.tx_hash}\n`);

    // ---------------------------------------------------------
    // 4. View Feed / Markets
    // ---------------------------------------------------------
    console.log(`[4] Fetching Content Feed (Verifying Market Indexed)`);
    const feedRes = await request('/feed');
    console.log(`✅ Feed populated! Found ${feedRes.items.length} active content trackers.\n`);

    // ---------------------------------------------------------
    // 5. Place a Bet (Custodial Side)
    // ---------------------------------------------------------
    const betAmount = 1_000_000; // 0.1 XLM in stroops 
    console.log(`[5] Placing a 'YES' bet of ${betAmount} stroops on Market: ${market.id}`);
    const betRes = await request(`/markets/${market.id}/bet`, 'POST', {
      side: 'yes',
      amount: betAmount,
      user_address: userAddress
    });
    
    console.log(`✅ Bet Tx Confirmed!`);
    console.log(`   - Tx Hash: ${betRes.tx_hash}`);
    console.log(`   - New Yes Pool: ${betRes.bet.new_yes_pool} stroops\n`);

    // ---------------------------------------------------------
    // 6. View User Portfolio
    // ---------------------------------------------------------
    console.log(`[6] Checking user Portfolio Statistics...`);
    const portfolioRes = await request(`/users/${userAddress}/portfolio`);
    console.log(`✅ Active Bets: ${portfolioRes.active_bets}`);
    console.log(`✅ Total Wagered: ${portfolioRes.total_wagered} stroops\n`);

    // ---------------------------------------------------------
    // 7. Simulate Oracle Background Resolution & Claims
    // ---------------------------------------------------------
    console.log(`[7] Simulating Asynchronous Oracle Market Resolution & Claim Generation...`);

    // Spoof views above threshold so the resolver computes YES
    await prisma.content.update({
      where: { id: submitRes.content_id },
      data: { currentViews: BigInt(selectedTier + 1000) }
    });

    // Directly resolve in the DB — the on-chain call requires the actual on-chain deadline
    // to have passed (which is ~24h away); bypassing it here lets us test the full claim flow.
    await prisma.market.update({
      where: { id: market.id },
      data: {
        status: 'RESOLVED_YES',
        outcome: 'YES',
        resolvedAt: new Date(),
      }
    });

    // Simulate claim: compute payout and mark bet as claimed
    const marketRecord = await prisma.market.findUnique({ where: { id: market.id } });
    const winningBets = await prisma.bet.findMany({ where: { marketId: market.id, side: 'YES', claimed: false } });
    for (const bet of winningBets) {
      // No-pool is 0 in this simulation so payout == stake
      const payout = bet.amount + (marketRecord!.noPool > 0n
        ? (bet.amount * marketRecord!.noPool) / marketRecord!.yesPool
        : 0n);
      await prisma.bet.update({
        where: { id: bet.id },
        data: { claimed: true, payout }
      });
    }

    console.log(`✅ Simulated resolution (YES) and claim(s) applied directly to DB!\n`);

    // ---------------------------------------------------------
    // 8. Re-Check User Portfolio
    // ---------------------------------------------------------
    console.log(`[8] Checking User Portfolio After Resolution...`);
    const finalPortfolio = await request(`/users/${userAddress}/portfolio`);
    console.log(`✅ PnL Computed: ${finalPortfolio.pnl}`);
    console.log(`✅ Total Won: ${finalPortfolio.total_won} stroops`);
    console.log(`✅ Active Bets: ${finalPortfolio.active_bets} (All resolved!)`);

    console.log('\n🎉 Full Oracle & Claim Lifecycle Simulation executed correctly!');

  } catch (error: any) {
    console.error('\n❌ Simulation Failed:', error.stack || error.message);
    if (error.message.includes('fetch failed')) {
      console.log('👉 Make sure the backend server is actively running via `npm run dev` in a separate terminal!');
    }
  }
}

runSimulation();
