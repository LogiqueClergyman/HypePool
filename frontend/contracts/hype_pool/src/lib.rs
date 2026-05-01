#![no_std]
use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short, token, Address, Env, Vec,
};

// ─── Data Types ───────────────────────────────────────────────────────

#[contracttype]
#[derive(Clone, PartialEq)]
pub enum PoolStatus {
    Active,
    Settled,
    Cancelled,
}

#[contracttype]
#[derive(Clone)]
pub enum RangeTier {
    Wide,   // >50% of total range  → 1x–2x
    Medium, // 20–50%               → 2x–4x
    Narrow, // 5–20%                → 4x–8x
    Sniper, // <5%                  → 8x–16x
}

#[contracttype]
#[derive(Clone)]
pub struct Pool {
    pub creator: Address,
    pub usdc_token: Address,
    pub target_views: u64,
    pub deadline: u64,     // Unix timestamp (seconds)
    pub total_staked: i128,
    pub status: PoolStatus,
    pub actual_views: u64, // set at settlement
}

#[contracttype]
#[derive(Clone)]
pub struct Stake {
    pub staker: Address,
    pub pool_id: u64,
    pub amount: i128,
    pub range_min: u64,
    pub range_max: u64,
    pub tier: RangeTier,
    pub claimed: bool,
}

// ─── Storage Keys ─────────────────────────────────────────────────────

#[contracttype]
pub enum DataKey {
    Admin,
    Oracle,
    NextPoolId,
    Pool(u64),
    PoolStakeCount(u64),
    Stake(u64, u64), // (pool_id, stake_id)
}

// ─── Contract ─────────────────────────────────────────────────────────

#[contract]
pub struct HypePoolContract;

#[contractimpl]
impl HypePoolContract {
    /// Called once at deployment.
    pub fn initialize(env: Env, admin: Address, oracle: Address) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Oracle, &oracle);
        env.storage().instance().set(&DataKey::NextPoolId, &0u64);
    }

    /// Create a new prediction pool. Returns pool_id.
    pub fn create_pool(
        env: Env,
        creator: Address,
        usdc_token: Address,
        target_views: u64,
        deadline: u64,
    ) -> u64 {
        creator.require_auth();

        let pool_id: u64 = env
            .storage()
            .instance()
            .get(&DataKey::NextPoolId)
            .unwrap_or(0);

        let pool = Pool {
            creator: creator.clone(),
            usdc_token,
            target_views,
            deadline,
            total_staked: 0,
            status: PoolStatus::Active,
            actual_views: 0,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Pool(pool_id), &pool);
        env.storage()
            .instance()
            .set(&DataKey::NextPoolId, &(pool_id + 1));
        env.storage()
            .persistent()
            .set(&DataKey::PoolStakeCount(pool_id), &0u64);

        env.events().publish(
            (symbol_short!("PoolNew"), pool_id),
            (creator, target_views, deadline),
        );

        pool_id
    }

    /// Place a range stake on a pool. Returns stake_id.
    /// amount is in USDC stroops (7 decimals). Min = 1_000_000 (0.10 USDC).
    pub fn place_stake(
        env: Env,
        staker: Address,
        pool_id: u64,
        amount: i128,
        range_min: u64,
        range_max: u64,
    ) -> u64 {
        staker.require_auth();

        if amount < 1_000_000 {
            panic!("minimum stake is 0.10 USDC");
        }
        if range_min >= range_max {
            panic!("range_min must be less than range_max");
        }

        let mut pool: Pool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id))
            .expect("pool not found");

        if pool.status != PoolStatus::Active {
            panic!("pool not active");
        }
        if env.ledger().timestamp() >= pool.deadline {
            panic!("pool deadline passed");
        }

        // Range tier: width as % of (target_views * 4) as the full log span.
        let full_span = pool.target_views.saturating_mul(4) as u128;
        let stake_span = (range_max - range_min) as u128;
        let pct = (stake_span * 100) / full_span.max(1);

        let tier = if pct > 50 {
            RangeTier::Wide
        } else if pct > 20 {
            RangeTier::Medium
        } else if pct > 5 {
            RangeTier::Narrow
        } else {
            RangeTier::Sniper
        };

        // Transfer USDC from staker to this contract.
        let token_client = token::Client::new(&env, &pool.usdc_token);
        token_client.transfer(&staker, &env.current_contract_address(), &amount);

        pool.total_staked += amount;
        env.storage()
            .persistent()
            .set(&DataKey::Pool(pool_id), &pool);

        let stake_id: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::PoolStakeCount(pool_id))
            .unwrap_or(0);

        let stake = Stake {
            staker: staker.clone(),
            pool_id,
            amount,
            range_min,
            range_max,
            tier,
            claimed: false,
        };

        env.storage()
            .persistent()
            .set(&DataKey::Stake(pool_id, stake_id), &stake);
        env.storage()
            .persistent()
            .set(&DataKey::PoolStakeCount(pool_id), &(stake_id + 1));

        env.events().publish(
            (symbol_short!("Staked"), pool_id, stake_id),
            (staker, amount, range_min, range_max),
        );

        stake_id
    }

    /// Called by the oracle after verifying view count off-chain.
    /// Distributes pool to winners proportionally. No winners → full refund.
    pub fn settle_pool(env: Env, pool_id: u64, actual_views: u64) {
        let oracle: Address = env
            .storage()
            .instance()
            .get(&DataKey::Oracle)
            .expect("oracle not set");
        oracle.require_auth();

        let mut pool: Pool = env
            .storage()
            .persistent()
            .get(&DataKey::Pool(pool_id))
            .expect("pool not found");

        if pool.status != PoolStatus::Active {
            panic!("pool already settled");
        }

        pool.status = PoolStatus::Settled;
        pool.actual_views = actual_views;
        env.storage()
            .persistent()
            .set(&DataKey::Pool(pool_id), &pool);

        let stake_count: u64 = env
            .storage()
            .persistent()
            .get(&DataKey::PoolStakeCount(pool_id))
            .unwrap_or(0);

        // Collect winners.
        let mut winning_total: i128 = 0;
        let mut winners: Vec<(Address, i128)> = Vec::new(&env);

        for stake_id in 0..stake_count {
            let stake: Stake = env
                .storage()
                .persistent()
                .get(&DataKey::Stake(pool_id, stake_id))
                .expect("stake not found");

            if actual_views >= stake.range_min && actual_views <= stake.range_max {
                winning_total += stake.amount;
                winners.push_back((stake.staker.clone(), stake.amount));
            }
        }

        let token_client = token::Client::new(&env, &pool.usdc_token);
        let total_pool = pool.total_staked;

        if winning_total == 0 {
            // No winners — refund everyone.
            for stake_id in 0..stake_count {
                let stake: Stake = env
                    .storage()
                    .persistent()
                    .get(&DataKey::Stake(pool_id, stake_id))
                    .expect("stake not found");
                token_client.transfer(
                    &env.current_contract_address(),
                    &stake.staker,
                    &stake.amount,
                );
            }
        } else {
            // Pay winners proportionally: payout = (stake / winning_total) * total_pool
            for (winner_addr, winner_stake) in winners.iter() {
                let payout = (winner_stake * total_pool) / winning_total;
                token_client.transfer(&env.current_contract_address(), &winner_addr, &payout);
            }
        }

        env.events().publish(
            (symbol_short!("Settled"), pool_id),
            (actual_views, winning_total, total_pool),
        );
    }

    /// Read pool state.
    pub fn get_pool(env: Env, pool_id: u64) -> Pool {
        env.storage()
            .persistent()
            .get(&DataKey::Pool(pool_id))
            .expect("pool not found")
    }

    /// Read a stake.
    pub fn get_stake(env: Env, pool_id: u64, stake_id: u64) -> Stake {
        env.storage()
            .persistent()
            .get(&DataKey::Stake(pool_id, stake_id))
            .expect("stake not found")
    }

    /// Number of stakes in a pool.
    pub fn stake_count(env: Env, pool_id: u64) -> u64 {
        env.storage()
            .persistent()
            .get(&DataKey::PoolStakeCount(pool_id))
            .unwrap_or(0)
    }

    /// Update oracle address (admin only).
    pub fn set_oracle(env: Env, new_oracle: Address) {
        let admin: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .expect("not initialized");
        admin.require_auth();
        env.storage().instance().set(&DataKey::Oracle, &new_oracle);
    }
}
