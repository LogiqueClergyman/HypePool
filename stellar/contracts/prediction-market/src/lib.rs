#![no_std]
use soroban_sdk::{contract, contractimpl, token, Address, Env};

mod errors;
mod storage;
pub mod types;

pub use crate::errors::MarketError;
pub use crate::types::{ContentType, MarketConfig, MarketState, Metric, Outcome};

mod test;

#[contract]
pub struct PredictionMarket;

#[contractimpl]
impl PredictionMarket {
    pub fn initialize(env: Env, config: MarketConfig) -> Result<(), MarketError> {
        if storage::has_config(&env) {
            return Err(MarketError::AlreadyInitialized);
        }
        if config.deadline <= env.ledger().timestamp() {
            return Err(MarketError::InvalidConfig);
        }
        if config.resolution_deadline <= config.deadline {
            return Err(MarketError::InvalidConfig);
        }
        if config.min_bet <= 0 {
            return Err(MarketError::InvalidConfig);
        }
        if config.platform_fee_bps > 1000 {
            return Err(MarketError::InvalidConfig);
        }

        let mut config = config;
        config.created_at = env.ledger().timestamp();
        storage::set_config(&env, &config);
        
        let state = MarketState {
            yes_pool: 0,
            no_pool: 0,
            yes_weighted_pool: 0,
            no_weighted_pool: 0,
            outcome: Outcome::Unresolved,
            total_bettors: 0,
        };
        storage::set_state(&env, &state);

        Ok(())
    }

    pub fn buy_yes(env: Env, user: Address, amount: i128) -> Result<(), MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        let config = storage::get_config(&env);
        if env.ledger().timestamp() >= config.deadline {
            return Err(MarketError::BettingClosed);
        }
        if amount < config.min_bet {
            return Err(MarketError::BelowMinBet);
        }

        user.require_auth();

        let token_client = token::TokenClient::new(&env, &config.token);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        let mut state = storage::get_state(&env);
        let config = storage::get_config(&env);

        let time_remaining = config.deadline - env.ledger().timestamp();
        let total_window = config.deadline - config.created_at;
        let weighted_amount = amount * (time_remaining as i128) * (time_remaining as i128)
                            / ((total_window as i128) * (total_window as i128));

        let existing = storage::get_yes_bet(&env, &user);

        if existing.is_none() && storage::get_no_bet(&env, &user).is_none() {
            state.total_bettors += 1;
        }

        let new_info = match existing {
            Some(prev) => types::BetInfo {
                amount: prev.amount + amount,
                weighted_amount: prev.weighted_amount + weighted_amount,
            },
            None => types::BetInfo {
                amount,
                weighted_amount,
            },
        };
        storage::set_yes_bet(&env, &user, &new_info);

        state.yes_pool += amount;
        state.yes_weighted_pool += weighted_amount;
        storage::set_state(&env, &state);

        Ok(())
    }

    pub fn buy_no(env: Env, user: Address, amount: i128) -> Result<(), MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        let config = storage::get_config(&env);
        if env.ledger().timestamp() >= config.deadline {
            return Err(MarketError::BettingClosed);
        }
        if amount < config.min_bet {
            return Err(MarketError::BelowMinBet);
        }

        user.require_auth();

        let token_client = token::TokenClient::new(&env, &config.token);
        token_client.transfer(&user, &env.current_contract_address(), &amount);

        let mut state = storage::get_state(&env);
        let config = storage::get_config(&env);

        let time_remaining = config.deadline - env.ledger().timestamp();
        let total_window = config.deadline - config.created_at;
        let weighted_amount = amount * (time_remaining as i128) * (time_remaining as i128)
                            / ((total_window as i128) * (total_window as i128));

        let existing = storage::get_no_bet(&env, &user);

        if existing.is_none() && storage::get_yes_bet(&env, &user).is_none() {
            state.total_bettors += 1;
        }

        let new_info = match existing {
            Some(prev) => types::BetInfo {
                amount: prev.amount + amount,
                weighted_amount: prev.weighted_amount + weighted_amount,
            },
            None => types::BetInfo {
                amount,
                weighted_amount,
            },
        };
        storage::set_no_bet(&env, &user, &new_info);

        state.no_pool += amount;
        state.no_weighted_pool += weighted_amount;
        storage::set_state(&env, &state);

        Ok(())
    }

    pub fn resolve(env: Env, oracle: Address, outcome: Outcome) -> Result<(), MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        if outcome == Outcome::Unresolved {
            return Err(MarketError::InvalidOutcome);
        }

        let mut state = storage::get_state(&env);
        if state.outcome != Outcome::Unresolved {
            return Err(MarketError::MarketAlreadyResolved);
        }

        let config = storage::get_config(&env);
        if env.ledger().timestamp() < config.deadline {
            return Err(MarketError::ResolutionWindowNotOpen);
        }
        if env.ledger().timestamp() > config.resolution_deadline {
            return Err(MarketError::ResolutionWindowNotOpen);
        }
        if oracle != config.oracle {
            return Err(MarketError::NotOracle);
        }

        oracle.require_auth();

        let losing_pool = if outcome == Outcome::Yes { state.no_pool } else { state.yes_pool };
        let fee = (losing_pool * (config.platform_fee_bps as i128)) / 10_000;
        
        storage::set_fee_collected(&env, fee);
        
        state.outcome = outcome;
        storage::set_state(&env, &state);

        Ok(())
    }

    pub fn claim(env: Env, user: Address) -> Result<i128, MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        
        let state = storage::get_state(&env);
        if state.outcome == Outcome::Unresolved {
            return Err(MarketError::MarketNotResolved);
        }

        if storage::has_claimed(&env, &user) {
            return Err(MarketError::AlreadyClaimed);
        }

        let winning_bet_info = match state.outcome {
            Outcome::Yes => storage::get_yes_bet(&env, &user),
            Outcome::No => storage::get_no_bet(&env, &user),
            _ => unreachable!(),
        };

        if winning_bet_info.is_none() || winning_bet_info.as_ref().unwrap().amount <= 0 {
            return Err(MarketError::NothingToClaim);
        }
        let winning_bet_info = winning_bet_info.unwrap();

        let (winning_pool, losing_pool, winning_weighted_pool) = if state.outcome == Outcome::Yes {
            (state.yes_pool, state.no_pool, state.yes_weighted_pool)
        } else {
            (state.no_pool, state.yes_pool, state.no_weighted_pool)
        };

        let fee = storage::get_fee_collected(&env);
        let net_losing_pool = losing_pool - fee;
        
        let payout = if winning_weighted_pool == 0 {
            winning_bet_info.amount
        } else {
            winning_bet_info.amount + (winning_bet_info.weighted_amount * net_losing_pool) / winning_weighted_pool
        };

        let config = storage::get_config(&env);
        let token_client = token::TokenClient::new(&env, &config.token);
        token_client.transfer(&env.current_contract_address(), &user, &payout);

        storage::set_claimed(&env, &user);

        Ok(payout)
    }

    pub fn refund(env: Env, user: Address) -> Result<i128, MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        
        let state = storage::get_state(&env);
        if state.outcome != Outcome::Unresolved {
            return Err(MarketError::NotRefundable);
        }

        let config = storage::get_config(&env);
        if env.ledger().timestamp() <= config.resolution_deadline {
            return Err(MarketError::NotRefundable);
        }

        let yes_info = storage::get_yes_bet(&env, &user);
        let no_info = storage::get_no_bet(&env, &user);
        let total = yes_info.map_or(0, |b| b.amount) + no_info.map_or(0, |b| b.amount);
        if total <= 0 {
            return Err(MarketError::NothingToRefund);
        }

        if storage::has_claimed(&env, &user) {
            return Err(MarketError::AlreadyClaimed);
        }

        user.require_auth();

        let token_client = token::TokenClient::new(&env, &config.token);
        token_client.transfer(&env.current_contract_address(), &user, &total);

        storage::set_claimed(&env, &user);

        Ok(total)
    }

    pub fn withdraw_fees(env: Env, creator: Address) -> Result<i128, MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        
        let state = storage::get_state(&env);
        if state.outcome == Outcome::Unresolved {
            return Err(MarketError::MarketNotResolved);
        }

        let config = storage::get_config(&env);
        if creator != config.creator {
            panic!("unauthorized");
        }

        creator.require_auth();

        let fee = storage::get_fee_collected(&env);
        if fee <= 0 {
            return Ok(0);
        }

        let token_client = token::TokenClient::new(&env, &config.token);
        token_client.transfer(&env.current_contract_address(), &creator, &fee);

        storage::set_fee_collected(&env, 0);

        Ok(fee)
    }

    pub fn get_config(env: Env) -> Result<MarketConfig, MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(storage::get_config(&env))
    }

    pub fn get_state(env: Env) -> Result<MarketState, MarketError> {
        if !storage::has_config(&env) {
            return Err(MarketError::NotInitialized);
        }
        Ok(storage::get_state(&env))
    }

    pub fn get_position(env: Env, user: Address) -> (types::BetInfo, types::BetInfo) {
        let yes_bet = storage::get_yes_bet(&env, &user).unwrap_or(types::BetInfo { amount: 0, weighted_amount: 0 });
        let no_bet = storage::get_no_bet(&env, &user).unwrap_or(types::BetInfo { amount: 0, weighted_amount: 0 });
        (yes_bet, no_bet)
    }

    pub fn get_odds(env: Env) -> (i128, i128) {
        if !storage::has_config(&env) {
            return (0, 0);
        }
        let state = storage::get_state(&env);
        (state.yes_pool, state.no_pool)
    }
}
