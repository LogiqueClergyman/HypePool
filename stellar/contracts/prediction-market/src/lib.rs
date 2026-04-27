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

        storage::set_config(&env, &config);
        
        let state = MarketState {
            yes_pool: 0,
            no_pool: 0,
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
        let current = storage::get_yes_bet(&env, &user);
        
        if current == 0 && storage::get_no_bet(&env, &user) == 0 {
            state.total_bettors += 1;
        }

        storage::set_yes_bet(&env, &user, current + amount);
        state.yes_pool += amount;
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
        let current = storage::get_no_bet(&env, &user);
        
        if current == 0 && storage::get_yes_bet(&env, &user) == 0 {
            state.total_bettors += 1;
        }

        storage::set_no_bet(&env, &user, current + amount);
        state.no_pool += amount;
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

        let winning_bet = if state.outcome == Outcome::Yes {
            storage::get_yes_bet(&env, &user)
        } else {
            storage::get_no_bet(&env, &user)
        };

        if winning_bet <= 0 {
            return Err(MarketError::NothingToClaim);
        }

        user.require_auth();

        let (winning_pool, losing_pool) = if state.outcome == Outcome::Yes {
            (state.yes_pool, state.no_pool)
        } else {
            (state.no_pool, state.yes_pool)
        };

        let fee = storage::get_fee_collected(&env);
        let net_losing_pool = losing_pool - fee;
        
        let payout = if winning_pool == 0 {
            winning_bet
        } else {
            winning_bet + (winning_bet * net_losing_pool) / winning_pool
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

        let total = storage::get_yes_bet(&env, &user) + storage::get_no_bet(&env, &user);
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

    pub fn get_position(env: Env, user: Address) -> (i128, i128) {
        let yes_bet = storage::get_yes_bet(&env, &user);
        let no_bet = storage::get_no_bet(&env, &user);
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
